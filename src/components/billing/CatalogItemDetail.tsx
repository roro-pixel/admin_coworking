import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { ServiceCatalogItem } from "../../services/billing.service";
import { Detail, IconButton, Section, StatusChip } from "../subscription/kit";
import { formatDate, formatMoney } from "../subscription/kitUtils";
import { currencyLabel } from "../payment/paymentUtils";

/** Champs que le backend ajoute à l'article (listes de référence, lot C0). */
export type CatalogItem = ServiceCatalogItem & {
  categoryLabel?: string;
  subcategoryLabel?: string;
  unitLabel?: string;
  taxRule?: { code?: string; name?: string; rate?: number; treatment?: string; labelOnDocument?: string } | null;
  referenceWarnings?: string[];
  securityDeposit?: boolean;
};

const MODE: Record<string, string> = { UNIT: "À l'unité", HOURLY: "À l'heure", DAILY: "À la journée", MONTHLY: "Au mois", FIXED: "Forfait" };
const POLICY: Record<string, string> = { NONE: "Aucune limite", WARN: "Avertir seulement", BLOCK: "Bloquer à l'émission" };
const FLOOR: Record<string, string> = { EXPLICIT: "saisi explicitement", DERIVED_FROM_MARGIN: "dérivé de la marge minimale", COST_PRICE: "dérivé du coût", NONE: "aucun plancher" };
const TREATMENT: Record<string, string> = { STANDARD: "Standard", REDUCED: "Réduit", EXEMPT: "Exonéré", OUT_OF_SCOPE: "Hors champ" };
const SEGMENT: Record<string, string> = { ALL: "Tous", MEMBER: "Membres", COMPANY: "Entreprises", VISITOR: "Visiteurs" };

export const CatalogItemDetail: React.FC<{ item: CatalogItem; onEdit: () => void; onClose: () => void }> = ({ item, onEdit, onClose }) => {
  const code = item.itemCode;
  const cur = currencyLabel(item.currency);
  const money = (n?: number) => (n == null ? undefined : formatMoney(n, cur));
  const prices = useQuery({ queryKey: ["catalog-prices", code], queryFn: () => billingService.listCatalogPrices(code), retry: false });
  const comps = useQuery({ queryKey: ["catalog-components", code], queryFn: () => billingService.getCatalogComponents(code), retry: false });
  const links = useQuery({ queryKey: ["catalog-links", code], queryFn: async () => (await billingService.getCatalogMargins({ search: code })).find((m) => m.itemCode === code), retry: false });
  const margin = item.costPrice != null ? item.unitPrice - item.costPrice : undefined;
  const marginRate = margin != null && item.unitPrice > 0 ? (margin / item.unitPrice) * 100 : undefined;
  const tax = item.taxRule;

  return (
    <Section
      title={item.name}
      description={code}
      action={
        <div className="flex items-center gap-1">
          <IconButton icon={Pencil} label="Modifier" onClick={onEdit} />
          <IconButton icon={X} label="Fermer" onClick={onClose} />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusChip tone={item.active === false ? "neutral" : "success"}>{item.active === false ? "Inactif" : "Actif"}</StatusChip>
        {item.currentlyValid === false && <StatusChip tone="warn">Hors fenêtre de validité</StatusChip>}
        {item.securityDeposit && <StatusChip tone="info">Article de caution</StatusChip>}
      </div>
      {(item.referenceWarnings ?? []).length > 0 && (
        <ul className="mb-4 space-y-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">{item.referenceWarnings!.map((w, i) => <li key={i}>{w}</li>)}</ul>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Detail label="Famille">{item.categoryLabel ?? item.category}</Detail>
        <Detail label="Sous-famille">{item.subcategoryLabel ?? item.subcategory}</Detail>
        <Detail label="Unité">{item.unitLabel ?? item.unit}</Detail>
        <Detail label="Prix unitaire" mono>{money(item.unitPrice)}</Detail>
        <Detail label="Règle de taxe">{tax ? `${tax.name ?? tax.code}${tax.rate != null ? ` · ${tax.rate} %` : ""}${tax.treatment ? ` · ${TREATMENT[tax.treatment] ?? tax.treatment}` : ""}` : item.taxRuleCode}</Detail>
        <Detail label="Taxable par défaut">{item.taxableByDefault == null ? undefined : item.taxableByDefault ? "Oui" : "Non"}</Detail>
        <Detail label="Coût" mono>{money(item.costPrice)}</Detail>
        <Detail label="Marge" mono>{margin == null ? undefined : `${money(margin)}${marginRate != null ? ` (${marginRate.toFixed(1)} %)` : ""}`}</Detail>
        <Detail label="Marge minimale">{item.minMarginRate != null ? `${item.minMarginRate} %` : undefined}</Detail>
        <Detail label="Plancher appliqué" mono>{item.effectiveFloorPrice != null ? `${money(item.effectiveFloorPrice)}${item.floorPriceOrigin ? ` · ${FLOOR[item.floorPriceOrigin] ?? item.floorPriceOrigin}` : ""}` : undefined}</Detail>
        <Detail label="Remise max">{item.maxDiscountRate != null ? `${item.maxDiscountRate} %` : undefined}</Detail>
        <Detail label="Politique de remise">{item.discountPolicy ? POLICY[item.discountPolicy] ?? item.discountPolicy : undefined}</Detail>
        <Detail label="Mode de facturation">{item.billingMode ? MODE[item.billingMode] ?? item.billingMode : undefined}</Detail>
        <Detail label="Quantité par défaut">{item.defaultQuantity}</Detail>
        <Detail label="Quantités min / max">{item.minQuantity != null || item.maxQuantity != null ? `${item.minQuantity ?? "—"} / ${item.maxQuantity ?? "—"}` : undefined}</Detail>
        <Detail label="Valide du">{item.validFrom ? formatDate(item.validFrom) : undefined}</Detail>
        <Detail label="Valide jusqu'au">{item.validUntil ? formatDate(item.validUntil) : undefined}</Detail>
        <Detail label="Référence externe" mono>{item.externalReference}</Detail>
        <Detail label="Article d'inventaire lié" mono>{links.data?.inventoryItemCode}</Detail>
        <Detail label="Compte de produit" mono>{links.data?.revenueAccount}</Detail>
        <Detail label="Ordre d'affichage">{item.displayOrder}</Detail>
        <Detail label="Description" wide>{item.description}</Detail>
        <Detail label="Description détaillée" wide>{item.detailedDescription}</Detail>
        <Detail label="Éléments inclus" wide>{(item.includedItems ?? []).join(", ")}</Detail>
        <Detail label="Étiquettes" wide>{(item.tags ?? []).join(", ")}</Detail>
      </div>
      {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="mt-4 max-h-48 rounded-2xl object-cover" />}

      {(comps.data ?? []).length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Composition</p>
          <div className="space-y-1.5">
            {comps.data!.map((c) => (
              <div key={`${c.componentSource}-${c.componentCode}`} className="flex items-center justify-between rounded-xl bg-white p-2.5 text-sm shadow-sm">
                <span className="font-mono">{c.componentCode}</span>
                <span className="tabular-nums text-gray-600">× {c.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Historique des prix</p>
        {prices.isLoading ? <p className="text-sm text-gray-400">Chargement…</p> : (prices.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Aucun prix daté : le prix de la fiche s'applique.</p>
        ) : (
          <div className="space-y-1.5">
            {prices.data!.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                <span><b>{SEGMENT[p.segment ?? "ALL"] ?? p.segment}</b> <span className="text-gray-500">{p.validFrom ? `du ${formatDate(p.validFrom)}` : ""}{p.validUntil ? ` au ${formatDate(p.validUntil)}` : ""}</span>{p.reason && <span className="block text-xs text-gray-400">{p.reason}</span>}</span>
                <span className="font-bold tabular-nums">{money(p.unitPrice)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
};
