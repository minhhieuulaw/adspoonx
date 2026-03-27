"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";

const FOOTER_LINKS = [
  { label: "Features",        href: "#features" },
  { label: "Pricing",         href: "#pricing" },
  { label: "FAQ",             href: "#faq" },
  { label: "Privacy Policy",  href: "/privacy" },
  { label: "Terms of Service",href: "/terms" },
] as const;

export default function FooterSection() {
  return (
    <footer className="relative pt-16 pb-10 px-6 overflow-hidden">
      {/* Top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--border) 20%, rgba(124,58,237,0.3) 50%, var(--border) 80%, transparent 100%)",
        }}
      />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">

          {/* Brand column */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link href="/home" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-transparent.png"
                alt="AdSpoonX"
                className="h-6"
                style={{ filter: "invert(1)", objectFit: "contain" }}
              />
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              The fastest way to discover winning Facebook ads. Built for media buyers, agencies, and e-commerce brands.
            </p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              A product by Archy Media LLC
            </p>

            {/* Contact info */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                <MapPin size={11} className="shrink-0 mt-0.5" />
                <span>1942 Broadway St. STE 314C, Boulder, CO 80302, USA</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                <Phone size={11} className="shrink-0" />
                <a
                  href="tel:+13254429234"
                  className="transition-colors hover:text-white"
                >
                  +1 (325) 442-9234
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                <Mail size={11} className="shrink-0" />
                <a
                  href="mailto:contact@adspoonx.com"
                  className="transition-colors hover:text-white"
                >
                  contact@adspoonx.com
                </a>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--text-3)" }}
            >
              Navigation
            </span>
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-1 text-sm transition-colors hover:text-white group"
                style={{ color: "var(--text-2)" }}
              >
                {label}
                {href.startsWith("http") && (
                  <ArrowUpRight
                    size={11}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* CTA box */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3 max-w-xs w-full md:w-auto"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Start spying for free
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              No credit card required. Access 10M+ ads immediately.
            </p>
            <Link
              href="/login"
              className="text-center text-sm font-semibold py-2 px-4 rounded-lg text-white transition-all duration-200 hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
                boxShadow: "0 0 16px var(--ai-glow)",
              }}
            >
              Get Started Free →
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            © {new Date().getFullYear()} Archy Media LLC. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Powered by Facebook Ads Library API
          </p>
        </div>
      </div>
    </footer>
  );
}
