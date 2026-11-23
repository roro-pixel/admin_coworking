import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, FileText, Truck } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { DeliveryNoteSummary } from "../../services/billing.service";
import { ActionButton, DataCard, Detail, Field, HeadRow, IconButton, ListHeader, PanelForm, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, MONO_LINK, ROW_HOVER, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUS_TONE } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

const COLS = "lg:grid-cols-[2.5rem_9rem_minmax(0,1fr)_9rem_minmax(0,1fr)_8rem_3rem]";
const STATUSES = ["", "DRAFT", "DELIVERED", "INVOICED", "CANCELLED"] as const;

type Action = { kind: "deliver" | "cancel" | "signed"; note: DeliveryNoteSummary };

const NoteDetail: React.FC<{ noteNumber: string }> = ({ noteNumber }) => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["billing-delivery-note", noteNumber], queryFn: () => billingService.getDeliveryNote(noteNumber) });
  if (isLoading) return <p className="p-3 text-sm text-gray-400">Chargement…</p>;
  if (isError || !data) return <p className="p-3 text-sm text-red-600">Détail indisponible.</p>;
  return (
    <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Detail label="Adresse de livraison" wide>{data.deliveryAddress}</Detail>
        <Detail label="Livré par">{data.deliveredBy}</Detail>
        <Detail label="Reçu par">{data.receivedBy}</Detail>
        <Detail label="Copie signée" mono>{data.signedCopyReference}</Detail>
        <Detail label="Stock sorti">{data.stockIssued ? "Oui" : undefined}</Detail>
        <Detail label="Annulé le">{data.cancelledAt ? formatDateTime(data.cancelledAt) : undefined}</Detail>
        <Detail label="Motif d'annulation" wide>{data.cancelReason}</Detail>
        <Detail label="Notes" wide>{data.notes}</Detail>
      </div>
      <div className="space-y-1.5">
        {(data.lines ?? []).map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-gray-800">{l.description ?? l.itemCode}</span>
            <span className="shrink-0 tabular-nums text-gray-600">
              {l.quantity}{l.unit ? ` ${l.unit}` : ""}{data.showPrices && l.unitPrice != null ? ` × ${formatMoney(l.unitPrice)}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Bons de livraison : liste, livraison, annulation, copie signée, PDF et facturation groupée. */
export const BillingDeliveryNotes: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCancel = hasPermission("BILLING:CANCEL");
  const canCreate = hasPermission("BILLING:CREATE");
  const [status, setStatus] = useState<string>("");
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-delivery-notes", "all", status, customer?.type, customer?.code],
    queryFn: () => billingService.listDeliveryNotes({ status: status || undefined, customerType: customer?.type, customerCode: customer?.code }),
  });
  const notes = data ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-delivery-notes"] }); qc.invalidateQueries({ queryKey: ["billing-delivery-note"] }); qc.invalidateQueries({ queryKey: ["billing-delivery-status"] }); };

  const run = useMutation({
    mutationFn: () => {
      const a = action!;
      if (a.kind === "deliver") return billingService.deliverDeliveryNote(a.note.noteNumber, text.trim() || undefined);
      if (a.kind === "cancel") return billingService.cancelDeliveryNote(a.note.noteNumber, text.trim() || undefined);
      return billingService.attachSignedCopy(a.note.noteNumber, text.trim() || undefined);
    },
    onSuccess: () => { refresh(); toast.success("Bon de livraison mis à jour."); setAction(null); setText(""); setError(null); },
    onError: (e: unknown) => setError(billingError(e, "Action impossible.")),
  });

  const invoice = useMutation({
    mutationFn: () => billingService.invoiceDeliveryNotes(Array.from(picked)),
    onSuccess: (doc) => { refresh(); setPicked(new Set()); toast.success(`Facture ${doc.documentNumber} créée.`); navigate(`/billing/documents/${doc.documentNumber}`); },
    onError: (e: unknown) => toast.error(billingError(e, "Facturation impossible : les bons doivent être livrés et du même client.")),
  });

  const pdf = useMutation({
    mutationFn: async (n: string) => saveBlob(await billingService.getDeliveryNotePdf(n), `BL_${n}.pdf`),
    onError: (e: unknown) => toast.error(billingError(e, "PDF indisponible.")),
  });

  const toggle = (n: string) => setPicked((p) => { const x = new Set(p); if (x.has(n)) x.delete(n); else x.add(n); return x; });
  const TITLES = { deliver: "Confirmer la livraison", cancel: "Annuler le bon de livraison", signed: "Enregistrer la copie signée" };
  const LABELS = { deliver: "Reçu par", cancel: "Motif", signed: "Référence de la copie signée" };

  return (
    <div className="space-y-5">
      <ListHeader title="Bons de livraison" subtitle="Les bons se créent depuis une facture ou un devis ; ici, suivi et facturation groupée" />

      <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
        <PillChoice label="Statut" options={STATUSES.map((s) => ({ value: s, label: s === "" ? "Tous" : DELIVERY_STATUS_LABEL[s] }))} value={status} onChange={setStatus} />
        <CustomerPicker value={customer} onChange={setCustomer} />
      </div>

      {action && (
        <PanelForm title={`${TITLES[action.kind]} ${action.note.noteNumber}`} submitLabel="Confirmer" pending={run.isPending} submitDisabled={action.kind === "cancel" ? false : false} error={error} onCancel={() => { setAction(null); setError(null); }} onSubmit={(e) => { e.preventDefault(); setError(null); run.mutate(); }}>
          {action.kind === "cancel" && <p className="text-sm text-gray-500">Un bon livré dont le stock est sorti remet le stock en place à l'annulation.</p>}
          <Field label={LABELS[action.kind]} hint="Facultatif"><input className={FIELD_SOFT} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        </PanelForm>
      )}

      {canCreate && picked.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800">{picked.size} bon{picked.size > 1 ? "s" : ""} sélectionné{picked.size > 1 ? "s" : ""}</p>
          <ActionButton icon={FileText} pending={invoice.isPending} onClick={() => invoice.mutate()}>Facturer la sélection</ActionButton>
        </div>
      )}

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={notes.length === 0} icon={Truck} title="Aucun bon de livraison">
        <HeadRow cols={COLS}><span /><span>N° bon</span><span>Client</span><span>Source</span><span>Facture</span><span>Statut</span><span /></HeadRow>
        <DataCard>
          {notes.map((n) => {
            const expanded = open === n.noteNumber;
            const selectable = n.status === "DELIVERED" && !n.invoiceNumber;
            return (
              <div key={n.noteNumber} className="max-lg:mb-2">
                <div className={`grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                  <div>{selectable && canCreate ? <input type="checkbox" aria-label="Sélectionner" checked={picked.has(n.noteNumber)} onChange={() => toggle(n.noteNumber)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" /> : null}</div>
                  <button type="button" onClick={() => setOpen(expanded ? null : n.noteNumber)} className={`truncate text-left font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)] ${FOCUS}`}>{n.noteNumber}</button>
                  <p className="truncate text-sm text-gray-700">{n.customerName ?? "—"}</p>
                  <p className="text-sm">{n.sourceDocumentNumber ? <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${n.sourceDocumentNumber}`)}>{n.sourceDocumentNumber}</button> : "—"}</p>
                  <p className="text-sm">{n.invoiceNumber ? <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${n.invoiceNumber}`)}>{n.invoiceNumber}</button> : <span className="text-gray-400">{n.deliveredAt ? formatDateTime(n.deliveredAt) : "—"}</span>}</p>
                  <div><StatusChip tone={DELIVERY_STATUS_TONE[n.status ?? ""] ?? "neutral"}>{DELIVERY_STATUS_LABEL[n.status ?? ""] ?? n.status}</StatusChip></div>
                  <div className="flex justify-end"><IconButton icon={expanded ? ChevronUp : ChevronDown} label="Détail" onClick={() => setOpen(expanded ? null : n.noteNumber)} /></div>
                </div>
                {expanded && (
                  <div className="space-y-3 px-4 pb-4">
                    <NoteDetail noteNumber={n.noteNumber} />
                    <div className="flex flex-wrap gap-2">
                      <ActionButton variant="ghost" icon={Download} pending={pdf.isPending && pdf.variables === n.noteNumber} onClick={() => pdf.mutate(n.noteNumber)}>PDF</ActionButton>
                      {canUpdate && n.status === "DRAFT" && <ActionButton onClick={() => { setAction({ kind: "deliver", note: n }); setText(""); setError(null); }}>Confirmer la livraison</ActionButton>}
                      {canUpdate && n.status === "DELIVERED" && <ActionButton variant="ghost" onClick={() => { setAction({ kind: "signed", note: n }); setText(""); setError(null); }}>Copie signée</ActionButton>}
                      {canCancel && (n.status === "DRAFT" || n.status === "DELIVERED") && <ActionButton variant="danger" onClick={() => { setAction({ kind: "cancel", note: n }); setText(""); setError(null); }}>Annuler</ActionButton>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </DataCard>
      </QueryState>
    </div>
  );
};
