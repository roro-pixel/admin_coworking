import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import type { ActivityVariation } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { ValueDonut } from "../../components/reporting/ReportCharts";
import { Delta, ExportButton, PeriodBar, RefreshButton, ReportBody, ReportHead, StatList } from "../../components/reporting/reportKit";
import { METHOD_COLORS, fmtInt, money, monthRange, useExport } from "../../components/reporting/reportUtils";
import { CheckField } from "../../components/subscription/kit";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { compactAmount } from "../../components/payment/paymentUtils";

const sinceText = (v?: ActivityVariation | null) =>
  v ? `${v.changePercent > 0 ? "+" : ""}${v.changePercent.toFixed(1).replace(".", ",")} % vs période précédente` : undefined;

const Module: React.FC<{ title: string; variation?: ActivityVariation | null; inverse?: boolean; rows: { label: string; value: React.ReactNode }[] }> = ({
  title,
  variation,
  inverse,
  rows,
}) => (
  <div className="min-w-0">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h4 className="text-sm font-bold text-gray-950">{title}</h4>
      <Delta value={variation?.changePercent} inverse={inverse} />
    </div>
    <StatList rows={rows} />
  </div>
);

export const ActivityReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());
  const [compare, setCompare] = useState(true);
  const exporter = useExport();

  const params = { from: range.from, to: range.to, compareWithPrevious: compare };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["activity-report", range.from, range.to, compare],
    queryFn: () => reportingService.getActivityReport(params),
  });

  const b = data?.bookings;
  const pay = data?.payments;

  return (
    <div className="space-y-6">
      <ReportHead title="Rapport d'activité consolidé" subtitle="Vue d'ensemble de tous les modules sur la période">
        <PeriodBar value={range} onChange={setRange} />
        <div className="w-40">
          <CheckField checked={compare} onChange={setCompare} label="Comparer" />
        </div>
        <ExportButton label="PDF" busy={exporter.busy === "pdf"} onClick={() => exporter.run("pdf", () => reportingService.exportActivityPdf(params), "rapport-activite.pdf")} />
        <ExportButton label="CSV" busy={exporter.busy === "csv"} onClick={() => exporter.run("csv", () => reportingService.exportActivityCsv(params), "rapport-activite.csv")} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && b && pay && (
          <>
            <KpiRow
              items={[
                { label: "Réservations", value: fmtInt(b.totalCount), hint: sinceText(b.variation) },
                { label: "Facturé", value: money(data.invoices.totalInvoiced), hint: sinceText(data.invoices.variation) },
                { label: "Encaissé", value: money(pay.totalReceived), tone: "pink", hint: sinceText(pay.variation) },
                { label: "Membres actifs", value: fmtInt(data.members.totalActive), hint: sinceText(data.members.variation) },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Réservations par statut">
                <ValueDonut
                  centerLabel="réservations"
                  format={fmtInt}
                  data={[
                    { key: "c", label: "Confirmées", value: b.confirmedCount, color: CHART_COLORS[0] },
                    { key: "d", label: "Terminées", value: b.completedCount, color: CHART_COLORS[2] },
                    { key: "x", label: "Annulées", value: b.cancelledCount, color: CHART_COLORS[5] },
                  ]}
                />
              </ChartCard>
              <ChartCard title="Encaissements par moyen">
                <ValueDonut
                  centerLabel="encaissés"
                  format={money}
                  centerFormat={compactAmount}
                  data={[
                    { key: "cash", label: "Espèces", value: pay.cashAmount, color: METHOD_COLORS.CASH },
                    { key: "wallet", label: "Portefeuille", value: pay.walletAmount, color: METHOD_COLORS.WALLET },
                    { key: "mm", label: "Mobile Money", value: pay.mobileMoneyAmount, color: METHOD_COLORS.MOBILE_MONEY },
                    { key: "bank", label: "Virement", value: pay.bankTransferAmount, color: METHOD_COLORS.BANK_TRANSFER },
                    { key: "card", label: "Carte", value: pay.cardAmount, color: METHOD_COLORS.CARD },
                  ]}
                />
              </ChartCard>
            </div>
            <ChartCard title="Détail par module" subtitle={compare ? "Les pastilles indiquent l'évolution depuis la période précédente" : undefined}>
              <div className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
                <Module
                  title="Réservations"
                  variation={b.variation}
                  rows={[
                    { label: "Total", value: fmtInt(b.totalCount) },
                    { label: "Confirmées", value: fmtInt(b.confirmedCount) },
                    { label: "Terminées", value: fmtInt(b.completedCount) },
                    { label: "Annulées", value: fmtInt(b.cancelledCount) },
                    { label: "Chiffre d'affaires", value: money(b.totalRevenue) },
                  ]}
                />
                <Module
                  title="Facturation"
                  variation={data.invoices.variation}
                  rows={[
                    { label: "Factures", value: fmtInt(data.invoices.totalCount) },
                    { label: "Facturé", value: money(data.invoices.totalInvoiced) },
                    { label: "Payé", value: money(data.invoices.totalPaid) },
                    { label: "Restant dû", value: money(data.invoices.totalOutstanding) },
                    { label: "En retard", value: fmtInt(data.invoices.overdueCount) },
                  ]}
                />
                <Module
                  title="Paiements"
                  variation={pay.variation}
                  rows={[
                    { label: "Transactions", value: fmtInt(pay.transactionCount) },
                    { label: "Encaissé", value: money(pay.totalReceived) },
                    { label: "Espèces", value: money(pay.cashAmount) },
                    { label: "Mobile Money", value: money(pay.mobileMoneyAmount) },
                  ]}
                />
                <Module
                  title="Abonnements"
                  variation={data.subscriptions.variation}
                  rows={[
                    { label: "Actifs", value: fmtInt(data.subscriptions.activeCount) },
                    { label: "Nouveaux", value: fmtInt(data.subscriptions.newCount) },
                    { label: "Renouvelés", value: fmtInt(data.subscriptions.renewedCount) },
                    { label: "Résiliés", value: fmtInt(data.subscriptions.cancelledCount) },
                  ]}
                />
                <Module
                  title="Stock"
                  variation={data.stock.variation}
                  rows={[
                    { label: "Entrées", value: fmtInt(data.stock.inboundMovements) },
                    { label: "Sorties", value: fmtInt(data.stock.outboundMovements) },
                    { label: "Valeur entrée", value: money(data.stock.inboundValue) },
                    { label: "Valeur sortie", value: money(data.stock.outboundValue) },
                  ]}
                />
                <Module
                  title="Contrats"
                  variation={data.contracts.variation}
                  rows={[
                    { label: "Actifs", value: fmtInt(data.contracts.activeCount) },
                    { label: "Signés", value: fmtInt(data.contracts.signedCount) },
                    { label: "Expirés", value: fmtInt(data.contracts.expiredCount) },
                  ]}
                />
                <Module
                  title="Membres"
                  variation={data.members.variation}
                  rows={[
                    { label: "Actifs", value: fmtInt(data.members.totalActive) },
                    { label: "Nouveaux", value: fmtInt(data.members.newCount) },
                  ]}
                />
                <Module
                  title="Support"
                  variation={data.support.variation}
                  inverse
                  rows={[
                    { label: "Tickets ouverts", value: fmtInt(data.support.openedCount) },
                    { label: "Résolus", value: fmtInt(data.support.resolvedCount) },
                    { label: "Clôturés", value: fmtInt(data.support.closedCount) },
                    { label: "Priorité haute", value: fmtInt(data.support.highPriorityCount) },
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
