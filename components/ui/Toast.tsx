"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastFn {
  (opts: { type: ToastType; message: string }): void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastFn;
}

// ── Styling ──────────────────────────────────────────────────────────────────

const typeConfig: Record<
  ToastType,
  { color: string; bg: string; border: string; Icon: typeof CheckCircle }
> = {
  success: {
    color: "var(--green)",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.18)",
    Icon: CheckCircle,
  },
  error: {
    color: "var(--red)",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.18)",
    Icon: XCircle,
  },
  warning: {
    color: "var(--amber)",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.18)",
    Icon: AlertTriangle,
  },
  info: {
    color: "var(--ai-light)",
    bg: "var(--ai-soft)",
    border: "rgba(124,58,237,0.18)",
    Icon: Info,
  },
};

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const AUTO_DISMISS = 4000;

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message }]);
      setTimeout(() => removeToast(id), AUTO_DISMISS);
    },
    [removeToast],
  );

  const toast = useCallback(
    (opts: { type: ToastType; message: string }) => addToast(opts.type, opts.message),
    [addToast],
  ) as ToastFn;

  toast.success = (msg: string) => addToast("success", msg);
  toast.error = (msg: string) => addToast("error", msg);
  toast.warning = (msg: string) => addToast("warning", msg);
  toast.info = (msg: string) => addToast("info", msg);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <AnimatePresence mode="popLayout">
              {toasts.map((t) => {
                const cfg = typeConfig[t.type];
                const { Icon } = cfg;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{
                      pointerEvents: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      minWidth: 280,
                      maxWidth: 380,
                      background: "var(--bg-elevated)",
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.8} style={{ color: cfg.color, flexShrink: 0 }} />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: "var(--text-1)",
                        lineHeight: 1.4,
                      }}
                    >
                      {t.message}
                    </span>
                    <button
                      onClick={() => removeToast(t.id)}
                      style={{
                        color: "var(--text-3)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        flexShrink: 0,
                        display: "flex",
                      }}
                    >
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
