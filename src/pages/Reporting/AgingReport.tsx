import React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { RefreshButton, ReportBody, ReportHead } from "../../components/reporting/reportKit";
import { AGING_COLORS, fmtInt, fmtPct, money } from "../../components/reporting/reportUtils";
import { compactAmount } from "../../components/payment/paymentUtils";

const KEYS = ["current", "days1to30", "days31to60", "days61to90", "over90"] as const;
const LABELS: Record<(typeof KEYS)[number], string> = {
  current: "À échéance",
  days1to30: "1 à 30 jours",
  days31to60: "31 à 60 jours",
  days61to90: "61 à 90 jours",
  over90: "Plus de 90 jours",
};

export const AgingReport: React.FC = () => {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["aging-report"],
    queryFn: () => reportingService.getAgingReport(),
  });

  const buckets = data
    ? KEYS.map((k, i) => ({
        key: k,
        label: LABELS[k],
        amount: data[k]?.amount || 0,
        count: data[k]?.count || 0,
        color: AGING_COLORS[i],
      }))
    : [];
  const risky = (data?.days61to90?.amount || 0) + (data?.over90?.amount || 0);
  const riskyCount = (data?.days61to90?.count || 0) + (data?.over90?.count || 0);
  const outstanding = data?.totalOutstanding || 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Vieillissement des créances" subtitle="Factures impayées classées par ancienneté">
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()} kpis={3}>
        {data && (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Total impayé", value: money(outstanding), tone: outstanding > 0 ? "danger" : "default", hint: `${fmtInt(data.totalInvoices)} facture${data.totalInvoices > 1 ? "s" : ""}` },
                { label: "Créances de plus de 60 jours", value: money(risky), hint: `${fmtInt(riskyCount)} facture${riskyCount > 1 ? "s" : ""} à risque` },
                { label: "Part à risque", value: fmtPct(outstanding > 0 ? (risky / outstanding) * 100 : 0), hint: "du total impayé" },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Répartition par ancienneté">
                <ValueDonut
                  centerLabel="impayés"
                  format={money}
                  centerFormat={compactAmount}
                  data={buckets.map((b) => ({ key: b.key, label: b.label, value: b.amount, color: b.color }))}
                />
              </ChartCard>
              <ChartCard title="Montant par tranche" subtitle="Du plus récent au plus ancien">
                <RankBars
                  format={money}
                  items={buckets.map((b) => ({
                    key: b.key,
                    label: b.label,
                    sub: `${fmtInt(b.count)} facture${b.count > 1 ? "s" : ""}`,
                    value: b.amount,
                    color: b.color,
                  }))}
                />
              </ChartCard>
            </div>
          </>
        )}
      </ReportBody>
    </div>
  );
};
