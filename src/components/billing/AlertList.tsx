import React from "react";
import type { BillingAlert } from "../../services/billing.service";

/** Alertes de simulation (stock, plafond d'encours, remise hors limites...) affichées pendant la saisie. */
export const AlertList: React.FC<{ alerts?: BillingAlert[]; className?: string }> = ({ alerts, className = "" }) => {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      {alerts.map((a, i) => (
        <p
          key={`${a.code}-${a.lineIndex ?? "doc"}-${i}`}
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            a.severity === "BLOCK" ? "bg-red-50 text-red-700" : a.severity === "INFO" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {a.lineIndex != null && <span className="font-semibold">Ligne {a.lineIndex + 1} : </span>}
          {a.message}
        </p>
      ))}
    </div>
  );
};
