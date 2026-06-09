import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  RefreshCw,
  AlertCircle,
  Timer,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";

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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Métriques des réservations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-24" />
                  <div className="h-7 bg-gray-200 rounded w-16" />
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
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
    );
  }

  const safeNum = (val: any): number =>
    typeof val === "number" && !isNaN(val) ? val : 0;

  const cards = [
    {
      title: "Brouillons",
      value: safeNum(metrics?.draftBookings),
      icon: Clock,
      color: "bg-gray-100 text-gray-600",
      format: "number",
    },
    {
      title: "En attente d'approbation",
      value: safeNum(metrics?.pendingApprovalBookings),
      icon: Timer,
      color: "bg-yellow-100 text-yellow-600",
      format: "number",
    },
    {
      title: "Confirmées",
      value: safeNum(metrics?.confirmedBookings),
      icon: CheckCircle,
      color: "bg-green-100 text-green-600",
      format: "number",
    },
    {
      title: "Terminées",
      value: safeNum(metrics?.completedBookings),
      icon: Calendar,
      color: "bg-blue-100 text-blue-600",
      format: "number",
    },
    {
      title: "Annulées",
      value: safeNum(metrics?.cancelledBookings),
      icon: XCircle,
      color: "bg-red-100 text-red-600",
      format: "number",
    },
    {
      title: "Non présent",
      value: safeNum(metrics?.noShowBookings),
      icon: Users,
      color: "bg-orange-100 text-orange-600",
      format: "number",
    },
    {
      title: "Holds actifs",
      value: safeNum(metrics?.activeHolds),
      icon: Clock,
      color: "bg-purple-100 text-purple-600",
      format: "number",
    },
    {
      title: "Montant confirmé",
      value: safeNum(metrics?.confirmedAmount),
      icon: DollarSign,
      color: "bg-indigo-100 text-indigo-600",
      format: "currency",
    },
    {
      title: "Montant complété",
      value: safeNum(metrics?.completedAmount),
      icon: DollarSign,
      color: "bg-teal-100 text-teal-600",
      format: "currency",
    },
  ];

  const formatValue = (value: number, format: string): string => {
    if (format === "currency") return `${value.toLocaleString("fr-FR")} FCFA`;
    return value.toLocaleString("fr-FR");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Métriques des réservations
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatValue(card.value, card.format)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Données brutes pour debug en dev */}
      {metrics && (
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            Données brutes de l&apos;API
          </summary>
          <pre className="mt-2 bg-gray-50 p-3 rounded-lg overflow-x-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
