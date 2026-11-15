import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { APPROVAL_LEVEL_LABEL, Cell, label } from "../../../components/inventory/invKit";

const LEVELS = ["MANAGER", "DIRECTOR", "FINANCE"] as const;
const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem_auto]";
interface Rule { id?: number; approvalLevel: string; minAmount: number; maxAmount: number | null; requiredApprovals: number; active: boolean }
const EMPTY = { approvalLevel: "MANAGER", minAmount: 0, maxAmount: 500000 as number | null, requiredApprovals: 1, active: true };

export const ApprovalRulesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: number | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: rules = [], isLoading, isError, refetch } = useQuery({ queryKey: ["approval-rules"], queryFn: () => inventoryService.getApprovalRules() as Promise<Rule[]> });

  // L'API ne documente qu'un POST qui REMPLACE toute la configuration : on renvoie donc toujours la liste complète
  const save = useMutation({
    mutationFn: (next: Rule[]) => inventoryService.createApprovalRule(next.map(({ id: _id, ...rest }) => rest)),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["approval-rules"] }); setEditing(null); setError(null); },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const submit = () => {
    const rule: Rule = { ...f! };
    save.mutate(editing!.id === null ? [...rules, rule] : rules.map((r) => (r.id === editing!.id ? { ...r, ...rule } : r)), { onSuccess: () => toast.success(editing?.id === null ? "Règle ajoutée" : "Règle modifiée") });
  };

  return (
    <div className="space-y-5">
      <ListHeader title="Règles d'approbation" subtitle={isLoading ? undefined : "Qui doit valider un bon de commande selon son montant"} action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ id: null, form: { ...EMPTY } }); }}>Nouvelle règle</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.id === null ? "Nouvelle règle" : "Modifier la règle"}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.id === null ? "Ajouter" : "Enregistrer"}
          error={error}
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Niveau" required>
              <select value={f.approvalLevel} onChange={(e) => set({ approvalLevel: e.target.value })} className={FIELD}>
                {LEVELS.map((l) => <option key={l} value={l}>{APPROVAL_LEVEL_LABEL[l]}</option>)}
              </select>
            </Field>
            <Field label="Approbations requises" required>
              <input type="number" min={1} value={f.requiredApprovals} onChange={(e) => set({ requiredApprovals: Number(e.target.value) || 1 })} className={FIELD} />
            </Field>
            <Field label="Montant minimum (FCFA)">
              <input type="number" min={0} value={f.minAmount} onChange={(e) => set({ minAmount: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
            <Field label="Montant maximum (FCFA)" hint="Laissez vide pour ne pas limiter.">
              <input type="number" min={0} value={f.maxAmount ?? ""} onChange={(e) => set({ maxAmount: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Illimité" className={FIELD} />
            </Field>
          </div>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Règle active" />
        </PanelForm>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les règles." onRetry={() => refetch()} />
      ) : rules.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucune règle d'approbation" hint="Sans règle, aucun niveau de validation n'est exigé selon le montant." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Niveau</span>
            <span>À partir de</span>
            <span>Jusqu'à</span>
            <span>Approbations</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {rules.map((r, i) => (
              <div key={r.id ?? i} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <p className="text-sm font-semibold text-gray-900">{label(APPROVAL_LEVEL_LABEL, r.approvalLevel)}</p>
                <Cell title="À partir de" className="max-lg:order-3"><span className="text-sm text-gray-700">{formatMoney(r.minAmount)}</span></Cell>
                <Cell title="Jusqu'à" className="max-lg:order-3"><span className="text-sm text-gray-700">{r.maxAmount ? formatMoney(r.maxAmount) : "Sans limite"}</span></Cell>
                <Cell title="Approbations" className="max-lg:order-3"><span className="text-sm text-gray-700">{r.requiredApprovals}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end"><StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip></div>
                <div className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ id: r.id ?? i, form: { approvalLevel: r.approvalLevel, minAmount: r.minAmount, maxAmount: r.maxAmount, requiredApprovals: r.requiredApprovals, active: r.active } }); }} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: "Supprimer cette règle d'approbation ?",
                        detail: "La configuration complète est renvoyée sans cette règle.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Règle supprimée",
                        errorMessage: "Suppression impossible",
                        onConfirm: () => save.mutateAsync(rules.filter((x, k) => (x.id ?? k) !== (r.id ?? i))),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
        </>
      )}
    </div>
  );
};
