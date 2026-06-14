import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Ticket,
  AlertCircle,
  Package,
  CreditCard,
  Clock,
  RefreshCw,
  TrendingUp,
  XCircle,
  Layers,
  Activity,
  BarChart2,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";

// FIX : helper de lecture défensive — évite NaN/undefined sur champs inconnus ou manquants
const safeNum = (val: unknown): number =>
  typeof val === "number" && isFinite(val) ? val : 0;

// FIX : formatage monétaire centralisé
const formatCurrency = (value: number): string =>
  `${value.toLocaleString("fr-FR")} FCFA`;

const formatNumber = (value: number): string => value.toLocaleString("fr-FR");

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
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Métriques des abonnements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-32" />
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-700 font-medium">
            Erreur de chargement des métriques
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // FIX : tous les champs proviennent directement des clés documentées dans la doc API
  // Pas d'alias ni de fallback sur des noms hypothétiques (mrr, totalActivePlans…)
  const cards: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    format: "number" | "currency";
    section?: string;
  }[] = [
    // ── Souscriptions ──────────────────────────────
    {
      title: "Souscriptions actives",
      value: safeNum(metrics?.activeSubscriptions),
      icon: Users,
      color: "bg-green-100 text-green-600",
      format: "number",
      section: "Souscriptions",
    },
    {
      title: "En attente d'activation",
      value: safeNum(metrics?.pendingSubscriptions),
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
      format: "number",
    },
    {
      title: "Suspendues",
      value: safeNum(metrics?.suspendedSubscriptions),
      icon: AlertCircle,
      color: "bg-orange-100 text-orange-600",
      format: "number",
    },
    {
      title: "Annulées",
      value: safeNum(metrics?.cancelledSubscriptions),
      icon: XCircle,
      color: "bg-red-100 text-red-600",
      format: "number",
    },

    // ── Revenus ────────────────────────────────────
    {
      title: "MRR actif",
      value: safeNum(metrics?.activeSubscriptionMrr),
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-600",
      format: "currency",
      section: "Revenus & Facturation",
    },
    {
      title: "Montant facturable en attente",
      value: safeNum(metrics?.pendingBillableAmount),
      icon: CreditCard,
      color: "bg-red-100 text-red-600",
      format: "currency",
    },
    {
      title: "Items facturables en attente",
      value: safeNum(metrics?.pendingBillableItems),
      icon: BarChart2,
      color: "bg-pink-100 text-pink-600",
      format: "number",
    },

    // ── Passes & Add-ons ───────────────────────────
    {
      title: "Passes actifs",
      value: safeNum(metrics?.activePasses),
      icon: Ticket,
      color: "bg-purple-100 text-purple-600",
      format: "number",
      section: "Passes & Add-ons",
    },
    {
      title: "Add-ons actifs",
      value: safeNum(metrics?.activeAddons),
      icon: Layers,
      color: "bg-indigo-100 text-indigo-600",
      format: "number",
    },
    {
      title: "Promotions actives",
      value: safeNum(metrics?.activePromotions),
      icon: Package,
      color: "bg-pink-100 text-pink-600",
      format: "number",
    },

    // ── Usage & Overage ────────────────────────────
    {
      title: "Usage enregistré",
      value: safeNum(metrics?.recordedUsageQuantity),
      icon: Activity,
      color: "bg-teal-100 text-teal-600",
      format: "number",
      section: "Usage & Overage",
    },
    {
      title: "Usage facturable",
      value: safeNum(metrics?.billableUsageQuantity),
      icon: Activity,
      color: "bg-cyan-100 text-cyan-600",
      format: "number",
    },
    {
      title: "Charges overage",
      value: safeNum(metrics?.overageCharges),
      icon: AlertCircle,
      color: "bg-orange-100 text-orange-600",
      format: "number",
    },
    {
      title: "Montant overage",
      value: safeNum(metrics?.overageAmount),
      icon: TrendingUp,
      color: "bg-red-100 text-red-600",
      format: "currency",
    },

    // ── Rollover ───────────────────────────────────
    {
      title: "Reports appliqués",
      value: safeNum(metrics?.rolloverRecords),
      icon: RefreshCw,
      color: "bg-gray-100 text-gray-600",
      format: "number",
      section: "Rollover",
    },
    {
      title: "Quantité reportée",
      value: safeNum(metrics?.rolloverQuantity),
      icon: RefreshCw,
      color: "bg-gray-100 text-gray-500",
      format: "number",
    },
  ];

  // Regroupe les cartes par section
  const sections: { label: string; items: typeof cards }[] = [];
  let currentSection: { label: string; items: typeof cards } | null = null;

  for (const card of cards) {
    if (card.section) {
      currentSection = { label: card.section, items: [] };
      sections.push(currentSection);
    }
    currentSection?.items.push(card);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Métriques des abonnements
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 text-sm text-gray-600 hover:bg-primary-50/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.label}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.18em] mb-4">
              {section.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100/70 hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${card.color} ring-1 ring-black/5`}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {card.format === "currency"
                        ? formatCurrency(card.value)
                        : formatNumber(card.value)}
                    </p>
                    <p className="text-sm text-gray-500">{card.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
