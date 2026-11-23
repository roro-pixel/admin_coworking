import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { budgetService } from "../../../services/budget.service";
import type { BudgetItem } from "../../../services/budget.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const FIELDS: FieldDef[] = [
  { key: "code", label: "Code", required: true }, { key: "label", label: "Libellé", required: true }, { key: "parentCode", label: "Poste parent" },
  { key: "itemType", label: "Type", hint: "CHARGE, PRODUCT, INVESTMENT ou TREASURY" }, { key: "responsible", label: "Responsable" }, { key: "controlLevel", label: "Niveau de contrôle", hint: "BLOCKING, ALERT ou INFO" },
  { key: "tolerancePct", label: "Tolérance %", type: "number" }, { key: "accounts", label: "Comptes (préfixes)", type: "list" }, { key: "expenseItems", label: "Postes de dépense analytiques", type: "list" },
  { key: "natures", label: "Natures d'opération", type: "list" }, { key: "controlAtParent", label: "Contrôle au niveau du parent", type: "bool" },
];
const tone = (s?: string) => (s === "ACTIVE" ? "success" : s === "PENDING" || s === "PENDING_APPROVAL" ? "warn" : s === "CLOSED" || s === "REJECTED" ? "danger" : "neutral");

export const ItemsPanel: React.FC = () => {
  const qc = useQueryClient();
  const canPrepare = useAuth().hasPermission("BUDGET:PREPARE");
  const [form, setForm] = useState<BudgetItem | "new" | null>(null);
  const [merge, setMerge] = useState<BudgetItem | null>(null);
  const q = useQuery({ queryKey: ["budget-items"], queryFn: budgetService.items });
  const refresh = () => qc.invalidateQueries({ queryKey: ["budget-items"] });
  const act = (i: BudgetItem, d: "approve" | "reject" | "close" | "reopen", label: string) => toast.confirm({
    tone: d === "reject" || d === "close" ? "danger" : "primary", message: `${label} le poste ${i.code} ?`, confirmLabel: label, successMessage: "Poste mis à jour", errorMessage: "Action impossible (droit ou état)",
    onConfirm: async () => { await budgetService.itemDecision(i.code, d); refresh(); },
  });
  const prefill = (i?: BudgetItem): FieldDef[] => FIELDS.map((f) => ({ ...f, def: i ? (f.type === "bool" ? !!(i as unknown as Record<string, unknown>)[f.key] : Array.isArray((i as unknown as Record<string, unknown>)[f.key]) ? ((i as unknown as Record<string, unknown>)[f.key] as string[]).join(", ") : String((i as unknown as Record<string, unknown>)[f.key] ?? "")) : f.def }));
  return (
    <div className="space-y-4">
      <ListHeader title="Nomenclature budgétaire" subtitle="Postes et correspondances : comptes, postes de dépense, natures. Une valeur n'alimente qu'un poste."
        action={canPrepare && !form ? <ActionButton onClick={() => setForm("new")}>Nouveau poste</ActionButton> : undefined} />
      {form && <ActionForm title={form === "new" ? "Nouveau poste" : `Modifier ${form.code}`} fields={prefill(form === "new" ? undefined : form)} onSubmit={async (v) => { await budgetService.saveItem(v); refresh(); toast.success("Poste enregistré"); }} onClose={() => setForm(null)} />}
      {merge && <ActionForm title={`Fusionner ${merge.code} dans…`} submitLabel="Fusionner" fields={[{ key: "into", label: "Poste cible", required: true }]} onSubmit={async (v) => { await budgetService.itemDecision(merge.code, "merge", String(v.into)); refresh(); toast.success("Postes fusionnés"); }} onClose={() => setMerge(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Layers} title="Aucun poste" /> : (
        <div className="space-y-2">
          {q.data!.map((i) => (
            <div key={i.code} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{i.label} <span className="font-normal text-gray-400">· {i.code}{i.parentCode ? ` · sous ${i.parentCode}` : ""}</span></p>
                <p className="truncate text-xs text-gray-400">{[i.itemType, i.controlLevel, i.tolerancePct != null && `tolérance ${i.tolerancePct} %`, i.accounts?.length ? `comptes ${i.accounts.join(", ")}` : null, i.expenseItems?.length ? `postes ${i.expenseItems.join(", ")}` : null, i.natures?.length ? `natures ${i.natures.join(", ")}` : null].filter(Boolean).join(" · ")}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {i.status && <StatusChip tone={tone(i.status)}>{i.status}</StatusChip>}
                {canPrepare && <>
                  <ActionButton variant="ghost" onClick={() => setForm(i)}>Modifier</ActionButton>
                  {(i.status === "PENDING" || i.status === "PENDING_APPROVAL") && <><ActionButton variant="ghost" onClick={() => act(i, "approve", "Valider")}>Valider</ActionButton><ActionButton variant="ghost" onClick={() => act(i, "reject", "Rejeter")}>Rejeter</ActionButton></>}
                  {i.status === "CLOSED" ? <ActionButton variant="ghost" onClick={() => act(i, "reopen", "Rouvrir")}>Rouvrir</ActionButton> : <ActionButton variant="ghost" onClick={() => act(i, "close", "Fermer")}>Fermer</ActionButton>}
                  <ActionButton variant="ghost" onClick={() => setMerge(i)}>Fusionner</ActionButton>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
