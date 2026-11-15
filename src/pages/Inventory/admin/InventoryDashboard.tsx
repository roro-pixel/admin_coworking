import React from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import { ReportBody, ReportHead, RefreshButton } from "../../../components/reporting/reportKit";
import { BarBreakdown, ChartCard, DonutBreakdown, KpiRow } from "../../../components/operations/OpsCharts";
import type { Slice } from "../../../components/operations/opsChartData";
import { CHART_COLORS } from "../../../components/operations/opsChartData";
import { formatMoney } from "../../../components/subscription/kitUtils";
import { qty } from "../../../components/inventory/invKit";

export const InventoryDashboard: React.FC = () => {
  const q = useQuery({ queryKey: ["inventory-dashboard"], queryFn: () => inventoryService.getDashboardMetrics() });
  const m = q.data;

  const alerts: Slice[] = m
    ? [
        { key: "low", label: "Stock bas", value: m.lowStockAlerts || 0, color: CHART_COLORS[1] },
        { key: "out", label: "Ruptures", value: m.outOfStockAlerts || 0, color: CHART_COLORS[0] },
        { key: "neg", label: "Stocks négatifs", value: m.negativeStockAlerts || 0, color: CHART_COLORS[3] },
        { key: "exp", label: "Expiration proche", value: m.expirySoonAlerts || 0, color: CHART_COLORS[2] },
      ].filter((s) => s.value > 0)
    : [];
  const alertTotal = alerts.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-6">
      <ReportHead title="Tableau de bord" subtitle="Vue d'ensemble de la valeur du stock et des points à traiter.">
        <RefreshButton fetching={q.isFetching && !q.isLoading} onClick={() => q.refetch()} />
      </ReportHead>

      <ReportBody loading={q.isLoading} error={q.isError} hasData={!!m} onRetry={() => q.refetch()} kpis={4} emptyTitle="Aucune donnée d'inventaire" emptyHint="Les indicateurs apparaîtront dès les premiers mouvements de stock.">
        {m && (
          <>
            <KpiRow
              columns={4}
              items={[
                { label: "Valeur du stock", value: formatMoney(m.totalStockValue || 0, "FCFA"), tone: "pink" },
                { label: "Alertes ouvertes", value: qty(m.openAlerts || 0), tone: (m.openAlerts || 0) > 0 ? "danger" : "success", hint: (m.openAlerts || 0) > 0 ? "À traiter" : "Rien à traiter" },
                { label: "Commandes en cours", value: qty(m.openPurchaseOrders || 0) },
                { label: "Lots expirant sous 30 jours", value: qty(m.expiringLots30Days || 0), tone: (m.expiringLots30Days || 0) > 0 ? "danger" : "default" },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Répartition des alertes" subtitle="Alertes liées au stock, par nature">
                {alertTotal === 0 ? <p className="py-10 text-center text-sm text-gray-500">Aucune alerte de stock en cours.</p> : <DonutBreakdown data={alerts} centerLabel="alertes" />}
              </ChartCard>
              <ChartCard title="Points de vigilance" subtitle="Volume par catégorie de risque">
                {alertTotal === 0 && !(m.expiringLots30Days || 0) ? (
                  <p className="py-10 text-center text-sm text-gray-500">Aucun point de vigilance.</p>
                ) : (
                  <BarBreakdown data={[...alerts, ...((m.expiringLots30Days || 0) > 0 ? [{ key: "lots", label: "Lots expirant (30 jours)", value: m.expiringLots30Days || 0, color: CHART_COLORS[4] }] : [])]} />
                )}
              </ChartCard>
            </div>
          </>
        )}
      </ReportBody>
    </div>
  );
};
