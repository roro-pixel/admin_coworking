import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { purchaseService } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, ErrorBlock, Field, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ORDERS_KEY, orderTone } from "./OrdersPanel";
import { invoiceTone } from "./InvoicesPanel";

export const OrderDetailPage: React.FC = () => {
  const { number = "" } = useParams();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canValidate = hasPermission("PURCHASE_ORDER:VALIDATE");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const key = ["purchase-order", number];
  const q = useQuery({ queryKey: key, queryFn: () => purchaseService.order(number) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: [ORDERS_KEY] }); };

  const validate = () => toast.confirm({
    message: `Valider la commande ${number} ?`, detail: "Engage le budget de la section.", confirmLabel: "Valider",
    successMessage: "Commande validée", errorMessage: "Validation impossible",
    onConfirm: async () => { await purchaseService.validateOrder(number); refresh(); },
  });
  const cancel = useMutation({
    mutationFn: () => purchaseService.cancelOrder(number, reason),
    onSuccess: () => { toast.success("Commande annulée"); setCancelling(false); setReason(""); refresh(); },
    onError: (e) => toast.error(apiMessage(e, "Annulation impossible.")),
  });
  const pdf = async () => {
    try { saveBlob(await purchaseService.orderPdf(number), `commande-${number}.pdf`); }
    catch (e) { toast.error(apiMessage(e, "PDF indisponible.")); }
  };

  const v = q.data;
  const o = v?.order;
  const closed = o?.status === "CANCELLED";
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/purchases" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Achats</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !v || !o ? <ErrorBlock message="Commande introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Commande {o.number} {o.status && <StatusChip tone={orderTone(o.status)}>{o.status}</StatusChip>}</h2>
              <div className="flex gap-2">
                <ActionButton variant="ghost" onClick={pdf}>PDF</ActionButton>
                {canValidate && !o.validatedAt && !closed && <ActionButton onClick={validate}>Valider</ActionButton>}
                {canValidate && !closed && !cancelling && <ActionButton variant="ghost" onClick={() => setCancelling(true)}>Annuler</ActionButton>}
              </div>
            </div>
            {cancelling && (
              <PanelForm title="Annuler la commande" onSubmit={(e) => { e.preventDefault(); cancel.mutate(); }} onCancel={() => setCancelling(false)} pending={cancel.isPending} submitLabel="Annuler la commande" submitDisabled={!reason.trim()}>
                <Field label="Motif" required><input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              </PanelForm>
            )}
            <Section title="Informations">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Fournisseur">{v.supplier?.name ? `${v.supplier.name} (${o.supplierCode})` : o.supplierCode}</Detail>
                <Detail label="Objet">{o.subject}</Detail>
                <Detail label="Section">{o.sectionCode}</Detail>
                <Detail label="Date">{formatDate(o.orderDate)}</Detail>
                <Detail label="Livraison attendue">{formatDate(o.expectedDate)}</Detail>
                <Detail label="État de besoin">{o.needStatementNumber}</Detail>
                <Detail label="Total HT" mono>{money(o.totalHt)}</Detail>
                <Detail label="TVA" mono>{money(o.totalVat)}</Detail>
                <Detail label="Total TTC" mono>{money(o.totalTtc)}</Detail>
                <Detail label="Facturé HT" mono>{money(o.invoicedHt)}</Detail>
                <Detail label="Budget engagé">{o.budgetCommitted ? "Oui" : "Non"}</Detail>
                <Detail label="Validée">{o.validatedAt ? `${formatDateTime(o.validatedAt)}${o.validatedBy ? ` par ${o.validatedBy}` : ""}` : undefined}</Detail>
                <Detail label="Annulée" wide>{o.cancelledBy ? `${o.cancelledBy}${o.cancelReason ? ` : ${o.cancelReason}` : ""}` : undefined}</Detail>
              </div>
            </Section>
            <Section title={`Lignes (${v.lines.length})`}>
              <div className="space-y-1.5">
                {v.lines.map((l, i) => (
                  <div key={l.id ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">{l.lineNo != null ? `${l.lineNo}. ` : ""}{l.designation}</span>
                      <span className="block text-xs text-gray-400">{[l.quantity != null && `${l.quantity} × ${money(l.unitPrice)}`, l.accountNumber && `compte ${l.accountNumber}`, l.vatRate != null && `TVA ${l.vatRate} %`, l.invoicedHt != null && `facturé ${money(l.invoicedHt)}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="font-mono">{money(l.amountHt)}</span>
                  </div>
                ))}
              </div>
            </Section>
            {v.invoices.length > 0 && (
              <Section title="Factures liées">
                <div className="space-y-1.5">
                  {v.invoices.map((i) => (
                    <Link key={i.number} to={`/accounting/purchases/invoices/${encodeURIComponent(i.number ?? "")}`} className="flex items-center justify-between rounded-xl bg-white p-2.5 text-sm shadow-sm hover:bg-gray-50">
                      <span>{i.number} · {formatDate(i.invoiceDate)}</span>
                      <span className="flex items-center gap-3"><span className="font-mono">{money(i.totalTtc)}</span>{i.status && <StatusChip tone={invoiceTone(i.status)}>{i.status}</StatusChip>}</span>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </AccountingShell>
  );
};
