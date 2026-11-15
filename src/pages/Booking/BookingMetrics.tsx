import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import { Skeleton } from "../../components/ui/Skeleton";
import { ActionButton, ErrorBlock, ListHeader } from "../../components/subscription/kit";
import { ColumnChart, DonutChart, KpiStrip, Panel, RingGauge } from "../../components/subscription/charts";
import { CHART } from "../../components/subscription/chartColors";
import { formatMoney, formatNumber } from "../../components/subscription/kitUtils";

const safeNum = (val: unknown): number =>
  typeof val === "number" && isFinite(val) ? val : 0;

const MetricsSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="space-y-4">
    <Skeleton className="h-32" />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-80 xl:col-span-2" />
      <Skeleton className="h-80" />
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-80" />
      <Skeleton className="h-80 xl:col-span-2" />
    </div>
  </div>
);

export const BookingMetrics: React.FC = () => {
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["booking-metrics"],
    queryFn: () => bookingService.getMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = (
    <ActionButton variant="ghost" icon={RefreshCw} pending={isFetching && !isLoading} onClick={() => refetch()}>
      Actualiser
    </ActionButton>
  );

  const draft = safeNum(metrics?.draftBookings);
  const pending = safeNum(metrics?.pendingApprovalBookings);
  const confirmed = safeNum(metrics?.confirmedBookings);
  const completed = safeNum(metrics?.completedBookings);
  const cancelled = safeNum(metrics?.cancelledBookings);
  const noShow = safeNum(metrics?.noShowBookings);
  const activeHolds = safeNum(metrics?.activeHolds);
  const confirmedAmount = safeNum(metrics?.confirmedAmount);
  const completedAmount = safeNum(metrics?.completedAmount);

  const total = draft + pending + confirmed + completed + cancelled + noShow;
  const activeOperational = confirmed + pending + activeHolds;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const noShowRate = total ? Math.round((noShow / total) * 100) : 0;

  // Répartition par statut, de la plus grande à la plus petite
  const statusRows = [
    { label: "Terminées", value: completed, color: CHART.success },
    { label: "Confirmées", value: confirmed, color: CHART.primary },
    { label: "Annulées", value: cancelled, color: CHART.danger },
    { label: "En attente", value: pending, color: CHART.warn },
    { label: "Non présent", value: noShow, color: CHART.neutral },
    { label: "Brouillons", value: draft, color: CHART.soft },
  ].sort((a, b) => b.value - a.value);

  const outcome = [
    { label: "Terminées", value: completed, color: CHART.success },
    { label: "Annulées", value: cancelled, color: CHART.danger },
    { label: "Non présent", value: noShow, color: CHART.warn },
  ];

  return (
    <div className="space-y-6">
      <ListHeader
        title="Métriques des réservations"
        subtitle="Vue synthétique des statuts, revenus et points d'attention."
        action={isLoading || isError ? undefined : refresh}
      />

      {isLoading && <MetricsSkeleton />}

      {isError && <ErrorBlock message="Erreur de chargement des métriques" onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <KpiStrip
            items={[
              { label: "Montant confirmé", value: formatMoney(confirmedAmount), hint: `${formatMoney(completedAmount)} déjà complétés` },
              { label: "Confirmées", value: formatNumber(confirmed), hint: `${formatNumber(pending)} en attente d'approbation` },
              { label: "Terminées", value: formatNumber(completed), hint: `${completionRate} % du volume total` },
              { label: "Annulées et non présentes", value: formatNumber(noShow + cancelled), hint: `${noShowRate} % de non-présentation` },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Réservations par statut"
              subtitle={`${formatNumber(total)} réservation${total > 1 ? "s" : ""} au total`}
              table={{
                head: ["Statut", "Réservations"],
                rows: statusRows.map((r) => [r.label, formatNumber(r.value)]),
              }}
            >
              <ColumnChart data={statusRows} />
            </Panel>

            <Panel
              title="Issue des réservations"
              subtitle="Terminées, annulées et non présentes"
              table={{
                head: ["Issue", "Réservations"],
                rows: outcome.map((r) => [r.label, formatNumber(r.value)]),
              }}
            >
              <DonutChart slices={outcome} centerLabel="réservations" />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Taux de complétion"
              subtitle="Terminées sur le volume total"
              table={{
                head: ["Mesure", "Valeur"],
                rows: [
                  ["Taux de complétion", `${completionRate} %`],
                  ["Taux de non-présentation", `${noShowRate} %`],
                  ["Holds actifs", formatNumber(activeHolds)],
                  ["Actif opérationnel", formatNumber(activeOperational)],
                ],
              }}
            >
              <div className="space-y-6">
                <RingGauge label="terminées" value={completed} total={total} color={CHART.success} />
                <dl className="space-y-2.5 text-sm">
                  {[
                    ["Non-présentation", `${noShowRate} %`],
                    ["Holds actifs", formatNumber(activeHolds)],
                    ["Actif opérationnel", formatNumber(activeOperational)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-bold text-gray-950">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Panel>

            <Panel
              className="xl:col-span-2"
              title="Revenus"
              subtitle="Montants en FCFA"
              table={{
                head: ["Montant", "FCFA"],
                rows: [
                  ["Confirmé", formatNumber(confirmedAmount)],
                  ["Complété", formatNumber(completedAmount)],
                ],
              }}
            >
              <ColumnChart
                unit=" FCFA"
                data={[
                  { label: "Confirmé", value: confirmedAmount, color: CHART.primary },
                  { label: "Complété", value: completedAmount, color: CHART.soft },
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
};
