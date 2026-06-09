import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import type { RealComparisonResponse } from "../../services/reporting.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const getLastMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { from: format(firstDay), to: format(lastDay) };
};

const formatFCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

const getVarianceColor = (percent: number) => {
  if (percent > 0) return "text-green-600";
  if (percent < 0) return "text-red-600";
  return "text-gray-500";
};

const getVarianceIcon = (percent: number) => {
  if (percent > 0) return <TrendingUp size={14} className="text-green-600" />;
  if (percent < 0) return <TrendingDown size={14} className="text-red-600" />;
  return null;
};

export const ComparisonReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getLastMonthRange());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["comparison-report", dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await reportingService.getComparison({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        compareWithPrevious: true,
      });
      return response as unknown as RealComparisonResponse;
    },
  });

  // Extraire les données
  const currentBookings = data?.current?.booking?.bookingCount ?? 0;
  const previousBookings = data?.previous?.booking?.bookingCount ?? 0;
  const currentRevenue = data?.current?.financial?.invoicedAmount ?? 0;
  const previousRevenue = data?.previous?.financial?.invoicedAmount ?? 0;
  const currentPaid = data?.current?.financial?.paidAmount ?? 0;
  const previousPaid = data?.previous?.financial?.paidAmount ?? 0;
  const currentSubscriptions =
    data?.current?.subscription?.activeSubscriptions ?? 0;
  const previousSubscriptions =
    data?.previous?.subscription?.activeSubscriptions ?? 0;

  // Pourcentages
  const bookingsPercent =
    previousBookings !== 0
      ? ((currentBookings - previousBookings) / previousBookings) * 100
      : currentBookings > 0
        ? 100
        : 0;
  const revenuePercent =
    previousRevenue !== 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0
        ? 100
        : 0;
  const paidPercent =
    previousPaid !== 0
      ? ((currentPaid - previousPaid) / previousPaid) * 100
      : currentPaid > 0
        ? 100
        : 0;
  const subscriptionsPercent =
    previousSubscriptions !== 0
      ? ((currentSubscriptions - previousSubscriptions) /
          previousSubscriptions) *
        100
      : currentSubscriptions > 0
        ? 100
        : 0;

  const comparisonData = [
    {
      name: "Réservations",
      current: currentBookings,
      previous: previousBookings,
    },
    {
      name: "Facturé (kFCFA)",
      current: currentRevenue / 1000,
      previous: previousRevenue / 1000,
    },
    {
      name: "Encaissé (kFCFA)",
      current: currentPaid / 1000,
      previous: previousPaid / 1000,
    },
    {
      name: "Abonnements",
      current: currentSubscriptions,
      previous: previousSubscriptions,
    },
  ];

  const periodLabel = `${dateRange.from} au ${dateRange.to}`;
  const previousPeriodLabel = (() => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration - 86400000);
    const prevTo = new Date(to.getTime() - duration - 86400000);
    return `${prevFrom.toISOString().split("T")[0]} au ${prevTo.toISOString().split("T")[0]}`;
  })();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement de la comparaison...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Comparaison de périodes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyse des évolutions entre deux périodes
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période à analyser
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: e.target.value }))
                }
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: e.target.value }))
                }
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          {isFetching && (
            <RefreshCw size={14} className="animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {data && (
        <>
          {/* Graphique - Avec Tooltip personnalisé corrigé */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-500" />
              Comparaison des indicateurs
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // S'assurer que label est une chaîne de caractères
                      const labelText =
                        typeof label === "string" ? label : String(label || "");

                      return (
                        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-700 mb-2">
                            {labelText}
                          </p>
                          {payload.map((entry, index) => {
                            let valueDisplay: string;
                            const entryValue = entry.value as number;

                            // Vérifier si c'est une valeur en kFCFA (Facturé ou Encaissé)
                            const isKiloFormat = labelText.includes("(kFCFA)");

                            if (
                              isKiloFormat &&
                              typeof entryValue === "number"
                            ) {
                              valueDisplay = `${(entryValue * 1000).toLocaleString("fr-FR")} FCFA`;
                            } else if (typeof entryValue === "number") {
                              valueDisplay = entryValue.toLocaleString("fr-FR");
                            } else {
                              valueDisplay = String(entryValue);
                            }

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-600">
                                  {entry.name}:
                                </span>
                                <span className="font-semibold">
                                  {valueDisplay}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="current"
                  name="Période actuelle"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="previous"
                  name="Période précédente"
                  fill="#9ca3af"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cartes de comparaison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-primary-600" />
                <h3 className="font-semibold text-gray-900">
                  Période actuelle
                </h3>
                <span className="text-xs text-gray-400 ml-auto">
                  {periodLabel}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Réservations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentBookings}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Facturé</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatFCFA(currentRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Encaissé</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatFCFA(currentPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Abonnements actifs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentSubscriptions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-gray-400" />
                <h3 className="font-semibold text-gray-900">
                  Période précédente
                </h3>
                <span className="text-xs text-gray-400 ml-auto">
                  {previousPeriodLabel}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Réservations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {previousBookings}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Facturé</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatFCFA(previousRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Encaissé</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatFCFA(previousPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Abonnements actifs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {previousSubscriptions}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Variances */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowRight size={18} />
              Évolution entre les deux périodes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Réservations</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getVarianceIcon(bookingsPercent)}
                  <span
                    className={`text-xl font-bold ${getVarianceColor(bookingsPercent)}`}
                  >
                    {bookingsPercent > 0 ? "+" : ""}
                    {bookingsPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Facturé</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getVarianceIcon(revenuePercent)}
                  <span
                    className={`text-xl font-bold ${getVarianceColor(revenuePercent)}`}
                  >
                    {revenuePercent > 0 ? "+" : ""}
                    {revenuePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Encaissé</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getVarianceIcon(paidPercent)}
                  <span
                    className={`text-xl font-bold ${getVarianceColor(paidPercent)}`}
                  >
                    {paidPercent > 0 ? "+" : ""}
                    {paidPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Abonnements</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getVarianceIcon(subscriptionsPercent)}
                  <span
                    className={`text-xl font-bold ${getVarianceColor(subscriptionsPercent)}`}
                  >
                    {subscriptionsPercent > 0 ? "+" : ""}
                    {subscriptionsPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
