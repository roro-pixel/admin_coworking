import { useSyncExternalStore } from "react";

export type ToastStatus = "confirm" | "pending" | "success" | "error";

export interface ToastItem {
  id: number;
  status: ToastStatus;
  message: string;
  detail?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  /** "danger" (défaut) : suppression, annulation. "primary" : action normale à confirmer. */
  tone?: "danger" | "primary";
  onConfirm?: () => Promise<unknown>;
}

interface ConfirmOptions {
  message: string;
  detail?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<unknown>;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => items;

const patch = (id: number, next: Partial<ToastItem>) => {
  items = items.map((t) => (t.id === id ? { ...t, ...next } : t));
  emit();
};

const dismiss = (id: number) => {
  items = items.filter((t) => t.id !== id);
  emit();
};

const flash = (status: "success" | "error", message: string, id?: number) => {
  const toastId = id ?? ++seq;
  if (id === undefined) {
    items = [...items, { id: toastId, status, message }];
    emit();
  } else {
    patch(id, { status, message, onConfirm: undefined, detail: undefined });
  }
  window.setTimeout(() => dismiss(toastId), status === "error" ? 5000 : 3000);
  return toastId;
};

export const toast = {
  success: (message: string) => flash("success", message),
  error: (message: string) => flash("error", message),
  dismiss,

  /** Toast de confirmation : l'action ne part qu'après un clic sur le bouton, puis le toast passe en attente (trois points) et se transforme en succès ou en erreur. */
  confirm: (opts: ConfirmOptions) => {
    const id = ++seq;
    items = [
      ...items,
      {
        id,
        status: "confirm",
        message: opts.message,
        detail: opts.detail,
        confirmLabel: opts.confirmLabel,
        pendingLabel: opts.pendingLabel,
        successMessage: opts.successMessage,
        errorMessage: opts.errorMessage,
        tone: opts.tone,
        onConfirm: opts.onConfirm,
      },
    ];
    emit();
    return id;
  },

  run: async (id: number) => {
    const t = items.find((x) => x.id === id);
    if (!t || !t.onConfirm) return;
    patch(id, { status: "pending" });
    try {
      await t.onConfirm();
      flash("success", t.successMessage || "Terminé", id);
    } catch (e) {
      // Le message renvoyé par l'API (comme l'ancien alert) passe avant le message générique
      const apiMessage = (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      flash("error", apiMessage || t.errorMessage || "L'action a échoué", id);
    }
  },
};

export const useToasts = () => useSyncExternalStore(subscribe, snapshot, snapshot);