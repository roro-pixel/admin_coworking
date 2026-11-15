import React from "react";
import { FIELD_LABEL, formatFieldValue, humanKey } from "./controlUtils";

/** Liste de champs d'une réponse dont la forme n'est pas documentée : une ligne par champ renvoyé. */
export const OpenFields: React.FC<{ entries: [string, unknown][]; className?: string }> = ({ entries, className = "" }) =>
  entries.length === 0 ? null : (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2 ${className}`}>
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="text-gray-400">{FIELD_LABEL[k] ?? humanKey(k)}</dt>
          <dd className="break-all text-right font-semibold text-gray-700">{formatFieldValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
