import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";

export const runtime = "nodejs";

interface VerifyRequest {
  csr?: string;
  privateKey?: string;
  publicKey?: string;
}

interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

interface VerifyResponse {
  success: boolean;
  checks: CheckResult[];
  // Extracted info (only present if parsing succeeds)
  csrInfo?: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string[];
    country?: string;
    state?: string;
    locality?: string;
    emailAddress?: string;
    serialNumber?: string;
    subjectAltNames?: string[];
    signatureAlgorithm?: string;
  };
  keyInfo?: {
    algorithm: string;
    keySize: number;
    // SHA-256 fingerprint of the public key modulus (hex) — used for matching
    publicKeyFingerprint: string;
  };
  privateKeyInfo?: {
    algorithm: string;
    keySize: number;
    publicKeyFingerprint: string;
  };
  csrPublicKeyInfo?: {
    algorithm: string;
    keySize: number;
    publicKeyFingerprint: string;
  };
  summary: {
    allMatch: boolean;
    passedChecks: number;
    totalChecks: number;
  };
}

/**
 * Compute a stable SHA-256 fingerprint of a public key.
 * We hash the DER-encoded SubjectPublicKeyInfo so the same key
 * (regardless of PEM formatting/whitespace) yields the same fingerprint.
 */
function publicKeyFingerprint(publicKey: forge.pki.PublicKey): string {
  const der = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes();
  const md = forge.md.sha256.create();
  md.update(der);
  return md.digest().toHex();
}

function getSubjectField(
  attrs: forge.pki.CertField[] | undefined,
  name: string
): string | undefined {
  if (!attrs) return undefined;
  const found = attrs.find((a) => a.name === name);
  return found ? decodeMaybeUtf8(found) : undefined;
}

function getSubjectFields(
  attrs: forge.pki.CertField[] | undefined,
  name: string
): string[] {
  if (!attrs) return [];
  return attrs.filter((a) => a.name === name).map((a) => decodeMaybeUtf8(a));
}

function getSubjectFieldByShortName(
  attrs: forge.pki.CertField[] | undefined,
  shortName: string
): string | undefined {
  if (!attrs) return undefined;
  const found = attrs.find((a) => a.shortName === shortName);
  return found ? decodeMaybeUtf8(found) : undefined;
}

/**
 * forge returns UTF8String attribute values as a binary string of UTF-8 bytes
 * (each char is one byte 0-255). Convert to a proper JS string by re-interpreting
 * the bytes as UTF-8. PrintableString (ASCII) values pass through unchanged.
 */
function decodeMaybeUtf8(attr: forge.pki.CertField): string {
  const v = attr.value;
  if (typeof v !== "string" || !v) return v;
  // 0x0C = UTF8String, 0x1E = BMPString, 0x16 = IA5String, 0x13 = PrintableString
  // Only UTF8String needs re-decoding; others are ASCII-safe.
  // Note: forge stores valueTagClass only when it differs from the default.
  // We attempt UTF-8 decode if the string contains any byte >= 0x80, which is
  // a strong signal that it was originally UTF-8 encoded.
  const hasHighBytes = /[\u0080-\u00FF]/.test(v);
  if (!hasHighBytes) return v;
  try {
    // Convert binary string -> UTF-8 string
    const buf = Buffer.from(v, "binary");
    const decoded = buf.toString("utf8");
    // Sanity check: if it decodes to valid UTF-8 (no replacement chars), use it
    if (!decoded.includes("\uFFFD")) return decoded;
  } catch {
    // ignore and fall through
  }
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyRequest;

    const csrPem = body.csr?.trim() ?? "";
    const privateKeyPem = body.privateKey?.trim() ?? "";
    const publicKeyPem = body.publicKey?.trim() ?? "";

    const checks: CheckResult[] = [];

    // -----------------------------------------------------------------
    // 1. Parse the CSR
    // -----------------------------------------------------------------
    let csr: forge.pki.CertificationRequest | null = null;
    if (!csrPem) {
      checks.push({
        id: "csr-present",
        label: "وجود CSR",
        status: "fail",
        detail: "محتوای CSR وارد نشده است.",
      });
    } else {
      try {
        csr = forge.pki.certificationRequestFromPem(csrPem);
        checks.push({
          id: "csr-parse",
          label: "تجزیه CSR (PEM)",
          status: "pass",
          detail: "ساختار PEM معتبر است.",
        });
      } catch (e) {
        checks.push({
          id: "csr-parse",
          label: "تجزیه CSR (PEM)",
          status: "fail",
          detail: `فرمت CSR نامعتبر است: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    }

    // -----------------------------------------------------------------
    // 2. Parse the private key
    // -----------------------------------------------------------------
    let privateKey: forge.pki.PrivateKey | null = null;
    if (!privateKeyPem) {
      checks.push({
        id: "priv-present",
        label: "وجود کلید خصوصی",
        status: "fail",
        detail: "محتوای کلید خصوصی وارد نشده است.",
      });
    } else {
      try {
        // Try without password first, then with common passwords
        try {
          privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        } catch {
          // Try with empty passphrase
          privateKey = forge.pki.decryptRsaPrivateKey(
            privateKeyPem,
            ""
          ) as forge.pki.PrivateKey | null;
          if (!privateKey) {
            throw new Error("Could not parse even with empty passphrase");
          }
        }
        checks.push({
          id: "priv-parse",
          label: "تجزیه کلید خصوصی (PEM)",
          status: "pass",
          detail: "ساختار PEM معتبر است.",
        });
      } catch (e) {
        checks.push({
          id: "priv-parse",
          label: "تجزیه کلید خصوصی (PEM)",
          status: "fail",
          detail: `فرمت کلید خصوصی نامعتبر است: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    }

    // -----------------------------------------------------------------
    // 3. Parse the public key
    // -----------------------------------------------------------------
    let publicKey: forge.pki.PublicKey | null = null;
    if (!publicKeyPem) {
      checks.push({
        id: "pub-present",
        label: "وجود کلید عمومی",
        status: "fail",
        detail: "محتوای کلید عمومی وارد نشده است.",
      });
    } else {
      try {
        publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        checks.push({
          id: "pub-parse",
          label: "تجزیه کلید عمومی (PEM)",
          status: "pass",
          detail: "ساختار PEM معتبر است.",
        });
      } catch (e) {
        checks.push({
          id: "pub-parse",
          label: "تجزیه کلید عمومی (PEM)",
          status: "fail",
          detail: `فرمت کلید عمومی نامعتبر است: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    }

    // -----------------------------------------------------------------
    // 4. Verify the CSR signature (CSR must be parsed)
    // -----------------------------------------------------------------
    if (csr) {
      try {
        const valid = csr.verify();
        checks.push({
          id: "csr-signature",
          label: "اعتبارسنجی امضای CSR",
          status: valid ? "pass" : "fail",
          detail: valid
            ? "امضای CSR با کلید عمومی درون آن معتبر است."
            : "امضای CSR نامعتبر است — احتمالاً فایل خراب شده است.",
        });
      } catch (e) {
        checks.push({
          id: "csr-signature",
          label: "اعتبارسنجی امضای CSR",
          status: "fail",
          detail: `خطا در اعتبارسنجی امضا: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    } else {
      checks.push({
        id: "csr-signature",
        label: "اعتبارسنجی امضای CSR",
        status: "skip",
        detail: "به دلیل نامعتبر بودن CSR، این بررسی انجام نشد.",
      });
    }

    // -----------------------------------------------------------------
    // 5. CSR public key ↔ pasted public key
    // -----------------------------------------------------------------
    if (csr && publicKey) {
      try {
        const csrFp = publicKeyFingerprint(csr.publicKey);
        const pubFp = publicKeyFingerprint(publicKey);
        const match = csrFp === pubFp;
        checks.push({
          id: "csr-pub-match",
          label: "تطابق کلید عمومی CSR با کلید عمومی",
          status: match ? "pass" : "fail",
          detail: match
            ? "کلید عمومی درون CSR با کلید عمومی ارائه‌شده یکی است."
            : "کلید عمومی درون CSR با کلید عمومی ارائه‌شده متفاوت است.",
        });
      } catch (e) {
        checks.push({
          id: "csr-pub-match",
          label: "تطابق کلید عمومی CSR با کلید عمومی",
          status: "fail",
          detail: `خطا در مقایسه: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    } else {
      checks.push({
        id: "csr-pub-match",
        label: "تطابق کلید عمومی CSR با کلید عمومی",
        status: "skip",
        detail: "به دلیل نبود یکی از ورودی‌ها، این بررسی انجام نشد.",
      });
    }

    // -----------------------------------------------------------------
    // 6. Private key ↔ public key
    // -----------------------------------------------------------------
    if (privateKey && publicKey) {
      try {
        // Derive public key from private key
        const derivedPub = forge.pki.setRsaPublicKey(
          (privateKey as forge.pki.rsa.PrivateKey).n,
          (privateKey as forge.pki.rsa.PrivateKey).e
        );
        const privFp = publicKeyFingerprint(derivedPub);
        const pubFp = publicKeyFingerprint(publicKey);
        const match = privFp === pubFp;
        checks.push({
          id: "priv-pub-match",
          label: "تطابق کلید خصوصی با کلید عمومی",
          status: match ? "pass" : "fail",
          detail: match
            ? "کلید عمومی ارائه‌شده متناظر با کلید خصوصی است."
            : "کلید عمومی ارائه‌شده با کلید خصوصی جفت نیست.",
        });
      } catch (e) {
        checks.push({
          id: "priv-pub-match",
          label: "تطابق کلید خصوصی با کلید عمومی",
          status: "fail",
          detail: `خطا در مقایسه: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    } else {
      checks.push({
        id: "priv-pub-match",
        label: "تطابق کلید خصوصی با کلید عمومی",
        status: "skip",
        detail: "به دلیل نبود یکی از ورودی‌ها، این بررسی انجام نشد.",
      });
    }

    // -----------------------------------------------------------------
    // 7. CSR signature was made by the provided private key
    // -----------------------------------------------------------------
    if (csr && privateKey) {
      try {
        // Re-derive the public key from the private key and check it matches CSR's
        const derivedPub = forge.pki.setRsaPublicKey(
          (privateKey as forge.pki.rsa.PrivateKey).n,
          (privateKey as forge.pki.rsa.PrivateKey).e
        );
        const csrFp = publicKeyFingerprint(csr.publicKey);
        const privFp = publicKeyFingerprint(derivedPub);
        const match = csrFp === privFp;
        checks.push({
          id: "csr-priv-match",
          label: "تطابق کلید خصوصی با CSR",
          status: match ? "pass" : "fail",
          detail: match
            ? "کلید خصوصی ارائه‌شده همان است که CSR را امضا کرده است."
            : "کلید خصوصی ارائه‌شده با کلید عمومی درون CSR جفت نیست.",
        });
      } catch (e) {
        checks.push({
          id: "csr-priv-match",
          label: "تطابق کلید خصوصی با CSR",
          status: "fail",
          detail: `خطا در مقایسه: ${e instanceof Error ? e.message : "unknown"}`,
        });
      }
    } else {
      checks.push({
        id: "csr-priv-match",
        label: "تطابق کلید خصوصی با CSR",
        status: "skip",
        detail: "به دلیل نبود یکی از ورودی‌ها، این بررسی انجام نشد.",
      });
    }

    // -----------------------------------------------------------------
    // Build the response with extracted info
    // -----------------------------------------------------------------
    let csrInfo: VerifyResponse["csrInfo"];
    if (csr) {
      const attrs = csr.subject.attributes;
      const ous = getSubjectFields(attrs, "organizationalUnitName");
      // Also handle numbered OUs (1.OU, 2.OU, 3.OU) which appear with the same shortName
      csrInfo = {
        commonName: getSubjectField(attrs, "commonName"),
        organization: getSubjectField(attrs, "organizationName"),
        organizationalUnit: ous.length ? ous : undefined,
        country: getSubjectField(attrs, "countryName"),
        state: getSubjectField(attrs, "stateOrProvinceName"),
        locality: getSubjectField(attrs, "localityName"),
        emailAddress: getSubjectField(attrs, "emailAddress"),
        serialNumber:
          getSubjectField(attrs, "serialNumber") ??
          getSubjectFieldByShortName(attrs, "serialNumber") ??
          attrs?.find((a) => a.type === "2.5.4.5")?.value,
        signatureAlgorithm: csr.signatureOid
          ? forge.pki.oids[csr.signatureOid] ?? csr.signatureOid
          : undefined,
      };
    }

    let keyInfo: VerifyResponse["keyInfo"];
    if (publicKey) {
      const rsaPub = publicKey as forge.pki.rsa.PublicKey;
      keyInfo = {
        algorithm: "RSA",
        keySize: rsaPub.n.bitLength(),
        publicKeyFingerprint: publicKeyFingerprint(publicKey),
      };
    }

    let privateKeyInfo: VerifyResponse["privateKeyInfo"];
    if (privateKey) {
      const rsaPriv = privateKey as forge.pki.rsa.PrivateKey;
      const derivedPub = forge.pki.setRsaPublicKey(rsaPriv.n, rsaPriv.e);
      privateKeyInfo = {
        algorithm: "RSA",
        keySize: rsaPriv.n.bitLength(),
        publicKeyFingerprint: publicKeyFingerprint(derivedPub),
      };
    }

    let csrPublicKeyInfo: VerifyResponse["csrPublicKeyInfo"];
    if (csr) {
      const rsaPub = csr.publicKey as forge.pki.rsa.PublicKey;
      csrPublicKeyInfo = {
        algorithm: "RSA",
        keySize: rsaPub.n.bitLength(),
        publicKeyFingerprint: publicKeyFingerprint(csr.publicKey),
      };
    }

    const passedChecks = checks.filter((c) => c.status === "pass").length;
    const totalChecks = checks.length;
    const allMatch =
      checks.length > 0 && checks.every((c) => c.status === "pass");

    const response: VerifyResponse = {
      success: true,
      checks,
      csrInfo,
      keyInfo,
      privateKeyInfo,
      csrPublicKeyInfo,
      summary: {
        allMatch,
        passedChecks,
        totalChecks,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Verify-keys error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `خطا در اعتبارسنجی: ${message}` },
      { status: 500 }
    );
  }
}
