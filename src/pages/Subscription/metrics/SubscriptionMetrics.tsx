import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, RefreshCw } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ActionButton, ErrorBlock, Field, ItemRow, ListHeader, Tag } from "../../../components/subscription/kit";
import { FIELD_SOFT, formatDate } from "../../../components/subscription/kitUtils";
import { ColumnChart, DonutChart, KpiStrip, Panel, RingGauge, compact } from "../../../components/subscription/charts";
import { CHART } from "../../../components/subscription/chartColors";

const safeNum = (val: unknown): number =>
  typeof val === "number" && isFinite(val) ? val : 0;

const formatCurrency = (value: number): string => `${value.toLocaleString("fr-FR")} FCFA`;

const formatNumber = (value: number): string => value.toLocaleString("fr-FR");

const formatPercent = (value: number): string =>
  `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

const WATCH_ROWS = [
  { key: "inGracePeriod", label: "En période de tolérance", status: "GRACE_PERIOD" },
  { key: "pendingTermination", label: "Résiliation en cours", status: "PENDING_TERMINATION" },
  { key: "pendingDocuments", label: "Documents en attente", status: "PENDING_DOCUMENTS" },
] as const;

const KpiSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="space-y-4">
    <Skeleton className="h-32" />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-72 xl:col-span-2" />
      <Skeleton className="h-72" />
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

/** Indicateurs de revenu, d'attrition et d'occupation sur une période choisie. */
const KpiSection: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: kpis, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-kpis", from, to],
    queryFn: () => subscriptionService.getSubscriptionKpis({ from: from || undefined, to: to || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const cycles = Object.entries(kpis?.mrrByCycle ?? {})
    .map(([key, value]) => ({ label: CYCLE_LABELS[key] ?? key, value: safeNum(value) }))
    .filter((c) => c.value > 0);
  const cycleColors = [CHART.primary, CHART.soft, CHART.neutral];

  const newMrr = safeNum(kpis?.newMrr);
  const lostMrr = Math.abs(safeNum(kpis?.churnedMrr));
  const netMrr = safeNum(kpis?.netMrrMovement);
  const lifetime = kpis?.customerLifetimeValue;
  const lifetimeMonths = kpis?.averageLifetimeMonths;
  const capacity = safeNum(kpis?.workspaceCapacity);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Indicateurs de la période</h2>
          {kpis && (
            <p className="mt-0.5 text-sm text-gray-500">
              Du {formatDate(kpis.from)} au {formatDate(kpis.to)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Du">
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={FIELD_SOFT} />
          </Field>
          <Field label="Au">
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={FIELD_SOFT} />
          </Field>
          {(from || to) && (
            <ActionButton variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>
              Période par défaut
            </ActionButton>
          )}
        </div>
      </div>

      {isLoading && <KpiSkeleton />}
      {isError && <ErrorBlock message="Erreur de chargement des indicateurs" onRetry={() => refetch()} />}

      {kpis && (
        <>
          <KpiStrip
            items={[
              { label: "MRR", value: formatCurrency(safeNum(kpis.mrr)), hint: "Revenu mensuel récurrent" },
              { label: "ARR", value: formatCurrency(safeNum(kpis.arr)), hint: "Revenu annuel récurrent" },
              {
                label: "Abonnements actifs",
                value: formatNumber(safeNum(kpis.activeSubscriptions)),
                hint: `${formatNumber(safeNum(kpis.newInPeriod))} nouveaux sur la période`,
              },
              { label: "ARPU", value: formatCurrency(safeNum(kpis.arpu)), hint: "MRR par abonné actif" },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Mouvement du MRR"
              subtitle="Gagné, perdu et solde net sur la période"
              table={{
                head: ["Mouvement", "FCFA"],
                rows: [
                  ["Nouveau", formatNumber(newMrr)],
                  ["Perdu", formatNumber(-lostMrr)],
                  ["Net", formatNumber(netMrr)],
                ],
              }}
            >
              <ColumnChart
                unit=" FCFA"
                data={[
                  { label: "Nouveau", value: newMrr, color: CHART.success },
                  { label: "Perdu", value: lostMrr, color: CHART.danger },
                  { label: "Net", value: Math.abs(netMrr), color: CHART.primary, display: `${netMrr < 0 ? "-" : ""}${formatNumber(Math.abs(netMrr))} FCFA` },
                ]}
              />
            </Panel>

            <Panel
              title="MRR par cycle"
              subtitle="Répartition de la facturation"
              table={{
                head: ["Cycle", "FCFA"],
                rows: cycles.map((c) => [c.label, formatNumber(c.value)]),
              }}
            >
              {cycles.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">Aucun revenu récurrent</p>
              ) : (
                <DonutChart
                  slices={cycles.map((c, i) => ({ ...c, color: cycleColors[i % cycleColors.length] }))}
                  centerValue={compact(safeNum(kpis.mrr))}
                  centerLabel="MRR"
                />
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Attrition"
              subtitle="Départs sur la période"
              table={{
                head: ["Mesure", "Valeur"],
                rows: [
                  ["Taux d'attrition", formatPercent(safeNum(kpis.churnRate))],
                  ["Attrition mensuelle", formatPercent(safeNum(kpis.monthlyChurnRate))],
                  ["Abonnements perdus", formatNumber(safeNum(kpis.churnedInPeriod))],
                  ["Valeur vie client", lifetime == null ? "Non calculable" : formatCurrency(lifetime)],
                  ["Durée de vie moyenne", lifetimeMonths == null ? "Non calculable" : `${formatNumber(lifetimeMonths)} mois`],
                ],
              }}
            >
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Taux d'attrition", formatPercent(safeNum(kpis.churnRate))],
                  ["Attrition mensuelle", formatPercent(safeNum(kpis.monthlyChurnRate))],
                  ["Abonnements perdus", `${formatNumber(safeNum(kpis.churnedInPeriod))} sur ${formatNumber(safeNum(kpis.activeAtStart))}`],
                  ["Valeur vie client", lifetime == null ? "Non calculable" : formatCurrency(lifetime)],
                  ["Durée de vie moyenne", lifetimeMonths == null ? "Non calculable" : `${formatNumber(lifetimeMonths)} mois`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-right font-bold text-gray-950">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel
              title="Occupation"
              subtitle="Places occupées sur la capacité"
              table={{
                head: ["Mesure", "Valeur"],
                rows: [
                  ["Places occupées", formatNumber(safeNum(kpis.seatsOccupied))],
                  ["Capacité", formatNumber(capacity)],
                  ["Taux d'occupation", formatPercent(safeNum(kpis.occupancyRate))],
                  ["Revenu par place", formatCurrency(safeNum(kpis.revenuePerSeat))],
                ],
              }}
            >
              <div className="space-y-6">
                <RingGauge label="occupées" value={safeNum(kpis.seatsOccupied)} total={capacity} />
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-gray-500">Revenu par place</dt>
                    <dd className="font-bold text-gray-950">{formatCurrency(safeNum(kpis.revenuePerSeat))}</dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel title="À surveiller" subtitle="Ouvre la liste filtrée">
              <div className="space-y-2">
                {WATCH_ROWS.map((r) => {
                  const count = safeNum(kpis[r.key]);
                  return (
                    <ItemRow key={r.key}>
                      <button
                        type="button"
                        onClick={() => navigate(`/subscriptions/subscriptions?status=${r.status}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]"
                      >
                        <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Tag>{formatNumber(count)}</Tag>
                          <ChevronRight size={16} className="text-gray-400" />
                        </span>
                      </button>
                    </ItemRow>
                  );
                })}
              </div>
            </Panel>
          </div>
        </>
      )}
    </section>
  );
};

const MetricsSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="space-y-4">
    <Skeleton className="h-32" />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-80" />
      <Skeleton className="h-80 xl:col-span-2" />
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-80 xl:col-span-2" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

export const SubscriptionMetrics: React.FC = () => {
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["subscription-metrics"],
    queryFn: () => subscriptionService.getSubscriptionMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = (
    <ActionButton
      variant="ghost"
      icon={RefreshCw}
      pending={isFetching && !isLoading}
      onClick={() => refetch()}
    >
      Actualiser
    </ActionButton>
  );

  const active = safeNum(metrics?.activeSubscriptions);
  const pending = safeNum(metrics?.pendingSubscriptions);
  const suspended = safeNum(metrics?.suspendedSubscriptions);
  const cancelled = safeNum(metrics?.cancelledSubscriptions);
  const totalSubs = active + pending + suspended + cancelled;

  const mrr = safeNum(metrics?.activeSubscriptionMrr);
  const pendingAmount = safeNum(metrics?.pendingBillableAmount);
  const overageAmount = safeNum(metrics?.overageAmount);

  const recorded = safeNum(metrics?.recordedUsageQuantity);
  const billable = safeNum(metrics?.billableUsageQuantity);

  const activePasses = safeNum(metrics?.activePasses);
  const activeAddons = safeNum(metrics?.activeAddons);
  const activePromotions = safeNum(metrics?.activePromotions);

  const statusParts = [
    { label: "Actives", value: active, color: CHART.success },
    { label: "En attente", value: pending, color: CHART.warn },
    { label: "Suspendues", value: suspended, color: CHART.neutral },
    { label: "Annulées", value: cancelled, color: CHART.danger },
  ];

  const overageCharges = safeNum(metrics?.overageCharges);
  const rolloverRecords = safeNum(metrics?.rolloverRecords);
  const rolloverQuantity = safeNum(metrics?.rolloverQuantity);

  return (
    <div className="space-y-6">
      <ListHeader
        title="Métriques des abonnements"
        subtitle="Vue consolidée des souscriptions, revenus, usages et reports."
        action={isLoading || isError ? undefined : refresh}
      />

      <KpiSection />

      <h2 className="text-lg font-bold text-gray-950">Portefeuille et facturation</h2>

      {isLoading && <MetricsSkeleton />}

      {isError && <ErrorBlock message="Erreur de chargement des métriques" onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <KpiStrip
            items={[
              { label: "MRR actif", value: formatCurrency(mrr), hint: "Revenu mensuel récurrent" },
              { label: "Souscriptions actives", value: formatNumber(active), hint: `${formatNumber(totalSubs)} au total` },
              { label: "Passes actifs", value: formatNumber(activePasses), hint: `${formatNumber(activeAddons)} add-ons actifs` },
              {
                label: "À facturer",
                value: formatCurrency(pendingAmount),
                hint: `${formatNumber(safeNum(metrics?.pendingBillableItems))} items en attente`,
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Souscriptions par statut"
              subtitle="Répartition du portefeuille"
              table={{
                head: ["Statut", "Souscriptions"],
                rows: statusParts.map((p) => [p.label, formatNumber(p.value)]),
              }}
            >
              <DonutChart slices={statusParts} centerLabel="souscriptions" />
            </Panel>

            <Panel
              className="xl:col-span-2"
              title="Revenus et facturation"
              subtitle="Montants en FCFA"
              table={{
                head: ["Montant", "FCFA"],
                rows: [
                  ["MRR actif", formatNumber(mrr)],
                  ["À facturer", formatNumber(pendingAmount)],
                  ["Overage", formatNumber(overageAmount)],
                ],
              }}
            >
              <ColumnChart
                unit=" FCFA"
                data={[
                  { label: "MRR actif", value: mrr, color: CHART.primary },
                  { label: "À facturer", value: pendingAmount, color: CHART.soft },
                  { label: "Overage", value: overageAmount, color: CHART.neutral },
                ]}
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Passes et options"
              subtitle="Éléments actifs"
              table={{
                head: ["Élément", "Actifs"],
                rows: [
                  ["Passes", formatNumber(activePasses)],
                  ["Add-ons", formatNumber(activeAddons)],
                  ["Promotions", formatNumber(activePromotions)],
                ],
              }}
            >
              <ColumnChart
                data={[
                  { label: "Passes", value: activePasses },
                  { label: "Add-ons", value: activeAddons },
                  { label: "Promotions", value: activePromotions },
                ]}
              />
            </Panel>

            <Panel
              title="Usage et reports"
              subtitle="Part facturable de l'usage enregistré"
              table={{
                head: ["Mesure", "Valeur"],
                rows: [
                  ["Usage enregistré", formatNumber(recorded)],
                  ["Usage facturable", formatNumber(billable)],
                  ["Charges overage", formatNumber(overageCharges)],
                  ["Montant overage", formatCurrency(overageAmount)],
                  ["Reports appliqués", formatNumber(rolloverRecords)],
                  ["Quantité reportée", formatNumber(rolloverQuantity)],
                ],
              }}
            >
              <div className="space-y-6">
                <RingGauge label="facturable" value={billable} total={recorded} />
                <dl className="space-y-2.5 text-sm">
                  {[
                    ["Charges overage", formatNumber(overageCharges)],
                    ["Montant overage", formatCurrency(overageAmount)],
                    ["Reports appliqués", formatNumber(rolloverRecords)],
                    ["Quantité reportée", formatNumber(rolloverQuantity)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-bold text-gray-950">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
};
