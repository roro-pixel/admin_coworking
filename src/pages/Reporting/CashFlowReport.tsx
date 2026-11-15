import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { movementTypeLabels, reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { RankBars, SeriesColumns } from "../../components/reporting/ReportCharts";
import { Disclosure, PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable } from "../../components/reporting/reportKit";
import { FLOW_IN, FLOW_OUT, fmtInt, longDay, money, monthRange, shortDay } from "../../components/reporting/reportUtils";

export const CashFlowReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["cash-flow-report", range.from, range.to],
    queryFn: () => reportingService.getCashFlowReport({ fromDate: range.from, toDate: range.to }),
  });

  const daily = data?.dailySeries ?? [];
  const types = data?.byMovementType ?? [];
  const toItems = (direction: string, color: string) =>
    types
      .filter((t) => t.direction === direction)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((t) => ({
        key: `${direction}-${t.movementType}`,
        label: movementTypeLabels[t.movementType] ?? t.movementType,
        sub: `${fmtInt(t.count)} mouvement${t.count > 1 ? "s" : ""}`,
        value: t.totalAmount || 0,
        color,
      }));

  return (
    <div className="space-y-6">
      <ReportHead title="Flux de trésorerie" subtitle="Entrées et sorties d'argent jour par jour">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()} kpis={3}>
        {data && (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Total entrées", value: money(data.totalInflows), tone: "pink" },
                { label: "Total sorties", value: money(data.totalOutflows) },
                { label: "Flux net", value: money(data.netCashFlow), tone: data.netCashFlow < 0 ? "danger" : "success" },
              ]}
            />
            <ChartCard title="Entrées et sorties par jour">
              <SeriesColumns
                format={money}
                labels={daily.map((d) => shortDay(d.date))}
                series={[
                  { key: "in", name: "Entrées", color: FLOW_IN, values: daily.map((d) => d.inflows || 0) },
                  { key: "out", name: "Sorties", color: FLOW_OUT, values: daily.map((d) => d.outflows || 0) },
                ]}
              />
              {daily.length > 0 && (
                <div className="mt-6">
                  <Disclosure label="Détail jour par jour">
                    <ReportTable
                      cols={[
                        { key: "d", label: "Date" },
                        { key: "in", label: "Entrées", align: "right" },
                        { key: "out", label: "Sorties", align: "right" },
                        { key: "net", label: "Net", align: "right" },
                      ]}
                      rows={daily.map((d) => ({
                        id: d.date,
                        cells: {
                          d: longDay(d.date),
                          in: money(d.inflows),
                          out: money(d.outflows),
                          net: <b className={d.net < 0 ? "text-red-600" : "text-gray-950"}>{`${d.net > 0 ? "+" : ""}${money(d.net)}`}</b>,
                        },
                      }))}
                    />
                  </Disclosure>
                </div>
              )}
            </ChartCard>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Entrées par type de mouvement">
                <RankBars format={money} items={toItems("IN", FLOW_IN)} />
              </ChartCard>
              <ChartCard title="Sorties par type de mouvement">
                <RankBars format={money} items={toItems("OUT", FLOW_OUT)} />
              </ChartCard>
            </div>
          </>
        )}
      </ReportBody>
    </div>
  );
};
