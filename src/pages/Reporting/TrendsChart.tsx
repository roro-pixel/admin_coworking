import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { PillChoice, ViewSwitch } from "../../components/operations/opsKit";
import { TrendChart } from "../../components/reporting/ReportCharts";
import type { TrendMode } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead } from "../../components/reporting/reportKit";
import { fmtPct, lastDaysRange, money, shortDay } from "../../components/reporting/reportUtils";
import { LOGO_PINK } from "../../components/layout/adminTheme";

type TrendType = "bookings" | "revenue" | "occupancy";

const oneDecimal = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const CONFIG: Record<TrendType, { label: string; color: string; dataKey: string; format: (n: number) => string; max?: number }> = {
  bookings: { label: "Réservations", color: LOGO_PINK, dataKey: "bookingCount", format: oneDecimal },
  revenue: { label: "Revenus", color: "#E8A33D", dataKey: "revenue", format: money },
  occupancy: { label: "Occupation", color: "#7FB08A", dataKey: "occupancyRate", format: (n) => fmtPct(n), max: 100 },
};

const MODES: { id: TrendMode; label: string }[] = [
  { id: "area", label: "Aire" },
  { id: "line", label: "Ligne" },
  { id: "bar", label: "Barres" },
];

export const TrendsChart: React.FC = () => {
  const [trendType, setTrendType] = useState<TrendType>("bookings");
  const [mode, setMode] = useState<TrendMode>("area");
  const [range, setRange] = useState(lastDaysRange(30));
  const config = CONFIG[trendType];

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["trends", trendType, range.from, range.to],
    queryFn: () => {
      const params = { fromDate: range.from, toDate: range.to, interval: "DAY" as const };
      if (trendType === "revenue") return reportingService.getRevenueTrends(params);
      if (trendType === "occupancy") return reportingService.getOccupancyTrends(params);
      return reportingService.getBookingTrends(params);
    },
  });

  // L'API renvoie soit { series: [...] }, soit directement un tableau de points
  const raw: unknown = data;
  const list: Record<string, unknown>[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { series?: unknown })?.series)
      ? ((raw as { series: Record<string, unknown>[] }).series)
      : [];
  const points = list.map((p) => ({
    date: String(p.timestamp ?? p.date ?? ""),
    value: Number(p.value ?? p[config.dataKey] ?? 0) || 0,
  }));
  const values = points.map((p) => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const average = values.length ? total / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Tendances" subtitle="Évolution jour par jour sur la période choisie">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <PillChoice
        label="Indicateur"
        value={trendType}
        onChange={setTrendType}
        options={(Object.keys(CONFIG) as TrendType[]).map((k) => ({ value: k, label: CONFIG[k].label }))}
      />

      <ReportBody
        loading={isLoading}
        error={isError}
        hasData={points.length > 0}
        onRetry={() => refetch()}
        kpis={trendType === "occupancy" ? 3 : 4}
        emptyHint="Aucune donnée pour cette période."
      >
        <KpiRow
          columns={trendType === "occupancy" ? 3 : 4}
          items={[
            { label: "Moyenne", value: config.format(average) },
            { label: "Minimum", value: config.format(min) },
            { label: "Maximum", value: config.format(max), tone: "pink" },
            ...(trendType === "occupancy" ? [] : [{ label: "Total", value: config.format(total) }]),
          ]}
        />
        <ChartCard title={`Évolution : ${config.label.toLowerCase()}`} subtitle="Survolez ou touchez le graphique pour lire une valeur">
          <div className="mb-5 flex justify-end">
            <ViewSwitch items={MODES} active={mode} onChange={setMode} />
          </div>
          <TrendChart
            labels={points.map((p) => shortDay(p.date))}
            values={values}
            mode={mode}
            name={config.label}
            format={config.format}
            color={config.color}
            max={config.max}
          />
        </ChartCard>
      </ReportBody>
    </div>
  );
};
