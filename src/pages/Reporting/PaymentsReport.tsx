import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentMethodLabels, reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { SeriesColumns, ValueDonut } from "../../components/reporting/ReportCharts";
import { Disclosure, PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable } from "../../components/reporting/reportKit";
import { METHOD_COLORS, fmtInt, fmtPct, longDay, money, monthRange, shortDay } from "../../components/reporting/reportUtils";
import { StatusChip } from "../../components/subscription/kit";
import { compactAmount } from "../../components/payment/paymentUtils";

const DAILY: { key: "cash" | "wallet" | "mobileMoney" | "bankTransfer" | "card" | "cheque"; method: string }[] = [
  { key: "cash", method: "CASH" },
  { key: "wallet", method: "WALLET" },
  { key: "mobileMoney", method: "MOBILE_MONEY" },
  { key: "bankTransfer", method: "BANK_TRANSFER" },
  { key: "card", method: "CARD" },
  { key: "cheque", method: "CHEQUE" },
];

export const PaymentsReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["payments-report", range.from, range.to],
    queryFn: () => reportingService.getPaymentsReport({ fromDate: range.from, toDate: range.to }),
  });

  const byMethod = data?.byMethod ?? [];
  const daily = data?.dailySeries ?? [];
  const series = DAILY.map((d) => ({
    key: d.key,
    name: paymentMethodLabels[d.method],
    color: METHOD_COLORS[d.method],
    values: daily.map((day) => day[d.key] ?? 0),
  })).filter((s) => s.values.some((v) => v > 0));

  return (
    <div className="space-y-6">
      <ReportHead title="Répartition des paiements" subtitle="Encaissements par moyen de paiement et par jour">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()} kpis={3}>
        {data && (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Total encaissé", value: money(data.totalReceived), tone: "pink" },
                { label: "Transactions", value: fmtInt(data.totalTransactions) },
                { label: "Montant moyen", value: money(data.totalTransactions > 0 ? data.totalReceived / data.totalTransactions : 0) },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Par moyen de paiement">
                <ValueDonut
                  centerLabel="encaissés"
                  format={money}
                  centerFormat={compactAmount}
                  data={byMethod.map((m) => ({
                    key: m.method,
                    label: paymentMethodLabels[m.method] ?? m.method,
                    value: m.amount ?? 0,
                    color: METHOD_COLORS[m.method] ?? "#B9B4B0",
                  }))}
                />
              </ChartCard>
              <ChartCard title="Détail par moyen" subtitle="Nombre de transactions, montant et part">
                <ReportTable
                  cols={[
                    { key: "m", label: "Moyen", width: "minmax(0,1.4fr)" },
                    { key: "c", label: "Transactions", align: "right" },
                    { key: "a", label: "Montant", align: "right", width: "minmax(0,1.3fr)" },
                    { key: "p", label: "Part", align: "right", width: "4rem" },
                  ]}
                  rows={byMethod.map((m) => ({
                    id: m.method,
                    cells: {
                      m: <StatusChip tone="neutral">{paymentMethodLabels[m.method] ?? m.method}</StatusChip>,
                      c: fmtInt(m.count),
                      a: <b className="text-gray-950">{money(m.amount)}</b>,
                      p: fmtPct(m.percentage, 0),
                    },
                  }))}
                />
              </ChartCard>
            </div>
            <ChartCard title="Encaissements par jour" subtitle="Empilés par moyen de paiement">
              <SeriesColumns stacked format={money} labels={daily.map((d) => shortDay(d.date))} series={series} />
              {daily.length > 0 && (
                <div className="mt-6">
                  <Disclosure label="Détail jour par jour">
                    <ReportTable
                      cols={[
                        { key: "d", label: "Date" },
                        ...series.map((s) => ({ key: s.key, label: s.name, align: "right" as const })),
                        { key: "t", label: "Total", align: "right" as const },
                      ]}
                      rows={daily.map((d) => ({
                        id: d.date,
                        cells: {
                          d: longDay(d.date),
                          ...Object.fromEntries(series.map((s) => [s.key, fmtInt(d[s.key as (typeof DAILY)[number]["key"]])])),
                          t: <b className="text-gray-950">{fmtInt(d.total)}</b>,
                        },
                      }))}
                    />
                  </Disclosure>
                </div>
              )}
            </ChartCard>
          </>
        )}
      </ReportBody>
    </div>
  );
};
