import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { purchaseService } from "../../../services/purchase.service";
import { money } from "../../../components/accounting/accountingLabels";
import { EmptyState, ErrorBlock, Field, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { FIELD, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";

export const PayablesPanel: React.FC = () => {
  const nav = useNavigate();
  const [until, setUntil] = useState("");
  const q = useQuery({ queryKey: ["purchase-payables", until], queryFn: () => purchaseService.payables(until || undefined) });
  const total = (q.data ?? []).reduce((a, p) => a + (p.remaining ?? 0), 0);
  return (
    <div className="space-y-4">
      <ListHeader title="Échéancier fournisseurs" subtitle={`Factures comptabilisées restant à payer : ${money(total)}.`} />
      <Field label="Échéances jusqu'au" hint="Toutes si vide"><input type="date" className={FIELD} value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Wallet} title="Rien à payer" /> : (
        <div className="space-y-2">
          {q.data!.map((p) => (
            <button key={p.number} onClick={() => nav(`/accounting/purchases/invoices/${encodeURIComponent(p.number ?? "")}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{p.supplierName ?? p.supplierCode} <span className="font-normal text-gray-400">· {p.number}{p.supplierReference ? ` · ${p.supplierReference}` : ""}</span></span>
                <span className="block text-xs text-gray-400">Échéance {formatDate(p.dueDate)} · net à payer {money(p.netToPay)}</span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                <span className="font-mono font-semibold">{money(p.remaining)}</span>
                {(p.daysLate ?? 0) > 0 && <StatusChip tone="danger">{p.daysLate} j de retard</StatusChip>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
