import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, CheckCheck, Eye, ScanSearch, ShieldOff } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashAnomalyFlag, CashAnomalyStatus } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ANOMALY_STATUS, ANOMALY_TYPE_LABEL, SEVERITY, anomalyTypeLabel } from "../../components/payment/paymentLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_minmax(0,2fr)_8rem_10rem]";

export const CashAnomaliesPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  // Analyse et revue : CASH_VARIANCE:DECIDE. La lecture reste sous CASH:READ.
  const canDecide = hasPermission("CASH_VARIANCE:DECIDE");
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [anomalyType, setAnomalyType] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [analyzeSession, setAnalyzeSession] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cash-anomalies", page, sessionNumber, registerCode, severity, status, anomalyType],
    queryFn: () =>
      paymentService.getCashAnomalies({
        sessionNumber: sessionNumber || undefined,
        registerCode: registerCode || undefined,
        severity: severity || undefined,
        status: status || undefined,
        anomalyType: anomalyType || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });
  const anomalies: CashAnomalyFlag[] = data?.content || [];

  const analyzeMutation = useMutation({
    mutationFn: () => paymentService.analyzeCashSession(analyzeSession),
    onSuccess: (flags) => {
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] });
      toast.success(
        flags.length === 0
          ? "Analyse terminée : aucune anomalie détectée"
          : `Analyse terminée : ${flags.length} anomalie${flags.length > 1 ? "s" : ""}`,
      );
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Analyse de la session impossible")),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ flag, status }: { flag: CashAnomalyFlag; status: CashAnomalyStatus }) =>
      paymentService.reviewCashAnomaly(flag.flagNumber, {
        status,
        note: reviewNote.trim() || undefined,
      }),
    onSuccess: () => {
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] });
      toast.success("Revue enregistrée");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Revue impossible")),
    onSettled: () => setReviewing(null),
  });

  const review = (flag: CashAnomalyFlag, status: CashAnomalyStatus) => {
    setReviewing(`${flag.flagNumber}:${status}`);
    reviewMutation.mutate({ flag, status });
  };

  const hasFilters = !!(sessionNumber || registerCode || severity || status || anomalyType);

  return (
    <div className="space-y-5">
      <ListHeader title="Anomalies de caisse" subtitle="Analyse des sessions, suivi et revue des écarts suspects." />

      {canDecide && (
      <Section title="Analyser une session" description="Lance la détection d'anomalies sur une session." icon={ScanSearch}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            analyzeMutation.mutate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Field label="N° de session" className="flex-1">
            <input value={analyzeSession} onChange={(e) => setAnalyzeSession(e.target.value)} placeholder="SES-2026-0091" className={`${FIELD} font-mono`} />
          </Field>
          <ActionButton type="submit" icon={AlertTriangle} pending={analyzeMutation.isPending} disabled={!analyzeSession.trim()}>
            Lancer l'analyse
          </ActionButton>
        </form>
      </Section>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <b className="text-gray-950">{data?.totalElements ?? 0}</b> anomalie{(data?.totalElements ?? 0) > 1 ? "s" : ""}
            {isFetching && !isLoading && <Dots className="ml-3 align-middle" />}
          </p>
          <FilterButton open={filtersOpen} active={hasFilters} onClick={() => setFiltersOpen((o) => !o)} />
        </div>
        {filtersOpen && (
          <FilterPanel
            canReset={hasFilters}
            onReset={() => {
              setSessionNumber("");
              setRegisterCode("");
              setSeverity("");
              setStatus("");
              setAnomalyType("");
              setPage(0);
            }}
          >
            <Field label="Session">
              <input
                value={sessionNumber}
                onChange={(e) => {
                  setSessionNumber(e.target.value);
                  setPage(0);
                }}
                placeholder="SES-…"
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
            <Field label="Caisse">
              <input
                value={registerCode}
                onChange={(e) => {
                  setRegisterCode(e.target.value);
                  setPage(0);
                }}
                placeholder="CSH-…"
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
            <Field label="Sévérité">
              <select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Toutes</option>
                {Object.entries(SEVERITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Statut de la revue">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Tous</option>
                {Object.entries(ANOMALY_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type d'anomalie">
              <select
                value={anomalyType}
                onChange={(e) => {
                  setAnomalyType(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Tous</option>
                {Object.entries(ANOMALY_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </FilterPanel>
        )}
        {canDecide && (
        <Field label="Note de revue" hint="Facultative. Elle est jointe à la prochaine action de revue.">
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Ex. vérifié avec la caissière"
            className={`${FIELD_SOFT} bg-white shadow-sm`}
          />
        </Field>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les anomalies." onRetry={() => refetch()} />
      ) : anomalies.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Aucune anomalie" hint="Aucune anomalie ne correspond à ces filtres." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Anomalie</span>
            <span>Session</span>
            <span>Sévérité</span>
            <span>Description</span>
            <span>Revue</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {anomalies.map((a) => {
              const sev = statusOf(SEVERITY, a.severity);
              const rev = statusOf(ANOMALY_STATUS, a.status || "OPEN");
              const current = a.status || "OPEN";
              const actions: { status: CashAnomalyStatus; label: string; icon: React.ElementType; tone: "pink" | "success" | "neutral" | "danger" }[] = [
                { status: "ACKNOWLEDGED", label: "Prendre en compte", icon: Eye, tone: "pink" },
                { status: "RESOLVED", label: "Marquer comme résolue", icon: CheckCheck, tone: "success" },
                { status: "DISMISSED", label: "Écarter (faux positif)", icon: ShieldOff, tone: "neutral" },
                { status: "ESCALATED", label: "Escalader", icon: ArrowUpRight, tone: "danger" },
              ];
              return (
                <div
                  key={a.flagNumber}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{a.flagNumber}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(a.detectedAt)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-0.5 lg:order-last">
                    {canDecide && actions.map((act) => (
                      <IconButton
                        key={act.status}
                        icon={act.icon}
                        label={act.label}
                        tone={act.tone}
                        disabled={current === act.status}
                        pending={reviewing === `${a.flagNumber}:${act.status}`}
                        onClick={() => review(a, act.status)}
                      />
                    ))}
                  </div>
                  <p className="col-span-2 truncate font-mono text-xs text-gray-600 lg:col-span-1">{a.sessionNumber}</p>
                  <div>
                    <StatusChip tone={sev.tone}>{sev.label}</StatusChip>
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{anomalyTypeLabel(a.anomalyType)}</p>
                    {a.description && <p className="line-clamp-2 text-xs text-gray-500">{a.description}</p>}
                    {a.movementNumber && <p className="truncate font-mono text-[11px] text-gray-400">Mouvement {a.movementNumber}</p>}
                    {a.reviewedBy && (
                      <p className="truncate text-[11px] text-gray-400">
                        Revue par {a.reviewedBy}
                        {a.reviewNote ? ` : ${a.reviewNote}` : ""}
                      </p>
                    )}
                  </div>
                  <div>
                    <StatusChip tone={rev.tone}>{rev.label}</StatusChip>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages || 1} total={data?.totalElements ?? anomalies.length} noun="anomalie" onChange={setPage} />
        </>
      )}
    </div>
  );
};
