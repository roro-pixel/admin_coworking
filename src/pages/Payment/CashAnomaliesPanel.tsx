import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, CheckCheck, Eye, ScanSearch, ShieldOff } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashAnomalyFlag, CashAnomalyReviewStatus } from "../../services/payment.service";
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
import { FIELD, FIELD_SOFT, formatDateTime } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ANOMALY_REVIEW, SEVERITY, humanize } from "../../components/payment/paymentLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_minmax(0,2fr)_8rem_10rem]";

export const CashAnomaliesPanel: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [severity, setSeverity] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [analyzeSession, setAnalyzeSession] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cash-anomalies", page, sessionNumber, registerCode, severity, reviewStatus],
    queryFn: () =>
      paymentService.getCashAnomalies({
        sessionNumber: sessionNumber || undefined,
        registerCode: registerCode || undefined,
        severity: severity || undefined,
        reviewStatus: reviewStatus || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });
  const anomalies: CashAnomalyFlag[] = data?.content || [];

  const analyzeMutation = useMutation({
    mutationFn: () => paymentService.analyzeCashSession(analyzeSession),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] });
      toast.success("Analyse terminée");
    },
    onError: () => toast.error("Analyse de la session impossible"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ flag, status }: { flag: CashAnomalyFlag; status: CashAnomalyReviewStatus }) =>
      paymentService.reviewCashAnomaly(flag.flagNumber, {
        reviewedBy: admin?.email || "admin",
        status,
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] });
      toast.success("Revue enregistrée");
    },
    onError: () => toast.error("Revue impossible"),
    onSettled: () => setReviewing(null),
  });

  const review = (flag: CashAnomalyFlag, status: CashAnomalyReviewStatus) => {
    setReviewing(`${flag.flagNumber}:${status}`);
    reviewMutation.mutate({ flag, status });
  };

  const hasFilters = !!(sessionNumber || registerCode || severity || reviewStatus);

  return (
    <div className="space-y-5">
      <ListHeader title="Anomalies de caisse" subtitle="Analyse des sessions, suivi et revue des écarts suspects." />

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
              setReviewStatus("");
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
                value={reviewStatus}
                onChange={(e) => {
                  setReviewStatus(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Tous</option>
                {Object.entries(ANOMALY_REVIEW).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          </FilterPanel>
        )}
        <Field label="Note de revue" hint="Facultative. Elle est jointe à la prochaine action de revue.">
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Ex. vérifié avec la caissière"
            className={`${FIELD_SOFT} bg-white shadow-sm`}
          />
        </Field>
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
              const rev = statusOf(ANOMALY_REVIEW, a.reviewStatus || "PENDING");
              const current = a.reviewStatus || "PENDING";
              const actions: { status: CashAnomalyReviewStatus; label: string; icon: React.ElementType; tone: "pink" | "success" | "neutral" | "danger" }[] = [
                { status: "ACKNOWLEDGED", label: "Prendre en compte", icon: Eye, tone: "pink" },
                { status: "RESOLVED", label: "Marquer comme résolue", icon: CheckCheck, tone: "success" },
                { status: "FALSE_POSITIVE", label: "Faux positif", icon: ShieldOff, tone: "neutral" },
                { status: "ESCALATED", label: "Escalader", icon: ArrowUpRight, tone: "danger" },
              ];
              return (
                <div
                  key={a.flagNumber}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{a.flagNumber}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-0.5 lg:order-last">
                    {actions.map((act) => (
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
                    <p className="truncate text-sm font-semibold text-gray-900">{humanize(a.anomalyType)}</p>
                    {a.description && <p className="line-clamp-2 text-xs text-gray-500">{a.description}</p>}
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
