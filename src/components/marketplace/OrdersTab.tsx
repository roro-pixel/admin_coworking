import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { marketplaceService } from "../../services/marketplace.service";
import { DataCard, EmptyState, ErrorBlock, StatusChip } from "../subscription/kit";
import { FOCUS, ROW_HOVER, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { ListSkeleton } from "../ui/Skeleton";
import { MARKETPLACE_KEY, ORDER_FILTERS, ORDER_STATUS } from "./marketplaceLabels";

/** Onglet Commandes */
export const OrdersTab: React.FC = () => {
  const [status, setStatus] = useState("");
  const [stockPending, setStockPending] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [MARKETPLACE_KEY, "orders", status, stockPending],
    queryFn: () => marketplaceService.getOrders({ status: status || undefined, stockPending: stockPending || undefined, limit: 100 }),
  });
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${status === f.value && !stockPending ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"}`}
            disabled={stockPending}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStockPending((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${stockPending ? "bg-amber-500 text-white" : "bg-white text-amber-700 shadow-sm hover:bg-amber-50"}`}
        >
          <AlertTriangle size={14} />
          Stock à corriger
        </button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les commandes." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={stockPending ? "Aucune sortie de stock à corriger" : "Aucune commande"} />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((o) => {
              const st = statusOf(ORDER_STATUS, o.status);
              return (
                <Link
                  key={o.orderNumber}
                  to={`/marketplace/orders/${encodeURIComponent(o.orderNumber)}`}
                  className={`flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 transition sm:flex-row sm:items-center sm:justify-between ${ROW_HOVER} ${FOCUS}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-950">{o.orderNumber}</span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      {o.stockPending && <StatusChip tone="warn">Stock en attente</StatusChip>}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {o.memberName ?? o.memberId}
                      {o.billingCompanyCode ? ` · facturée à ${o.billingCompanyCode}` : ""}
                      {" · "}
                      {o.lines.length} ligne(s) · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{formatMoney(o.totalAmount, "FCFA")}</p>
                </Link>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
