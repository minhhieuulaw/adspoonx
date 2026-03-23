"use client";

import { forwardRef, type InputHTMLAttributes, type ReactElement } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactElement;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className, style, ...rest }, ref) => {
    return (
      <div
        className={clsx(
          "flex items-center gap-2 rounded-[8px] px-3 py-2 transition-colors duration-150",
          className,
        )}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          ...style,
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = "var(--ai)";
          e.currentTarget.style.boxShadow = "0 0 0 2px var(--ai-soft)";
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {icon && (
          <span style={{ color: "var(--text-3)", flexShrink: 0, display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--text-3)]"
          style={{ color: "var(--text-1)" }}
          {...rest}
        />
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
