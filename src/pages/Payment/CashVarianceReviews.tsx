import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashVarianceDecision, CashVarianceReview, CashVarianceStatus } from "../../services/cashRegister.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { PillChoice } from "../../components/operations/opsKit";
import { VARIANCE_DECISION, VARIANCE_DECISION_OPTIONS, VARIANCE_KIND, VARIANCE_STATUS } from "../../components/cash/cashLabels";

const FILTERS: { value: CashVarianceStatus | ""; label: string }[] = [
  { value: "PENDING", label: "À décider" },
  { value: "DECIDED", label: "Décidés" },
  { value: "", label: "Tous" },
];

const Row: React.FC<{ r: CashVarianceReview; canDecide: boolean }> = ({ r, canDecide }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<CashVarianceDecision>(r.proposedDecision ?? "EXPENSE");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const st = statusOf(VARIANCE_STATUS, r.status);

  const decide = useMutation({
    mutationFn: () => cashRegisterService.decideVarianceReview(r.reviewNumber, { decision, note: note.trim() || undefined, reviewDueAt: decision === "INVESTIGATION" && dueAt ? new Date(dueAt).toISOString() : undefined }),
    onSuccess: () => {
      toast.success("Décision enregistrée.");
      queryClient.invalidateQueries({ queryKey: ["cash-variance-reviews"] });
    },
    // 403 : l'ouvreur ou le clôtureur de la session ne peut pas décider de son propre écart.
    onError: (e: unknown) => setError(apiMessage(e, "Décision refusée.")),
  });

  return (
    <div className="space-y-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">
            <span className="font-mono">{r.reviewNumber}</span> · {VARIANCE_KIND[r.kind] ?? r.kind} · <span className={r.amount < 0 ? "text-red-700" : "text-emerald-700"}>{formatMoney(r.amount, "FCFA")}</span>
          </p>
          <p className="text-xs text-gray-500">
            {r.registerCode}
            {r.cashier ? ` · ${r.cashier}` : ""}
            {r.reason ? ` · ${r.reason}` : ""}
            {r.contestDeadline ? ` · contestation avant ${formatDateTime(r.contestDeadline)}` : ""}
          </p>
          {r.decision && <p className="text-xs text-gray-500">Décision : {VARIANCE_DECISION[r.decision] ?? r.decision}{r.decidedBy ? ` · ${r.decidedBy}` : ""}{r.decidedAt ? ` · ${formatDateTime(r.decidedAt)}` : ""}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
          {r.sessionNumber && <ActionButton variant="ghost" onClick={() => navigate(`/payments/sessions/${r.sessionNumber}`)}>Session</ActionButton>}
          {canDecide && r.status === "PENDING" && <ActionButton onClick={() => setOpen((v) => !v)}>Décider</ActionButton>}
        </div>
      </div>
      {open && (
        <div className="rounded-2xl bg-gray-50 p-4">
          {error && <p role="alert" className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Décision">
              <select value={decision} onChange={(e) => setDecision(e.target.value as CashVarianceDecision)} className={FIELD_SOFT}>
                {VARIANCE_DECISION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Commentaire"><input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD_SOFT} /></Field>
            {decision === "INVESTIGATION" && <Field label="Revue prévue le"><input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={FIELD_SOFT} /></Field>}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setOpen(false)}>Annuler</ActionButton>
            <ActionButton pending={decide.isPending} onClick={() => { setError(null); decide.mutate(); }}>Enregistrer la décision</ActionButton>
          </div>
        </div>
      )}
    </div>
  );
};

export const CashVarianceReviews: React.FC = () => {
  const { hasPermission } = useAuth();
  const canDecide = hasPermission("CASH_VARIANCE:DECIDE");
  const [status, setStatus] = useState<CashVarianceStatus | "">("PENDING");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cash-variance-reviews", status],
    queryFn: () => cashRegisterService.getVarianceReviews({ status: status || undefined }),
  });
  return (
    <div className="space-y-5">
      <ListHeader title="Écarts de caisse" subtitle="Décisions sur les écarts constatés. Celui qui a ouvert ou clôturé la session ne peut pas en décider." />
      <PillChoice label="Statut" value={status} options={FILTERS} onChange={(v) => setStatus(v)} />
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message={apiMessage(error, "Écarts indisponibles.")} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Scale} title="Aucun écart" hint="Rien à décider pour ce filtre." />
      ) : (
        <DataCard>{(data ?? []).map((r) => <Row key={r.reviewNumber} r={r} canDecide={canDecide} />)}</DataCard>
      )}
    </div>
  );
};
