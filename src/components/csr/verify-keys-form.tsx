"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Eraser,
  FileKey,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

interface VerifyResponse {
  success: boolean;
  checks: CheckResult[];
  csrInfo?: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string[];
    country?: string;
    state?: string;
    locality?: string;
    emailAddress?: string;
    serialNumber?: string;
    signatureAlgorithm?: string;
  };
  keyInfo?: {
    algorithm: string;
    keySize: number;
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

const PLACEHOLDERS = {
  csr: `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCSVIx...
-----END CERTIFICATE REQUEST-----`,
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgw...
-----END PRIVATE KEY-----`,
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB...
-----END PUBLIC KEY-----`,
};

export function VerifyKeysForm() {
  const { toast } = useToast();
  const [csr, setCsr] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const handlePaste = async (
    setter: (v: string) => void,
    field: "CSR" | "کلید خصوصی" | "کلید عمومی"
  ) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text.trim());
        toast({ title: "جای‌گذاری شد", description: `${field} از کلیپ‌بورد جای‌گذاری شد.` });
      } else {
        toast({
          variant: "destructive",
          title: "کلیپ‌بورد خالی است",
          description: "متن معتبری در کلیپ‌بورد یافت نشد.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "دسترسی به کلیپ‌بورد ممکن نیست",
        description: "لطفاً به‌صورت دستی متن را در کادر جای‌گذاری کنید.",
      });
    }
  };

  const handleClear = () => {
    setCsr("");
    setPrivateKey("");
    setPublicKey("");
    setResult(null);
  };

  const handleVerify = async () => {
    if (!csr.trim() && !privateKey.trim() && !publicKey.trim()) {
      toast({
        variant: "destructive",
        title: "ورودی خالی",
        description: "حداقل یکی از سه کادر را پر کنید.",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csr, privateKey, publicKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          variant: "destructive",
          title: "خطا در اعتبارسنجی",
          description: data.error ?? "خطای ناشناخته",
        });
        return;
      }
      setResult(data as VerifyResponse);
      if (data.summary.allMatch) {
        toast({
          title: "همه کلیدها منطبق هستند",
          description: `${data.summary.passedChecks} از ${data.summary.totalChecks} بررسی موفق بود.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "تطابق کامل نیست",
          description: `${data.summary.passedChecks} از ${data.summary.totalChecks} بررسی موفق بود.`,
        });
      }
      setTimeout(() => {
        document
          .getElementById("verify-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطای شبکه";
      toast({
        variant: "destructive",
        title: "خطا در ارتباط با سرور",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertTitle>بررسی صحت کلیدها و CSR</AlertTitle>
        <AlertDescription className="text-xs leading-6">
          با جای‌گذاری محتوای CSR، کلید خصوصی و کلید عمومی، سیستم به‌صورت خودکار
          اعتبارسنجی می‌کند که این سه با هم منطبق هستند. این بررسی شامل تجزیه PEM،
          اعتبارسنجی امضای CSR، و مقایسه اثر انگشت (SHA-256) کلیدهاست.
        </AlertDescription>
      </Alert>

      {/* Three input cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        <KeyInputCard
          title="CSR"
          subtitle="Certificate Signing Request"
          icon={<FileKey className="size-4" />}
          value={csr}
          onChange={setCsr}
          onPaste={() => handlePaste(setCsr, "CSR")}
          placeholder={PLACEHOLDERS.csr}
        />
        <KeyInputCard
          title="کلید خصوصی"
          subtitle="Private Key (PEM)"
          icon={<KeyRound className="size-4" />}
          value={privateKey}
          onChange={setPrivateKey}
          onPaste={() => handlePaste(setPrivateKey, "کلید خصوصی")}
          placeholder={PLACEHOLDERS.privateKey}
          sensitive
        />
        <KeyInputCard
          title="کلید عمومی"
          subtitle="Public Key (PEM)"
          icon={<ShieldCheck className="size-4" />}
          value={publicKey}
          onChange={setPublicKey}
          onPaste={() => handlePaste(setPublicKey, "کلید عمومی")}
          placeholder={PLACEHOLDERS.publicKey}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          onClick={handleVerify}
          disabled={loading}
          className="flex-1 h-12 text-base gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              در حال اعتبارسنجی...
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              بررسی صحت کلیدها
            </>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleClear}
          disabled={loading}
          className="h-12 gap-2"
        >
          <Eraser className="size-4" />
          پاک کردن همه
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div id="verify-results" className="scroll-mt-20 space-y-5">
          <Separator />

          {/* Overall status */}
          <Card
            className={cn(
              "border-2",
              result.summary.allMatch
                ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
            )}
          >
            <CardContent className="py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div
                  className={cn(
                    "size-14 rounded-2xl grid place-items-center shrink-0",
                    result.summary.allMatch
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {result.summary.allMatch ? (
                    <ShieldCheck className="size-7" />
                  ) : (
                    <ShieldAlert className="size-7" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">
                    {result.summary.allMatch
                      ? "کلیدها کاملاً منطبق و معتبر هستند"
                      : "تطابق کامل نیست — لطفاً بررسی کنید"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {result.summary.passedChecks} از{" "}
                    {result.summary.totalChecks} بررسی با موفقیت انجام شد.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing
                    value={result.summary.passedChecks}
                    max={result.summary.totalChecks}
                    success={result.summary.allMatch}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed checks */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="size-4 text-primary" />
                جزئیات بررسی‌ها
              </CardTitle>
              <CardDescription className="text-xs">
                نتایج هر مرحله از اعتبارسنجی به‌صورت تفکیک‌شده.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.checks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </CardContent>
          </Card>

          {/* Extracted info */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.csrInfo && (
              <InfoCard
                title="اطلاعات استخراج‌شده از CSR"
                icon={<FileKey className="size-4 text-primary" />}
                rows={[
                  { label: "نام مشترک (CN)", value: result.csrInfo.commonName, mono: true },
                  { label: "سازمان (O)", value: result.csrInfo.organization, mono: true },
                  {
                    label: "واحد سازمانی (OU)",
                    value: result.csrInfo.organizationalUnit?.join(" / "),
                  },
                  { label: "کشور (C)", value: result.csrInfo.country },
                  { label: "استان (S)", value: result.csrInfo.state },
                  { label: "شهر (L)", value: result.csrInfo.locality },
                  {
                    label: "پست الکترونیک (E)",
                    value: result.csrInfo.emailAddress,
                    mono: true,
                  },
                  {
                    label: "شناسه/کد ملی",
                    value: result.csrInfo.serialNumber,
                    mono: true,
                  },
                  {
                    label: "الگوریتم امضا",
                    value: result.csrInfo.signatureAlgorithm,
                    mono: true,
                  },
                ]}
              />
            )}
            {(result.keyInfo || result.privateKeyInfo || result.csrPublicKeyInfo) && (
              <InfoCard
                title="اطلاعات کلیدها"
                icon={<KeyRound className="size-4 text-primary" />}
                rows={[
                  result.csrPublicKeyInfo && {
                    label: "الگوریتم کلید CSR",
                    value: `${result.csrPublicKeyInfo.algorithm} ${result.csrPublicKeyInfo.keySize}`,
                    mono: true,
                  },
                  result.privateKeyInfo && {
                    label: "الگوریتم کلید خصوصی",
                    value: `${result.privateKeyInfo.algorithm} ${result.privateKeyInfo.keySize}`,
                    mono: true,
                  },
                  result.keyInfo && {
                    label: "الگوریتم کلید عمومی",
                    value: `${result.keyInfo.algorithm} ${result.keyInfo.keySize}`,
                    mono: true,
                  },
                ].filter(Boolean) as { label: string; value?: string; mono?: boolean }[]}
                fingerprints={[
                  result.csrPublicKeyInfo && {
                    label: "اثر انگشت CSR",
                    value: result.csrPublicKeyInfo.publicKeyFingerprint,
                  },
                  result.privateKeyInfo && {
                    label: "اثر انگشت کلید خصوصی",
                    value: result.privateKeyInfo.publicKeyFingerprint,
                  },
                  result.keyInfo && {
                    label: "اثر انگشت کلید عمومی",
                    value: result.keyInfo.publicKeyFingerprint,
                  },
                ].filter(Boolean) as { label: string; value: string }[]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Helper Components ----------------- */

function KeyInputCard({
  title,
  subtitle,
  icon,
  value,
  onChange,
  onPaste,
  placeholder,
  sensitive,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  onPaste: () => void;
  placeholder: string;
  sensitive?: boolean;
}) {
  const charCount = value.length;
  return (
    <Card className="border-border/60 shadow-sm flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm leading-tight">{title}</CardTitle>
              <p className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPaste}
            className="h-7 gap-1 text-[11px] shrink-0"
            title="جای‌گذاری از کلیپ‌بورد"
          >
            <ClipboardPaste className="size-3.5" />
            جای‌گذاری
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="relative flex-1">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            dir="ltr"
            spellCheck={false}
            className={cn(
              "min-h-[180px] lg:min-h-[240px] resize-y code-block bg-background text-[11px] leading-relaxed scrollbar-thin",
              sensitive && value && "blur-sm focus:blur-none hover:blur-none"
            )}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{charCount > 0 ? `${charCount} کاراکتر` : "خالی"}</span>
          {sensitive && (
            <Badge variant="outline" className="text-[9px] gap-1 py-0 h-4">
              <KeyRound className="size-2.5" />
              محرمانه
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const Icon =
    check.status === "pass"
      ? CheckCircle2
      : check.status === "fail"
      ? XCircle
      : AlertCircle;
  const color =
    check.status === "pass"
      ? "text-emerald-600 dark:text-emerald-400"
      : check.status === "fail"
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Icon className={cn("size-4 mt-0.5 shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{check.label}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] py-0 h-4",
              check.status === "pass" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
              check.status === "fail" && "border-destructive/40 text-destructive",
              check.status === "skip" && "text-muted-foreground"
            )}
          >
            {check.status === "pass" ? "موفق" : check.status === "fail" ? "ناموفق" : "نادیده"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-5">{check.detail}</p>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  rows,
  fingerprints = [],
}: {
  title: string;
  icon: React.ReactNode;
  rows: { label: string; value?: string; mono?: boolean }[];
  fingerprints?: { label: string; value: string }[];
}) {
  const nonEmpty = rows.filter((r) => r.value);
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nonEmpty.length === 0 ? (
          <p className="text-xs text-muted-foreground">اطلاعاتی استخراج نشد.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-2">
            {nonEmpty.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-xs py-1.5 border-b last:border-0"
              >
                <dt className="text-muted-foreground shrink-0">{r.label}</dt>
                <dd
                  dir={r.mono ? "ltr" : "rtl"}
                  className={cn(
                    "font-medium text-left truncate max-w-[60%]",
                    r.mono && "font-mono text-[11px]"
                  )}
                  title={r.value}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {fingerprints.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                اثر انگشت کلیدها (SHA-256)
              </span>
              {fingerprints.map((f, i) => (
                <FingerprintRow key={i} label={f.label} value={f.value} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FingerprintRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  // Pretty-format the hex: groups of 2 chars separated by ":"
  const pretty =
    value.match(/.{1,2}/g)?.join(":").match(/.{1,39}/g)?.join("\n") ?? value;
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-5 gap-1 text-[10px] px-1.5"
        >
          {copied ? (
            <>
              <CheckCircle2 className="size-3 text-emerald-600" />
              کپی شد
            </>
          ) : (
            <>
              <Copy className="size-3" />
              کپی
            </>
          )}
        </Button>
      </div>
      <pre
        dir="ltr"
        className="code-block text-[10px] leading-tight text-foreground/80 overflow-x-auto scrollbar-thin"
      >
        <code>{pretty}</code>
      </pre>
    </div>
  );
}

function ProgressRing({
  value,
  max,
  success,
}: {
  value: number;
  max: number;
  success: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative size-14 shrink-0">
      <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="stroke-muted"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className={cn(
            "transition-all duration-500",
            success ? "stroke-emerald-500" : "stroke-amber-500"
          )}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xs font-bold">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}
