import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import type { RealComparisonResponse } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { Delta, PeriodBar, RefreshButton, ReportBody, ReportHead } from "../../components/reporting/reportKit";
import { fmtInt, isoDate, longDay, money, monthRange, percentChange } from "../../components/reporting/reportUtils";
import { LOGO_PINK } from "../../components/layout/adminTheme";

const PREV_COLOR = "#B9B4B0";

/** Période de même durée qui précède juste la période analysée */
const previousRange = (from: string, to: string) => {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  };
  const f = parse(from);
  const days = Math.round((parse(to).getTime() - f.getTime()) / 86400000) + 1;
  const prevTo = new Date(f);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: isoDate(prevFrom), to: isoDate(prevTo) };
};

const PairBar: React.FC<{ caption: string; value: number; max: number; color: string; format: (n: number) => string }> = ({
  caption,
  value,
  max,
  color,
  format,
}) => (
  <div className="flex items-center gap-3">
    <span className="w-20 shrink-0 text-xs font-semibold text-gray-400">{caption}</span>
    <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }} />
    </div>
    <b className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-950 sm:w-36">{format(value)}</b>
  </div>
);

export const ComparisonReport: React.FC = () => {
  const [range, setRange] = useState(monthRange(-1));

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["comparison-report", range.from, range.to],
    queryFn: async () => {
      const response = await reportingService.getComparison({
        fromDate: range.from,
        toDate: range.to,
        compareWithPrevious: true,
      });
      return response as unknown as RealComparisonResponse;
    },
  });

  const prev = previousRange(range.from, range.to);
  const rows = data
    ? [
        { key: "b", label: "Réservations", cur: data.current?.booking?.bookingCount ?? 0, old: data.previous?.booking?.bookingCount ?? 0, fmt: fmtInt },
        { key: "i", label: "Facturé", cur: data.current?.financial?.invoicedAmount ?? 0, old: data.previous?.financial?.invoicedAmount ?? 0, fmt: money },
        { key: "p", label: "Encaissé", cur: data.current?.financial?.paidAmount ?? 0, old: data.previous?.financial?.paidAmount ?? 0, fmt: money },
        { key: "s", label: "Abonnements actifs", cur: data.current?.subscription?.activeSubscriptions ?? 0, old: data.previous?.subscription?.activeSubscriptions ?? 0, fmt: fmtInt },
      ].map((r) => ({ ...r, pct: percentChange(r.cur, r.old) }))
    : [];

  const sign = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")} % vs période précédente`;

  return (
    <div className="space-y-6">
      <ReportHead title="Comparaison de périodes" subtitle="Évolution entre la période choisie et la période précédente de même durée">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        <KpiRow
          items={rows.map((r) => ({ label: r.label, value: r.fmt(r.cur), hint: sign(r.pct) }))}
        />
        <ChartCard
          title="Période actuelle contre période précédente"
          subtitle={`Du ${longDay(range.from)} au ${longDay(range.to)} · précédente : du ${longDay(prev.from)} au ${longDay(prev.to)}`}
        >
          <ul className="space-y-7">
            {rows.map((r) => {
              const max = Math.max(r.cur, r.old);
              return (
                <li key={r.key}>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-950">{r.label}</span>
                    <Delta value={r.pct} />
                  </div>
                  <div className="space-y-2">
                    <PairBar caption="Actuelle" value={r.cur} max={max} color={LOGO_PINK} format={r.fmt} />
                    <PairBar caption="Précédente" value={r.old} max={max} color={PREV_COLOR} format={r.fmt} />
                  </div>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </ReportBody>
    </div>
  );
};
