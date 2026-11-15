import React from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Trash2 } from "lucide-react";
import { brandVars } from "../layout/adminTheme";
import { toast, useToasts } from "./toastStore";

/** Trois points qui rebondissent : à mettre dans un bouton ou un toast pendant une attente. */
export const Dots: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-1 ${className}`} role="status" aria-label="Chargement">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
      />
    ))}
  </span>
);

/** À rendre une fois par page (ou dans AdminLayout). Les toasts viennent de toastStore. */
export const Toaster: React.FC = () => {
  const items = useToasts();

  return (
    <>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      <div
        style={brandVars}
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.status === "error" ? "alert" : "status"}
            style={{ animation: "toastIn .22s ease-out" }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-3 shadow-xl shadow-gray-900/10"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  t.status === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : t.status === "error" || (t.status === "confirm" && t.tone !== "primary")
                      ? "bg-red-50 text-red-600"
                      : "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]"
                }`}
              >
                {t.status === "success" ? (
                  <CheckCircle2 size={18} />
                ) : t.status === "error" ? (
                  <AlertCircle size={18} />
                ) : t.status === "pending" ? (
                  <Dots />
                ) : t.tone === "primary" ? (
                  <HelpCircle size={18} />
                ) : (
                  <Trash2 size={17} />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-gray-900">
                  {t.status === "pending" ? t.pendingLabel || "Suppression en cours" : t.message}
                </p>
                {t.detail && t.status !== "success" && t.status !== "error" && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{t.detail}</p>
                )}

                {t.status === "confirm" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast.dismiss(t.id)}
                      className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.run(t.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white transition ${
                        t.tone === "primary"
                          ? "bg-[color:var(--logo-pink-dark)] hover:opacity-90"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {t.confirmLabel || "Confirmer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};