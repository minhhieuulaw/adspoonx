"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id:       string;
  message:  string;
  color:    string;
  link:     string | null;
  linkText: string | null;
}

const COLOR_MAP: Record<string, {
  bg:     string;
  border: string;
  text:   string;
  dot:    string;
}> = {
  purple: {
    bg:     "linear-gradient(90deg, rgba(124,58,237,0.18) 0%, rgba(167,139,250,0.08) 100%)",
    border: "rgba(124,58,237,0.35)",
    text:   "#C4B5FD",
    dot:    "#A78BFA",
  },
  blue: {
    bg:     "linear-gradient(90deg, rgba(59,130,246,0.18) 0%, rgba(96,165,250,0.08) 100%)",
    border: "rgba(59,130,246,0.35)",
    text:   "#93C5FD",
    dot:    "#60A5FA",
  },
  red: {
    bg:     "linear-gradient(90deg, rgba(239,68,68,0.18) 0%, rgba(252,165,165,0.06) 100%)",
    border: "rgba(239,68,68,0.35)",
    text:   "#FCA5A5",
    dot:    "#F87171",
  },
  green: {
    bg:     "linear-gradient(90deg, rgba(16,185,129,0.18) 0%, rgba(52,211,153,0.06) 100%)",
    border: "rgba(16,185,129,0.35)",
    text:   "#6EE7B7",
    dot:    "#34D399",
  },
  yellow: {
    bg:     "linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(252,211,77,0.06) 100%)",
    border: "rgba(245,158,11,0.35)",
    text:   "#FCD34D",
    dot:    "#FBBF24",
  },
};

export default function AnnouncementBanner() {
  const [items,     setItems]     = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [current,   setCurrent]   = useState(0);

  useEffect(() => {
    fetch("/api/public/announcements")
      .then(r => r.json() as Promise<Announcement[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setItems(data);
      })
      .catch(() => null);
  }, []);

  // Rotate through multiple banners every 6s
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const visible = items.filter(i => !dismissed.has(i.id));

  // Notify nav of banner height
  useEffect(() => {
    document.documentElement.style.setProperty("--banner-h", visible.length > 0 ? "36px" : "0px");
  }, [visible.length]);

  if (visible.length === 0) return null;

  const item  = visible[current % visible.length];
  const theme = COLOR_MAP[item.color] ?? COLOR_MAP.purple;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center px-4"
      style={{
        height: "36px",
        background: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {/* Left sparkle icon */}
      <Sparkles
        size={11}
        className="shrink-0 mr-2 hidden sm:block"
        style={{ color: theme.dot }}
      />

      {/* Message */}
      <span
        className="text-[12px] font-medium truncate"
        style={{ color: theme.text }}
      >
        {item.message}
      </span>

      {/* Optional link */}
      {item.link && (
        <Link
          href={item.link}
          className="flex items-center gap-1 ml-3 text-[12px] font-semibold underline underline-offset-2 shrink-0 hover:opacity-75 transition-opacity"
          style={{ color: theme.text }}
          target={item.link.startsWith("http") ? "_blank" : undefined}
          rel={item.link.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {item.linkText ?? "Learn more"}
          {item.link.startsWith("http") && <ExternalLink size={10} />}
        </Link>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(d => new Set([...d, item.id]))}
        className="absolute right-4 p-1 rounded transition-opacity hover:opacity-60"
        style={{ color: theme.text }}
        aria-label="Dismiss announcement"
      >
        <X size={13} />
      </button>
    </div>
  );
}
