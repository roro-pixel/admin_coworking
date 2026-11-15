import React from "react";
import { FOCUS, PINK_SOFT } from "../subscription/kitUtils";

export interface ChoiceItem {
  value: string;
  label: string;
  description?: string;
}

/**
 * Choix unique présenté en tuiles (template, type de propriétaire, renouvellement...).
 * `columns` : classe grid-cols écrite en toutes lettres.
 */
export const ChoiceTiles: React.FC<{
  items: ChoiceItem[];
  value: string;
  onChange: (value: string) => void;
  columns?: string;
  compact?: boolean;
  label: string;
}> = ({ items, value, onChange, columns = "grid-cols-1 sm:grid-cols-2", compact = false, label }) => (
  <div role="radiogroup" aria-label={label} className={`grid gap-2 ${columns}`}>
    {items.map((it) => {
      const on = it.value === value;
      return (
        <button
          key={it.value}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(it.value)}
          className={`rounded-2xl text-left transition ${compact ? "px-4 py-2.5" : "p-4"} ${FOCUS} ${
            on
              ? `${PINK_SOFT} ring-2 ring-[color:var(--logo-pink)]`
              : "bg-white shadow-sm hover:bg-gray-100"
          }`}
        >
          <span
            className={`block text-sm font-semibold ${
              on ? "text-[color:var(--logo-pink-dark)]" : "text-gray-900"
            }`}
          >
            {it.label}
          </span>
          {it.description && (
            <span className="mt-0.5 block text-xs text-gray-500">{it.description}</span>
          )}
        </button>
      );
    })}
  </div>
);

/** Étiquette d'un groupe de tuiles (un <label> avalerait les clics sur les boutons). */
export const Group: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div>
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
      {required && <span className="text-[color:var(--logo-pink-dark)]"> *</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </div>
);
