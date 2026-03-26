import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "adspoonX — Facebook Ads Intelligence",
  description: "Khám phá và phân tích quảng cáo Facebook đang hoạt động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full`}>
      <body className="h-full antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <SessionProvider>
            <ErrorBoundary>
              <ToastProvider>{children}</ToastProvider>
            </ErrorBoundary>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
