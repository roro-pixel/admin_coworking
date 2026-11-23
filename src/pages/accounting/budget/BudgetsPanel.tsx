import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { budgetService } from "../../../services/budget.service";
import { accountingService } from "../../../services/accounting.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const budgetTone = (s?: string) => (s === "ACTIVE" ? "success" : s === "REJECTED" ? "danger" : s === "DRAFT" ? "neutral" : "warn");

/** Sélecteur d'exercice partagé par les onglets budget. */
export const useFiscalYear = () => {
  const years = useQuery({ queryKey: ["acc-fiscal-years"], queryFn: accountingService.fiscalYears });
  const [code, setCode] = useState("");
  const cur = code || years.data?.find((y) => y.status === "OPEN")?.code || years.data?.[0]?.code || "";
  const select = (
    <Field label="Exercice"><select className={FIELD} value={cur} onChange={(e) => setCode(e.target.value)}>{(years.data ?? []).map((y) => <option key={y.code} value={y.code}>{y.code}</option>)}</select></Field>
  );
  return { code: cur, select };
};

export const BudgetsPanel: React.FC = () => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const canPrepare = useAuth().hasPermission("BUDGET:PREPARE");
  const fy = useFiscalYear();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["budgets", fy.code], queryFn: () => budgetService.budgets(fy.code), enabled: !!fy.code });
  return (
    <div className="space-y-4">
      <ListHeader title="Budgets" subtitle="Un budget par exercice, en versions. Une seule version est active."
        action={canPrepare && !open ? <ActionButton onClick={() => setOpen(true)}>Nouvelle version</ActionButton> : undefined} />
      {fy.select}
      {open && (
        <ActionForm title="Nouvelle version" submitLabel="Créer" onClose={() => setOpen(false)}
          fields={[{ key: "label", label: "Libellé" }, { key: "basis", label: "Base", def: "EMPTY", hint: "EMPTY, ACTIVE (révision, motif obligatoire) ou PREVIOUS_ACTUAL" }, { key: "evolutionPct", label: "Évolution %", type: "number", hint: "Pour PREVIOUS_ACTUAL" }, { key: "reason", label: "Motif", hint: "Obligatoire pour une révision" }]}
          onSubmit={async (v) => { const b = await budgetService.create({ ...v, fiscalYearCode: fy.code }); qc.invalidateQueries({ queryKey: ["budgets"] }); toast.success("Version créée"); if (b?.id != null) nav(`/accounting/budget/${b.id}`); }} />
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Wallet} title="Aucun budget sur cet exercice" /> : (
        <div className="space-y-2">
          {q.data!.map((b) => (
            <button key={b.id} onClick={() => nav(`/accounting/budget/${b.id}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
              <span className="min-w-0"><span className="block text-sm font-semibold text-gray-900">Version {b.version} · {b.label ?? b.fiscalYearCode}</span><span className="block text-xs text-gray-400">Charges {money(b.totalCharges)} · produits {money(b.totalProducts)}{b.reason ? ` · ${b.reason}` : ""}</span></span>
              {b.status && <StatusChip tone={budgetTone(b.status)}>{b.status}</StatusChip>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
