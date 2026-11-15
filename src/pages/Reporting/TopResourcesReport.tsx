import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable, SelectField, Sub } from "../../components/reporting/reportKit";
import { fmtInt, fmtMinutes, fmtPct, money, monthRange, rateColor } from "../../components/reporting/reportUtils";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { PINK_SOFT } from "../../components/subscription/kitUtils";

const LIMITS = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
];

export const TopResourcesReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["top-resources", range.from, range.to, limit],
    queryFn: () => reportingService.getTopResources({ fromDate: range.from, toDate: range.to, limit }),
  });

  const resources = data ?? [];
  const totalRevenue = resources.reduce((a, r) => a + (r.revenueGenerated ?? 0), 0);
  const totalBookings = resources.reduce((a, r) => a + (r.totalBookings ?? 0), 0);
  const totalMinutes = resources.reduce((a, r) => a + (r.totalMinutesBooked ?? 0), 0);
  const avgRate = resources.length ? resources.reduce((a, r) => a + (r.utilizationRate ?? 0), 0) / resources.length : 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Top ressources" subtitle="Les ressources les plus utilisées et les plus rentables">
        <PeriodBar value={range} onChange={setRange} />
        <SelectField label="Nombre de ressources" value={limit} options={LIMITS} onChange={setLimit} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={resources.length > 0} onRetry={() => refetch()}>
        <KpiRow
          items={[
            { label: "Revenu généré", value: money(totalRevenue), tone: "pink" },
            { label: "Réservations", value: fmtInt(totalBookings) },
            { label: "Temps utilisé", value: fmtMinutes(totalMinutes) },
            { label: "Utilisation moyenne", value: fmtPct(avgRate), hint: `${resources.length} ressource${resources.length > 1 ? "s" : ""}` },
          ]}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Revenus par ressource" subtitle="Les 8 premières du classement">
            <RankBars
              format={money}
              items={resources.slice(0, 8).map((r) => ({ key: r.resourceCode, label: r.resourceName, value: r.revenueGenerated ?? 0 }))}
            />
          </ChartCard>
          <ChartCard title="Répartition du temps d'utilisation" subtitle="Les 6 premières du classement">
            <ValueDonut
              centerLabel="de réservation"
              format={fmtMinutes}
              data={resources.slice(0, 6).map((r, i) => ({
                key: r.resourceCode,
                label: r.resourceName,
                value: r.totalMinutesBooked ?? 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
            />
          </ChartCard>
        </div>
        <ChartCard title="Classement détaillé">
          <ReportTable
            cols={[
              { key: "rank", label: "#", width: "2.5rem" },
              { key: "name", label: "Ressource", width: "minmax(0,1.6fr)" },
              { key: "bookings", label: "Réservations", align: "right" },
              { key: "time", label: "Temps utilisé", align: "right" },
              { key: "revenue", label: "Revenu", align: "right" },
              { key: "rate", label: "Utilisation", width: "minmax(0,1.2fr)" },
            ]}
            rows={resources.map((r, i) => ({
              id: r.resourceCode,
              cells: {
                rank: (
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
                    {i + 1}
                  </span>
                ),
                name: (
                  <>
                    <span className="block truncate font-semibold text-gray-950">{r.resourceName}</span>
                    <Sub>{r.resourceCode} · {r.resourceTypeCode}</Sub>
                  </>
                ),
                bookings: fmtInt(r.totalBookings),
                time: fmtMinutes(r.totalMinutesBooked),
                revenue: <b className="text-gray-950">{money(r.revenueGenerated)}</b>,
                rate: (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <RatioBar value={r.utilizationRate ?? 0} total={100} color={rateColor(r.utilizationRate ?? 0)} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-semibold text-gray-600">{fmtPct(r.utilizationRate)}</span>
                  </div>
                ),
              },
            }))}
          />
        </ChartCard>
      </ReportBody>
    </div>
  );
};
