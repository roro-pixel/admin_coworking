import React, { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { ActionButton } from "../subscription/kit";
import { FOCUS, PINK_SOFT } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";

export const CredentialsPanel: React.FC<{
  title: string;
  subtitle?: string;
  rows?: { label: string; value: string }[];
  password?: string;
  note: string;
  onClose: () => void;
}> = ({ title, subtitle, rows = [], password, note, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Mot de passe copié");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible, sélectionnez le mot de passe à la main");
    }
  };

  return (
    <section className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-emerald-200 sm:p-5">
      <h4 className="text-base font-bold text-gray-950">{title}</h4>
      {subtitle && <p className="mt-0.5 break-all text-sm text-gray-500">{subtitle}</p>}

      {rows.length > 0 && (
        <dl className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-gray-500">{r.label}</dt>
              <dd className="min-w-0 break-all text-right font-semibold text-gray-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {password && (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500">Mot de passe temporaire</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="min-w-0 break-all rounded-xl bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-wide text-gray-950 shadow-sm">
              {visible ? password : "••••••••••"}
            </code>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className={`inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 ${FOCUS}`}
              >
                {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                {visible ? "Cacher" : "Afficher"}
              </button>
              <button
                type="button"
                onClick={copy}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--logo-pink-dark)] transition hover:opacity-80 ${PINK_SOFT} ${FOCUS}`}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                Copier
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">{note}</p>

      <div className="mt-5 flex justify-end">
        <ActionButton onClick={onClose}>Fermer</ActionButton>
      </div>
    </section>
  );
};
