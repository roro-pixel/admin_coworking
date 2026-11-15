import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { SeriesColumns } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable, Sub } from "../../components/reporting/reportKit";
import { FLOW_IN, FLOW_OUT, fmtInt, money, monthRange } from "../../components/reporting/reportUtils";
import { StatusChip } from "../../components/subscription/kit";
import { formatMoney } from "../../components/subscription/kitUtils";

export const CashRegistersReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["cash-registers-report", range.from, range.to],
    queryFn: () => reportingService.getCashRegistersReport({ fromDate: range.from, toDate: range.to }),
  });

  const registers = data?.registers ?? [];

  return (
    <div className="space-y-6">
      <ReportHead title="Rapport par caisse" subtitle="Entrées, sorties et écarts de chaque caisse">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()} kpis={3}>
        {data && (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Total entrées", value: money(data.totalCashIn), tone: "pink" },
                { label: "Total sorties", value: money(data.totalCashOut) },
                { label: "Flux net", value: money(data.netFlow), tone: data.netFlow < 0 ? "danger" : "success" },
              ]}
            />
            <ChartCard title="Entrées et sorties par caisse">
              <SeriesColumns
                height={240}
                format={money}
                labels={registers.map((r) => r.registerName)}
                series={[
                  { key: "in", name: "Entrées", color: FLOW_IN, values: registers.map((r) => r.cashIn || 0) },
                  { key: "out", name: "Sorties", color: FLOW_OUT, values: registers.map((r) => r.cashOut || 0) },
                ]}
              />
            </ChartCard>
            <ChartCard title="Détail par caisse" subtitle="Montants en FCFA">
              <ReportTable
                cols={[
                  { key: "reg", label: "Caisse", width: "minmax(0,1.5fr)" },
                  { key: "sessions", label: "Sessions", align: "right", width: "5rem" },
                  { key: "open", label: "Fond initial", align: "right" },
                  { key: "in", label: "Entrées", align: "right" },
                  { key: "out", label: "Sorties", align: "right" },
                  { key: "net", label: "Flux net", align: "right" },
                  { key: "gap", label: "Écart", align: "right" },
                  { key: "mov", label: "Mouvements", align: "right", width: "6rem" },
                ]}
                rows={registers.map((r) => ({
                  id: r.registerCode,
                  cells: {
                    reg: (
                      <>
                        <span className="block truncate font-semibold text-gray-950">{r.registerName}</span>
                        <Sub>{r.registerCode}</Sub>
                      </>
                    ),
                    sessions: fmtInt(r.sessionsCount),
                    open: fmtInt(r.openingAmount),
                    in: fmtInt(r.cashIn),
                    out: fmtInt(r.cashOut),
                    net: <b className={r.netFlow < 0 ? "text-red-600" : "text-gray-950"}>{fmtInt(r.netFlow)}</b>,
                    gap:
                      r.totalVariance !== 0 ? (
                        <StatusChip tone={r.totalVariance < 0 ? "danger" : "warn"}>
                          {r.totalVariance > 0 ? "+" : ""}
                          {formatMoney(r.totalVariance, "")}
                        </StatusChip>
                      ) : (
                        <span className="text-gray-400">Aucun</span>
                      ),
                    mov: fmtInt(r.movementsCount),
                  },
                }))}
              />
            </ChartCard>
          </>
        )}
      </ReportBody>
    </div>
  );
};
