import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";

export const runtime = "nodejs";

const DEFAULT_PASSWORD = "RAYNOP@SSWORD123456";

type PersonaType = "UNA" | "NGO" | "DAB";

interface CsrRequest {
  persona: PersonaType;
  // Common fields
  email?: string;
  provinceFa?: string;
  cityFa?: string;
  // UNA (Natural Person) fields
  firstNameFa?: string; // G (GivenName)
  lastNameFa?: string; // SN (Surname)
  firstNameEn?: string;
  lastNameEn?: string;
  nationalCode?: string; // 10-digit
  // NGO (Legal Person) fields
  orgNameFa?: string; // OU (mandatory)
  orgNameEn?: string; // CN
  nationalId?: string; // 11-digit
  orgUnit1?: string;
  orgUnit2?: string;
  orgUnit3?: string;
  // DAB (Electronic Registry Office) fields - Appendix 3
  dabFirstNameFa?: string; // G (GivenName) - mandatory Fa
  dabLastNameFa?: string; // SN (Surname) - mandatory Fa
  dabNationalCode?: string; // 10-digit, used in CN as [National Code]
  dabOfficeNameFa?: string; // OU (mandatory Fa) - Registry Office Name
  dabOfficeNameEn?: string; // used in CN as RaName.RA [NationalCode]
  dabOfficeId?: string; // SERIALNUMBER - Registry Office ID
  dabOrgType?: "Governmental" | "Non-Governmental"; // O field
  dabOrgUnit1?: string;
  dabOrgUnit2?: string;
  dabOrgUnit3?: string;
}

interface GeneratedFiles {
  configTxt: string;
  privateKeyPem: string;
  publicKeyPem: string;
  csrPem: string;
  commands: {
    generateCsr: string;
    extractPublicKey: string;
    generatePfx: string;
  };
  summary: {
    persona: PersonaType;
    commonName: string;
    serialNumber: string;
    algorithm: string;
    keySize: number;
    generatedAt: string;
  };
}

/**
 * Builds the OpenSSL config.txt content based on persona type.
 * Mirrors the format described in the GICA guide for Samaneh Moudian.
 */
function buildConfigTxt(req: CsrRequest): string {
  const lines: string[] = ["[req]", "prompt = no", "distinguished_name = dn", "", "[dn]"];

  if (req.persona === "UNA") {
    // Natural Person
    const fullNameEn = `${req.firstNameEn ?? ""} ${req.lastNameEn ?? ""}`.trim();
    lines.push(`CN = ${fullNameEn} [Sign]`);
    lines.push(`serialNumber = ${req.nationalCode ?? ""}`);
    lines.push(`O = Unaffiliated`);
    lines.push(`SN = ${req.lastNameFa ?? ""}`);
    lines.push(`G = ${req.firstNameFa ?? ""}`);
    lines.push(`S = ${req.provinceFa ?? ""}`);
    lines.push(`L = ${req.cityFa ?? ""}`);
    lines.push(`C = IR`);
    if (req.email) {
      lines.push(`E = ${req.email}`);
    }
  } else if (req.persona === "NGO") {
    // Legal Person (NGO - Non-Governmental)
    lines.push(`CN = ${req.orgNameEn ?? ""} [Stamp]`);
    lines.push(`serialNumber = ${req.nationalId ?? ""}`);
    lines.push(`O = Non-Governmental`);
    lines.push(`OU = ${req.orgNameFa ?? ""}`);
    if (req.orgUnit1) lines.push(`1.OU = ${req.orgUnit1}`);
    if (req.orgUnit2) lines.push(`2.OU = ${req.orgUnit2}`);
    if (req.orgUnit3) lines.push(`3.OU = ${req.orgUnit3}`);
    lines.push(`S = ${req.provinceFa ?? ""}`);
    lines.push(`L = ${req.cityFa ?? ""}`);
    lines.push(`C = IR`);
    if (req.email) {
      lines.push(`E = ${req.email}`);
    }
  } else {
    // DAB - Electronic Registry Office (Appendix 3)
    // CN format: {OfficeNameEn}.RA [{NationalCode}]
    lines.push(`CN = ${req.dabOfficeNameEn ?? ""}.RA [${req.dabNationalCode ?? ""}]`);
    lines.push(`serialNumber = ${req.dabOfficeId ?? ""}`);
    lines.push(`O = ${req.dabOrgType ?? "Non-Governmental"}`);
    lines.push(`OU = ${req.dabOfficeNameFa ?? ""}`);
    if (req.dabOrgUnit1) lines.push(`1.OU = ${req.dabOrgUnit1}`);
    if (req.dabOrgUnit2) lines.push(`2.OU = ${req.dabOrgUnit2}`);
    if (req.dabOrgUnit3) lines.push(`3.OU = ${req.dabOrgUnit3}`);
    lines.push(`S = ${req.provinceFa ?? ""}`);
    lines.push(`L = ${req.cityFa ?? ""}`);
    lines.push(`C = IR`);
    lines.push(`SN = ${req.dabLastNameFa ?? ""}`);
    lines.push(`G = ${req.dabFirstNameFa ?? ""}`);
    if (req.email) {
      lines.push(`E = ${req.email}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Builds the node-forge subject attributes array from the request.
 * Uses proper OIDs for custom fields like serialNumber.
 * Persian/non-ASCII fields use UTF8String (tag 0x0C) so the resulting
 * CSR can be re-parsed by both forge and OpenSSL.
 */
const UTF8STRING = 0x0c;

function buildSubjectAttrs(req: CsrRequest): forge.pki.CertField[] {
  const attrs: forge.pki.CertField[] = [];

  if (req.persona === "UNA") {
    const fullNameEn = `${req.firstNameEn ?? ""} ${req.lastNameEn ?? ""}`.trim();
    attrs.push({ name: "commonName", value: `${fullNameEn} [Sign]` });
    attrs.push({ name: "organizationName", value: "Unaffiliated" });
    if (req.lastNameFa)
      attrs.push({
        name: "surname",
        value: req.lastNameFa,
        valueTagClass: UTF8STRING,
      });
    if (req.firstNameFa)
      attrs.push({
        name: "givenName",
        value: req.firstNameFa,
        valueTagClass: UTF8STRING,
      });
    attrs.push({ name: "countryName", value: "IR" });
    if (req.provinceFa)
      attrs.push({
        name: "stateOrProvinceName",
        value: req.provinceFa,
        valueTagClass: UTF8STRING,
      });
    if (req.cityFa)
      attrs.push({
        name: "localityName",
        value: req.cityFa,
        valueTagClass: UTF8STRING,
      });
    if (req.email) attrs.push({ name: "emailAddress", value: req.email });
    // serialNumber uses OID 2.5.4.5
    attrs.push({ name: "serialNumber", value: req.nationalCode ?? "" });
  } else if (req.persona === "NGO") {
    attrs.push({ name: "commonName", value: `${req.orgNameEn ?? ""} [Stamp]` });
    attrs.push({ name: "organizationName", value: "Non-Governmental" });
    if (req.orgNameFa)
      attrs.push({
        name: "organizationalUnitName",
        value: req.orgNameFa,
        valueTagClass: UTF8STRING,
      });
    if (req.orgUnit1)
      attrs.push({
        name: "organizationalUnitName",
        value: req.orgUnit1,
        valueTagClass: UTF8STRING,
      });
    if (req.orgUnit2)
      attrs.push({
        name: "organizationalUnitName",
        value: req.orgUnit2,
        valueTagClass: UTF8STRING,
      });
    if (req.orgUnit3)
      attrs.push({
        name: "organizationalUnitName",
        value: req.orgUnit3,
        valueTagClass: UTF8STRING,
      });
    attrs.push({ name: "countryName", value: "IR" });
    if (req.provinceFa)
      attrs.push({
        name: "stateOrProvinceName",
        value: req.provinceFa,
        valueTagClass: UTF8STRING,
      });
    if (req.cityFa)
      attrs.push({
        name: "localityName",
        value: req.cityFa,
        valueTagClass: UTF8STRING,
      });
    if (req.email) attrs.push({ name: "emailAddress", value: req.email });
    // serialNumber uses OID 2.5.4.5
    attrs.push({ name: "serialNumber", value: req.nationalId ?? "" });
  } else {
    // DAB - Electronic Registry Office (Appendix 3)
    // CN format: {OfficeNameEn}.RA [{NationalCode}]
    attrs.push({
      name: "commonName",
      value: `${req.dabOfficeNameEn ?? ""}.RA [${req.dabNationalCode ?? ""}]`,
    });
    attrs.push({
      name: "organizationName",
      value: req.dabOrgType ?? "Non-Governmental",
    });
    if (req.dabOfficeNameFa)
      attrs.push({
        name: "organizationalUnitName",
        value: req.dabOfficeNameFa,
        valueTagClass: UTF8STRING,
      });
    if (req.dabOrgUnit1)
      attrs.push({
        name: "organizationalUnitName",
        value: req.dabOrgUnit1,
        valueTagClass: UTF8STRING,
      });
    if (req.dabOrgUnit2)
      attrs.push({
        name: "organizationalUnitName",
        value: req.dabOrgUnit2,
        valueTagClass: UTF8STRING,
      });
    if (req.dabOrgUnit3)
      attrs.push({
        name: "organizationalUnitName",
        value: req.dabOrgUnit3,
        valueTagClass: UTF8STRING,
      });
    attrs.push({ name: "countryName", value: "IR" });
    if (req.provinceFa)
      attrs.push({
        name: "stateOrProvinceName",
        value: req.provinceFa,
        valueTagClass: UTF8STRING,
      });
    if (req.cityFa)
      attrs.push({
        name: "localityName",
        value: req.cityFa,
        valueTagClass: UTF8STRING,
      });
    if (req.dabLastNameFa)
      attrs.push({
        name: "surname",
        value: req.dabLastNameFa,
        valueTagClass: UTF8STRING,
      });
    if (req.dabFirstNameFa)
      attrs.push({
        name: "givenName",
        value: req.dabFirstNameFa,
        valueTagClass: UTF8STRING,
      });
    if (req.email) attrs.push({ name: "emailAddress", value: req.email });
    // serialNumber uses OID 2.5.4.5 — Registry Office ID
    attrs.push({ name: "serialNumber", value: req.dabOfficeId ?? "" });
  }

  return attrs;
}

/**
 * Validates input fields based on persona.
 * Returns array of error messages (empty if valid).
 */
function validateInput(req: CsrRequest): string[] {
  const errors: string[] = [];

  if (req.persona === "UNA") {
    if (!req.firstNameFa?.trim()) errors.push("نام (فارسی) الزامی است.");
    if (!req.lastNameFa?.trim()) errors.push("نام خانوادگی (فارسی) الزامی است.");
    if (!req.firstNameEn?.trim()) errors.push("First name (English) is required.");
    if (!req.lastNameEn?.trim()) errors.push("Last name (English) is required.");
    if (!req.nationalCode?.trim()) errors.push("کد ملی الزامی است.");
    else if (!/^\d{10}$/.test(req.nationalCode.trim()))
      errors.push("کد ملی باید دقیقاً ۱۰ رقم باشد.");
    if (!req.provinceFa?.trim()) errors.push("نام استان الزامی است.");
    if (!req.cityFa?.trim()) errors.push("نام شهر الزامی است.");
  } else if (req.persona === "NGO") {
    if (!req.orgNameFa?.trim()) errors.push("نام سازمان (فارسی) الزامی است.");
    if (!req.orgNameEn?.trim()) errors.push("Organization name (English) is required.");
    if (!req.nationalId?.trim()) errors.push("شناسه ملی الزامی است.");
    else if (!/^\d{11}$/.test(req.nationalId.trim()))
      errors.push("شناسه ملی باید دقیقاً ۱۱ رقم باشد.");
    if (!req.provinceFa?.trim()) errors.push("نام استان الزامی است.");
    if (!req.cityFa?.trim()) errors.push("نام شهر الزامی است.");
  } else if (req.persona === "DAB") {
    if (!req.dabFirstNameFa?.trim()) errors.push("نام (فارسی) الزامی است.");
    if (!req.dabLastNameFa?.trim()) errors.push("نام خانوادگی (فارسی) الزامی است.");
    if (!req.dabNationalCode?.trim()) errors.push("کد ملی الزامی است.");
    else if (!/^\d{10}$/.test(req.dabNationalCode.trim()))
      errors.push("کد ملی باید دقیقاً ۱۰ رقم باشد.");
    if (!req.dabOfficeNameFa?.trim())
      errors.push("نام مرجع ثبت دفتر (فارسی) الزامی است.");
    if (!req.dabOfficeNameEn?.trim())
      errors.push("نام مرجع ثبت دفتر (انگلیسی) الزامی است.");
    if (!req.dabOfficeId?.trim())
      errors.push("شناسه مرجع ثبت دفتر الزامی است.");
    if (!req.provinceFa?.trim()) errors.push("نام استان الزامی است.");
    if (!req.cityFa?.trim()) errors.push("نام شهر الزامی است.");
  } else {
    errors.push("نوع شخص نامعتبر است.");
  }

  if (req.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
    errors.push("پست الکترونیک معتبر نیست.");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CsrRequest;
    // Password is always handled in the backend — never read from the client.
    // This keeps the default PEM pass phrase consistent across all personas.
    const password = DEFAULT_PASSWORD;

    // Validate input
    const errors = validateInput(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Build config.txt
    const configTxt = buildConfigTxt(body);

    // Generate RSA 2048 keypair
    // Using pki.rsa.generateKeyPair - this is CPU intensive, so we run it in nodejs runtime
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

    // Build subject attributes
    const attrs = buildSubjectAttrs(body);

    // Create CSR (Certificate Signing Request)
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;
    csr.setSubject(attrs);

    // Sign the CSR with the private key using SHA-256
    // Note: forge requires a message digest instance (not a string) for csr.sign
    const md = forge.md.sha256.create();
    csr.sign(keyPair.privateKey, md);

    if (!csr.verify()) {
      return NextResponse.json(
        { success: false, errors: ["CSG verification failed. Please try again."] },
        { status: 500 }
      );
    }

    // Convert to PEM format
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // Build OpenSSL command reference (for the manual path described in the PDF)
    const commands = {
      generateCsr: `openssl req -new -utf8 -config "C:\\openssl\\config.txt" -newkey rsa:2048 -keyout mykey.key -out mycsr.txt`,
      extractPublicKey: `openssl rsa -in mykey.key -pubout -out mypublickey.txt`,
      generatePfx: `openssl pkcs12 -export -inkey mykey.key -in certificate.crt -out keystore.pfx`,
    };

    // Build summary
    let commonName: string;
    let serialNumber: string;
    if (body.persona === "UNA") {
      commonName = `${body.firstNameEn} ${body.lastNameEn} [Sign]`;
      serialNumber = body.nationalCode!;
    } else if (body.persona === "NGO") {
      commonName = `${body.orgNameEn} [Stamp]`;
      serialNumber = body.nationalId!;
    } else {
      // DAB
      commonName = `${body.dabOfficeNameEn}.RA [${body.dabNationalCode}]`;
      serialNumber = body.dabOfficeId!;
    }

    const summary = {
      persona: body.persona,
      commonName,
      serialNumber,
      algorithm: "RSA 2048 + SHA-256",
      keySize: 2048,
      generatedAt: new Date().toISOString(),
    };

    const result: GeneratedFiles = {
      configTxt,
      privateKeyPem,
      publicKeyPem,
      csrPem,
      commands,
      summary,
    };

    return NextResponse.json({
      success: true,
      data: result,
      passwordHint: `رمز پیش‌فرض استفاده‌شده: ${password}`,
    });
  } catch (err) {
    console.error("CSR generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, errors: [`خطا در ساخت گواهی: ${message}`] },
      { status: 500 }
    );
  }
}
