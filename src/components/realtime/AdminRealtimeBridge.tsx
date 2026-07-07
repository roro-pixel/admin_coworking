import React, { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react";
import { useAdminRealtime } from "../../hooks/useAdminRealtime";

type ToastTone = "info" | "warning" | "critical" | "success";

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

const toneClass: Record<ToastTone, string> = {
  info: "border-slate-200 bg-white text-slate-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const toneIcon: Record<ToastTone, React.ElementType> = {
  info: Bell,
  warning: AlertTriangle,
  critical: AlertTriangle,
  success: CheckCircle2,
};

export const AdminRealtimeBridge: React.FC = () => {
  useAdminRealtime();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const id = Date.now() + Math.random();
      const toast: ToastItem = {
        id,
        title: detail.title || "Notification",
        message: detail.message,
        tone: detail.tone || "info",
      };

      setToasts((current) => [toast, ...current].slice(0, 3));
      window.setTimeout(
        () => {
          setToasts((current) => current.filter((item) => item.id !== id));
        },
        detail.tone === "critical" ? 9000 : 6000,
      );
    };

    window.addEventListener("admin-realtime-toast", handler);
    return () => window.removeEventListener("admin-realtime-toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-[80] w-[min(380px,calc(100vw-2rem))] space-y-3">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-lg ${toneClass[toast.tone]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="mt-1 line-clamp-3 text-sm opacity-80">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((current) =>
                    current.filter((item) => item.id !== toast.id),
                  )
                }
                className="rounded-lg p-1 opacity-60 hover:bg-white/60 hover:opacity-100"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
