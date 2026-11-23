import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Wallet } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { UnallocatedSuggestion } from "../../services/billing.service";
import { ActionButton, ErrorBanner, Field, ItemRow, ListHeader, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

const SuggestionCard: React.FC<{ s: UnallocatedSuggestion; canAllocate: boolean }> = ({ s, canAllocate }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cur = currencyLabel(s.currency ?? "XAF");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const allocate = useMutation({
    mutationFn: (documentNumber: string) => {
      const c = s.candidates?.find((x) => x.documentNumber === documentNumber);
      const amount = toNum(amounts[documentNumber] ?? "") ?? c?.proposedAmount ?? Math.min(s.pending ?? 0, c?.balanceDue ?? 0);
      return billingService.allocateUnallocatedPayment(s.transactionNumber, { allocations: [{ documentNumber, amount }] });
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["billing-unallocated"] }); qc.invalidateQueries({ queryKey: ["billing-document"] }); setError(null); toast.success(`Imputé : ${formatMoney(r.allocated ?? 0, cur)}.`); },
    onError: (e: unknown) => setError(billingError(e, "Imputation impossible.")),
  });
  return (
    <ItemRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{s.transactionNumber}</p>
          <p className="mt-0.5 text-sm text-gray-700">{s.payerName ?? s.customerCode ?? "Payeur inconnu"}{s.providerReference ? ` · réf. ${s.providerReference}` : ""}</p>
          <p className="text-xs text-gray-400">Payé le {formatDateTime(s.paidAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-gray-950">{formatMoney(s.pending ?? 0, cur)}</p>
          <p className="text-xs text-gray-400">sur {formatMoney(s.amount ?? 0, cur)} reçus</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {(s.candidates ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Aucune facture candidate.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {s.candidates!.map((c) => (
            <div key={c.documentNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3">
              <div className="min-w-0">
                <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${c.documentNumber}`)}>{c.documentNumber}</button>
                <p className="truncate text-sm text-gray-700">{c.title}</p>
                <p className="text-xs text-gray-500">Reste {formatMoney(c.balanceDue ?? 0, cur)}{c.dueDate ? ` · échéance ${formatDate(c.dueDate)}` : ""}</p>
                {(c.reasons ?? []).length > 0 && <p className="text-xs text-gray-400">{c.reasons!.join(" · ")}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.score != null && <StatusChip tone={c.score >= 0.8 ? "success" : c.score >= 0.5 ? "warn" : "neutral"}>{Math.round(c.score * (c.score <= 1 ? 100 : 1))} %</StatusChip>}
                {canAllocate && (
                  <>
                    <input type="number" min={0} step="any" placeholder={String(c.proposedAmount ?? "")} aria-label="Montant à imputer" className={`${FIELD_SOFT} w-32`} value={amounts[c.documentNumber] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [c.documentNumber]: e.target.value }))} />
                    <ActionButton className="!px-4 !py-2" pending={allocate.isPending && allocate.variables === c.documentNumber} onClick={() => allocate.mutate(c.documentNumber)}>Imputer</ActionButton>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ItemRow>
  );
};

const AllocationLookup: React.FC<{ canCancel: boolean }> = ({ canCancel }) => {
  const qc = useQueryClient();
  const [number, setNumber] = useState("");
  const [query, setQuery] = useState("");
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"REOPEN" | "NEUTRALIZE">("REOPEN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ["billing-allocations", query], queryFn: () => billingService.getTransactionAllocations(query), enabled: !!query });

  const cancel = useMutation({
    mutationFn: () => billingService.cancelAllocation(cancelling!, { invoiceOutcome: outcome, reason: reason.trim() }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["billing-allocations"] });
      qc.invalidateQueries({ queryKey: ["billing-unallocated"] });
      toast.success(r.accountingRequired ? "Imputation annulée : une écriture comptable est à passer." : "Imputation annulée.");
      setCancelling(null); setReason(""); setError(null);
    },
    onError: (e: unknown) => setError(billingError(e, "Annulation impossible.")),
  });

  return (
    <Section title="Imputations d'une transaction" icon={Search} description="Consultez où un paiement a été imputé et annulez une imputation erronée.">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Field label="N° de transaction" className="min-w-[14rem] flex-1"><input className={`${FIELD_SOFT} font-mono`} value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setQuery(number.trim()); }} /></Field>
        <ActionButton variant="ghost" icon={Search} disabled={!number.trim()} onClick={() => setQuery(number.trim())}>Rechercher</ActionButton>
      </div>
      {cancelling != null && (
        <PanelForm title="Annuler l'imputation" submitLabel="Annuler l'imputation" pending={cancel.isPending} submitDisabled={!reason.trim()} error={error} onCancel={() => { setCancelling(null); setError(null); }} onSubmit={(e) => { e.preventDefault(); setError(null); cancel.mutate(); }}>
          <PillChoice label="Sort de la facture" options={[{ value: "REOPEN", label: "Rouvrir la facture" }, { value: "NEUTRALIZE", label: "Neutraliser" }]} value={outcome} onChange={(v) => setOutcome(v as "REOPEN" | "NEUTRALIZE")} />
          <Field label="Motif" required><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </PanelForm>
      )}
      {query && (isLoading ? <p className="text-sm text-gray-400">Chargement…</p> : isError || !data ? <p className="text-sm text-red-600">Transaction introuvable.</p> : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Montant {formatMoney(data.amount ?? 0)} · en attente d'imputation {formatMoney(data.pending ?? 0)}</p>
          {(data.current ?? []).map((a) => (
            <ItemRow key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-mono text-xs font-semibold">{a.documentNumber}</p><p className="text-xs text-gray-500">{a.mode} · {formatDateTime(a.allocatedAt)}{a.allocatedBy ? ` · ${a.allocatedBy}` : ""}</p></div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">{formatMoney(a.amount ?? 0)}</span>
                  {canCancel && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setCancelling(a.id); setReason(""); setError(null); }}>Annuler</ActionButton>}
                </div>
              </div>
            </ItemRow>
          ))}
          {(data.reversed ?? []).length > 0 && <p className="pt-2 text-xs font-semibold text-gray-400">Imputations annulées</p>}
          {(data.reversed ?? []).map((a) => (
            <ItemRow key={a.id} className="opacity-70">
              <p className="font-mono text-xs">{a.documentNumber} · {formatMoney(a.amount ?? 0)}</p>
              <p className="text-xs text-gray-500">{a.reason}{a.reversedBy ? ` · ${a.reversedBy}` : ""} · {formatDateTime(a.reversedAt)}{a.elementsReverted ? ` · éléments : ${a.elementsReverted}` : ""}</p>
            </ItemRow>
          ))}
        </div>
      ))}
    </Section>
  );
};

/** Paiements reçus sans facture imputée : suggestions de rapprochement et imputations. */
export const BillingUnallocated: React.FC = () => {
  const { hasPermission } = useAuth();
  const canAllocate = hasPermission("BILLING:CREATE");
  const canCancel = hasPermission("BILLING:CANCEL");
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-unallocated", customer?.type, customer?.code],
    queryFn: () => billingService.getUnallocatedSuggestions({ customerType: customer?.type, customerCode: customer?.code, limit: 50 }),
  });
  const list = data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader title="Paiements non alloués" subtitle="Encaissements en attente d'imputation sur une facture" />
      <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm"><CustomerPicker value={customer} onChange={setCustomer} /></div>
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={Wallet} title="Aucun paiement à imputer" hint="Tous les encaissements sont rapprochés.">
        <div className="space-y-3">{list.map((s) => <SuggestionCard key={s.transactionNumber} s={s} canAllocate={canAllocate} />)}</div>
      </QueryState>
      <AllocationLookup canCancel={canCancel} />
    </div>
  );
};
