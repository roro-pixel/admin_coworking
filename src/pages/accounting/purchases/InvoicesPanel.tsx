import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { purchaseService } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { PurchaseLinesEditor, newPLine, toLineInputs } from "../../../components/accounting/PurchaseLinesEditor";
import type { PLine } from "../../../components/accounting/PurchaseLinesEditor";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { SUPPLIERS_KEY } from "./SuppliersPanel";

export const INVOICES_KEY = "purchase-invoices";
export const invoiceTone = (s?: string) => (s === "POSTED" || s === "PAID" ? "success" : s === "PARTIALLY_PAID" ? "warn" : s === "CANCELLED" ? "danger" : "neutral");

const InvoiceForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const suppliers = useQuery({ queryKey: [SUPPLIERS_KEY], queryFn: purchaseService.suppliers });
  const [f, setF] = useState({ supplierCode: "", supplierReference: "", kind: "", invoiceDate: new Date().toISOString().slice(0, 10), dueDate: "", orderNumber: "", originalNumber: "", subject: "", documentRef: "", withholdingAmount: "", closeOrder: false });
  const [lines, setLines] = useState<PLine[]>([newPLine()]);
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => purchaseService.createInvoice({
      supplierCode: f.supplierCode, supplierReference: f.supplierReference, kind: f.kind, invoiceDate: f.invoiceDate, dueDate: f.dueDate, orderNumber: f.orderNumber,
      originalNumber: f.originalNumber, subject: f.subject, documentRef: f.documentRef, closeOrder: f.closeOrder || undefined,
      withholdingAmount: f.withholdingAmount.trim() ? Number(f.withholdingAmount.replace(",", ".")) : undefined, lines: toLineInputs(lines),
    }),
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: [INVOICES_KEY] }); toast.success("Facture enregistrée (non comptabilisée)"); if (v?.invoice?.number) nav(`/accounting/purchases/invoices/${encodeURIComponent(v.invoice.number)}`); else onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  const t = (k: "supplierReference" | "kind" | "orderNumber" | "originalNumber" | "subject" | "documentRef" | "withholdingAmount", label: string, hint?: string) => (
    <Field label={label} hint={hint}><input className={FIELD} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  return (
    <PanelForm title="Nouvelle facture fournisseur" onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.supplierCode || !toLineInputs(lines).length} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fournisseur" required>
          <select className={FIELD} value={f.supplierCode} onChange={(e) => setF({ ...f, supplierCode: e.target.value })}>
            <option value="">—</option>
            {(suppliers.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}
          </select>
        </Field>
        {t("supplierReference", "N° de la facture du fournisseur")}
        {t("kind", "Nature", "Facture, avoir… (selon le serveur)")}
        <Field label="Date de facture"><input type="date" className={FIELD} value={f.invoiceDate} onChange={(e) => setF({ ...f, invoiceDate: e.target.value })} /></Field>
        <Field label="Échéance" hint="Délai du fournisseur si vide"><input type="date" className={FIELD} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        {t("orderNumber", "Commande liée")}
        {t("originalNumber", "Facture d'origine", "Pour un avoir")}
        {t("subject", "Objet")}
        {t("documentRef", "Référence du justificatif")}
        {t("withholdingAmount", "Retenue (montant)", "Calculée selon le fournisseur si vide")}
      </div>
      <CheckField checked={f.closeOrder} onChange={(v) => setF({ ...f, closeOrder: v })} label="Solder la commande liée" />
      <PurchaseLinesEditor lines={lines} onChange={setLines} invoice />
    </PanelForm>
  );
};

export const InvoicesPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("SUPPLIER_INVOICE:MANAGE");
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: [INVOICES_KEY], queryFn: purchaseService.invoices });
  return (
    <div className="space-y-4">
      <ListHeader title="Factures fournisseurs" subtitle="Une facture est comptabilisée à la demande depuis son détail."
        action={canManage && !open ? <ActionButton onClick={() => setOpen(true)}>Nouvelle facture</ActionButton> : undefined} />
      {open && <InvoiceForm onClose={() => setOpen(false)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={FileText} title="Aucune facture" /> : (
        <div className="space-y-2">
          {q.data!.map((i) => (
            <button key={i.number} onClick={() => nav(`/accounting/purchases/invoices/${encodeURIComponent(i.number ?? "")}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{i.number} <span className="font-normal text-gray-400">· {i.supplierCode}{i.supplierReference ? ` · ${i.supplierReference}` : ""}</span></span>
                <span className="block truncate text-xs text-gray-400">{formatDate(i.invoiceDate)} → échéance {formatDate(i.dueDate)}{i.subject ? ` · ${i.subject}` : ""}</span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                <span className="font-mono">{money(i.netToPay ?? i.totalTtc)}</span>
                {i.status && <StatusChip tone={invoiceTone(i.status)}>{i.status}</StatusChip>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
