"use client";

import { useState, useMemo } from "react";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileKey,
  FileText,
  Info,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  Users,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileViewer } from "@/components/csr/file-viewer";
import { ALL_PROVINCES, getCitiesForProvince, DEFAULT_PASSWORD } from "@/lib/iran-data";
import { cn } from "@/lib/utils";

type Persona = "UNA" | "NGO";

interface GenerationResult {
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
    persona: Persona;
    commonName: string;
    serialNumber: string;
    algorithm: string;
    keySize: number;
    generatedAt: string;
  };
}

export default function Home() {
  const { toast } = useToast();
  const [persona, setPersona] = useState<Persona>("NGO");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Common fields
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");

  // UNA fields
  const [firstNameFa, setFirstNameFa] = useState("");
  const [lastNameFa, setLastNameFa] = useState("");
  const [firstNameEn, setFirstNameEn] = useState("");
  const [lastNameEn, setLastNameEn] = useState("");
  const [nationalCode, setNationalCode] = useState("");

  // NGO fields
  const [orgNameFa, setOrgNameFa] = useState("");
  const [orgNameEn, setOrgNameEn] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [orgUnit1, setOrgUnit1] = useState("");
  const [orgUnit2, setOrgUnit2] = useState("");
  const [orgUnit3, setOrgUnit3] = useState("");

  // Password (with default)
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);

  const availableCities = useMemo(
    () => getCitiesForProvince(province),
    [province]
  );

  const handleProvinceChange = (val: string) => {
    setProvince(val);
    setCity(""); // reset city when province changes
  };

  const resetForm = () => {
    setFirstNameFa("");
    setLastNameFa("");
    setFirstNameEn("");
    setLastNameEn("");
    setNationalCode("");
    setOrgNameFa("");
    setOrgNameEn("");
    setNationalId("");
    setOrgUnit1("");
    setOrgUnit2("");
    setOrgUnit3("");
    setProvince("");
    setCity("");
    setEmail("");
    setPassword(DEFAULT_PASSWORD);
    setResult(null);
    setErrors([]);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (persona === "UNA") {
      if (!firstNameFa.trim()) errs.push("نام (فارسی) الزامی است.");
      if (!lastNameFa.trim()) errs.push("نام خانوادگی (فارسی) الزامی است.");
      if (!firstNameEn.trim()) errs.push("نام لاتین الزامی است.");
      if (!lastNameEn.trim()) errs.push("نام خانوادگی لاتین الزامی است.");
      if (!nationalCode.trim()) errs.push("کد ملی الزامی است.");
      else if (!/^\d{10}$/.test(nationalCode.trim()))
        errs.push("کد ملی باید دقیقاً ۱۰ رقم باشد.");
    } else {
      if (!orgNameFa.trim()) errs.push("نام سازمان (فارسی) الزامی است.");
      if (!orgNameEn.trim()) errs.push("نام سازمان لاتین الزامی است.");
      if (!nationalId.trim()) errs.push("شناسه ملی سازمان الزامی است.");
      else if (!/^\d{11}$/.test(nationalId.trim()))
        errs.push("شناسه ملی باید دقیقاً ۱۱ رقم باشد.");
    }
    if (!province.trim()) errs.push("انتخاب استان الزامی است.");
    if (!city.trim()) errs.push("انتخاب شهر الزامی است.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.push("پست الکترونیک معتبر نیست.");
    if (!password.trim()) errs.push("رمز عبور الزامی است.");
    return errs;
  };

  const buildPayload = () => {
    return {
      persona,
      password,
      email: email.trim() || undefined,
      provinceFa: province,
      cityFa: city,
      firstNameFa: firstNameFa.trim() || undefined,
      lastNameFa: lastNameFa.trim() || undefined,
      firstNameEn: firstNameEn.trim() || undefined,
      lastNameEn: lastNameEn.trim() || undefined,
      nationalCode: nationalCode.trim() || undefined,
      orgNameFa: orgNameFa.trim() || undefined,
      orgNameEn: orgNameEn.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
      orgUnit1: orgUnit1.trim() || undefined,
      orgUnit2: orgUnit2.trim() || undefined,
      orgUnit3: orgUnit3.trim() || undefined,
    };
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        variant: "destructive",
        title: "خطا در ورود اطلاعات",
        description: validationErrors[0],
      });
      return;
    }
    setErrors([]);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate-csr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msgs = data.errors ?? ["خطای ناشناخته"];
        setErrors(msgs);
        toast({
          variant: "destructive",
          title: "ساخت گواهی ناموفق بود",
          description: msgs[0],
        });
        return;
      }
      setResult(data.data as GenerationResult);
      toast({
        title: "گواهی با موفقیت ساخته شد",
        description: "فایل‌های تولیدشده آماده دانلود هستند.",
      });
      // Scroll to results
      setTimeout(() => {
        document
          .getElementById("results-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطای شبکه";
      setErrors([msg]);
      toast({
        variant: "destructive",
        title: "خطا در ارتباط با سرور",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = () => {
    if (!result) return;
    const files: { name: string; content: string }[] = [
      { name: "config.txt", content: result.configTxt },
      { name: "mykey.key", content: result.privateKeyPem },
      { name: "mypublickey.pem", content: result.publicKeyPem },
      { name: "mycsr.txt", content: result.csrPem },
    ];
    files.forEach((f, idx) => {
      setTimeout(() => {
        const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, idx * 250);
    });
    toast({
      title: "دانلود همه فایل‌ها",
      description: "۴ فایل به ترتیب دانلود می‌شوند.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base leading-tight">
                سامانه ساخت گواهی CSR
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                مبتنی بر پروفایل گواهی سامانه مودیان
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Award className="size-3" />
              GICA.SW.User.CertProfile v1.0
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b grid-pattern overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14 relative">
          <div className="flex flex-col items-start gap-4 max-w-3xl">
            <Badge className="gap-1.5" variant="secondary">
              <Sparkles className="size-3.5" />
              مطابق راهنمای شرکت فناوری اطلاعات دولت
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight">
              ساخت گواهی CSR و کلیدهای رمزنگاری
              <br className="hidden sm:block" />
              <span className="text-primary"> برای سامانه مودیان</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-7">
              با تکمیل این فرم، فایل‌های <code className="px-1.5 py-0.5 rounded bg-muted text-xs" dir="ltr">config.txt</code>،
              کلید خصوصی، کلید عمومی و درخواست گواهی (CSR) مطابق
              استاندارد GICA به‌صورت خودکار تولید و آماده دانلود می‌شوند.
              نیازی به نصب OpenSSL ندارید؛ فایل‌ها در همین سامانه تولید می‌شوند.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="gap-1">
                <KeyRound className="size-3" />
                RSA 2048
              </Badge>
              <Badge variant="outline" className="gap-1">
                <FileKey className="size-3" />
                SHA-256
              </Badge>
              <Badge variant="outline" className="gap-1">
                <FileText className="size-3" />
                PEM / PKCS#10
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" />
                رمز پیش‌فرض فعال
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-8 sm:py-12 flex-1 w-full">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    ۱
                  </span>
                  انتخاب نوع شخص
                </CardTitle>
                <CardDescription>
                  گواهی الکترونیک را بر اساس نوع شخص انتخاب کنید. این انتخاب
                  تعیین‌کننده فیلدهای فرم است.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={persona}
                  onValueChange={(v) => {
                    setPersona(v as Persona);
                    setErrors([]);
                  }}
                  className="grid sm:grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="persona-una"
                    className={cn(
                      "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all hover:bg-accent/40",
                      persona === "UNA"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <RadioGroupItem value="UNA" id="persona-una" className="mt-1" />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        <span className="font-semibold">شخص حقیقی</span>
                        <Badge variant="outline" className="text-[10px] font-mono">UNA</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground leading-5">
                        شخص مستقل حقیقی (Unaffiliated) — مناسب افراد برای ارتباط با سامانه مودیان.
                      </span>
                    </div>
                  </Label>

                  <Label
                    htmlFor="persona-ngo"
                    className={cn(
                      "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all hover:bg-accent/40",
                      persona === "NGO"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <RadioGroupItem value="NGO" id="persona-ngo" className="mt-1" />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        <span className="font-semibold">شخص حقوقی</span>
                        <Badge variant="outline" className="text-[10px] font-mono">NGO</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground leading-5">
                        شخص حقوقی غیردولتی (Non-Governmental) — مناسب شرکت‌ها و سازمان‌ها.
                      </span>
                    </div>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Dynamic form fields */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    ۲
                  </span>
                  {persona === "UNA" ? "اطلاعات شخص حقیقی" : "اطلاعات شخص حقوقی"}
                </CardTitle>
                <CardDescription>
                  {persona === "UNA"
                    ? "اطلاعات هویتی فردی مطابق کارت ملی وارد شود."
                    : "اطلاعات سازمانی مطابق روزنامه رسمی وارد شود."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {persona === "UNA" ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FieldGroup
                        label="نام (فارسی)"
                        required
                        hint="Given Name — G"
                        htmlFor="firstNameFa"
                      >
                        <Input
                          id="firstNameFa"
                          value={firstNameFa}
                          onChange={(e) => setFirstNameFa(e.target.value)}
                          placeholder="مثال: محمد"
                          className="bg-background"
                        />
                      </FieldGroup>
                      <FieldGroup
                        label="نام خانوادگی (فارسی)"
                        required
                        hint="Surname — SN"
                        htmlFor="lastNameFa"
                      >
                        <Input
                          id="lastNameFa"
                          value={lastNameFa}
                          onChange={(e) => setLastNameFa(e.target.value)}
                          placeholder="مثال: رضایی"
                          className="bg-background"
                        />
                      </FieldGroup>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FieldGroup
                        label="First Name (English)"
                        required
                        hint="Used in CN field"
                        htmlFor="firstNameEn"
                      >
                        <Input
                          id="firstNameEn"
                          value={firstNameEn}
                          onChange={(e) => setFirstNameEn(e.target.value)}
                          placeholder="e.g. Mohammad"
                          dir="ltr"
                          className="bg-background text-left"
                        />
                      </FieldGroup>
                      <FieldGroup
                        label="Last Name (English)"
                        required
                        hint="Used in CN field"
                        htmlFor="lastNameEn"
                      >
                        <Input
                          id="lastNameEn"
                          value={lastNameEn}
                          onChange={(e) => setLastNameEn(e.target.value)}
                          placeholder="e.g. Rezaei"
                          dir="ltr"
                          className="bg-background text-left"
                        />
                      </FieldGroup>
                    </div>
                    <FieldGroup
                      label="کد ملی"
                      required
                      hint="10-digit National Code — SERIALNUMBER"
                      htmlFor="nationalCode"
                    >
                      <Input
                        id="nationalCode"
                        value={nationalCode}
                        onChange={(e) =>
                          setNationalCode(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        placeholder="مثال: 1234567890"
                        dir="ltr"
                        inputMode="numeric"
                        className="bg-background text-left tracking-widest"
                      />
                    </FieldGroup>
                  </>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FieldGroup
                        label="نام سازمان (فارسی)"
                        required
                        hint="Organizational Unit — OU"
                        htmlFor="orgNameFa"
                      >
                        <Input
                          id="orgNameFa"
                          value={orgNameFa}
                          onChange={(e) => setOrgNameFa(e.target.value)}
                          placeholder="مثال: شرکت توسعه تجارت الکترونیک"
                          className="bg-background"
                        />
                      </FieldGroup>
                      <FieldGroup
                        label="Organization Name (English)"
                        required
                        hint="Used in CN field"
                        htmlFor="orgNameEn"
                      >
                        <Input
                          id="orgNameEn"
                          value={orgNameEn}
                          onChange={(e) => setOrgNameEn(e.target.value)}
                          placeholder="e.g. Ecommerce Development Co."
                          dir="ltr"
                          className="bg-background text-left"
                        />
                      </FieldGroup>
                    </div>
                    <FieldGroup
                      label="شناسه ملی سازمان"
                      required
                      hint="11-digit National ID — SERIALNUMBER"
                      htmlFor="nationalId"
                    >
                      <Input
                        id="nationalId"
                        value={nationalId}
                        onChange={(e) =>
                          setNationalId(e.target.value.replace(/\D/g, "").slice(0, 11))
                        }
                        placeholder="مثال: 14000405500"
                        dir="ltr"
                        inputMode="numeric"
                        className="bg-background text-left tracking-widest"
                      />
                    </FieldGroup>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          واحدهای سازمانی (اختیاری)
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          1.OU / 2.OU / 3.OU
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        در صورت وجود چند واحد سازمانی، هر سه فیلد را پر کنید.
                      </p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <Input
                          value={orgUnit1}
                          onChange={(e) => setOrgUnit1(e.target.value)}
                          placeholder="واحد سازمانی ۱"
                          className="bg-background"
                        />
                        <Input
                          value={orgUnit2}
                          onChange={(e) => setOrgUnit2(e.target.value)}
                          placeholder="واحد سازمانی ۲"
                          className="bg-background"
                        />
                        <Input
                          value={orgUnit3}
                          onChange={(e) => setOrgUnit3(e.target.value)}
                          placeholder="واحد سازمانی ۳"
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Common location fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup
                    label="استان"
                    required
                    hint="State — S"
                    htmlFor="province"
                  >
                    <Select value={province} onValueChange={handleProvinceChange}>
                      <SelectTrigger id="province" className="bg-background w-full">
                        <SelectValue placeholder="انتخاب استان" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {ALL_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                  <FieldGroup
                    label="شهر"
                    required
                    hint="Locality — L"
                    htmlFor="city"
                  >
                    <Select value={city} onValueChange={setCity} disabled={!province}>
                      <SelectTrigger id="city" className="bg-background w-full">
                        <SelectValue
                          placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {availableCities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>

                <FieldGroup
                  label="پست الکترونیک"
                  hint="اختیاری — Email Address (E)"
                  htmlFor="email"
                >
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@example.com"
                    dir="ltr"
                    className="bg-background text-left"
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Password section */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    ۳
                  </span>
                  رمز عبور کلید خصوصی
                </CardTitle>
                <CardDescription>
                  این رمز برای محافظت از کلید خصوصی (PEM pass phrase) استفاده می‌شود.
                  رمز پیش‌فرض طبق درخواست تنظیم شده است.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup
                  label="رمز عبور"
                  required
                  hint="PEM pass phrase"
                  htmlFor="password"
                >
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      dir="ltr"
                      className="bg-background text-left pl-20 pr-3 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 left-2 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    >
                      {showPassword ? "پنهان" : "نمایش"}
                    </button>
                  </div>
                </FieldGroup>
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>تذکر امنیتی</AlertTitle>
                  <AlertDescription className="text-xs leading-6">
                    کلید خصوصی (<code dir="ltr">mykey.key</code>) باید محرمانه بماند و
                    تحت هیچ شرایطی با کسی به اشتراک گذاشته نشود. رمز عبور را در جای
                    امن نگه‌داری کنید.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Validation errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>لطفاً خطاهای زیر را برطرف کنید:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pr-5 mt-1 space-y-1 text-xs">
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-12 text-base gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    در حال ساخت گواهی...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    ساخت گواهی و تولید فایل‌ها
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
                className="h-12 gap-2"
              >
                پاک کردن فرم
              </Button>
            </div>
          </div>

          {/* Right Sidebar: Step Guide & Info */}
          <aside className="lg:col-span-2 space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="size-4 text-primary" />
                  درباره گواهی الکترونیک
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  گواهی الکترونیک برای احراز هویت در سامانه‌های مالیاتی، به ویژه
                  سامانه مودیان، ضروری است. درخواست گواهی (CSR) حاوی کلید عمومی و
                  اطلاعات هویتی شماست.
                </p>
                <p>
                  پس از صدور گواهی توسط مرکز صدور، فایل <code dir="ltr" className="px-1 bg-muted rounded">certificate.crt</code> را
                  دریافت کرده و با کلید خصوصی، فایل <code dir="ltr" className="px-1 bg-muted rounded">keystore.pfx</code> می‌سازید.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="size-4 text-primary" />
                  راهنمای مراحل (OpenSSL)
                </CardTitle>
                <CardDescription className="text-xs">
                  در صورت تمایل به اجرای دستی، مراحل زیر را دنبال کنید.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="step-1">
                  <AccordionItem value="step-1">
                    <AccordionTrigger className="text-sm py-3">
                      ۱. نصب OpenSSL
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-6 space-y-2 text-muted-foreground">
                      <p>برنامه OpenSSL را از نشانی <code dir="ltr" className="px-1 bg-muted rounded">www.gica.ir</code> دانلود کنید.</p>
                      <p>فایل‌ها را در مسیر <code dir="ltr" className="px-1 bg-muted rounded">C:\openssl</code> استخراج کنید.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step-2">
                    <AccordionTrigger className="text-sm py-3">
                      ۲. ساخت فایل config.txt
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-6 space-y-2 text-muted-foreground">
                      <p>یک فایل متنی UTF-8 به نام <code dir="ltr" className="px-1 bg-muted rounded">config.txt</code> در مسیر OpenSSL ایجاد کنید.</p>
                      <p>محتوای فایل توسط این سامانه به‌صورت خودکار تولید می‌شود — کافی است آن را دانلود و در مسیر موردنظر قرار دهید.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step-3">
                    <AccordionTrigger className="text-sm py-3">
                      ۳. ساخت CSR و کلید خصوصی
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-6 space-y-2 text-muted-foreground">
                      <p>در محیط CMD دستور زیر را اجرا کنید:</p>
                      <pre dir="ltr" className="code-block bg-muted/60 rounded p-2 text-[11px] overflow-x-auto">
{`cd /d "C:\\Openssl\\bin"
openssl req -new -utf8 -config "C:\\openssl\\config.txt" -newkey rsa:2048 -keyout mykey.key -out mycsr.txt`}
                      </pre>
                      <p>رمز عبور را دو بار وارد کنید (PEM pass phrase).</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step-4">
                    <AccordionTrigger className="text-sm py-3">
                      ۴. استخراج کلید عمومی
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-6 space-y-2 text-muted-foreground">
                      <p>برای استخراج کلید عمومی از کلید خصوصی:</p>
                      <pre dir="ltr" className="code-block bg-muted/60 rounded p-2 text-[11px] overflow-x-auto">
{`openssl rsa -in mykey.key -pubout -out mypublickey.txt`}
                      </pre>
                      <p>رمز کلید خصوصی را وارد کنید تا کلید عمومی تولید شود.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step-5">
                    <AccordionTrigger className="text-sm py-3">
                      ۵. ساخت فایل PFX
                    </AccordionTrigger>
                    <AccordionContent className="text-xs leading-6 space-y-2 text-muted-foreground">
                      <p>پس از دریافت گواهی از مرکز صدور:</p>
                      <pre dir="ltr" className="code-block bg-muted/60 rounded p-2 text-[11px] overflow-x-auto">
{`openssl pkcs12 -export -inkey mykey.key -in certificate.crt -out keystore.pfx`}
                      </pre>
                      <p>رمز Export را وارد کنید. این فایل برای راه‌اندازی در سامانه مودیان استفاده می‌شود.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Alert className="border-amber-300 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20">
              <Lock className="size-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-200">
                توصیه امنیتی
              </AlertTitle>
              <AlertDescription className="text-xs leading-6 text-amber-900/80 dark:text-amber-200/80">
                فایل <code dir="ltr" className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">mykey.key</code> شامل
                کلید خصوصی شماست. هرگز آن را از طریق ایمیل یا پیام‌رسان ارسال نکنید.
                این فایل فقط باید روی سرور یا سیستم امن شما قرار گیرد.
              </AlertDescription>
            </Alert>
          </aside>
        </div>

        {/* Results Section */}
        {result && (
          <section id="results-section" className="mt-10 scroll-mt-20">
            <Separator className="mb-8" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 grid place-items-center">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">گواهی با موفقیت ساخته شد</h2>
                  <p className="text-sm text-muted-foreground">
                    فایل‌های زیر آماده دانلود و استفاده هستند.
                  </p>
                </div>
              </div>
              <Button onClick={downloadAll} className="gap-2 shadow-sm">
                <Download className="size-4" />
                دانلود همه فایل‌ها
              </Button>
            </div>

            {/* Summary card */}
            <Card className="mb-6 bg-primary/5 border-primary/30">
              <CardContent className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <SummaryItem
                    label="نوع شخص"
                    value={result.summary.persona === "UNA" ? "حقیقی (UNA)" : "حقوقی (NGO)"}
                  />
                  <SummaryItem label="نام مشترک" value={result.summary.commonName} mono />
                  <SummaryItem label="شناسه / کد ملی" value={result.summary.serialNumber} mono />
                  <SummaryItem label="الگوریتم" value={result.summary.algorithm} mono />
                </div>
              </CardContent>
            </Card>

            {/* File viewers */}
            <div className="grid md:grid-cols-2 gap-4">
              <FileViewer
                fileName="config.txt"
                label="فایل پیکربندی OpenSSL"
                description="محتوای فایل config.txt — در مسیر C:\\openssl ذخیره کنید"
                content={result.configTxt}
              />
              <FileViewer
                fileName="mycsr.txt"
                label="درخواست گواهی (CSR)"
                description="این فایل را به مرکز صدور گواهی ارسال کنید"
                content={result.csrPem}
                variant="warning"
              />
              <FileViewer
                fileName="mykey.key"
                label="کلید خصوصی (محرم)"
                description="این فایل را امن نگه‌دارید و هرگز به اشتراک نگذارید"
                content={result.privateKeyPem}
              />
              <FileViewer
                fileName="mypublickey.pem"
                label="کلید عمومی"
                description="استخراج‌شده از کلید خصوصی"
                content={result.publicKeyPem}
              />
            </div>

            {/* Commands reference */}
            <Card className="mt-6 border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="size-4 text-primary" />
                  مرجع دستورات OpenSSL
                </CardTitle>
                <CardDescription className="text-xs">
                  این دستورات معادل مسیر دستی تولید گواهی در راهنمای GICA هستند.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CommandBlock
                  step="۱"
                  title="ساخت CSR و کلید خصوصی"
                  command={result.commands.generateCsr}
                />
                <CommandBlock
                  step="۲"
                  title="استخراج کلید عمومی"
                  command={result.commands.extractPublicKey}
                />
                <CommandBlock
                  step="۳"
                  title="ساخت فایل PFX (پس از دریافت گواهی)"
                  command={result.commands.generatePfx}
                />
              </CardContent>
            </Card>

            {/* Next steps */}
            <Alert className="mt-6">
              <ChevronLeft className="size-4" />
              <AlertTitle>گام بعدی</AlertTitle>
              <AlertDescription className="text-xs leading-6">
                فایل <code dir="ltr" className="px-1 bg-muted rounded">mycsr.txt</code> را به
                مرکز صدور گواهی (GICA) ارسال کنید. پس از دریافت
                فایل <code dir="ltr" className="px-1 bg-muted rounded">certificate.crt</code>،
                با اجرای دستور سوم، فایل <code dir="ltr" className="px-1 bg-muted rounded">keystore.pfx</code> را
                بسازید و در سامانه مودیان بارگذاری کنید.
              </AlertDescription>
            </Alert>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>
                مطابق پروفایل گواهی سامانه مودیان — نسخه ۱.۰ (۱۴۰۴/۰۷/۲۵)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono">GICA.SW.User.CertProfilev1.0</span>
              <span className="text-border">|</span>
              <span>شرکت فناوری اطلاعات دولت</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ----------------- Helper Components ----------------- */

function FieldGroup({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm flex items-center gap-2">
        <span>
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
            {hint}
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground block">{label}</span>
      <span
        className={cn(
          "text-sm font-medium block truncate",
          mono && "font-mono text-xs"
        )}
        dir={mono ? "ltr" : "rtl"}
      >
        {value}
      </span>
    </div>
  );
}

function CommandBlock({
  step,
  title,
  command,
}: {
  step: string;
  title: string;
  command: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <span className="size-5 rounded bg-primary/10 text-primary text-[11px] grid place-items-center font-bold">
            {step}
          </span>
          <span className="text-xs font-medium">{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 text-[11px]">
          {copied ? (
            <>
              <Check className="size-3 text-emerald-600" />
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
      <pre dir="ltr" className="code-block p-3 text-[11px] leading-relaxed overflow-x-auto bg-card">
        <code>{command}</code>
      </pre>
    </div>
  );
}
