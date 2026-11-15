import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { DerivationPreview } from "../../../services/subscriptionDerivation.service";
import { formatMoney } from "../kitUtils";
import { DELTA_TYPE_LABELS } from "./lifecycleLabels";

const MONEY_TYPES = ["PRICE", "SETUP_FEE", "ADDON_INCLUDED"];
const fmt = (v: string | number | null | undefined, currency: string, type: string): string => {
  if (v === null || v === undefined || v === "") return "Aucune";
  if (typeof v !== "number") return v;
  return MONEY_TYPES.includes(type) ? formatMoney(v, currency) : v.toLocaleString("fr-FR");
};

/**
 * Résultat d'une simulation de dérivation : prix du catalogue contre prix dérivé,
 * différences ligne par ligne, refus éventuel, second visa éventuel.
 * Toujours montrer ceci avant de créer.
 */
export const DerivationPreviewCard: React.FC<{ preview: DerivationPreview }> = ({ preview }) => {
  const blocked = !!preview.blockingReason;
  return (
    <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
      {blocked && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Refusée : </span>
            {preview.blockingReason}
          </p>
        </div>
      )}
      {!blocked && preview.requiresApproval && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>Cette dérivation demandera le second visa d'une autre personne avant d'être appliquée.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">Prix catalogue</p>
          <p className="mt-1 text-base font-bold text-gray-900">{formatMoney(preview.cataloguePrice, preview.currency)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">Prix dérivé</p>
          <p className="mt-1 text-base font-bold text-[color:var(--logo-pink-dark)]">{formatMoney(preview.derivedPrice, preview.currency)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">Remise</p>
          <p className="mt-1 text-base font-bold text-gray-900">{preview.discountPercent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">Impact total</p>
          <p className="mt-1 text-base font-bold text-gray-900">{formatMoney(preview.totalImpact, preview.currency)}</p>
        </div>
      </div>

      {preview.deltas.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-400">Ce qui change</p>
          <div className="space-y-1.5">
            {preview.deltas.map((d, i) => (
              <div key={`${d.type}-${d.target ?? ""}-${i}`} className="grid grid-cols-1 gap-1 rounded-xl bg-white px-4 py-2.5 shadow-sm sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] sm:items-center sm:gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {DELTA_TYPE_LABELS[d.type] ?? d.type}
                  {d.target && <span className="font-mono text-xs font-normal text-gray-400"> · {d.target}</span>}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="text-xs text-gray-400 sm:hidden">Catalogue : </span>
                  {fmt(d.catalogueValue, preview.currency, d.type)}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  <span className="text-xs font-normal text-gray-400 sm:hidden">Dérivé : </span>
                  {fmt(d.derivedValue, preview.currency, d.type)}
                </p>
                <p className="text-sm font-semibold text-gray-700 sm:text-right">{d.impact != null ? formatMoney(d.impact, preview.currency) : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
