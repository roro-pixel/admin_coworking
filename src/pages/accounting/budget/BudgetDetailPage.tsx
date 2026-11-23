import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { budgetService } from "../../../services/budget.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, ErrorBlock, Section, StatusChip } from "../../../components/subscription/kit";
import { formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { budgetTone } from "./BudgetsPanel";

const bar = (p?: number) => (p == null ? "bg-gray-300" : p > 100 ? "bg-red-500" : p > 75 ? "bg-amber-500" : "bg-emerald-500");

export const BudgetDetailPage: React.FC = () => {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canPrepare = hasPermission("BUDGET:PREPARE");
  const [form, setForm] = useState<"line" | "reject" | null>(null);
  const key = ["budget", id];
  const q = useQuery({ queryKey: key, queryFn: () => budgetService.budget(id) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["budgets"] }); };
  const b = q.data;

  const step = (action: "submit" | "consolidate" | "approve", label: string, detail?: string) => toast.confirm({
    message: `${label} cette version ?`, detail, confirmLabel: label, successMessage: "Circuit mis à jour", errorMessage: "Action impossible (droit ou état)",
    onConfirm: async () => { await budgetService.circuit(id, action); refresh(); },
  });
  const freeze = (lineId: number, frozen: boolean) => toast.confirm({
    tone: frozen ? "danger" : "primary", message: frozen ? "Geler cette ligne ?" : "Dégeler cette ligne ?", detail: frozen ? "Plus aucun engagement possible." : undefined, confirmLabel: frozen ? "Geler" : "Dégeler",
    successMessage: "Ligne mise à jour", errorMessage: "Action impossible", onConfirm: async () => { await budgetService.freeze(lineId, frozen); refresh(); },
  });
  const editable = b?.status === "DRAFT" || b?.status === "SUBMITTED";

  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/budget" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Budget</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !b ? <ErrorBlock message="Budget introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Budget {b.fiscalYearCode} · version {b.version} {b.status && <StatusChip tone={budgetTone(b.status)}>{b.status}</StatusChip>}</h2>
              {canPrepare && !form && (
                <div className="flex flex-wrap gap-2">
                  {b.status === "DRAFT" && <ActionButton onClick={() => step("submit", "Soumettre")}>Soumettre</ActionButton>}
                  {b.status === "SUBMITTED" && <ActionButton onClick={() => step("consolidate", "Consolider")}>Consolider</ActionButton>}
                  {b.status === "CONSOLIDATED" && <ActionButton onClick={() => step("approve", "Approuver", "L'ancienne version active est archivée, ses engagements ouverts suivent la nouvelle.")}>Approuver</ActionButton>}
                  {b.status !== "ACTIVE" && b.status !== "REJECTED" && <ActionButton variant="ghost" onClick={() => setForm("reject")}>Rejeter</ActionButton>}
                </div>
              )}
            </div>
            <Section title="Synthèse">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Total charges" mono>{money(b.totalCharges)}</Detail><Detail label="Total produits" mono>{money(b.totalProducts)}</Detail><Detail label="Libellé">{b.label}</Detail>
                <Detail label="Motif" wide>{b.reason}</Detail><Detail label="Soumis par">{b.submittedBy}</Detail><Detail label="Consolidé par">{b.consolidatedBy}</Detail>
                <Detail label="Approuvé">{b.approvedAt ? `${formatDateTime(b.approvedAt)}${b.approvedBy ? ` par ${b.approvedBy}` : ""}` : undefined}</Detail>
              </div>
            </Section>

            {form === "reject" && <ActionForm title="Rejeter la version" submitLabel="Rejeter" fields={[{ key: "reason", label: "Motif", required: true }]} onSubmit={async (v) => { await budgetService.circuit(id, "reject", String(v.reason)); refresh(); }} onClose={() => setForm(null)} />}
            {form === "line" && (
              <ActionForm title="Ajouter une ligne" submitLabel="Ajouter" onClose={() => setForm(null)}
                fields={[{ key: "itemCode", label: "Poste budgétaire", required: true }, { key: "sectionCode", label: "Section" }, { key: "annualAmount", label: "Montant annuel", type: "number", required: true },
                  { key: "profile", label: "Mensualisation", hint: "EQUAL, ou 12 poids séparés par des virgules" }, { key: "months", label: "12 montants", type: "list", hint: "Séparés par des virgules (remplace la mensualisation)" },
                  { key: "controlLevel", label: "Niveau de contrôle", hint: "BLOCKING, ALERT ou INFO" }, { key: "tolerancePct", label: "Tolérance %", type: "number" }, { key: "responsible", label: "Responsable" }]}
                onSubmit={async (v) => { const body = { ...v, months: Array.isArray(v.months) ? v.months.map((m) => Number(String(m).replace(",", "."))) : undefined }; await budgetService.addLine(id, body); refresh(); toast.success("Ligne ajoutée"); }} />
            )}

            <Section title={`Lignes (${b.lines?.length ?? 0})`} action={canPrepare && editable && !form ? <ActionButton variant="ghost" onClick={() => setForm("line")}>Ajouter une ligne</ActionButton> : undefined}>
              <div className="space-y-2">
                {(b.lines ?? []).map((l) => (
                  <div key={l.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">{l.itemLabel ?? l.itemCode}{l.sectionCode ? <span className="font-normal text-gray-400"> · {l.sectionCode}</span> : null}</span>
                      <span className="flex items-center gap-2">{l.frozen && <StatusChip tone="danger">Gelée</StatusChip>}{l.controlLevel && <StatusChip tone="neutral">{l.controlLevel}</StatusChip>}
                        {hasPermission("BUDGET:PREPARE") && <ActionButton variant="ghost" onClick={() => freeze(l.id, !l.frozen)}>{l.frozen ? "Dégeler" : "Geler"}</ActionButton>}</span>
                    </div>
                    <p className="text-xs text-gray-500">Budget {money(l.annualAmount)} · engagé {money(l.committed)} · réalisé {money(l.realized)} · disponible {money(l.available)}{l.responsible ? ` · ${l.responsible}` : ""}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${bar(l.consumptionPct)}`} style={{ width: `${Math.min(100, Math.max(0, l.consumptionPct ?? 0))}%` }} /></div>
                    {(l.months ?? []).length > 0 && <p className="mt-1 font-mono text-[11px] text-gray-400">{l.months!.map((m) => m.toLocaleString("fr-FR")).join(" · ")}</p>}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </AccountingShell>
  );
};
