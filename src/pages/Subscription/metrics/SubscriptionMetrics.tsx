import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Ticket,
  AlertCircle,
  CreditCard,
  RefreshCw,
  Activity,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";

const safeNum = (val: unknown): number =>
  typeof val === "number" && isFinite(val) ? val : 0;

const formatCurrency = (value: number): string =>
  `${value.toLocaleString("fr-FR")} FCFA`;

const formatNumber = (value: number): string => value.toLocaleString("fr-FR");

type MetricTone = "green" | "blue" | "purple" | "orange" | "slate";

const metricToneClass: Record<
  MetricTone,
  { icon: string; bar: string }
> = {
  green: { icon: "bg-green-50 text-green-700", bar: "bg-green-500" },
  blue: { icon: "bg-blue-50 text-blue-700", bar: "bg-blue-500" },
  purple: { icon: "bg-purple-50 text-purple-700", bar: "bg-purple-500" },
  orange: { icon: "bg-orange-50 text-orange-700", bar: "bg-orange-500" },
  slate: { icon: "bg-slate-50 text-slate-700", bar: "bg-slate-500" },
};

const MetricPanel: React.FC<{
  title: string;
  icon: React.ElementType;
  mainLabel: string;
  mainValue: string;
  tone: MetricTone;
  items: [string, string][];
}> = ({ title, icon: Icon, mainLabel, mainValue, tone, items }) => {
  const t = metricToneClass[tone];

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">{title}</p>
            <p className="mt-4 text-xs font-medium text-gray-400">
              {mainLabel}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-gray-950">
              {mainValue}
            </p>
          </div>

          <div className={`rounded-2xl p-3 ${t.icon}`}>
            <Icon size={22} />
          </div>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full w-2/3 rounded-full ${t.bar}`} />
        </div>
      </div>

      <div className="space-y-1 bg-gray-50/70 p-3">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
          >
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-bold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Métriques des abonnements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-gray-100 animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl mb-5" />
              <div className="h-8 bg-gray-100 rounded w-28 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-36" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Métriques des abonnements
        </h2>
        <div className="bg-red-50 rounded-2xl p-6 text-center ring-1 ring-red-100">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-700 font-medium">
            Erreur de chargement des métriques
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Métriques des abonnements
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vue consolidée des souscriptions, revenus, usages et reports.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ring-gray-100 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <MetricPanel
          title="Souscriptions"
          icon={Users}
          mainLabel="Actives"
          mainValue={formatNumber(safeNum(metrics?.activeSubscriptions))}
          tone="green"
          items={[
            [
              "En attente",
              formatNumber(safeNum(metrics?.pendingSubscriptions)),
            ],
            [
              "Suspendues",
              formatNumber(safeNum(metrics?.suspendedSubscriptions)),
            ],
            [
              "Annulées",
              formatNumber(safeNum(metrics?.cancelledSubscriptions)),
            ],
          ]}
        />

        <MetricPanel
          title="Revenus & facturation"
          icon={CreditCard}
          mainLabel="MRR actif"
          mainValue={formatCurrency(safeNum(metrics?.activeSubscriptionMrr))}
          tone="blue"
          items={[
            [
              "Montant en attente",
              formatCurrency(safeNum(metrics?.pendingBillableAmount)),
            ],
            [
              "Items facturables",
              formatNumber(safeNum(metrics?.pendingBillableItems)),
            ],
          ]}
        />

        <MetricPanel
          title="Passes & options"
          icon={Ticket}
          mainLabel="Passes actifs"
          mainValue={formatNumber(safeNum(metrics?.activePasses))}
          tone="purple"
          items={[
            ["Add-ons actifs", formatNumber(safeNum(metrics?.activeAddons))],
            [
              "Promotions actives",
              formatNumber(safeNum(metrics?.activePromotions)),
            ],
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MetricPanel
          title="Usage & overage"
          icon={Activity}
          mainLabel="Usage enregistré"
          mainValue={formatNumber(safeNum(metrics?.recordedUsageQuantity))}
          tone="orange"
          items={[
            [
              "Usage facturable",
              formatNumber(safeNum(metrics?.billableUsageQuantity)),
            ],
            ["Charges overage", formatNumber(safeNum(metrics?.overageCharges))],
            [
              "Montant overage",
              formatCurrency(safeNum(metrics?.overageAmount)),
            ],
          ]}
        />

        <MetricPanel
          title="Rollover"
          icon={RefreshCw}
          mainLabel="Reports appliqués"
          mainValue={formatNumber(safeNum(metrics?.rolloverRecords))}
          tone="slate"
          items={[
            [
              "Quantité reportée",
              formatNumber(safeNum(metrics?.rolloverQuantity)),
            ],
          ]}
        />
      </div>
    </div>
  );
};