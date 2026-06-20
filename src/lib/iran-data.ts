// Iranian provinces and major cities for the CSR generator form
export const IRAN_PROVINCES: { province: string; cities: string[] }[] = [
  { province: "تهران", cities: ["تهران", "اسلام‌شهر", "شهریار", "ورامین", "پاکدشت", "ری"] },
  { province: "اصفهان", cities: ["اصفهان", "کاشان", "نجف‌آباد", "خمینی‌شهر", "شاهین‌شهر", "فولادشهر"] },
  { province: "فارس", cities: ["شیراز", "مرودشت", "کازرون", "جهرم", "فسا", "لار"] },
  { province: "خراسان رضوی", cities: ["مشهد", "نیشابور", "سبزوار", "تربت حیدریه", "قوچان"] },
  { province: "خراسان شمالی", cities: ["بجنورد", "اسفراین", "شیروان", "آشخانه"] },
  { province: "خراسان جنوبی", cities: ["بیرجند", "قاین", "فردوس", "نهبندان"] },
  { province: "آذربایجان شرقی", cities: ["تبریز", "مراغه", "میانه", "اهر", "مرند"] },
  { province: "آذربایجان غربی", cities: ["ارومیه", "خوی", "ماه‌نشان", "ماکو", "میاندوآب"] },
  { province: "کرمان", cities: ["کرمان", "سیرجان", "رفسنجان", "جیرفت", "بم"] },
  { province: "گیلان", cities: ["رشت", "بندر انزلی", "لاهیجان", "آستارا", "صومعه‌سرا"] },
  { province: "مازندران", cities: ["ساری", "بابل", "آمل", "قائم‌شهر", "نوشهر"] },
  { province: "گلستان", cities: ["گرگان", "گنبد کاووس", "علی‌آباد کتول", "آق‌قلا"] },
  { province: "خوزستان", cities: ["اهواز", "آبادان", "خرمشهر", "دزفول", "ماهشهر"] },
  { province: "کرمانشاه", cities: ["کرمانشاه", "اسلام‌آباد غرب", "هرسین", "صحنه"] },
  { province: "همدان", cities: ["همدان", "ملایر", "نهاوند", "تویسرکان", "اسدآباد"] },
  { province: "کردستان", cities: ["سنندج", "سقز", "مریوان", "بانه", "قروه"] },
  { province: "البرز", cities: ["کرج", "فردیس", "نظرآباد", "اشتهارد", "هشتگرد"] },
  { province: "قم", cities: ["قم", "قنوات", "کهک", "جعفریه"] },
  { province: "مرکزی", cities: ["اراک", "ساوه", "خمین", "محلات", "دلیجان"] },
  { province: "زنجان", cities: ["زنجان", "ابهر", "خرمدره", "قیدار"] },
  { province: "قزوین", cities: ["قزوین", "تاکستان", "آبیک", "بوئین‌زهرا"] },
  { province: "اردبیل", cities: ["اردبیل", "پارس‌آباد", "مشگین‌شهر", "خلخال"] },
  { province: "سیستان و بلوچستان", cities: ["زاهدان", "زابل", "چابهار", "ایرانشهر"] },
  { province: "لرستان", cities: ["خرم‌آباد", "بروجرد", "دورود", "الیگودرز", "آزادگان"] },
  { province: "ایلام", cities: ["ایلام", "دهلران", "آبدانان", "مهران"] },
  { province: "بوشهر", cities: ["بوشهر", "برازجان", "گناوه", "خارک"] },
  { province: "هرمزگان", cities: ["بندرعباس", "میناب", "قشم", "بندر لنگه", "کیش"] },
  { province: "چاهارمحال و بختیاری", cities: ["شهرکرد", "بروجن", "فارسان", "لردگان"] },
  { province: "کهگیلویه و بویراحمد", cities: ["یاسوج", "گچساران", "دهدشت", "سی‌سخت"] },
  { province: "سمنان", cities: ["سمنان", "شاهرود", "دامغان", "گرمسار"] },
];

// Flatten for select options
export const ALL_PROVINCES = IRAN_PROVINCES.map((p) => p.province);

export function getCitiesForProvince(province: string): string[] {
  return IRAN_PROVINCES.find((p) => p.province === province)?.cities ?? [];
}

// Convert English digits to Persian for display
export function toPersianDigits(input: string | number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(input).replace(/[0-9]/g, (d) => persianDigits[parseInt(d, 10)]);
}

// Default password per spec
export const DEFAULT_PASSWORD = "RAYNOP@SSWORD123456";
