import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Banknote, FileText, Plus, Receipt, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDeposit, DepositPlanItem } from "../../services/billing.service";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { DEPOSIT_STATUS_LABEL, DEPOSIT_STATUS_TONE } from "./billingLabels";

interface Row { label: string; mode: "AMOUNT" | "PERCENTAGE"; value: string; lineOrders: string; dueDate: string; invoiceNow: boolean }
const emptyRow = (): Row => ({ label: "", mode: "PERCENTAGE", value: "", lineOrders: "", dueDate: "", invoiceNow: true });

const toItem = (r: Row): DepositPlanItem => {
  const orders = r.lineOrders.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n));
  return {
    label: r.label.trim() || undefined,
    mode: r.mode,
    value: Number(r.value),
    lineOrders: orders.length ? orders : undefined,
    dueDate: r.dueDate || undefined,
    invoiceNow: r.invoiceNow,
  };
};

/** Formulaire du plan d'acomptes d'un devis ou d'une facture en brouillon. */
const PlanForm: React.FC<{ kind: "QUOTE" | "INVOICE"; documentNumber: string; onDone: () => void; onCancel: () => void }> = ({ kind, documentNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const valid = rows.length > 0 && rows.every((r) => Number(r.value) > 0 && (r.mode !== "PERCENTAGE" || Number(r.value) <= 100));

  const m = useMutation({
    mutationFn: () => {
      const data = { deposits: rows.map(toItem) };
      return kind === "QUOTE" ? billingService.planQuoteDeposits(documentNumber, data) : billingService.planInvoiceDeposits(documentNumber, data);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["billing-deposits", documentNumber] });
      qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] });
      toast.success(`${created.length} acompte${created.length > 1 ? "s" : ""} créé${created.length > 1 ? "s" : ""}.`);
      onDone();
    },
    onError: (e: unknown) => setError(billingError(e, "Impossible de créer le plan d'acomptes.")),
  });

  return (
    <PanelForm title="Plan d'acomptes" submitLabel="Créer le plan" pending={m.isPending} submitDisabled={!valid} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      {rows.map((r, i) => (
        <ItemRow key={i} className="bg-gray-50 !shadow-none">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
            <Field label="Libellé" className="col-span-2 md:col-span-4">
              <input className={FIELD_SOFT} value={r.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="À la commande" />
            </Field>
            <Field label="Mode" className="md:col-span-2">
              <select className={FIELD_SOFT} value={r.mode} onChange={(e) => patch(i, { mode: e.target.value as Row["mode"] })}>
                <option value="PERCENTAGE">Pourcentage</option>
                <option value="AMOUNT">Montant TTC</option>
              </select>
            </Field>
            <Field label={r.mode === "PERCENTAGE" ? "Valeur (%)" : "Montant"} required className="md:col-span-2">
              <input type="number" min={0} max={r.mode === "PERCENTAGE" ? 100 : undefined} className={FIELD_SOFT} value={r.value} onChange={(e) => patch(i, { value: e.target.value })} />
            </Field>
            <Field label="Échéance" className="col-span-2 md:col-span-3">
              <input type="date" className={FIELD_SOFT} value={r.dueDate} onChange={(e) => patch(i, { dueDate: e.target.value })} />
            </Field>
            <div className="flex items-end justify-end md:col-span-1">
              <IconButton icon={Trash2} tone="danger" label="Retirer l'acompte" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} />
            </div>
          </div>
          {r.mode === "PERCENTAGE" && (
            <Field label="Lignes servant de base" hint="Numéros séparés par une virgule. Vide : le total TTC." className="mt-3">
              <input className={FIELD_SOFT} value={r.lineOrders} onChange={(e) => patch(i, { lineOrders: e.target.value })} placeholder="1,2" />
            </Field>
          )}
          <div className="mt-3">
            <CheckField checked={r.invoiceNow} onChange={(v) => patch(i, { invoiceNow: v })} label="Facturer et émettre la facture d'acompte tout de suite" />
          </div>
        </ItemRow>
      ))}
      <ActionButton variant="ghost" icon={Plus} onClick={() => setRows((x) => [...x, emptyRow()])}>Ajouter un acompte</ActionButton>
    </PanelForm>
  );
};

/** Règlement d'un acompte : remboursement ou conservation en avoir. */
const SettleForm: React.FC<{ deposit: BillingDeposit; documentNumber: string; onDone: () => void; onCancel: () => void }> = ({ deposit, documentNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"REFUND" | "CREDIT">("REFUND");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => billingService.settleDeposit(deposit.id, { mode, reason: reason.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-deposits", documentNumber] }); toast.success("Acompte soldé."); onDone(); },
    onError: (e: unknown) => setError(billingError(e, "Impossible de solder l'acompte.")),
  });
  return (
    <PanelForm title={`Solder l'acompte n° ${deposit.rank ?? deposit.id}`} submitLabel="Solder" pending={m.isPending} submitDisabled={!reason.trim()} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <Field label="Sort de l'acompte encaissé">
        <select className={FIELD_SOFT} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="REFUND">Rembourser le client</option>
          <option value="CREDIT">Garder en avoir</option>
        </select>
      </Field>
      <Field label="Motif" required>
        <input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </PanelForm>
  );
};

/**
 * Acomptes d'un devis ou d'une facture : liste, plan, facturation d'un acompte prévu, retrait, solde.
 * `canPlan` : devis non converti/refusé/expiré, ou facture en brouillon.
 */
export const DepositsPanel: React.FC<{
  documentNumber: string;
  kind: "QUOTE" | "INVOICE";
  currency: string;
  canPlan: boolean;
}> = ({ documentNumber, kind, currency, canPlan }) => {
  const qc = useQueryClient();
  const cur = currencyLabel(currency);
  const [planning, setPlanning] = useState(false);
  const [settling, setSettling] = useState<BillingDeposit | null>(null);
  const [cancelling, setCancelling] = useState<BillingDeposit | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-deposits", documentNumber], queryFn: () => billingService.getDocumentDeposits(documentNumber) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-deposits", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] }); };

  const invoice = useMutation({
    mutationFn: (id: number) => billingService.invoiceDeposit(id),
    onSuccess: (d) => { refresh(); toast.success(`Facture d'acompte ${d.depositInvoiceNumber ?? ""} émise.`); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible de facturer l'acompte.")),
  });
  const cancel = useMutation({
    mutationFn: (d: BillingDeposit) => billingService.cancelDeposit(d.id, cancelReason.trim() || undefined),
    onSuccess: () => { refresh(); setCancelling(null); setCancelReason(""); toast.success("Acompte retiré."); },
    onError: (e: unknown) => setError(billingError(e, "Impossible de retirer l'acompte.")),
  });

  const deposits = data ?? [];
  const totalPaid = deposits.reduce((s, d) => s + (d.paidAmount ?? 0), 0);

  return (
    <Section title="Acomptes" icon={Banknote} description={deposits.length ? `${formatMoney(totalPaid, cur)} encaissé` : undefined}
      action={canPlan && !planning ? <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setPlanning(true)}>Plan d'acomptes</ActionButton> : undefined}>
      {planning && <PlanForm kind={kind} documentNumber={documentNumber} onDone={() => setPlanning(false)} onCancel={() => setPlanning(false)} />}
      {settling && <SettleForm deposit={settling} documentNumber={documentNumber} onDone={() => setSettling(null)} onCancel={() => setSettling(null)} />}
      {cancelling && (
        <PanelForm title={`Retirer l'acompte n° ${cancelling.rank ?? cancelling.id}`} submitLabel="Retirer" pending={cancel.isPending} error={error} onCancel={() => { setCancelling(null); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); cancel.mutate(cancelling); }}>
          <Field label="Motif" hint="Facultatif. Sa facture d'acompte est annulée ; impossible s'il est déjà encaissé.">
            <input className={FIELD_SOFT} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </Field>
        </PanelForm>
      )}
      {isLoading ? <Skeleton className="h-16 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les acomptes." onRetry={() => refetch()} />
        : deposits.length === 0 ? <EmptyState icon={Banknote} title="Aucun acompte" hint={canPlan ? "Créez un plan d'acomptes pour demander une avance." : undefined} />
        : (
          <div className="space-y-2">
            {deposits.map((d) => (
              <ItemRow key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Acompte n° {d.rank ?? d.id}{d.label ? ` · ${d.label}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatMoney(d.amount, cur)}
                      {d.mode === "PERCENTAGE" && d.value != null ? ` (${d.value} %)` : ""}
                      {d.dueDate ? ` · échéance ${formatDate(d.dueDate)}` : ""}
                      {(d.paidAmount ?? 0) > 0 ? ` · encaissé ${formatMoney(d.paidAmount, cur)}` : ""}
                    </p>
                    {d.depositInvoiceNumber && <p className="mt-1 font-mono text-xs text-gray-500"><Receipt size={12} className="mr-1 inline" />{d.depositInvoiceNumber}</p>}
                    {d.finalDocumentNumber && d.status === "DEDUCTED" && <p className="mt-1 text-xs text-gray-400">Déduit sur {d.finalDocumentNumber}</p>}
                    {d.settlementDocument && <p className="mt-1 text-xs text-gray-400"><FileText size={12} className="mr-1 inline" />Avoir {d.settlementDocument}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone={DEPOSIT_STATUS_TONE[d.status ?? ""] ?? "neutral"}>{DEPOSIT_STATUS_LABEL[d.status ?? ""] ?? d.status}</StatusChip>
                    {d.status === "PLANNED" && <ActionButton variant="ghost" className="!px-4 !py-2" pending={invoice.isPending && invoice.variables === d.id} onClick={() => invoice.mutate(d.id)}>Facturer</ActionButton>}
                    {(d.status === "PLANNED" || d.status === "INVOICED") && <IconButton icon={Ban} tone="danger" label="Retirer l'acompte" onClick={() => { setCancelling(d); setError(null); }} />}
                    {(d.status === "PAID" || d.status === "PARTIALLY_PAID") && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => setSettling(d)}>Solder</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};
