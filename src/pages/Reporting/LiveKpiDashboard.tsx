import React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { Gauge } from "../../components/reporting/ReportCharts";
import { ReportBody, ReportHead, RefreshButton, StatList } from "../../components/reporting/reportKit";
import { fmtInt, money, rateColor } from "../../components/reporting/reportUtils";

export const LiveKpiDashboard: React.FC = () => {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["live-kpis"],
    queryFn: () => reportingService.getLiveKpis(),
    refetchInterval: 30000,
  });

  const rate = data?.occupancyRate ?? 0;
  const updated = data ? new Date(data.updatedAt) : null;

  return (
    <div className="space-y-6">
      <ReportHead title="KPIs en temps réel" subtitle="Actualisés automatiquement toutes les 30 secondes">
        {updated && !Number.isNaN(updated.getTime()) && (
          <span className="text-xs font-semibold text-gray-400">
            Mis à jour à {updated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Réservations actives", value: fmtInt(data.currentActiveBookings), hint: "en cours" },
                { label: "Revenu du jour", value: money(data.todayRevenue), tone: "pink" },
                { label: "Réservations du jour", value: fmtInt(data.todayBookings), hint: "nouvelles réservations" },
                { label: "Check-ins en attente", value: fmtInt(data.pendingCheckins), hint: "à vérifier" },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Taux d'occupation actuel" subtitle="Places occupées sur la capacité totale">
                <Gauge value={rate} color={rateColor(rate)} caption="d'occupation" />
                <div className="mt-6">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-gray-800">{fmtInt(data.currentOccupancy)} occupées</span>
                    <span className="text-gray-500">sur {fmtInt(data.totalCapacity)}</span>
                  </div>
                  <RatioBar value={data.currentOccupancy} total={data.totalCapacity} color={rateColor(rate)} />
                </div>
              </ChartCard>
              <ChartCard title="Activité du jour">
                <StatList
                  rows={[
                    { label: "Sessions actives", value: fmtInt(data.activeSessions) },
                    { label: "Capacité totale", value: fmtInt(data.totalCapacity) },
                    {
                      label: "Panier moyen",
                      value: money(data.todayBookings > 0 ? data.todayRevenue / data.todayBookings : 0),
                    },
                    { label: "Revenu du jour", value: money(data.todayRevenue) },
                  ]}
                />
              </ChartCard>
            </div>
          </>
        )}
      </ReportBody>
    </div>
  );
};
