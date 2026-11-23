import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { purchaseService } from "../../../services/purchase.service";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const WithholdingsPanel: React.FC = () => {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const q = useQuery({ queryKey: ["purchase-withholdings", period], queryFn: () => purchaseService.withholdings(period), enabled: !!period });
  const exp = async () => {
    try { saveBlob(await purchaseService.withholdingsCsv(period), `retenues-${period}.csv`); }
    catch (e) { toast.error(apiMessage(e, "Export impossible.")); }
  };
  const d = q.data;
  return (
    <div className="space-y-4">
      <ListHeader title="Retenues à la source" subtitle="État des retenues opérées sur les factures fournisseurs, pour la déclaration."
        action={<ActionButton variant="ghost" icon={Download} onClick={exp} disabled={!period}>Exporter (CSV)</ActionButton>} />
      <Field label="Période" hint="Format AAAA-MM, selon le serveur"><input className={FIELD} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-10" /></Field>
      {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : d.lines.length === 0 ? <EmptyState icon={Inbox} title="Aucune retenue sur la période" /> : (
        <>
          <div className="space-y-2">
            {d.lines.map((l, i) => (
              <div key={`${l.invoiceNumber}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm shadow-sm">
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900">{l.supplierName ?? l.supplierCode} <span className="font-normal text-gray-400">· {l.invoiceNumber}</span></span>
                  <span className="block text-xs text-gray-400">{[l.niu && `NIU ${l.niu}`, formatDate(l.invoiceDate), `base ${money(l.base)}`, l.rate != null && `${l.rate} %`, l.account && `compte ${l.account}`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="font-mono font-semibold">{money(l.amount)}</span>
              </div>
            ))}
          </div>
          <Section title={`Total : ${money(d.total)}`}>
            {Object.entries(d.accountMovements ?? {}).map(([a, v]) => <p key={a} className="flex justify-between text-sm text-gray-600"><span>Compte {a}</span><span className="font-mono">{money(v)}</span></p>)}
          </Section>
        </>
      )}
    </div>
  );
};
