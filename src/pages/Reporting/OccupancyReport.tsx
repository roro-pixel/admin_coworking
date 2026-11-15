import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { Gauge, RankBars } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable, Sub } from "../../components/reporting/reportKit";
import { fmtInt, fmtMinutes, fmtPct, money, monthRange, rateColor } from "../../components/reporting/reportUtils";

const rateLabel = (rate: number) =>
  rate >= 80 ? "Très demandée" : rate >= 60 ? "Bonne performance" : rate >= 30 ? "Utilisation normale" : "Sous-utilisée";

export const OccupancyReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["occupancy-report", range.from, range.to],
    queryFn: () => reportingService.getOccupancyReport({ fromDate: range.from, toDate: range.to }),
  });

  const overall = data?.overallOccupancyRate ?? 0;
  const types = data?.byResourceType ?? [];
  const resources = data?.byResource ?? [];

  return (
    <div className="space-y-6">
      <ReportHead title="Taux d'occupation" subtitle="Utilisation des ressources sur la période">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Taux global", value: fmtPct(overall), tone: "pink" },
                { label: "Réservations", value: fmtInt(data.totalBookings) },
                { label: "Temps réservé", value: fmtMinutes(data.totalBookedMinutes) },
                { label: "Période", value: `${fmtInt(data.periodDays)} jours` },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ChartCard title="Occupation globale">
                <Gauge value={overall} color={rateColor(overall)} caption={rateLabel(overall)} />
              </ChartCard>
              <ChartCard title="Par type de ressource" className="lg:col-span-2">
                <RankBars
                  max={100}
                  format={(n) => fmtPct(n)}
                  items={types.map((t) => ({
                    key: t.typeCode,
                    label: t.typeName,
                    sub: `${fmtInt(t.resourceCount)} ressource${t.resourceCount > 1 ? "s" : ""} · ${fmtInt(t.totalBookings)} réservations · ${money(t.totalRevenue)}`,
                    value: t.occupancyRate ?? 0,
                    color: rateColor(t.occupancyRate ?? 0),
                  }))}
                />
              </ChartCard>
            </div>
            {resources.length > 0 && (
              <ChartCard title="Par ressource">
                <ReportTable
                  cols={[
                    { key: "res", label: "Ressource", width: "minmax(0,1.5fr)" },
                    { key: "type", label: "Type" },
                    { key: "bookings", label: "Réservations", align: "right" },
                    { key: "time", label: "Temps réservé", align: "right" },
                    { key: "revenue", label: "Revenu", align: "right" },
                    { key: "rate", label: "Occupation", width: "minmax(0,1.3fr)" },
                  ]}
                  rows={resources.map((r) => ({
                    id: r.resourceCode,
                    cells: {
                      res: (
                        <>
                          <span className="block truncate font-semibold text-gray-950">{r.resourceName}</span>
                          <Sub>{r.resourceCode}</Sub>
                        </>
                      ),
                      type: r.typeName,
                      bookings: fmtInt(r.bookingCount),
                      time: fmtMinutes(r.bookedMinutes),
                      revenue: <b className="text-gray-950">{money(r.revenue)}</b>,
                      rate: (
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <RatioBar value={r.occupancyRate ?? 0} total={100} color={rateColor(r.occupancyRate ?? 0)} />
                            </div>
                            <span className="w-14 shrink-0 text-right text-xs font-semibold text-gray-600">{fmtPct(r.occupancyRate)}</span>
                          </div>
                          <Sub>{rateLabel(r.occupancyRate ?? 0)}</Sub>
                        </div>
                      ),
                    },
                  }))}
                />
              </ChartCard>
            )}
          </>
        )}
      </ReportBody>
    </div>
  );
};
