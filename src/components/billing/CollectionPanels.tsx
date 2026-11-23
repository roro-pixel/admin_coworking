import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, HandCoins } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { PaymentPromisePayload } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { PROMISE_CHANNEL_LABEL, PROMISE_STATUS_LABEL, PROMISE_STATUS_TONE } from "./billingLabels";

/** Promesses de paiement d'une facture (recouvrement) : liste, enregistrement, annulation. Droit PAYMENT:PROCESS. */
export const PromisesPanel: React.FC<{ documentNumber: string; currency: string; balanceDue: number; canCreate: boolean }> = ({ documentNumber, currency, balanceDue, canCreate }) => {
  const qc = useQueryClient();
  const cur = currencyLabel(currency);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ promisedDate: string; amount: string; channel: string; note: string }>({ promisedDate: "", amount: "", channel: "PHONE", note: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-promises", documentNumber], queryFn: () => billingService.listPaymentPromises({ documentNumber }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-promises"] }); };

  const create = useMutation({
    mutationFn: () => billingService.createPaymentPromise(documentNumber, {
      promisedDate: form.promisedDate, amount: form.amount ? Number(form.amount) : undefined,
      channel: form.channel as PaymentPromisePayload["channel"], note: form.note.trim() || undefined,
    }),
    onSuccess: (p) => { refresh(); setAdding(false); setForm({ promisedDate: "", amount: "", channel: "PHONE", note: "" }); toast.success(`Promesse ${p.promiseNumber} enregistrée.`); },
    onError: (e: unknown) => setError(billingError(e, "Impossible d'enregistrer la promesse.")),
  });
  const cancel = useMutation({
    mutationFn: (n: string) => billingService.cancelPaymentPromise(n),
    onSuccess: () => { refresh(); toast.success("Promesse annulée."); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible d'annuler la promesse.")),
  });

  return (
    <Section title="Promesses de paiement" icon={HandCoins}
      action={canCreate && !adding ? <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => setAdding(true)}>Nouvelle promesse</ActionButton> : undefined}>
      {adding && (
        <PanelForm title="Enregistrer une promesse" submitLabel="Enregistrer" pending={create.isPending} submitDisabled={!form.promisedDate} error={error} onCancel={() => { setAdding(false); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date promise" required><input type="date" className={FIELD_SOFT} value={form.promisedDate} onChange={(e) => setForm({ ...form, promisedDate: e.target.value })} /></Field>
            <Field label={`Montant (${cur})`} hint={`Vide : solde dû, ${formatMoney(balanceDue, cur)}`}><input type="number" min={0} className={FIELD_SOFT} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Canal">
              <select className={FIELD_SOFT} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {Object.entries(PROMISE_CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Note" className="sm:col-span-3"><input className={FIELD_SOFT} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
        </PanelForm>
      )}
      {isLoading ? <Skeleton className="h-14 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les promesses." onRetry={() => refetch()} />
        : (data ?? []).length === 0 ? <EmptyState icon={HandCoins} title="Aucune promesse" />
        : (
          <div className="space-y-2">
            {(data ?? []).map((p) => (
              <ItemRow key={p.promiseNumber}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(p.amount, cur)} avant le {formatDate(p.promisedDate)}</p>
                    <p className="mt-0.5 text-xs text-gray-500"><span className="font-mono">{p.promiseNumber}</span>{p.channel ? ` · ${PROMISE_CHANNEL_LABEL[p.channel] ?? p.channel}` : ""}{p.createdBy ? ` · ${p.createdBy}` : ""}</p>
                    {p.note && <p className="mt-1 text-xs text-gray-500">{p.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone={PROMISE_STATUS_TONE[p.status ?? ""] ?? "neutral"}>{PROMISE_STATUS_LABEL[p.status ?? ""] ?? p.status}</StatusChip>
                    {p.status === "OPEN" && canCreate && <ActionButton variant="ghost" className="!px-4 !py-2" pending={cancel.isPending && cancel.variables === p.promiseNumber} onClick={() => cancel.mutate(p.promiseNumber)}>Annuler</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};

/** Plan de paiement d'une facture en retard (crée un échéancier). */
export const PaymentPlanPanel: React.FC<{ documentNumber: string; onCancel: () => void; onCreated: () => void }> = ({ documentNumber, onCancel, onCreated }) => {
  const qc = useQueryClient();
  const [installments, setInstallments] = useState("3");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [intervalMonths, setIntervalMonths] = useState("1");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => billingService.createPaymentPlan(documentNumber, { installments: Number(installments), firstDueDate, intervalMonths: Number(intervalMonths) || undefined, notes: notes.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-schedule", documentNumber] }); toast.success("Plan de paiement créé."); onCreated(); },
    onError: (e: unknown) => setError(billingError(e, "Impossible de créer le plan de paiement.")),
  });
  return (
    <PanelForm title="Plan de paiement" submitLabel="Créer le plan" pending={m.isPending} submitDisabled={!firstDueDate || Number(installments) < 2} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <p className="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500"><CalendarClock size={14} className="mt-0.5 shrink-0" />Le solde est réparti en échéances égales. Un seul échéancier actif par facture.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nombre d'échéances" required><input type="number" min={2} className={FIELD_SOFT} value={installments} onChange={(e) => setInstallments(e.target.value)} /></Field>
        <Field label="Première échéance" required><input type="date" className={FIELD_SOFT} value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} /></Field>
        <Field label="Intervalle (mois)"><input type="number" min={1} className={FIELD_SOFT} value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-3"><input className={FIELD_SOFT} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </PanelForm>
  );
};
