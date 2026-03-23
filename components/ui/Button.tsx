"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-[11px] px-2.5 py-1 gap-1",
  md: "text-[13px] px-3.5 py-2 gap-1.5",
  lg: "text-[14px] px-5 py-2.5 gap-2",
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--ai), var(--ai-hover))",
    color: "#fff",
    border: "1px solid var(--ai)",
    boxShadow: "0 1px 12px rgba(124,58,237,0.25)",
  },
  secondary: {
    background: "var(--bg-hover)",
    color: "var(--text-1)",
    border: "1px solid var(--border-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-2)",
    border: "1px solid transparent",
  },
  danger: {
    background: "rgba(239,68,68,0.12)",
    color: "var(--red)",
    border: "1px solid rgba(239,68,68,0.2)",
  },
};

const hoverStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--ai-hover), var(--ai-light))",
    boxShadow: "0 2px 20px rgba(124,58,237,0.35)",
  },
  secondary: {
    background: "var(--bg-active)",
    borderColor: "var(--border-strong)",
  },
  ghost: {
    background: "var(--bg-hover)",
    color: "var(--text-1)",
  },
  danger: {
    background: "rgba(239,68,68,0.18)",
  },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      children,
      className,
      onMouseEnter,
      onMouseLeave,
      style,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          "inline-flex items-center justify-center font-medium rounded-[8px] transition-all duration-150 select-none",
          sizeClasses[size],
          isDisabled && "opacity-45 pointer-events-none",
          className,
        )}
        style={{ ...variantStyles[variant], ...style }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            Object.assign(e.currentTarget.style, hoverStyles[variant]);
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
            Object.assign(e.currentTarget.style, variantStyles[variant]);
            if (style) Object.assign(e.currentTarget.style, style);
          }
          onMouseLeave?.(e);
        }}
        {...rest}
      >
        {loading ? (
          <Loader2
            size={size === "sm" ? 12 : size === "md" ? 14 : 16}
            className="animate-spin"
          />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
