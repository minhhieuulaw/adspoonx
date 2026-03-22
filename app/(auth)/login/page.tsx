"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";

export default function LoginPage() {
  const { t, locale, setLocale } = useLanguage();

  function toggleLocale() {
    const next: Locale = locale === "en" ? "vi" : "en";
    setLocale(next);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Language toggle top-right */}
      <button
        onClick={toggleLocale}
        className="absolute top-5 right-5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors hover:bg-white/5"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          color: "var(--text-secondary)",
        }}
      >
        <span className={locale === "en" ? "text-indigo-400" : "opacity-40"}>EN</span>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span className={locale === "vi" ? "text-indigo-400" : "opacity-40"}>VI</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            adspoon<span className="text-indigo-400">X</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t.login.tagline}
          </p>
        </div>

        <h2 className="text-lg font-semibold text-center mb-1" style={{ color: "var(--text-primary)" }}>
          {t.login.title}
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
          {t.login.subtitle}
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/ads" })}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-primary)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t.login.continueWithGoogle}
        </button>

        <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
          {t.login.termsPrefix}{" "}
          <span className="text-indigo-400 cursor-pointer hover:underline">
            {t.login.termsLink}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
