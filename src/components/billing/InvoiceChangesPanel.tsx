import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, ClipboardEdit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { billingService } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { CUSTOMER_TYPE_LABEL, INVOICE_CHANGE_LABEL, INVOICE_CHANGE_TONE } from "./billingLabels";

/**
 * Demandes de modification d'une facture non payée (circuit d'approbation INVOICE_CHANGE).
 * `onRequest` ouvre l'éditeur (DocumentForm en mode « change »). Bandeau tant qu'une demande est en attente.
 */
export const InvoiceChangesPanel: React.FC<{
  invoiceNumber: string;
  currency: string;
  /** Facture ISSUED/SENT sans paiement imputé et non certifiée côté demande directe */
  canRequest: boolean;
  onRequest?: () => void;
}> = ({ invoiceNumber, currency, canRequest, onRequest }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cur = currencyLabel(currency);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-invoice-changes", invoiceNumber], queryFn: () => billingService.listInvoiceChanges(invoiceNumber) });
  const changes = [...(data ?? [])].sort((a, b) => (b.requestedAt ?? "").localeCompare(a.requestedAt ?? ""));
  const pending = changes.find((c) => c.status === "PENDING");

  const cancel = useMutation({
    mutationFn: (id: number) => billingService.cancelInvoiceChange(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-invoice-changes", invoiceNumber] }); toast.success("Demande retirée."); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible de retirer la demande.")),
  });

  return (
    <Section title="Modifications" icon={ClipboardEdit} description="Une facture se modifie tant qu'aucun paiement n'est imputé"
      action={canRequest && onRequest ? <ActionButton variant="ghost" className="!px-4 !py-2" onClick={onRequest}>Demander une modification</ActionButton> : undefined}>
      {pending && (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Modification en attente d'approbation
          {pending.approvalNumber && (<> (<button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/approvals/${encodeURIComponent(pending.approvalNumber!)}`)}>{pending.approvalNumber}</button>)</>)}
          . La facture garde sa version en vigueur jusqu'à l'accord.
        </p>
      )}
      {isLoading ? <Skeleton className="h-16 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les demandes." onRetry={() => refetch()} />
        : changes.length === 0 ? <EmptyState icon={ClipboardEdit} title="Aucune demande de modification" />
        : (
          <div className="space-y-2">
            {changes.map((c) => (
              <ItemRow key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.reason}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatMoney(c.totalBefore, cur)} → {formatMoney(c.totalAfter, cur)} · {c.requestedByName ?? c.requestedBy ?? "—"} · {formatDateTime(c.requestedAt)}
                    </p>
                    {c.decisionComment && <p className="mt-1 text-xs text-gray-500">« {c.decisionComment} »{c.decidedBy ? ` · ${c.decidedBy}` : ""}</p>}
                    {c.result === "NEW_VERSION" && <p className="mt-1 text-xs text-gray-400">Nouvelle version n° {c.versionNumber}</p>}
                    {c.result === "CORRECTIVE_INVOICE" && c.resultDocumentNumber && (
                      <p className="mt-1 text-xs text-gray-500">
                        Remplacée par la rectificative{" "}
                        <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${c.resultDocumentNumber}`)}>{c.resultDocumentNumber}</button>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone={INVOICE_CHANGE_TONE[c.status ?? ""] ?? "neutral"}>{INVOICE_CHANGE_LABEL[c.status ?? ""] ?? c.status}</StatusChip>
                    {c.status === "PENDING" && <ActionButton variant="ghost" className="!px-4 !py-2" pending={cancel.isPending && cancel.variables === c.id} onClick={() => cancel.mutate(c.id)}>Retirer</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};

/** Changement de client d'une facture (mode IN_PLACE ou REISSUE décidé par le serveur). */
export const ChangeCustomerPanel: React.FC<{ invoiceNumber: string; onCancel: () => void; onDone: (newInvoice?: string) => void }> = ({ invoiceNumber, onCancel, onDone }) => {
  const qc = useQueryClient();
  const [customerType, setCustomerType] = useState("MEMBER");
  const [customerCode, setCustomerCode] = useState("");
  const [reason, setReason] = useState("");
  const [payments, setPayments] = useState<"KEEP_AS_CREDIT" | "TRANSFER">("KEEP_AS_CREDIT");
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () => billingService.changeInvoiceCustomer(invoiceNumber, { customerType, customerCode: customerCode.trim(), reason: reason.trim(), payments }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["billing-documents"] });
      qc.invalidateQueries({ queryKey: ["billing-document", invoiceNumber] });
      toast.success(r.mode === "REISSUE" ? `Facture réémise : ${r.newInvoice}.` : "Client modifié.");
      onDone(r.newInvoice);
    },
    onError: (e: unknown) => setError(billingError(e, "Impossible de changer le client.")),
  });

  return (
    <PanelForm title="Changer le client" submitLabel="Changer le client" pending={m.isPending} submitDisabled={!customerCode.trim() || !reason.trim()} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <p className="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500"><ArrowRightLeft size={14} className="mt-0.5 shrink-0" />Facture non certifiée : le client est remplacé sur place. Facture certifiée : elle est annulée par avoir puis réémise au nouveau client.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type de client">
          <select className={FIELD_SOFT} value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
            {Object.entries(CUSTOMER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Code du client" required><input className={`${FIELD_SOFT} font-mono`} value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} /></Field>
        <Field label="Paiements déjà reçus" className="sm:col-span-2">
          <select className={FIELD_SOFT} value={payments} onChange={(e) => setPayments(e.target.value as typeof payments)}>
            <option value="KEEP_AS_CREDIT">Les garder en avoir au premier client</option>
            <option value="TRANSFER">Les transférer au nouveau client</option>
          </select>
        </Field>
        <Field label="Motif" required className="sm:col-span-2"><input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </PanelForm>
  );
};
