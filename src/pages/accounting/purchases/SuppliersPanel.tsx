import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { purchaseService } from "../../../services/purchase.service";
import type { Supplier } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const SUPPLIERS_KEY = "purchase-suppliers";
const n = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));

const SupplierForm: React.FC<{ initial?: Supplier; onClose: () => void }> = ({ initial, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState({
    code: initial?.code ?? "", name: initial?.name ?? "", niu: initial?.niu ?? "", rccm: initial?.rccm ?? "", address: initial?.address ?? "",
    phone: initial?.phone ?? "", email: initial?.email ?? "", bankDetails: initial?.bankDetails ?? "", paymentTermsDays: initial?.paymentTermsDays?.toString() ?? "",
    accountNumber: initial?.accountNumber ?? "", defaultAccount: initial?.defaultAccount ?? "", vatExempt: !!initial?.vatExempt,
    withholdingRate: initial?.withholdingRate?.toString() ?? "", withholdingAccount: initial?.withholdingAccount ?? "", withholdingBase: initial?.withholdingBase ?? "", withholdingLabel: initial?.withholdingLabel ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => purchaseService.saveSupplier({
      ...(initial ? { id: initial.id } : {}), code: f.code || undefined, name: f.name, niu: f.niu, rccm: f.rccm, address: f.address, phone: f.phone, email: f.email, bankDetails: f.bankDetails,
      paymentTermsDays: n(f.paymentTermsDays), accountNumber: f.accountNumber, defaultAccount: f.defaultAccount, vatExempt: f.vatExempt,
      withholdingRate: n(f.withholdingRate), withholdingAccount: f.withholdingAccount, withholdingBase: f.withholdingBase, withholdingLabel: f.withholdingLabel,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }); toast.success("Fournisseur enregistré"); onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  const t = (k: keyof typeof f, label: string, hint?: string, disabled?: boolean) => (
    <Field label={label} hint={hint}><input className={FIELD} disabled={disabled} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  return (
    <PanelForm title={initial ? `Modifier ${initial.code}` : "Nouveau fournisseur"} onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.name.trim()} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        {t("code", "Code", "Généré si vide", !!initial)}
        <Field label="Raison sociale" required><input className={FIELD} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {t("niu", "NIU")}{t("rccm", "RCCM")}{t("phone", "Téléphone")}{t("email", "E-mail")}
        {t("address", "Adresse")}{t("bankDetails", "Coordonnées bancaires")}
        <Field label="Délai de paiement (jours)"><input className={FIELD} inputMode="numeric" value={f.paymentTermsDays} onChange={(e) => setF({ ...f, paymentTermsDays: e.target.value })} /></Field>
        {t("accountNumber", "Compte fournisseur")}{t("defaultAccount", "Compte de charge par défaut")}
      </div>
      <CheckField checked={f.vatExempt} onChange={(v) => setF({ ...f, vatExempt: v })} label="Exonéré de TVA" />
      <p className="pt-2 text-xs font-semibold text-gray-500">Retenue à la source</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Taux %"><input className={FIELD} inputMode="decimal" value={f.withholdingRate} onChange={(e) => setF({ ...f, withholdingRate: e.target.value })} /></Field>
        {t("withholdingAccount", "Compte de retenue")}{t("withholdingBase", "Base")}{t("withholdingLabel", "Libellé")}
      </div>
    </PanelForm>
  );
};

export const SuppliersPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("SUPPLIER:MANAGE");
  const qc = useQueryClient();
  const [form, setForm] = useState<Supplier | "new" | null>(null);
  const [inv, setInv] = useState("");
  const q = useQuery({ queryKey: [SUPPLIERS_KEY], queryFn: purchaseService.suppliers });
  const fromInv = useMutation({
    mutationFn: () => purchaseService.supplierFromInventory(inv.trim()),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }); toast.success(`Fournisseur ${s.code ?? ""} créé`); setInv(""); },
    onError: (e) => toast.error(apiMessage(e, "Création impossible.")),
  });
  return (
    <div className="space-y-4">
      <ListHeader title="Fournisseurs" subtitle="Tiers fournisseurs, délais de paiement et retenues à la source."
        action={canManage && !form ? <ActionButton onClick={() => setForm("new")}>Nouveau fournisseur</ActionButton> : undefined} />
      {form && <SupplierForm initial={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Reprendre un fournisseur du stock" hint="Code du fournisseur côté inventaire"><input className={FIELD} value={inv} onChange={(e) => setInv(e.target.value)} /></Field>
          <ActionButton variant="ghost" disabled={!inv.trim()} pending={fromInv.isPending} onClick={() => fromInv.mutate()}>Créer</ActionButton>
        </div>
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Building2} title="Aucun fournisseur" /> : (
        <div className="space-y-2">
          {q.data!.map((s) => (
            <div key={s.code ?? s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.name} <span className="font-normal text-gray-400">· {s.code}</span></p>
                <p className="truncate text-xs text-gray-400">{[s.niu && `NIU ${s.niu}`, s.paymentTermsDays != null && `${s.paymentTermsDays} j`, s.withholdingRate ? `retenue ${s.withholdingRate} %` : null, s.vatExempt ? "exonéré TVA" : null].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.status && <StatusChip tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</StatusChip>}
                <Link className="text-sm font-semibold text-gray-700 underline" to={`/accounting/purchases/suppliers/${encodeURIComponent(s.code ?? "")}`}>Relevé</Link>
                {canManage && <ActionButton variant="ghost" onClick={() => setForm(s)}>Modifier</ActionButton>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
