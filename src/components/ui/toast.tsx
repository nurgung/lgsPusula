"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
};

type Toast = ToastInput & { id: number };

/** Success/info toasts close themselves; error toasts stay until the user closes them. */
export const TOAST_AUTO_DISMISS_MS = 6000;
export const MAX_VISIBLE_TOASTS = 3;

const variantStyles: Record<ToastVariant, { box: string; label: string }> = {
  success: {
    box: "border-success-700/40 bg-success-50 text-success-700",
    label: "Başarılı",
  },
  error: { box: "border-danger-700/40 bg-danger-50 text-danger-700", label: "Hata" },
  info: { box: "border-info-700/30 bg-info-50 text-info-700", label: "Bilgi" },
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (toast.variant === "error" || paused) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.variant, paused, onDismiss]);

  const styles = variantStyles[toast.variant];
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-card border p-3 pl-4 shadow-card",
        styles.box,
      )}
    >
      <div className="min-w-0 flex-1 py-1">
        <p className="text-xs font-bold tracking-wide uppercase">{styles.label}</p>
        <p className="font-semibold text-ink-900">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-sm text-ink-700">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={`Bildirimi kapat: ${toast.title}`}
        className="inline-flex size-touch shrink-0 items-center justify-center rounded-control text-ink-700 hover:bg-surface-muted"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Provides `useToast()`. Both live regions are rendered from the first paint, because
 * screen readers ignore regions that are inserted together with their content.
 * Errors go to an assertive `alert` region, everything else to a polite `status` region.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...input, id }].slice(-MAX_VISIBLE_TOASTS));
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);
  const errors = toasts.filter((toast) => toast.variant === "error");
  const others = toasts.filter((toast) => toast.variant !== "error");

  return (
    <ToastContext value={value}>
      {children}
      <div
        data-toast-viewport=""
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 sm:items-stretch sm:px-0"
      >
        <div role="alert" className="flex w-full max-w-md flex-col gap-2">
          {errors.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
        <div role="status" className="flex w-full max-w-md flex-col gap-2">
          {others.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </ToastContext>
  );
}
