"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";

export default function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale } = useLanguage();

  const [form, setForm]         = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState<"credentials" | "google" | null>(null);
  const [error, setError]       = useState("");

  const callbackUrl = searchParams.get("callbackUrl") ?? "/ads";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("credentials");
    try {
      const result = await signIn("credentials", {
        email:       form.email,
        password:    form.password,
        redirect:    false,
        callbackUrl,
      });
      if (result?.ok) {
        router.push(callbackUrl);
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === "en" ? "vi" as Locale : "en" as Locale)}
        className="absolute top-5 right-5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors hover:bg-white/5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
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
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            adspoon<span className="text-indigo-400">X</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Facebook Ads Intelligence
          </p>
        </div>

        <h2 className="text-lg font-semibold text-center mb-1" style={{ color: "var(--text-primary)" }}>
          Sign in to your account
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
          Discover thousands of running ads
        </p>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm text-red-400 bg-red-500/10 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Email address
            </label>
            <input
              type="email" placeholder="you@example.com" required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} placeholder="Your password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
                style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                style={{ color: "var(--text-muted)" }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white mt-1 disabled:opacity-70"
            style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
          >
            {loading === "credentials" && <Loader2 size={14} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
        </div>

        <button
          onClick={() => { setLoading("google"); void signIn("google", { callbackUrl }); }}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-70"
          style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
        >
          {loading === "google" ? <Loader2 size={15} className="animate-spin" /> : (
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline font-medium">
            Create one free
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
