import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Shuffle } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { budgetService } from "../../../services/budget.service";
import type { Forecast } from "../../../services/budget.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const FORECAST_FIELDS: FieldDef[] = [
  { key: "itemCode", label: "Poste budgétaire", required: true }, { key: "sectionCode", label: "Section" }, { key: "subject", label: "Objet", required: true }, { key: "amount", label: "Montant", type: "number", required: true },
  { key: "plannedMonth", label: "Mois prévu", hint: "AAAA-MM", required: true }, { key: "recurrence", label: "Récurrence", hint: "NONE, MONTHLY, QUARTERLY ou YEARLY" }, { key: "occurrences", label: "Occurrences", type: "number" },
  { key: "supplier", label: "Fournisseur" }, { key: "responsible", label: "Responsable" }, { key: "priority", label: "Priorité", hint: "ESSENTIAL, IMPORTANT ou DESIRABLE" },
];
const STATUSES = ["PLANNED", "COMMITTED", "REALIZED", "POSTPONED", "CANCELLED"];

export const ForecastsPanel: React.FC = () => {
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("BUDGET_FORECAST:MANAGE");
  const [form, setForm] = useState<Forecast | "new" | null>(null);
  const [item, setItem] = useState("");
  const q = useQuery({ queryKey: ["budget-forecasts", item], queryFn: () => budgetService.forecasts(item || undefined) });
  const reasons = useQuery({ queryKey: ["budget-reasons"], queryFn: budgetService.unplannedReasons });
  const refresh = () => qc.invalidateQueries({ queryKey: ["budget-forecasts"] });
  const setStatus = (f: Forecast, status: string) => toast.confirm({ message: `Passer la prévision ${f.number} à ${status} ?`, confirmLabel: "Confirmer", successMessage: "Statut mis à jour", errorMessage: "Action impossible", onConfirm: async () => { await budgetService.forecastStatus(f.number!, status); refresh(); } });
  const prefill = (f?: Forecast): FieldDef[] => FORECAST_FIELDS.map((x) => ({ ...x, def: f ? String((f as unknown as Record<string, unknown>)[x.key] ?? "") : x.def }));
  return (
    <div className="space-y-4">
      <ListHeader title="Prévisions de dépenses" subtitle="Une demande de fonds cite une prévision ouverte ou se déclare non prévue avec un motif."
        action={canManage && !form ? <ActionButton onClick={() => setForm("new")}>Nouvelle prévision</ActionButton> : undefined} />
      <input className="w-48 rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Filtrer par poste" value={item} onChange={(e) => setItem(e.target.value)} />
      {form && <ActionForm title={form === "new" ? "Nouvelle prévision" : `Modifier ${form.number}`} fields={prefill(form === "new" ? undefined : form)} onSubmit={async (v) => { if (form === "new") await budgetService.createForecast(v); else await budgetService.updateForecast(form.number!, v); refresh(); toast.success("Prévision enregistrée"); }} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={CalendarClock} title="Aucune prévision" /> : (
        <div className="space-y-2">
          {q.data!.map((f) => (
            <div key={f.number} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{f.number} · {f.subject}</p>
                <p className="truncate text-xs text-gray-400">{[f.itemCode, f.sectionCode, f.plannedMonth, f.recurrence && f.recurrence !== "NONE" ? `${f.recurrence} ×${f.occurrences ?? 1}` : null, f.priority, f.supplier, `${money(f.amount)}`, f.realizedAmount ? `réalisé ${money(f.realizedAmount)}` : null].filter(Boolean).join(" · ")}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {f.status && <StatusChip tone={f.status === "REALIZED" || f.status === "COMMITTED" ? "success" : f.status === "CANCELLED" ? "danger" : "warn"}>{f.status}</StatusChip>}
                {canManage && <>
                  <ActionButton variant="ghost" onClick={() => setForm(f)}>Modifier</ActionButton>
                  <select aria-label="Changer le statut" className="rounded-xl border border-gray-200 px-2 py-1.5 text-xs" value="" onChange={(e) => e.target.value && setStatus(f, e.target.value)}>
                    <option value="">Statut…</option>{STATUSES.filter((s) => s !== f.status).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(reasons.data ?? []).length > 0 && <p className="text-xs text-gray-400">Motifs de dépense non prévue : {reasons.data!.map((r) => String(r.label ?? r.code ?? JSON.stringify(r))).join(", ")}.</p>}
    </div>
  );
};

export const TransfersPanel: React.FC = () => {
  const qc = useQueryClient();
  const canRequest = useAuth().hasPermission("BUDGET:TRANSFER_REQUEST");
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["budget-transfers"], queryFn: budgetService.transfers });
  const refresh = () => qc.invalidateQueries({ queryKey: ["budget-transfers"] });
  const decide = (id: number, d: "approve" | "reject") => toast.confirm({
    tone: d === "reject" ? "danger" : "primary", message: d === "approve" ? "Approuver ce virement ?" : "Rejeter ce virement ?", detail: d === "approve" ? "Réduit la ligne source et augmente la cible sur les mois restants. Le demandeur ne peut pas approuver." : undefined,
    confirmLabel: d === "approve" ? "Approuver" : "Rejeter", successMessage: "Décision enregistrée", errorMessage: "Action impossible (droit ou état)", onConfirm: async () => { await budgetService.decideTransfer(id, d); refresh(); qc.invalidateQueries({ queryKey: ["budget"] }); },
  });
  return (
    <div className="space-y-4">
      <ListHeader title="Virements de crédits" subtitle="Entre deux lignes du même budget, dans la limite du disponible de la source." action={canRequest && !open ? <ActionButton onClick={() => setOpen(true)}>Demander un virement</ActionButton> : undefined} />
      {open && <ActionForm title="Demande de virement" submitLabel="Demander" onClose={() => setOpen(false)} fields={[{ key: "fromLineId", label: "Ligne source (ID)", type: "number", required: true }, { key: "toLineId", label: "Ligne cible (ID)", type: "number", required: true }, { key: "amount", label: "Montant", type: "number", required: true }, { key: "reason", label: "Motif", required: true }]} onSubmit={async (v) => { await budgetService.requestTransfer(v); refresh(); toast.success("Virement demandé"); }} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Shuffle} title="Aucun virement" /> : (
        <div className="space-y-2">
          {q.data!.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">Ligne {t.fromLineId} → ligne {t.toLineId} · {money(t.amount)}</p><p className="truncate text-xs text-gray-400">{[t.reason, t.requestedBy && `demandé par ${t.requestedBy}`, t.decidedBy && `décidé par ${t.decidedBy} ${formatDateTime(t.decidedAt)}`].filter(Boolean).join(" · ")}</p></div>
              <div className="flex items-center gap-2">
                {t.status && <StatusChip tone={t.status === "APPROVED" ? "success" : t.status === "REJECTED" ? "danger" : "warn"}>{t.status}</StatusChip>}
                {canRequest && (t.status === "PENDING" || t.status === "REQUESTED") && <><ActionButton onClick={() => decide(t.id, "approve")}>Approuver</ActionButton><ActionButton variant="ghost" onClick={() => decide(t.id, "reject")}>Rejeter</ActionButton></>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
