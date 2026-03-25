import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";

export default function FooterSection() {
  return (
    <footer
      className="border-t py-12 px-6"
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Logo + Company info */}
          <div className="flex flex-col gap-3">
            <Link href="/home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-transparent.png" alt="AdSpoonX" className="h-6" style={{ filter: "invert(1)", objectFit: "contain" }} />
            </Link>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              A product by Archy Media LLC
            </p>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <MapPin size={11} className="shrink-0" />
                <span>1942 Broadway St. STE 314C, Boulder, CO 80302, USA</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Phone size={11} className="shrink-0" />
                <a href="tel:+13254429234" className="hover:text-white transition-colors">+1 (325) 442-9234</a>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Mail size={11} className="shrink-0" />
                <a href="mailto:contact@adspoonx.com" className="hover:text-white transition-colors">contact@adspoonx.com</a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              Terms of Service
            </Link>
            <a
              href="mailto:contact@adspoonx.com"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              Contact
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Archy Media LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
