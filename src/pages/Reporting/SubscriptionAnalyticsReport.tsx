import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { RankBars, TrendChart, ValueDonut } from "../../components/reporting/ReportCharts";
import { ExportButton, RefreshButton, ReportBody, ReportHead, ReportTable, SelectField, Sub } from "../../components/reporting/reportKit";
import { DANGER, fmtInt, fmtPct, money, monthLabel, useExport } from "../../components/reporting/reportUtils";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { StatusChip } from "../../components/subscription/kit";
import { formatDate } from "../../components/subscription/kitUtils";
import { compactAmount } from "../../components/payment/paymentUtils";

const MONTHS = [6, 12, 24].map((m) => ({ value: m, label: `${m} derniers mois` }));
const RENEWAL = [15, 30, 60].map((d) => ({ value: d, label: `Renouvellements sous ${d} jours` }));

export const SubscriptionAnalyticsReport: React.FC = () => {
  const [months, setMonths] = useState(12);
  const [renewalDays, setRenewalDays] = useState(30);
  const exporter = useExport();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["subscription-analytics", months, renewalDays],
    queryFn: () => reportingService.getSubscriptionAnalytics({ months, renewalDays }),
  });

  const mrr = data?.mrrTrend ?? [];
  const churnTrend = data?.churnTrend ?? [];
  const plans = data?.activeByPlan ?? [];
  const revenue = data?.revenueByPlan ?? [];
  const renewals = data?.upcomingRenewals ?? [];
  const churn = churnTrend[churnTrend.length - 1]?.churnRate ?? 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Analytique des abonnements" subtitle="Revenu récurrent, résiliations et prochains renouvellements">
        <SelectField label="Historique" value={months} options={MONTHS} onChange={setMonths} />
        <SelectField label="Fenêtre de renouvellement" value={renewalDays} options={RENEWAL} onChange={setRenewalDays} />
        <ExportButton label="PDF" busy={exporter.busy === "pdf"} onClick={() => exporter.run("pdf", () => reportingService.exportSubscriptionAnalyticsPdf({ months, renewalDays }), "rapport-abonnements.pdf")} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Revenu mensuel récurrent", value: money(data.currentMrr), tone: "pink" },
                { label: "Abonnements actifs", value: fmtInt(data.totalActive) },
                { label: "Taux de résiliation", value: fmtPct(churn), hint: "dernier mois" },
                { label: "À renouveler", value: fmtInt(renewals.length), hint: `sous ${renewalDays} jours` },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Revenu mensuel récurrent">
                <TrendChart height={220} name="Revenu récurrent" format={money} labels={mrr.map((m) => monthLabel(m.month))} values={mrr.map((m) => m.mrr)} />
              </ChartCard>
              <ChartCard title="Taux de résiliation" subtitle="Part des abonnements résiliés chaque mois">
                <TrendChart
                  mode="line"
                  height={220}
                  name="Résiliation"
                  color={DANGER}
                  format={(n) => fmtPct(n)}
                  labels={churnTrend.map((c) => monthLabel(c.month))}
                  values={churnTrend.map((c) => c.churnRate)}
                />
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Abonnements actifs par plan">
                <RankBars
                  format={fmtInt}
                  items={plans.map((p) => ({ key: p.planName, label: p.planName, sub: money(p.totalAmount), value: p.subscriptionCount }))}
                />
              </ChartCard>
              <ChartCard title="Revenu par plan">
                <ValueDonut
                  centerLabel="par mois"
                  format={money}
                  centerFormat={compactAmount}
                  data={revenue.map((r, i) => ({ key: r.planName, label: r.planName, value: r.totalRevenue, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                />
              </ChartCard>
            </div>
            <ChartCard title="Prochains renouvellements" subtitle={`Échéances dans les ${renewalDays} prochains jours`}>
              <ReportTable
                empty="Aucun renouvellement prévu sur cette fenêtre."
                cols={[
                  { key: "n", label: "Abonnement", width: "minmax(0,1.5fr)" },
                  { key: "who", label: "Abonné" },
                  { key: "end", label: "Échéance" },
                  { key: "a", label: "Montant", align: "right" },
                ]}
                rows={renewals.map((r) => ({
                  id: r.subscriptionNumber,
                  cells: {
                    n: (<><span className="block truncate font-semibold text-gray-950">{r.planName}</span><Sub>{r.subscriptionNumber}</Sub></>),
                    who: r.subscriberCode,
                    end: (
                      <span className="inline-flex items-center gap-2">
                        {formatDate(r.currentPeriodEnd)}
                        <StatusChip tone={r.daysUntilRenewal <= 7 ? "warn" : "neutral"}>dans {fmtInt(r.daysUntilRenewal)} j</StatusChip>
                      </span>
                    ),
                    a: <b className="text-gray-950">{money(r.totalAmount)}</b>,
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
