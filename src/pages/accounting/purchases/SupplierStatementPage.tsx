import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { purchaseService } from "../../../services/purchase.service";
import { money } from "../../../components/accounting/accountingLabels";
import { EmptyState, ErrorBlock, Field, Section } from "../../../components/subscription/kit";
import { FIELD, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";

export const SupplierStatementPage: React.FC = () => {
  const { code = "" } = useParams();
  const [range, setRange] = useState({ from: "", to: "" });
  const q = useQuery({ queryKey: ["purchase-statement", code, range], queryFn: () => purchaseService.supplierStatement(code, range) });
  const d = q.data;
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/purchases" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Achats</Link>
        <h2 className="text-lg font-bold text-gray-900">Relevé du fournisseur {d?.supplier?.name ?? code}</h2>
        <div className="flex flex-wrap gap-3">
          <Field label="Du"><input type="date" className={FIELD} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
          <Field label="Au"><input type="date" className={FIELD} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
        </div>
        {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (
          <Section title={`${formatDate(d.from)} → ${formatDate(d.to)}`}>
            <p className="mb-2 text-sm text-gray-600">Solde d'ouverture <b className="font-mono">{money(d.opening)}</b></p>
            {d.lines.length === 0 ? <EmptyState icon={Inbox} title="Aucun mouvement" /> : (
              <div className="space-y-1.5">
                {d.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[6rem_1fr_6rem_6rem_7rem] items-center gap-2 rounded-xl bg-white p-2.5 text-xs shadow-sm">
                    <span className="text-gray-500">{formatDate(l.date)}</span>
                    <span className="min-w-0 truncate text-gray-800">{l.entryNumber ? <Link className="underline" to={`/accounting/entries/${encodeURIComponent(l.entryNumber)}`}>{l.entryNumber}</Link> : null} {l.label}{l.reference ? ` · ${l.reference}` : ""}</span>
                    <span className="text-right font-mono">{l.debit ? money(l.debit) : ""}</span>
                    <span className="text-right font-mono">{l.credit ? money(l.credit) : ""}</span>
                    <span className="text-right font-mono font-semibold">{money(l.balance)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600">Solde de clôture <b className="font-mono">{money(d.closing)}</b></p>
          </Section>
        )}
      </div>
    </AccountingShell>
  );
};
