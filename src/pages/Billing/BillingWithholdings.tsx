import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileCheck2, Percent, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { Withholding, WithholdingType } from "../../services/billing.service";
import { ActionButton, Field, ItemRow, ListHeader, PanelForm, StatusChip, Switch, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { WITHHOLDING_BASE_LABEL, WITHHOLDING_STATUS_TONE } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

type Tab = "list" | "types";
const TABS: TabItem<Tab>[] = [{ id: "list", label: "Retenues", icon: FileCheck2 }, { id: "types", label: "Types de retenue", icon: Percent }];
const emptyType = { code: "", label: "", rate: "", base: "TTC" as "TTC" | "HT" | "TVA", account: "", displayOrder: "" };

const Types: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BILLING:CREATE");
  const canUpdate = hasPermission("BILLING:UPDATE");
  const [inactive, setInactive] = useState(false);
  const [editing, setEditing] = useState<{ code?: string } | null>(null);
  const [form, setForm] = useState(emptyType);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-withholding-types", "all", inactive], queryFn: () => billingService.listWithholdingTypes(inactive) });
  const list = data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["billing-withholding-types"] });
  const set = (k: keyof typeof emptyType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const start = (t?: WithholdingType) => {
    setError(null);
    setEditing({ code: t?.code });
    setForm(t ? { code: t.code, label: t.label, rate: t.rate?.toString() ?? "", base: (t.base as "TTC" | "HT" | "TVA") ?? "TTC", account: t.account ?? "", displayOrder: t.displayOrder?.toString() ?? "" } : emptyType);
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { label: form.label.trim(), rate: toNum(form.rate), base: form.base, account: form.account.trim(), displayOrder: toNum(form.displayOrder) };
      return editing?.code ? billingService.updateWithholdingType(editing.code, body) : billingService.createWithholdingType({ code: form.code.trim().toUpperCase(), ...body });
    },
    onSuccess: () => { refresh(); setEditing(null); toast.success("Type enregistré."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });
  const toggle = useMutation({
    mutationFn: (t: WithholdingType) => billingService.setWithholdingTypeActive(t.code, t.active === false),
    onSuccess: refresh,
    onError: (e: unknown) => toast.error(billingError(e, "Changement impossible.")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch checked={inactive} onChange={setInactive} label="Afficher aussi les types inactifs" />
        {canCreate && <ActionButton icon={Plus} onClick={() => start()}>Nouveau type</ActionButton>}
      </div>
      {editing && (
        <PanelForm title={editing.code ? `Modifier ${editing.code}` : "Nouveau type de retenue"} submitLabel="Enregistrer" pending={save.isPending} submitDisabled={!form.label.trim() || !form.account.trim() || (!editing.code && !form.code.trim())} error={error} onCancel={() => setEditing(null)} onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {!editing.code && <Field label="Code" required><input className={`${FIELD_SOFT} font-mono uppercase`} value={form.code} onChange={set("code")} /></Field>}
            <Field label="Libellé" required><input className={FIELD_SOFT} value={form.label} onChange={set("label")} /></Field>
            <Field label="Taux (%)" hint="Vide : saisi à chaque retenue"><input type="number" min={0} step="any" className={FIELD_SOFT} value={form.rate} onChange={set("rate")} /></Field>
            <Field label="Base de calcul" required><select className={FIELD_SOFT} value={form.base} onChange={set("base")}>{Object.entries(WITHHOLDING_BASE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Compte comptable" required hint="Compte de la retenue subie"><input className={`${FIELD_SOFT} font-mono`} value={form.account} onChange={set("account")} /></Field>
            <Field label="Ordre"><input type="number" className={FIELD_SOFT} value={form.displayOrder} onChange={set("displayOrder")} /></Field>
          </div>
        </PanelForm>
      )}
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={Percent} title="Aucun type de retenue" rows={3}>
        <div className="space-y-2">
          {list.map((t) => (
            <ItemRow key={t.code}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t.label} <span className="font-mono text-xs font-normal text-gray-400">{t.code}</span></p>
                  <p className="text-xs text-gray-500">{t.rate != null ? `${t.rate} %` : "Taux libre"} · {WITHHOLDING_BASE_LABEL[t.base ?? ""] ?? t.base} · compte {t.account}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={t.active === false ? "neutral" : "success"}>{t.active === false ? "Inactif" : "Actif"}</StatusChip>
                  {canUpdate && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => start(t)}>Modifier</ActionButton>}
                  {canUpdate && <ActionButton variant="ghost" className="!px-4 !py-2" pending={toggle.isPending && toggle.variables?.code === t.code} onClick={() => toggle.mutate(t)}>{t.active === false ? "Activer" : "Désactiver"}</ActionButton>}
                </div>
              </div>
            </ItemRow>
          ))}
        </div>
      </QueryState>
    </div>
  );
};

const List: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCancel = hasPermission("BILLING:CANCEL");
  const [missing, setMissing] = useState(true);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [act, setAct] = useState<{ kind: "cert" | "cancel"; w: Withholding } | null>(null);
  const [ref, setRef] = useState("");
  const [doc, setDoc] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-withholdings", "all", missing, customer?.type, customer?.code],
    queryFn: () => billingService.listWithholdings({ certificate: missing ? "missing" : undefined, customerType: customer?.type, customerCode: customer?.code }),
  });
  const list = data ?? [];
  const run = useMutation({
    mutationFn: () => act!.kind === "cert"
      ? billingService.attachWithholdingCertificate(act!.w.withholdingNumber, { certificateDocument: doc.trim(), certificateReference: ref.trim() || undefined })
      : billingService.cancelWithholding(act!.w.withholdingNumber, reason.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-withholdings"] }); qc.invalidateQueries({ queryKey: ["billing-document-withholdings"] }); setAct(null); setRef(""); setDoc(""); setReason(""); setError(null); toast.success("Retenue mise à jour."); },
    onError: (e: unknown) => setError(billingError(e, "Action impossible.")),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
        <Switch checked={missing} onChange={setMissing} label="Attestations manquantes seulement" hint="Retenues subies dont le client n'a pas encore remis l'attestation" />
        <CustomerPicker value={customer} onChange={setCustomer} />
      </div>
      {act && (
        <PanelForm title={act.kind === "cert" ? `Attestation de ${act.w.withholdingNumber}` : `Annuler ${act.w.withholdingNumber}`} submitLabel="Confirmer" pending={run.isPending} submitDisabled={act.kind === "cert" ? !doc.trim() : !reason.trim()} error={error} onCancel={() => { setAct(null); setError(null); }} onSubmit={(e) => { e.preventDefault(); setError(null); run.mutate(); }}>
          {act.kind === "cert" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Document (GED)" required hint="Référence du fichier déposé"><input className={`${FIELD_SOFT} font-mono`} value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
              <Field label="Référence de l'attestation"><input className={FIELD_SOFT} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
            </div>
          ) : <Field label="Motif" required><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        </PanelForm>
      )}
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={FileCheck2} title={missing ? "Aucune attestation en attente" : "Aucune retenue"}>
        <div className="space-y-2">
          {list.map((w) => {
            const cur = currencyLabel(w.currency ?? "XAF");
            return (
              <ItemRow key={w.withholdingNumber}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{w.typeLabel ?? w.typeCode} <span className="font-mono text-xs font-normal text-gray-400">{w.withholdingNumber}</span></p>
                    <p className="text-xs text-gray-500">
                      {w.documentNumber && <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${w.documentNumber}`)}>{w.documentNumber}</button>} · base {formatMoney(w.baseAmount ?? 0, cur)} à {w.rate} % · {formatDate(w.withheldOn)}
                      {w.certificateReference ? ` · attestation ${w.certificateReference}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(w.amount ?? 0, cur)}</span>
                    {w.certificateMissing && <StatusChip tone="warn">Attestation manquante</StatusChip>}
                    <StatusChip tone={WITHHOLDING_STATUS_TONE[w.status ?? ""] ?? "neutral"}>{w.status === "CANCELLED" ? "Annulée" : "Enregistrée"}</StatusChip>
                    {canUpdate && w.status !== "CANCELLED" && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setAct({ kind: "cert", w }); setError(null); }}>Attestation</ActionButton>}
                    {canCancel && w.status !== "CANCELLED" && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setAct({ kind: "cancel", w }); setError(null); }}>Annuler</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};

/** Retenues à la source : suivi des attestations et types de retenue. */
export const BillingWithholdings: React.FC = () => {
  const [tab, setTab] = useState<Tab>("list");
  return (
    <div className="space-y-5">
      <ListHeader title="Retenues à la source" subtitle="Retenues subies sur les factures, attestations à récupérer et types disponibles" />
      <Tabs items={TABS} active={tab} onChange={setTab} variant="soft" />
      {tab === "list" ? <List /> : <Types />}
    </div>
  );
};
