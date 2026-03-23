import { clsx } from "clsx";
import type { ReactNode } from "react";

type Variant = "default" | "success" | "warning" | "error" | "ai";

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: {
    background: "var(--bg-active)",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
  },
  success: {
    background: "rgba(16,185,129,0.12)",
    color: "var(--green)",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  warning: {
    background: "rgba(245,158,11,0.12)",
    color: "var(--amber)",
    border: "1px solid rgba(245,158,11,0.2)",
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    color: "var(--red)",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  ai: {
    background: "var(--ai-soft)",
    color: "var(--ai-light)",
    border: "1px solid rgba(124,58,237,0.2)",
  },
};

export default function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none",
        className,
      )}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
