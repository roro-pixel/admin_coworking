import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { RankBars, TrendChart } from "../../components/reporting/ReportCharts";
import { ExportButton, PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable, Sub } from "../../components/reporting/reportKit";
import { fmtInt, fmtPct, money, monthRange, rateColor, useExport } from "../../components/reporting/reportUtils";
import { CHART_COLORS } from "../../components/operations/opsChartData";

const SLOTS = [
  { key: "morningBookings", label: "Matin", color: CHART_COLORS[1] },
  { key: "afternoonBookings", label: "Après-midi", color: CHART_COLORS[0] },
  { key: "eveningBookings", label: "Soir", color: CHART_COLORS[3] },
] as const;

export const ResourceUtilizationReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());
  const exporter = useExport();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["resource-utilization", range.from, range.to],
    queryFn: () => reportingService.getResourceUtilizationReport({ from: range.from, to: range.to }),
  });

  const hours = [...(data?.hourlyHeatmap ?? [])].sort((a, b) => a.hour - b.hour);
  const resources = data?.resources ?? [];
  const under = data?.underutilized ?? [];
  const overall = data?.overallOccupancyRate ?? 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Utilisation des ressources" subtitle="Fréquentation par heure, occupation et revenu par ressource">
        <PeriodBar value={range} onChange={setRange} />
        <ExportButton
          label="PDF"
          busy={exporter.busy === "pdf"}
          onClick={() => exporter.run("pdf", () => reportingService.exportResourceUtilizationPdf({ from: range.from, to: range.to }), "rapport-utilisation-ressources.pdf")}
        />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Occupation globale", value: fmtPct(overall), tone: "pink" },
                { label: "Période", value: `${fmtInt(data.periodDays)} jours` },
                { label: "Ressources suivies", value: fmtInt(resources.length) },
                { label: "Sous-utilisées", value: fmtInt(under.length), tone: under.length > 0 ? "danger" : "default" },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ChartCard title="Fréquentation par heure" subtitle="Nombre de réservations selon l'heure de début" className="lg:col-span-2">
                <TrendChart
                  mode="bar"
                  height={220}
                  name="Réservations"
                  format={fmtInt}
                  labels={hours.map((h) => `${h.hour}h`)}
                  values={hours.map((h) => h.bookingCount)}
                />
              </ChartCard>
              <ChartCard title="À surveiller" subtitle="Ressources sous-utilisées">
                <RankBars
                  max={100}
                  format={(n) => fmtPct(n)}
                  items={under.map((u) => ({
                    key: u.resourceCode,
                    label: u.resourceName,
                    sub: `${u.resourceType} · ${money(u.totalRevenue)}`,
                    value: u.occupancyRate ?? 0,
                    color: rateColor(u.occupancyRate ?? 0),
                  }))}
                />
              </ChartCard>
            </div>
            <ChartCard title="Ressources" subtitle="Occupation, créneaux les plus réservés et revenu">
              <ReportTable
                cols={[
                  { key: "res", label: "Ressource", width: "minmax(0,1.5fr)" },
                  { key: "rate", label: "Occupation", width: "minmax(0,1.3fr)" },
                  { key: "slots", label: "Créneaux", width: "minmax(0,1.2fr)" },
                  { key: "rev", label: "Revenu", align: "right" },
                  { key: "perh", label: "Revenu par heure", align: "right" },
                ]}
                rows={resources.map((r) => {
                  const total = SLOTS.reduce((a, s) => a + (r[s.key] || 0), 0);
                  return {
                    id: r.resourceCode,
                    cells: {
                      res: (
                        <>
                          <span className="block truncate font-semibold text-gray-950">{r.resourceName}</span>
                          <Sub>{r.resourceType} · {fmtInt(r.totalBookings)} réservations</Sub>
                        </>
                      ),
                      rate: (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <RatioBar value={r.occupancyRate ?? 0} total={100} color={rateColor(r.occupancyRate ?? 0)} />
                          </div>
                          <span className="w-14 shrink-0 text-right text-xs font-semibold text-gray-600">{fmtPct(r.occupancyRate)}</span>
                        </div>
                      ),
                      slots: (
                        <div title={SLOTS.map((s) => `${s.label} : ${r[s.key] || 0}`).join(" · ")}>
                          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
                            {SLOTS.map((s) =>
                              (r[s.key] || 0) > 0 ? (
                                <div key={s.key} style={{ width: `${((r[s.key] || 0) / total) * 100}%`, backgroundColor: s.color }} />
                              ) : null,
                            )}
                          </div>
                          <Sub>{SLOTS.map((s) => `${r[s.key] || 0}`).join(" · ")} (matin, après-midi, soir)</Sub>
                        </div>
                      ),
                      rev: <b className="text-gray-950">{money(r.totalRevenue)}</b>,
                      perh: money(r.revenuePerHour),
                    },
                  };
                })}
              />
            </ChartCard>
          </>
        )}
      </ReportBody>
    </div>
  );
};
