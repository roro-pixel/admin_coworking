import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { purchaseService } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, ErrorBlock, Field, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { INVOICES_KEY, invoiceTone } from "./InvoicesPanel";

export const InvoiceDetailPage: React.FC = () => {
  const { number = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("SUPPLIER_INVOICE:MANAGE");
  const canPay = hasPermission("SUPPLIER_PAYMENT:MANAGE");
  const [paying, setPaying] = useState(false);
  const [p, setP] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), treasuryAccount: "", journalCode: "", reference: "" });
  const [err, setErr] = useState<string | null>(null);
  const key = ["purchase-invoice", number];
  const q = useQuery({ queryKey: key, queryFn: () => purchaseService.invoice(number) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: [INVOICES_KEY] }); qc.invalidateQueries({ queryKey: ["purchase-payables"] }); };

  const post = () => toast.confirm({
    message: `Comptabiliser la facture ${number} ?`, detail: "Génère l'écriture d'achat. Elle ne se modifie plus ensuite.", confirmLabel: "Comptabiliser",
    successMessage: "Facture comptabilisée", errorMessage: "Comptabilisation impossible",
    onConfirm: async () => { await purchaseService.postInvoice(number); refresh(); },
  });
  const del = () => toast.confirm({
    tone: "danger", message: `Supprimer la facture ${number} ?`, confirmLabel: "Supprimer", successMessage: "Facture supprimée", errorMessage: "Suppression impossible",
    onConfirm: async () => { await purchaseService.deleteInvoice(number); qc.invalidateQueries({ queryKey: [INVOICES_KEY] }); nav("/accounting/purchases"); },
  });
  const pay = useMutation({
    mutationFn: () => purchaseService.payInvoice(number, { amount: p.amount.trim() ? Number(p.amount.replace(",", ".")) : undefined, date: p.date, treasuryAccount: p.treasuryAccount, journalCode: p.journalCode, reference: p.reference }),
    onSuccess: () => { toast.success("Paiement enregistré"); setPaying(false); setErr(null); refresh(); qc.invalidateQueries({ queryKey: ["accounting-entries"] }); },
    onError: (e) => setErr(apiMessage(e, "Paiement impossible.")),
  });

  const v = q.data;
  const inv = v?.invoice;
  const posted = !!inv?.entryNumber || !!inv?.postedAt;
  const remaining = (inv?.netToPay ?? 0) - (inv?.paidAmount ?? 0);

  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/purchases" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Achats</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !v || !inv ? <ErrorBlock message="Facture introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Facture {inv.number} {inv.status && <StatusChip tone={invoiceTone(inv.status)}>{inv.status}</StatusChip>}</h2>
              <div className="flex gap-2">
                {canManage && !posted && <ActionButton onClick={post}>Comptabiliser</ActionButton>}
                {canManage && !posted && <ActionButton variant="ghost" onClick={del}>Supprimer</ActionButton>}
                {canPay && posted && remaining > 0 && !paying && <ActionButton onClick={() => { setPaying(true); setP((x) => ({ ...x, amount: String(remaining) })); }}>Payer</ActionButton>}
              </div>
            </div>

            {paying && (
              <PanelForm title="Paiement fournisseur" onSubmit={(e) => { e.preventDefault(); setErr(null); pay.mutate(); }} onCancel={() => setPaying(false)} pending={pay.isPending} submitLabel="Payer" error={err}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Montant" hint={`Reste ${money(remaining)}`}><input className={FIELD} inputMode="decimal" value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} /></Field>
                  <Field label="Date"><input type="date" className={FIELD} value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} /></Field>
                  <Field label="Référence"><input className={FIELD} value={p.reference} onChange={(e) => setP({ ...p, reference: e.target.value })} /></Field>
                  <Field label="Compte de trésorerie"><input className={FIELD} value={p.treasuryAccount} onChange={(e) => setP({ ...p, treasuryAccount: e.target.value })} /></Field>
                  <Field label="Journal"><input className={FIELD} value={p.journalCode} onChange={(e) => setP({ ...p, journalCode: e.target.value })} /></Field>
                </div>
              </PanelForm>
            )}

            <Section title="Informations">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Fournisseur">{v.supplier?.name ? `${v.supplier.name} (${inv.supplierCode})` : inv.supplierCode}</Detail>
                <Detail label="N° du fournisseur">{inv.supplierReference}</Detail>
                <Detail label="Nature">{inv.kind}</Detail>
                <Detail label="Date">{formatDate(inv.invoiceDate)}</Detail>
                <Detail label="Échéance">{formatDate(inv.dueDate)}</Detail>
                <Detail label="Objet">{inv.subject}</Detail>
                <Detail label="Commande">{inv.orderNumber}</Detail>
                <Detail label="Facture d'origine">{inv.originalNumber}</Detail>
                <Detail label="Justificatif">{inv.documentRef}</Detail>
                <Detail label="Total HT" mono>{money(inv.totalHt)}</Detail>
                <Detail label="TVA" mono>{money(inv.totalVat)}</Detail>
                <Detail label="Total TTC" mono>{money(inv.totalTtc)}</Detail>
                <Detail label="Retenue" mono>{inv.withholdingAmount ? money(inv.withholdingAmount) : undefined}</Detail>
                <Detail label="Net à payer" mono>{money(inv.netToPay)}</Detail>
                <Detail label="Payé" mono>{money(inv.paidAmount)}</Detail>
                <Detail label="Compte fournisseur">{inv.payableAccount}</Detail>
                <Detail label="Écriture">{inv.entryNumber && <Link className="underline" to={`/accounting/entries/${encodeURIComponent(inv.entryNumber)}`}>{inv.entryNumber}</Link>}</Detail>
                <Detail label="Comptabilisée">{inv.postedAt ? `${formatDateTime(inv.postedAt)}${inv.postedBy ? ` par ${inv.postedBy}` : ""}` : undefined}</Detail>
              </div>
            </Section>

            <Section title={`Lignes (${v.lines.length})`}>
              <div className="space-y-1.5">
                {v.lines.map((l, i) => (
                  <div key={l.id ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">{l.designation}</span>
                      <span className="block text-xs text-gray-400">{[l.accountNumber && `compte ${l.accountNumber}`, l.quantity != null && `qté ${l.quantity}`, l.vatRate != null && `TVA ${l.vatRate} %`, l.sectionCode && `section ${l.sectionCode}`, l.fixedAssetCode && `immo ${l.fixedAssetCode}`, l.serviceStart && `service ${formatDate(l.serviceStart)} → ${formatDate(l.serviceEnd)}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="font-mono">{money(l.amountHt)}</span>
                  </div>
                ))}
              </div>
            </Section>

            {v.payments.length > 0 && (
              <Section title={`Paiements (${v.payments.length})`}>
                <div className="space-y-1.5">
                  {v.payments.map((x, i) => (
                    <div key={x.id ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                      <span className="text-gray-700">{formatDate(x.paymentDate)} · {x.treasuryAccount}{x.journalCode ? ` · ${x.journalCode}` : ""}{x.reference ? ` · ${x.reference}` : ""}</span>
                      <span className="flex items-center gap-3">
                        {x.entryNumber && <Link className="text-xs underline" to={`/accounting/entries/${encodeURIComponent(x.entryNumber)}`}>{x.entryNumber}</Link>}
                        <span className="font-mono">{money(x.amount)}</span>
                      </span>
                    </div>
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
