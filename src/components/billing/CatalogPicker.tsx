import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem } from "../../services/billing.service";
import { FIELD, FOCUS, ROW_HOVER, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { currencyLabel } from "../payment/paymentUtils";
import { SOURCE_TYPE_LABEL } from "./billingLabels";

/**
 * Recherche dans le catalogue facturable, affichée sous la ligne qui la demande.
 */
export const CatalogPicker: React.FC<{
  onPick: (item: BillingCatalogLookupItem) => void;
  onClose: () => void;
}> = ({ onPick, onClose }) => {
  const [query, setQuery] = useState("");
  const enabled = query.trim().length > 1;
  const { data, isFetching } = useQuery({
    queryKey: ["billing-catalog-lookup-line", query],
    queryFn: () => billingService.catalogLookup({ q: query, size: 8 }),
    enabled,
  });
  const items: BillingCatalogLookupItem[] = data?.content ?? [];

  return (
    <div className="mt-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article ou un service"
            className={`${FIELD} pl-10`}
          />
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la recherche" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 ${FOCUS}`}>
          <X size={16} />
        </button>
      </div>
      <div className="mt-2 max-h-60 overflow-y-auto">
        {!enabled ? (
          <p className="p-3 text-xs text-gray-400">Tapez au moins 2 caractères pour rechercher.</p>
        ) : isFetching && items.length === 0 ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-3 text-xs text-gray-400">Aucun résultat.</p>
        ) : (
          items.map((item) => (
            <button
              key={`${item.sourceType}-${item.sourceCode}`}
              type="button"
              onClick={() => onPick(item)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${ROW_HOVER} ${FOCUS}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-gray-900">{item.name}</span>
                <span className="block truncate text-xs text-gray-400">{SOURCE_TYPE_LABEL[item.sourceType] ?? item.sourceType}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-gray-800">
                {formatMoney(item.unitPrice, currencyLabel(item.currency))}
                {item.unit ? <span className="font-normal text-gray-400"> / {item.unit}</span> : null}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
