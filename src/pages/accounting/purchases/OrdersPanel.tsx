import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { purchaseService } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { PurchaseLinesEditor, newPLine, toLineInputs } from "../../../components/accounting/PurchaseLinesEditor";
import type { PLine } from "../../../components/accounting/PurchaseLinesEditor";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { SUPPLIERS_KEY } from "./SuppliersPanel";

export const ORDERS_KEY = "purchase-orders";
export const orderTone = (s?: string) => (s === "VALIDATED" || s === "INVOICED" ? "success" : s === "CANCELLED" ? "danger" : s === "PARTIALLY_INVOICED" ? "warn" : "neutral");

const OrderForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const suppliers = useQuery({ queryKey: [SUPPLIERS_KEY], queryFn: purchaseService.suppliers });
  const [f, setF] = useState({ supplierCode: "", subject: "", orderDate: new Date().toISOString().slice(0, 10), expectedDate: "", sectionCode: "" });
  const [lines, setLines] = useState<PLine[]>([newPLine()]);
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => purchaseService.createOrder({ ...f, lines: toLineInputs(lines) }),
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: [ORDERS_KEY] }); toast.success("Commande enregistrée"); if (v?.order?.number) nav(`/accounting/purchases/orders/${encodeURIComponent(v.order.number)}`); else onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  return (
    <PanelForm title="Nouvelle commande" onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.supplierCode || !toLineInputs(lines).length} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fournisseur" required>
          <select className={FIELD} value={f.supplierCode} onChange={(e) => setF({ ...f, supplierCode: e.target.value })}>
            <option value="">—</option>
            {(suppliers.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}
          </select>
        </Field>
        <Field label="Objet"><input className={FIELD} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Section analytique"><input className={FIELD} value={f.sectionCode} onChange={(e) => setF({ ...f, sectionCode: e.target.value })} /></Field>
        <Field label="Date de commande"><input type="date" className={FIELD} value={f.orderDate} onChange={(e) => setF({ ...f, orderDate: e.target.value })} /></Field>
        <Field label="Livraison attendue"><input type="date" className={FIELD} value={f.expectedDate} onChange={(e) => setF({ ...f, expectedDate: e.target.value })} /></Field>
      </div>
      <PurchaseLinesEditor lines={lines} onChange={setLines} />
    </PanelForm>
  );
};

const FromNeedForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const suppliers = useQuery({ queryKey: [SUPPLIERS_KEY], queryFn: purchaseService.suppliers });
  const [f, setF] = useState({ needNumber: "", supplierCode: "", lineNos: "" });
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => purchaseService.orderFromNeed({
      needNumber: f.needNumber, supplierCode: f.supplierCode,
      lineNos: f.lineNos.split(/[,\s;]+/).filter(Boolean).map(Number).filter((x) => !Number.isNaN(x)),
    }),
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: [ORDERS_KEY] }); toast.success("Commande créée depuis le besoin"); if (v?.order?.number) nav(`/accounting/purchases/orders/${encodeURIComponent(v.order.number)}`); else onClose(); },
    onError: (e) => setErr(apiMessage(e, "Création impossible.")),
  });
  return (
    <PanelForm title="Commande depuis un état de besoin" onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Créer" submitDisabled={!f.needNumber.trim() || !f.supplierCode} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="N° de l'état de besoin" required><input className={FIELD} value={f.needNumber} onChange={(e) => setF({ ...f, needNumber: e.target.value })} /></Field>
        <Field label="Fournisseur" required>
          <select className={FIELD} value={f.supplierCode} onChange={(e) => setF({ ...f, supplierCode: e.target.value })}>
            <option value="">—</option>
            {(suppliers.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}
          </select>
        </Field>
        <Field label="Lignes du besoin" hint="Numéros séparés par des virgules"><input className={FIELD} value={f.lineNos} onChange={(e) => setF({ ...f, lineNos: e.target.value })} /></Field>
      </div>
    </PanelForm>
  );
};

export const OrdersPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("PURCHASE_ORDER:MANAGE");
  const nav = useNavigate();
  const [mode, setMode] = useState<"order" | "need" | null>(null);
  const q = useQuery({ queryKey: [ORDERS_KEY], queryFn: purchaseService.orders });
  return (
    <div className="space-y-4">
      <ListHeader title="Bons de commande" subtitle="La validation engage le budget de la section."
        action={canManage && !mode ? <div className="flex gap-2"><ActionButton variant="ghost" onClick={() => setMode("need")}>Depuis un besoin</ActionButton><ActionButton onClick={() => setMode("order")}>Nouvelle commande</ActionButton></div> : undefined} />
      {mode === "order" && <OrderForm onClose={() => setMode(null)} />}
      {mode === "need" && <FromNeedForm onClose={() => setMode(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={ShoppingCart} title="Aucune commande" /> : (
        <div className="space-y-2">
          {q.data!.map((o) => (
            <button key={o.number} onClick={() => nav(`/accounting/purchases/orders/${encodeURIComponent(o.number ?? "")}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{o.number} <span className="font-normal text-gray-400">· {o.supplierCode}</span></span>
                <span className="block truncate text-xs text-gray-400">{formatDate(o.orderDate)}{o.subject ? ` · ${o.subject}` : ""} · facturé {money(o.invoicedHt)} / {money(o.totalHt)} HT</span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                <span className="font-mono">{money(o.totalTtc)}</span>
                {o.status && <StatusChip tone={orderTone(o.status)}>{o.status}</StatusChip>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
