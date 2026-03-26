"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id:       string;
  message:  string;
  color:    string;
  link:     string | null;
  linkText: string | null;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  purple: { bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.4)", text: "#c4b5fd" },
  blue:   { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)", text: "#93c5fd" },
  red:    { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  text: "#fca5a5" },
  green:  { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#6ee7b7" },
  yellow: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#fcd34d" },
};

export default function AnnouncementBanner() {
  const [items,      setItems]      = useState<Announcement[]>([]);
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set());
  const [current,    setCurrent]    = useState(0);

  useEffect(() => {
    fetch("/api/public/announcements")
      .then(r => r.json() as Promise<Announcement[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setItems(data);
      })
      .catch(() => null);
  }, []);

  // Xoay vòng nếu có nhiều hơn 1 banner
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const visible = items.filter(i => !dismissed.has(i.id));

  // Thông báo cho nav biết banner đang hiển thị hay không
  useEffect(() => {
    const h = visible.length > 0 ? "36px" : "0px";
    document.documentElement.style.setProperty("--banner-h", h);
  }, [visible.length]);

  if (visible.length === 0) return null;

  const item  = visible[current % visible.length];
  const theme = COLOR_MAP[item.color] ?? COLOR_MAP.purple;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center px-4 py-2 text-center text-[13px] font-medium gap-3"
      style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
    >
      <span style={{ color: theme.text }}>{item.message}</span>

      {item.link && (
        <Link
          href={item.link}
          className="flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity shrink-0"
          style={{ color: theme.text }}
          target={item.link.startsWith("http") ? "_blank" : undefined}
          rel={item.link.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {item.linkText ?? "Learn more"}
          {item.link.startsWith("http") && <ExternalLink size={11} />}
        </Link>
      )}

      <button
        onClick={() => setDismissed(d => new Set([...d, item.id]))}
        className="ml-auto shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
        style={{ color: theme.text }}
        aria-label="Đóng banner"
      >
        <X size={13} />
      </button>
    </div>
  );
}
