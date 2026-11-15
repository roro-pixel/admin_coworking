import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentMethodLabels, reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { SeriesColumns, ValueDonut } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead, StatList } from "../../components/reporting/reportKit";
import { OK, WARN, fmtInt, fmtPct, frLabel, METHOD_COLORS, money, monthRange } from "../../components/reporting/reportUtils";
import { LOGO_PINK } from "../../components/layout/adminTheme";
import { compactAmount } from "../../components/payment/paymentUtils";

export const FinanceDashboard: React.FC = () => {
  const [range, setRange] = useState(monthRange());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["finance-dashboard", range.from, range.to],
    queryFn: () => reportingService.getFinanceDashboard({ fromDate: range.from, toDate: range.to }),
  });

  const p = data?.payments;
  const methods = p
    ? [
        ["CASH", p.cashAmount],
        ["WALLET", p.walletAmount],
        ["MOBILE_MONEY", p.mobileMoneyAmount],
        ["BANK_TRANSFER", p.bankTransferAmount],
        ["CARD", p.cardAmount],
        ["CHEQUE", p.chequeAmount],
      ].map(([key, value]) => ({
        key: key as string,
        label: paymentMethodLabels[key as string] ?? (key as string),
        value: (value as number) || 0,
        color: METHOD_COLORS[key as string],
      }))
    : [];
  const sources = data?.revenueBySource ?? [];
  const rate = data?.collectionRate ?? 0;

  return (
    <div className="space-y-6">
      <ReportHead title="Tableau de bord financier" subtitle="Facturation, encaissements et créances sur la période">
        <PeriodBar value={range} onChange={setRange} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Chiffre d'affaires", value: money(data.totalInvoiced), hint: `${fmtInt(data.invoiceCount)} factures émises` },
                { label: "Encaissements", value: money(data.totalPaid), tone: "pink", hint: `${fmtInt(p?.transactionCount)} transactions` },
                { label: "Taux de recouvrement", value: fmtPct(rate) },
                {
                  label: "Créances en retard",
                  value: money(data.overdueAmount),
                  tone: (data.overdueCount ?? 0) > 0 ? "danger" : "default",
                  hint: `${fmtInt(data.overdueCount)} facture${(data.overdueCount ?? 0) > 1 ? "s" : ""} en retard`,
                },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Encaissements par moyen de paiement">
                <ValueDonut data={methods} centerLabel="encaissés" format={money} centerFormat={compactAmount} />
              </ChartCard>
              <ChartCard title="Facturation par source" subtitle="Facturé, payé et restant à encaisser">
                <SeriesColumns
                  height={230}
                  format={money}
                  labels={sources.map((s) => frLabel(s.sourceType))}
                  series={[
                    { key: "inv", name: "Facturé", color: LOGO_PINK, values: sources.map((s) => s.totalInvoiced || 0) },
                    { key: "paid", name: "Payé", color: OK, values: sources.map((s) => s.totalPaid || 0) },
                    { key: "due", name: "Restant", color: WARN, values: sources.map((s) => s.outstandingAmount || 0) },
                  ]}
                />
              </ChartCard>
            </div>
            <ChartCard title="Suivi de la période">
              <div className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-gray-800">Facturé encaissé</span>
                    <b className="tabular-nums text-gray-950">{fmtPct(rate)}</b>
                  </div>
                  <RatioBar value={data.totalPaid} total={data.totalInvoiced} />
                  <div className="mt-5">
                    <StatList
                      rows={[
                        { label: "Reste à encaisser", value: money(data.totalOutstanding) },
                        { label: "TVA collectée", value: money(data.totalVat) },
                        { label: "Centimes additionnels", value: money(data.totalAdditionalCent) },
                      ]}
                    />
                  </div>
                </div>
                <StatList
                  rows={[
                    { label: "Remises accordées", value: money(data.totalDiscounts) },
                    { label: "Factures annulées", value: fmtInt(data.cancelledInvoiceCount) },
                    { label: "Paiements échoués", value: fmtInt(p?.failedCount) },
                    { label: "Paiements en attente", value: fmtInt(p?.pendingCount) },
                  ]}
                />
              </div>
            </ChartCard>
          </>
        )}
      </ReportBody>
    </div>
  );
};
