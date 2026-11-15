import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashRegisterStatistics } from "../../services/payment.service";
import { DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader } from "../../components/subscription/kit";
import { FIELD_SOFT, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import {
  BarBreakdown,
  ChartCard,
  ChartSkeleton,
  ColumnChart,
  DonutBreakdown,
  KpiRow,
  KpiRowSkeleton,
} from "../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import type { Slice } from "../../components/operations/opsChartData";
import { LOGO_PINK } from "../../components/layout/adminTheme";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_6rem_7rem_8rem_9rem_8rem]";
const GREEN = CHART_COLORS[2];
const RED = "#D9534F";

/** Montants du graphique en milliers de FCFA : les repères d'axe restent lisibles */
const k = (n: number) => Math.round((n || 0) / 1000);

const trend = (v?: number | null) => {
  if (v === null || v === undefined) return "";
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toLocaleString("fr-FR")} %`;
};

export const CashMetricsDashboard: React.FC = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [registerCode, setRegisterCode] = useState("");

  const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };

  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ["cash-metrics-overview", registerCode, fromDate, toDate],
    queryFn: () => paymentService.getCashMetricsOverview({ ...params, registerCode: registerCode || undefined }),
  });

  const { data: registers = [] } = useQuery({
    queryKey: ["cash-metrics-registers", fromDate, toDate],
    queryFn: () => paymentService.getCashMetricsRegisters(params),
  });

  const { data: selectedRegisterStats } = useQuery({
    queryKey: ["cash-register-stats", registerCode, fromDate, toDate],
    queryFn: () => paymentService.getCashRegisterStatistics(registerCode, params),
    enabled: !!registerCode,
  });

  const flows: Slice[] = useMemo(
    () =>
      overview
        ? [
            { key: "pay", label: "Encaissements", value: k(overview.totalPayments), color: LOGO_PINK },
            { key: "in", label: "Entrées", value: k(overview.totalCashIn), color: GREEN },
            { key: "out", label: "Sorties", value: k(overview.totalCashOut), color: RED },
            { key: "ref", label: "Remboursements", value: k(overview.totalRefunds), color: CHART_COLORS[1] },
          ]
        : [],
    [overview],
  );

  const sessionSlices: Slice[] = useMemo(
    () =>
      overview
        ? [
            { key: "open", label: "Ouvertes", value: overview.openSessionCount ?? 0, color: GREEN },
            { key: "review", label: "À valider", value: overview.closingReviewSessionCount ?? 0, color: CHART_COLORS[1] },
            { key: "closed", label: "Clôturées", value: overview.closedSessionCount ?? 0, color: "#B9B4B0" },
          ]
        : [],
    [overview],
  );

  const activity: Slice[] = useMemo(
    () =>
      [...registers]
        .sort((a, b) => Number(b.movementCount || 0) - Number(a.movementCount || 0))
        .map((r, i) => ({
          key: r.registerCode,
          label: r.registerName || r.registerCode,
          value: Number(r.movementCount || 0),
          color: CHART_COLORS[i % CHART_COLORS.length],
        })),
    [registers],
  );

  const peakHours: Slice[] = useMemo(
    () =>
      (selectedRegisterStats?.peakHours ?? [])
        .slice()
        .sort((a, b) => a.hourOfDay - b.hourOfDay)
        .map((h) => ({ key: String(h.hourOfDay), label: `${h.hourOfDay} h`, value: h.movementCount, color: LOGO_PINK })),
    [selectedRegisterStats],
  );

  const selectedName = registers.find((r) => r.registerCode === registerCode)?.registerName || registerCode;

  return (
    <div className="space-y-5">
      <ListHeader title="Métriques de caisse" subtitle="Flux, sessions et activité par caisse sur la période choisie." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Du">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${FIELD_SOFT} bg-white shadow-sm`} />
        </Field>
        <Field label="Au">
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`${FIELD_SOFT} bg-white shadow-sm`} />
        </Field>
        <Field label="Caisse">
          <select value={registerCode} onChange={(e) => setRegisterCode(e.target.value)} className={`${FIELD_SOFT} bg-white shadow-sm`}>
            <option value="">Toutes les caisses</option>
            {registers.map((r) => (
              <option key={r.registerCode} value={r.registerCode}>
                {r.registerName || r.registerCode}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {isLoading ? (
        <>
          <KpiRowSkeleton />
          <div className="grid gap-5 xl:grid-cols-5">
            <ChartSkeleton className="xl:col-span-3" />
            <ChartSkeleton className="xl:col-span-2" />
          </div>
        </>
      ) : isError || !overview ? (
        <ErrorBlock message="Impossible de charger les métriques." onRetry={() => refetch()} />
      ) : (
        <>
          <KpiRow
            items={[
              { label: "Encaissements", value: formatMoney(overview.totalPayments), hint: `${overview.movementCount} mouvements` },
              { label: "Entrées d'espèces", value: formatMoney(overview.totalCashIn), tone: "success" },
              { label: "Sorties d'espèces", value: formatMoney(overview.totalCashOut), tone: "danger" },
              {
                label: "Position nette",
                value: formatMoney(overview.netCashPosition),
                tone: "pink",
                hint: `${overview.openSessionCount} session${overview.openSessionCount > 1 ? "s" : ""} ouverte${overview.openSessionCount > 1 ? "s" : ""}`,
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-5">
            <ChartCard
              title="Flux de caisse"
              subtitle="Montants cumulés sur la période, en milliers de FCFA"
              className="xl:col-span-3"
            >
              <ColumnChart data={flows} height={240} />
            </ChartCard>
            <ChartCard
              title="Sessions"
              subtitle={`${overview.activeRegisterCount} caisse${overview.activeRegisterCount > 1 ? "s" : ""} active${overview.activeRegisterCount > 1 ? "s" : ""} sur ${overview.registerCount}`}
              className="xl:col-span-2"
            >
              <DonutBreakdown data={sessionSlices} centerLabel="sessions" />
              <p className="mt-5 text-sm text-gray-500">
                Écart en attente de validation :{" "}
                <b className="text-gray-950">{formatMoney(overview.pendingVarianceAmount)}</b>
              </p>
            </ChartCard>
          </div>

          <div className={`grid gap-5 ${peakHours.length > 0 ? "xl:grid-cols-2" : ""}`}>
            <ChartCard title="Activité par caisse" subtitle="Nombre de mouvements enregistrés">
              <BarBreakdown data={activity} />
            </ChartCard>
            {peakHours.length > 0 && (
              <ChartCard title={`Heures de pointe · ${selectedName}`} subtitle="Mouvements par heure de la journée">
                <ColumnChart data={peakHours} height={200} />
                {selectedRegisterStats?.periodOverPeriodChangePercentage !== null &&
                  selectedRegisterStats?.periodOverPeriodChangePercentage !== undefined && (
                    <p className="mt-4 text-sm text-gray-500">
                      Évolution par rapport à la période précédente :{" "}
                      <b className="text-gray-950">{trend(selectedRegisterStats.periodOverPeriodChangePercentage)}</b>
                    </p>
                  )}
              </ChartCard>
            )}
          </div>
        </>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-bold text-gray-950">Statistiques par caisse</h3>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : registers.length === 0 ? (
          <EmptyState icon={BarChart3} title="Aucune caisse" hint="Aucune activité sur cette période." />
        ) : (
          <>
            <HeadRow cols={COLS}>
              <span>Caisse</span>
              <span className="text-right">Sessions</span>
              <span className="text-right">Mouvements</span>
              <span className="text-right">Durée moyenne</span>
              <span className="text-right">Écart moyen</span>
              <span className="text-right">Évolution</span>
            </HeadRow>
            <DataCard>
              {registers.map((r: CashRegisterStatistics) => (
                <div
                  key={r.registerCode}
                  className={`grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS}`}
                >
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="truncate font-semibold text-gray-950">{r.registerName}</p>
                    <p className="truncate font-mono text-xs text-gray-400">{r.registerCode}</p>
                  </div>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">
                    <span className="text-xs text-gray-400 lg:hidden">Sessions · </span>
                    {r.sessionCount}
                  </p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">
                    <span className="text-xs text-gray-400 lg:hidden">Mouvements · </span>
                    {r.movementCount}
                  </p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">
                    <span className="text-xs text-gray-400 lg:hidden">Durée · </span>
                    {Math.round(r.averageSessionDurationMinutes || 0)} min
                  </p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">
                    <span className="text-xs text-gray-400 lg:hidden">Écart · </span>
                    {formatMoney(r.averageVarianceAmount ?? 0)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-gray-700 lg:text-right">{trend(r.periodOverPeriodChangePercentage)}</p>
                </div>
              ))}
            </DataCard>
          </>
        )}
      </section>
    </div>
  );
};
