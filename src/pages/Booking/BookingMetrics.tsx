import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Timer,
  Activity,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";

const safeNum = (val: any): number =>
  typeof val === "number" && !isNaN(val) ? val : 0;

const formatCurrency = (value: number): string =>
  `${value.toLocaleString("fr-FR")} FCFA`;

const formatNumber = (value: number): string => value.toLocaleString("fr-FR");

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

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Métriques des réservations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Chargement de l'activité opérationnelle.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
                <div className="w-11 h-11 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 ring-1 ring-red-100 rounded-2xl p-8 text-center">
        <AlertCircle size={34} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-700 font-semibold">
          Erreur de chargement des métriques
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const draft = safeNum(metrics?.draftBookings);
  const pending = safeNum(metrics?.pendingApprovalBookings);
  const confirmed = safeNum(metrics?.confirmedBookings);
  const completed = safeNum(metrics?.completedBookings);
  const cancelled = safeNum(metrics?.cancelledBookings);
  const noShow = safeNum(metrics?.noShowBookings);
  const activeHolds = safeNum(metrics?.activeHolds);
  const confirmedAmount = safeNum(metrics?.confirmedAmount);
  const completedAmount = safeNum(metrics?.completedAmount);

  const totalBookings =
    draft + pending + confirmed + completed + cancelled + noShow;
  const activeOperational = confirmed + pending + activeHolds;
  const completionRate = totalBookings
    ? Math.round((completed / totalBookings) * 100)
    : 0;
  const noShowRate = totalBookings
    ? Math.round((noShow / totalBookings) * 100)
    : 0;

  const cards = [
    {
      title: "Réservations confirmées",
      value: formatNumber(confirmed),
      subtitle: `${pending} en attente d'approbation`,
      icon: CheckCircle,
      tone: "green",
    },
    {
      title: "Réservations terminées",
      value: formatNumber(completed),
      subtitle: `${completionRate}% du volume total`,
      icon: Calendar,
      tone: "blue",
    },
    {
      title: "Montant confirmé",
      value: formatCurrency(confirmedAmount),
      subtitle: "Réservations confirmées",
      icon: DollarSign,
      tone: "purple",
    },
    {
      title: "Incidents / no-show",
      value: formatNumber(noShow + cancelled),
      subtitle: `${noShowRate}% non-présentation`,
      icon: XCircle,
      tone: "red",
    },
  ];

  const statusBars = [
    { label: "Brouillons", value: draft, tone: "gray" },
    { label: "En attente", value: pending, tone: "yellow" },
    { label: "Confirmées", value: confirmed, tone: "green" },
    { label: "Terminées", value: completed, tone: "blue" },
    { label: "Annulées", value: cancelled, tone: "red" },
    { label: "Non présent", value: noShow, tone: "orange" },
  ];

  const revenueBars = [
    { label: "Confirmé", value: confirmedAmount },
    { label: "Complété", value: completedAmount },
  ];
  const maxRevenue = Math.max(...revenueBars.map((r) => r.value), 1);
  const maxStatus = Math.max(...statusBars.map((s) => s.value), 1);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Métriques des réservations
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vue synthétique des statuts, revenus et points d'attention.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-50" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {card.title}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-gray-950">
                    {card.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">{card.subtitle}</p>
                </div>
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                Répartition par statut
              </h3>
              <p className="text-sm text-gray-500">
                {totalBookings} réservation{totalBookings > 1 ? "s" : ""} au total.
              </p>
            </div>
            <Activity size={20} className="text-primary-500" />
          </div>

          <div className="space-y-4">
            {statusBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{bar.label}</span>
                  <span className="text-gray-500">{formatNumber(bar.value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.max(4, (bar.value / maxStatus) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900">Revenus réservation</h3>
            <p className="text-sm text-gray-500">Montants confirmés et complétés.</p>
          </div>
          <div className="space-y-5">
            {revenueBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{bar.label}</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(bar.value)}
                  </span>
                </div>
                <div className="h-12 rounded-2xl bg-gray-50 p-1.5">
                  <div
                    className="h-full rounded-xl bg-primary-500"
                    style={{ width: `${Math.max(6, (bar.value / maxRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-gray-50 p-4">
              <Clock size={17} className="text-primary-500 mb-2" />
              <p className="text-gray-500">Holds actifs</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(activeHolds)}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <Timer size={17} className="text-primary-500 mb-2" />
              <p className="text-gray-500">Actif opérationnel</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(activeOperational)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
