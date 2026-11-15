import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { ComplianceRule, ComplianceRuleAction, ComplianceRuleSeverity } from "../../../services/walletControl.service";
import { EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, StatusChip, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { RULE_ACTION_LABEL, RULE_ACTION_OPTIONS, RULE_CATEGORY_LABEL, SEVERITY, SEVERITY_OPTIONS } from "../../../components/wallet/walletLabels";

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));
const toLocalInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : "");

/** Modification d'une règle de surveillance : chaque changement exige une justification. */
const RuleForm: React.FC<{ rule: ComplianceRule; onClose: () => void }> = ({ rule, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: rule.name,
    description: rule.description ?? "",
    severity: rule.severity as ComplianceRuleSeverity,
    action: rule.action as ComplianceRuleAction,
    amountThreshold: rule.amountThreshold?.toString() ?? "",
    countThreshold: rule.countThreshold?.toString() ?? "",
    ratioThreshold: rule.ratioThreshold?.toString() ?? "",
    windowMinutes: rule.windowMinutes?.toString() ?? "",
    active: rule.active,
    effectiveFrom: toLocalInput(rule.effectiveFrom),
    effectiveTo: toLocalInput(rule.effectiveTo),
    rationale: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((s) => ({ ...s, ...patch }));

  const mutation = useMutation({
    mutationFn: () =>
      walletControlService.updateRule(rule.ruleCode, {
        name: f.name.trim(),
        description: f.description.trim() || null,
        severity: f.severity,
        action: f.action,
        amountThreshold: num(f.amountThreshold),
        countThreshold: num(f.countThreshold),
        ratioThreshold: num(f.ratioThreshold),
        windowMinutes: num(f.windowMinutes),
        active: f.active,
        effectiveFrom: f.effectiveFrom ? new Date(f.effectiveFrom).toISOString() : null,
        effectiveTo: f.effectiveTo ? new Date(f.effectiveTo).toISOString() : null,
        rationale: f.rationale.trim(),
      }),
    onSuccess: () => {
      toast.success("Règle mise à jour");
      qc.invalidateQueries({ queryKey: ["wallet-rules"] });
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Mise à jour impossible.")),
  });

  return (
    <PanelForm title={`Modifier ${rule.ruleCode}`} pending={mutation.isPending} submitLabel="Enregistrer" submitDisabled={!f.name.trim() || !f.rationale.trim()} error={error} onCancel={onClose} onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nom" required>
          <input className={FIELD_SOFT} value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Gravité" required>
          <select className={FIELD_SOFT} value={f.severity} onChange={(e) => set({ severity: e.target.value as ComplianceRuleSeverity })}>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" className="md:col-span-2">
          <input className={FIELD_SOFT} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Action déclenchée" required>
          <select className={FIELD_SOFT} value={f.action} onChange={(e) => set({ action: e.target.value as ComplianceRuleAction })}>
            {RULE_ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fenêtre d'observation (minutes)">
          <input inputMode="numeric" className={FIELD_SOFT} value={f.windowMinutes} onChange={(e) => set({ windowMinutes: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Seuil de montant">
          <input inputMode="decimal" className={FIELD_SOFT} value={f.amountThreshold} onChange={(e) => set({ amountThreshold: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Seuil de nombre">
          <input inputMode="numeric" className={FIELD_SOFT} value={f.countThreshold} onChange={(e) => set({ countThreshold: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Seuil de ratio">
          <input inputMode="decimal" className={FIELD_SOFT} value={f.ratioThreshold} onChange={(e) => set({ ratioThreshold: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <div className="flex items-end">
          <Switch checked={f.active} onChange={(v) => set({ active: v })} label="Règle active" />
        </div>
        <Field label="En vigueur du">
          <input type="datetime-local" className={FIELD_SOFT} value={f.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
        </Field>
        <Field label="Jusqu'au">
          <input type="datetime-local" className={FIELD_SOFT} value={f.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} />
        </Field>
        <Field label="Justification de la modification" required hint="Conservée dans la piste d'audit" className="md:col-span-2">
          <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={f.rationale} onChange={(e) => set({ rationale: e.target.value })} />
        </Field>
      </div>
    </PanelForm>
  );
};

/** Règles de surveillance : seuils, gravité et action déclenchée. */
export const RulesPanel: React.FC = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["wallet-rules"], queryFn: () => walletControlService.getRules() });
  const rules = data ?? [];
  const current = rules.find((r) => r.ruleCode === editing);

  return (
    <div className="space-y-5">
      <ListHeader title="Règles" subtitle={isLoading ? undefined : `${rules.length} règle${rules.length > 1 ? "s" : ""} de surveillance`} />
      {current && <RuleForm key={current.ruleCode} rule={current} onClose={() => setEditing(null)} />}
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les règles." onRetry={() => refetch()} />
      ) : rules.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title="Aucune règle" hint="Les règles de surveillance configurées apparaissent ici." />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {rules.map((r) => {
            const sev = SEVERITY[r.severity] ?? { label: r.severity, tone: "neutral" as const };
            const thresholds = [
              r.amountThreshold != null && `montant ${r.amountThreshold.toLocaleString("fr-FR")}`,
              r.countThreshold != null && `nombre ${r.countThreshold}`,
              r.ratioThreshold != null && `ratio ${r.ratioThreshold}`,
              r.windowMinutes != null && `fenêtre ${r.windowMinutes} min`,
            ].filter(Boolean);
            return (
              <ItemRow key={r.ruleCode} className={r.active ? "" : "opacity-70"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-950">{r.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-500">
                      {r.ruleCode}
                      {r.category ? ` · ${RULE_CATEGORY_LABEL[r.category] ?? r.category}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip>
                    <IconButton icon={Pencil} label="Modifier la règle" onClick={() => setEditing(r.ruleCode)} />
                  </div>
                </div>
                {r.description && <p className="mt-2 text-sm text-gray-600">{r.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <StatusChip tone={sev.tone}>{sev.label}</StatusChip>
                  <span>{RULE_ACTION_LABEL[r.action] ?? r.action}</span>
                  {thresholds.length > 0 && <span>· {thresholds.join(" · ")}</span>}
                </div>
              </ItemRow>
            );
          })}
        </div>
      )}
    </div>
  );
};
