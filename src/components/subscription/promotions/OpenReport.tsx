import React from "react";
import { X } from "lucide-react";
import { FOCUS } from "../kitUtils";
import { formatOpenValue, humanKey } from "./promoLabels";


/**
 * Affiche une réponse dont la forme n'est pas documentée : chaque champ renvoyé par le backend
 * devient une ligne, sans en supposer aucun.
 */
export const OpenReport: React.FC<{
  title: string;
  data: Record<string, unknown>;
  onClose?: () => void;
}> = ({ title, data, onClose }) => (
  <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
    <div className="mb-2 flex items-start justify-between gap-3">
      <p className="font-bold">{title}</p>
      {onClose && (
        <button type="button" aria-label="Fermer" onClick={onClose} className={`rounded-full p-1 hover:bg-emerald-100 ${FOCUS}`}>
          <X size={14} />
        </button>
      )}
    </div>
    <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="capitalize text-emerald-700">{humanKey(k)}</dt>
          <dd className="break-all text-right font-semibold">{formatOpenValue(v)}</dd>
        </div>
      ))}
    </dl>
  </div>
);
