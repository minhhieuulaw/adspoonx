import Link from "next/link";
import { Zap } from "lucide-react";

export default function FooterSection() {
  return (
    <footer
      className="border-t py-10 px-6"
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            adspoon<span className="text-indigo-400">X</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              {item}
            </a>
          ))}
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © 2026 adspoonX. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
