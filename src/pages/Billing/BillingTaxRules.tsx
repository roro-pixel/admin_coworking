import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Percent, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { TaxRule } from "../../services/billing.service";
import { ActionButton, Field, ItemRow, ListHeader, PanelForm, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDate } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { TAX_TREATMENT_LABEL } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState, toNum } from "../../components/billing/pageKit";

const today = () => new Date().toLocaleDateString("sv-SE");
const emptyCreate = { code: "", name: "", taxType: "VAT", rate: "", treatment: "STANDARD", labelOnDocument: "", exemptionReason: "", countryCode: "", validFrom: today(), displayOrder: "" };

const Versions: React.FC<{ baseCode: string }> = ({ baseCode }) => {
  const { data, isLoading } = useQuery({ queryKey: ["billing-tax-rule-versions", baseCode], queryFn: () => billingService.getTaxRuleVersions(baseCode) });
  if (isLoading) return <p className="mt-3 text-sm text-gray-400">Chargement…</p>;
  return (
    <div className="mt-3 space-y-1.5 rounded-2xl bg-gray-50 p-3">
      {(data ?? []).map((v) => (
        <div key={v.code} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
          <span className="font-mono text-xs text-gray-600">{v.code}</span>
          <span className="tabular-nums text-gray-800">{v.rate} %</span>
          <span className="text-xs text-gray-500">{formatDate(v.validFrom)} → {v.validUntil ? formatDate(v.validUntil) : "sans fin"}</span>
          {v.currentlyValid && <StatusChip tone="success">En vigueur</StatusChip>}
        </div>
      ))}
    </div>
  );
};

/**
 * Règles de taxe. Une règle est versionnée : on ne change jamais son taux, on programme une règle
 * successeur à une date. Lecture : BILLING:READ ; écriture : BILLING:TAX_RULES en plus.
 */
export const BillingTaxRules: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const special = hasPermission("BILLING:TAX_RULES");
  const canCreate = special && hasPermission("BILLING:CREATE");
  const canUpdate = special && hasPermission("BILLING:UPDATE");
  const [inactive, setInactive] = useState(false);
  const [mode, setMode] = useState<{ kind: "create" } | { kind: "edit"; rule: TaxRule } | { kind: "successor"; rule: TaxRule } | null>(null);
  const [form, setForm] = useState(emptyCreate);
  const [versions, setVersions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-tax-rules", inactive], queryFn: () => billingService.listTaxRules(inactive) });
  const rules = data ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-tax-rules"] }); qc.invalidateQueries({ queryKey: ["billing-tax-rule-versions"] }); qc.invalidateQueries({ queryKey: ["billing-catalog-references"] }); };
  const set = (k: keyof typeof emptyCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const open = (m: NonNullable<typeof mode>) => {
    setError(null);
    setMode(m);
    if (m.kind === "create") setForm(emptyCreate);
    else setForm({ ...emptyCreate, name: m.rule.name, labelOnDocument: m.rule.labelOnDocument ?? "", exemptionReason: m.rule.exemptionReason ?? "", displayOrder: m.rule.displayOrder?.toString() ?? "", rate: m.kind === "successor" ? "" : m.rule.rate?.toString() ?? "", validFrom: today() });
  };

  const save = useMutation({
    mutationFn: () => {
      const m = mode!;
      if (m.kind === "create") return billingService.createTaxRule({ code: form.code.trim().toUpperCase(), name: form.name.trim(), taxType: form.taxType.trim() || undefined, rate: toNum(form.rate) ?? 0, treatment: form.treatment, labelOnDocument: form.labelOnDocument.trim() || undefined, exemptionReason: form.exemptionReason.trim() || undefined, countryCode: form.countryCode.trim() || undefined, validFrom: form.validFrom || undefined, displayOrder: toNum(form.displayOrder) });
      if (m.kind === "edit") return billingService.updateTaxRule(m.rule.code, { name: form.name.trim() || undefined, labelOnDocument: form.labelOnDocument.trim() || undefined, exemptionReason: form.exemptionReason.trim() || undefined, displayOrder: toNum(form.displayOrder) });
      return billingService.createTaxRuleSuccessor(m.rule.baseCode ?? m.rule.code, { rate: toNum(form.rate) ?? 0, validFrom: form.validFrom, name: form.name.trim() || undefined, labelOnDocument: form.labelOnDocument.trim() || undefined });
    },
    onSuccess: () => { refresh(); setMode(null); setError(null); toast.success("Règle enregistrée."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });
  const toggle = useMutation({
    mutationFn: (r: TaxRule) => billingService.setTaxRuleActive(r.code, r.active === false),
    onSuccess: refresh,
    onError: (e: unknown) => toast.error(billingError(e, "Changement impossible.")),
  });

  const titles = { create: "Nouvelle règle de taxe", edit: "Modifier la règle", successor: "Programmer un nouveau taux" };
  const invalid = mode?.kind === "create" ? !form.code.trim() || !form.name.trim() || toNum(form.rate) == null : mode?.kind === "successor" ? toNum(form.rate) == null || !form.validFrom : false;

  return (
    <div className="space-y-5">
      <ListHeader title="Règles de taxe" subtitle="Taux de TVA et autres taxes applicables aux lignes de documents" action={canCreate ? <ActionButton icon={Plus} onClick={() => open({ kind: "create" })}>Nouvelle règle</ActionButton> : undefined} />
      {!special && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">Lecture seule : la modification des règles de taxe exige l'autorité BILLING:TAX_RULES.</p>}

      {mode && (
        <PanelForm title={titles[mode.kind]} submitLabel="Enregistrer" pending={save.isPending} submitDisabled={invalid} error={error} onCancel={() => setMode(null)} onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
          {mode.kind === "successor" && <p className="text-sm text-gray-500">Le taux actuel de {mode.rule.name} reste appliqué jusqu'à la veille de la date choisie ; les documents déjà émis ne changent pas.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {mode.kind === "create" && <Field label="Code" required><input className={`${FIELD_SOFT} font-mono uppercase`} value={form.code} onChange={set("code")} /></Field>}
            <Field label="Nom" required={mode.kind === "create"}><input className={FIELD_SOFT} value={form.name} onChange={set("name")} /></Field>
            {mode.kind !== "edit" && <Field label="Taux (%)" required><input type="number" min={0} step="any" className={FIELD_SOFT} value={form.rate} onChange={set("rate")} /></Field>}
            {mode.kind !== "edit" && <Field label="Applicable dès le" required={mode.kind === "successor"}><input type="date" className={FIELD_SOFT} value={form.validFrom} onChange={set("validFrom")} /></Field>}
            {mode.kind === "create" && (
              <>
                <Field label="Traitement"><select className={FIELD_SOFT} value={form.treatment} onChange={set("treatment")}>{Object.entries(TAX_TREATMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Type de taxe"><input className={FIELD_SOFT} value={form.taxType} onChange={set("taxType")} /></Field>
                <Field label="Pays"><input className={FIELD_SOFT} value={form.countryCode} onChange={set("countryCode")} maxLength={2} /></Field>
              </>
            )}
            {mode.kind !== "successor" && <Field label="Mention d'exonération"><input className={FIELD_SOFT} value={form.exemptionReason} onChange={set("exemptionReason")} /></Field>}
            <Field label="Libellé sur le document"><input className={FIELD_SOFT} value={form.labelOnDocument} onChange={set("labelOnDocument")} /></Field>
            {mode.kind !== "successor" && <Field label="Ordre"><input type="number" className={FIELD_SOFT} value={form.displayOrder} onChange={set("displayOrder")} /></Field>}
          </div>
        </PanelForm>
      )}

      <Switch checked={inactive} onChange={setInactive} label="Afficher aussi les règles inactives" />

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={rules.length === 0} icon={Percent} title="Aucune règle de taxe">
        <div className="space-y-2">
          {rules.map((r) => {
            const base = r.baseCode ?? r.code;
            return (
              <ItemRow key={r.code}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{r.name} <span className="font-mono text-xs font-normal text-gray-400">{r.code}</span></p>
                    <p className="text-xs text-gray-500">{TAX_TREATMENT_LABEL[r.treatment ?? ""] ?? r.treatment}{r.taxType ? ` · ${r.taxType}` : ""}{r.countryCode ? ` · ${r.countryCode}` : ""} · dès le {formatDate(r.validFrom)}{r.validUntil ? ` jusqu'au ${formatDate(r.validUntil)}` : ""}</p>
                    {r.exemptionReason && <p className="text-xs text-gray-400">{r.exemptionReason}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold tabular-nums text-gray-950">{r.rate ?? 0} %</span>
                    <StatusChip tone={r.active === false ? "neutral" : r.currentlyValid ? "success" : "warn"}>{r.active === false ? "Inactive" : r.currentlyValid ? "En vigueur" : "Programmée"}</StatusChip>
                    <ActionButton variant="ghost" className="!px-4 !py-2" icon={History} onClick={() => setVersions(versions === base ? null : base)}>Versions</ActionButton>
                    {canUpdate && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => open({ kind: "edit", rule: r })}>Modifier</ActionButton>}
                    {canCreate && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => open({ kind: "successor", rule: r })}>Nouveau taux</ActionButton>}
                    {canUpdate && <ActionButton variant="ghost" className="!px-4 !py-2" pending={toggle.isPending && toggle.variables?.code === r.code} onClick={() => toggle.mutate(r)}>{r.active === false ? "Activer" : "Désactiver"}</ActionButton>}
                  </div>
                </div>
                {versions === base && <Versions baseCode={base} />}
              </ItemRow>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};
