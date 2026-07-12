import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastCtx {
  toast: (t: Omit<ToastItem, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (opts: {
    title: string;
    message: string;
    okLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
}

const ToastContext = createContext<ToastCtx | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ── Icons per kind ───────────────────────────────────────────────────────────
const KIND_STYLES: Record<ToastKind, { icon: ReactNode; ring: string; bg: string; text: string; accent: string }> = {
  success: {
    icon: <CheckCircle2 size={20} className="text-emerald-600" />,
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    accent: "border-l-emerald-500",
  },
  error: {
    icon: <XCircle size={20} className="text-red-600" />,
    ring: "ring-red-500/20",
    bg: "bg-red-50",
    text: "text-red-800",
    accent: "border-l-red-500",
  },
  warning: {
    icon: <AlertTriangle size={20} className="text-amber-600" />,
    ring: "ring-amber-500/20",
    bg: "bg-amber-50",
    text: "text-amber-800",
    accent: "border-l-amber-500",
  },
  info: {
    icon: <Info size={20} className="text-blue-600" />,
    ring: "ring-blue-500/20",
    bg: "bg-blue-50",
    text: "text-blue-800",
    accent: "border-l-blue-500",
  },
};

// ── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    okLabel: string;
    cancelLabel: string;
    danger: boolean;
    resolve: (v: boolean) => void;
  } | null>(null);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, duration: 3800, ...t };
    setItems((prev) => [...prev, item]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => dismiss(id), item.duration);
    }
  }, [dismiss]);

  const ctx: ToastCtx = {
    toast,
    success: (title, message) => toast({ kind: "success", title, message }),
    error: (title, message) => toast({ kind: "error", title, message, duration: 5000 }),
    warning: (title, message) => toast({ kind: "warning", title, message, duration: 4500 }),
    info: (title, message) => toast({ kind: "info", title, message }),
    confirm: ({ title, message, okLabel = "Ya, Lanjutkan", cancelLabel = "Batal", danger = false }) =>
      new Promise<boolean>((resolve) => {
        setConfirmModal({ title, message, okLabel, cancelLabel, danger, resolve });
      }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {items.map((item) => {
          const style = KIND_STYLES[item.kind];
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 ${style.accent} ${style.bg} ring-1 ${style.ring} shadow-2xl px-4 py-3 backdrop-blur animate-toast-in`}
            >
              <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
              <div className={`flex-1 min-w-0 ${style.text}`}>
                <p className="font-bold text-sm leading-tight">{item.title}</p>
                {item.message && <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{item.message}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className={`flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ${style.text}`}
                aria-label="Tutup notifikasi"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            confirmModal.resolve(false);
            setConfirmModal(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-5 py-4 flex items-center gap-3 ${confirmModal.danger ? "bg-red-50 border-b border-red-100" : "bg-blue-50 border-b border-blue-100"}`}>
              {confirmModal.danger ? (
                <AlertTriangle size={22} className="text-red-600 flex-shrink-0" />
              ) : (
                <Info size={22} className="text-blue-600 flex-shrink-0" />
              )}
              <h3 className={`font-bold text-base ${confirmModal.danger ? "text-red-900" : "text-blue-900"}`}>
                {confirmModal.title}
              </h3>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-gray-700 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  confirmModal.resolve(false);
                  setConfirmModal(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
              >
                {confirmModal.cancelLabel}
              </button>
              <button
                onClick={() => {
                  confirmModal.resolve(true);
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white shadow transition-colors ${confirmModal.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {confirmModal.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
