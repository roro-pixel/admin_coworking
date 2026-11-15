import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { PillChoice } from "../../components/operations/opsKit";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { ExportButton, RefreshButton, ReportBody, ReportHead, ReportTable, Sub } from "../../components/reporting/reportKit";
import { AGING_COLORS, fmtInt, fmtPct, money, useExport } from "../../components/reporting/reportUtils";
import { formatDate } from "../../components/subscription/kitUtils";
import { compactAmount } from "../../components/payment/paymentUtils";

const BUCKETS = ["current", "days1to30", "days31to60", "days61to90", "days90plus"] as const;
const SORTS = [
  { value: "age", label: "Ancienneté" },
  { value: "amount", label: "Montant" },
  { value: "customer", label: "Client" },
];

const ageColor = (days: number) => AGING_COLORS[days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4];

export const DebtRecoveryReport: React.FC = () => {
  const [sortBy, setSortBy] = useState("age");
  const exporter = useExport();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["debt-recovery", sortBy],
    queryFn: () => reportingService.getDebtRecoveryReport({ sortBy }),
  });

  const buckets = data
    ? BUCKETS.map((k, i) => ({
        key: k,
        label: data.aging[k].label,
        amount: data.aging[k].totalAmount || 0,
        count: data.aging[k].invoiceCount || 0,
        color: AGING_COLORS[i],
      }))
    : [];
  const over90 = data?.aging.days90plus.totalAmount ?? 0;
  const total = data?.totalOutstanding ?? 0;
  const invoices = data?.unpaidInvoices ?? [];

  return (
    <div className="space-y-6">
      <ReportHead title="Recouvrement des impayés" subtitle="Factures ouvertes, ancienneté et contacts pour relancer">
        <ExportButton label="PDF" busy={exporter.busy === "pdf"} onClick={() => exporter.run("pdf", () => reportingService.exportDebtRecoveryPdf({ sortBy }), "rapport-recouvrement.pdf")} />
        <ExportButton label="CSV" busy={exporter.busy === "csv"} onClick={() => exporter.run("csv", () => reportingService.exportDebtRecoveryCsv({ sortBy }), "rapport-recouvrement.csv")} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()} kpis={3}>
        {data && (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Total impayé", value: money(total), tone: total > 0 ? "danger" : "default" },
                { label: "Factures impayées", value: fmtInt(data.totalInvoices) },
                { label: "Plus de 90 jours", value: money(over90), tone: over90 > 0 ? "danger" : "default", hint: `${fmtPct(total > 0 ? (over90 / total) * 100 : 0)} du total` },
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
              <ChartCard title="Montant par tranche">
                <RankBars
                  format={money}
                  items={buckets.map((b) => ({ key: b.key, label: b.label, sub: `${fmtInt(b.count)} facture${b.count > 1 ? "s" : ""}`, value: b.amount, color: b.color }))}
                />
              </ChartCard>
            </div>
            <ChartCard title="Factures impayées" subtitle={`${fmtInt(invoices.length)} facture${invoices.length > 1 ? "s" : ""}`}>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-gray-400">Trier par</span>
                <PillChoice label="Tri des factures" options={SORTS} value={sortBy} onChange={setSortBy} />
              </div>
              <ReportTable
                cols={[
                  { key: "doc", label: "Facture", width: "minmax(0,1.1fr)" },
                  { key: "cust", label: "Client", width: "minmax(0,1.6fr)" },
                  { key: "due", label: "Échéance" },
                  { key: "age", label: "Ancienneté" },
                  { key: "due$", label: "Reste dû", align: "right" },
                ]}
                rows={invoices.map((i) => ({
                  id: i.documentNumber,
                  cells: {
                    doc: (
                      <>
                        <span className="block truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{i.documentNumber}</span>
                        <Sub>Émise le {formatDate(i.issueDate)}</Sub>
                      </>
                    ),
                    cust: (
                      <>
                        <span className="block truncate font-semibold text-gray-950">{i.customerName}</span>
                        <Sub>{[i.customerEmail, i.customerPhone].filter(Boolean).join(" · ") || i.customerCode}</Sub>
                      </>
                    ),
                    due: formatDate(i.dueDate),
                    age: (
                      <span className="inline-flex items-center gap-2 font-semibold text-gray-800">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ageColor(i.agingDays) }} />
                        {i.agingDays > 0 ? `${fmtInt(i.agingDays)} j de retard` : "À échéance"}
                      </span>
                    ),
                    "due$": <b className="text-gray-950">{money(i.balanceDue)}</b>,
                  },
                }))}
                empty="Aucune facture impayée."
              />
            </ChartCard>
          </>
        )}
      </ReportBody>
    </div>
  );
};
