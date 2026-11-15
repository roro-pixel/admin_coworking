import React from "react";
import type { DerivationOutcome } from "../../../services/subscriptionDerivation.service";
import { StatusChip } from "../kit";
import { formatMoney } from "../kitUtils";

/** Résultat (ou simulation) d'un traitement par lot : totaux puis une ligne par abonnement, erreurs comprises. */
export const DerivationOutcomeCard: React.FC<{ outcome: DerivationOutcome; simulated: boolean }> = ({ outcome, simulated }) => (
  <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
    <p className="text-sm font-semibold text-gray-700">
      {simulated ? "Simulation : rien n'a été modifié." : `Lot ${outcome.batchCode ?? ""} appliqué.`}
    </p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[
        { l: "Abonnements", v: String(outcome.total) },
        { l: "Réussis", v: String(outcome.succeeded) },
        { l: "En échec", v: String(outcome.failed) },
        { l: "À approuver", v: String(outcome.pendingApproval) },
        { l: "Impact total", v: formatMoney(outcome.totalImpact, "FCFA") },
      ].map((t) => (
        <div key={t.l} className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">{t.l}</p>
          <p className="mt-1 text-base font-bold text-gray-900">{t.v}</p>
        </div>
      ))}
    </div>
    <div className="space-y-1.5">
      {outcome.lines.map((l) => (
        <div key={l.subscriptionNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-gray-900">{l.subscriptionNumber}</p>
            {l.message && <p className="text-xs text-red-600">{l.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            {l.impact != null && <span className="text-sm font-semibold text-gray-700">{formatMoney(l.impact, "FCFA")}</span>}
            {l.requiresApproval && <StatusChip tone="warn">À approuver</StatusChip>}
            <StatusChip tone={l.ok ? "success" : "danger"}>{l.ok ? "Réussi" : "En échec"}</StatusChip>
          </div>
        </div>
      ))}
    </div>
  </div>
);
