import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سامانه ساخت گواهی CSR | سامانه مودیان",
  description:
    "سامانه ساخت گواهی CSR و کلیدهای عمومی و خصوصی برای سامانه مودیان مالیاتی. مناسب اشخاص حقیقی و حقوقی.",
  keywords: [
    "CSR",
    "سامانه مودیان",
    "گواهی الکترونیک",
    "OpenSSL",
    "کلید خصوصی",
    "کلید عمومی",
    "مالیات",
  ],
  authors: [{ name: "GICA" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
