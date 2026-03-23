"use client";

import { clsx } from "clsx";
import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({
  children,
  className,
  hover = true,
  style,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-[10px] transition-all duration-150",
        hover && "hover:translate-y-[-2px]",
        className,
      )}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        ...(hover
          ? {
              cursor: "pointer",
            }
          : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)";
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }
        rest.onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
