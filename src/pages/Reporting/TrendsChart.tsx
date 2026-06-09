import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  TrendingUp,
  Calendar,
  LineChart as LineChartIcon,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const getLast30Days = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { from: format(from), to: format(to) };
};

type TrendType = "bookings" | "revenue";
type ChartType = "line" | "area" | "bar";

const trendConfig: Record<
  TrendType,
  {
    label: string;
    color: string;
    unit: string;
    yAxisLabel: string;
    dataKey: string;
  }
> = {
  bookings: {
    label: "Réservations",
    color: "#3b82f6",
    unit: "",
    yAxisLabel: "Nombre de réservations",
    dataKey: "bookingCount",
  },
  revenue: {
    label: "Revenus",
    color: "#10b981",
    unit: " FCFA",
    yAxisLabel: "Montant (FCFA)",
    dataKey: "revenue",
  },
};

const formatFCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

const tooltipFormatter = (value: any, name: any): [string, string] => {
  if (typeof value === "number") {
    if (name === "Revenus" || name === "revenue")
      return [formatFCFA(value), name];
    if (name === "Réservations" || name === "bookings")
      return [String(value), name];
    return [String(value), name];
  }
  return [String(value), name];
};

export const TrendsChart: React.FC = () => {
  const [trendType, setTrendType] = useState<TrendType>("bookings");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [dateRange, setDateRange] = useState(getLast30Days());

  // Utiliser l'endpoint trend/daily
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["trends", trendType, dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await reportingService.getBookingTrends({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        interval: "DAY",
      });
      return response;
    },
  });

  const config = trendConfig[trendType];

  const formatYAxis = (value: number) => {
    if (trendType === "revenue") return `${(value / 1000).toFixed(0)}k`;
    return String(value);
  };

  const formatValue = (value: number) => {
    if (trendType === "revenue") return formatFCFA(value);
    return `${value}`;
  };

  // Extraire les données de la réponse API - gérer les deux formats possibles
  let seriesData: { date: string; value: number }[] = [];

  if (data) {
    if (Array.isArray(data)) {
      // Si data est directement un tableau
      seriesData = data.map((point) => ({
        date: new Date(point.date).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        value: (point[config.dataKey as keyof typeof point] as number) || 0,
        fullDate: point.date,
      }));
    } else if (data.series && Array.isArray(data.series)) {
      // Si data a une propriété series
      seriesData = data.series.map((point: any) => ({
        date: new Date(point.timestamp || point.date).toLocaleDateString(
          "fr-FR",
          { day: "2-digit", month: "short" },
        ),
        value: point.value || point[config.dataKey] || 0,
        fullDate: point.timestamp || point.date,
      }));
    }
  }

  // Calculer les statistiques
  const values = seriesData.map((d) => d.value);
  const average =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const total = values.reduce((a, b) => a + b, 0);

  const renderChart = () => {
    if (seriesData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-gray-400">
          <LineChartIcon size={48} className="mb-2 opacity-30" />
          <p className="text-sm">Aucune donnée disponible</p>
        </div>
      );
    }

    const commonProps = {
      data: seriesData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient
                  id={`gradient-${trendType}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={config.color}
                    stopOpacity={0.3}
                  />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                name={config.label}
                stroke={config.color}
                strokeWidth={2}
                fill={`url(#gradient-${trendType})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="value"
                name={config.label}
                fill={config.color}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={config.label}
                stroke={config.color}
                strokeWidth={2}
                dot={{ r: 4, fill: config.color }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement des tendances...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tendances</h2>
          <p className="text-sm text-gray-500 mt-1">Évolution dans le temps</p>
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
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["bookings", "revenue"] as TrendType[]).map((type) => (
              <button
                key={type}
                onClick={() => setTrendType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  trendType === type
                    ? "text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={
                  trendType === type
                    ? { backgroundColor: trendConfig[type].color }
                    : {}
                }
              >
                {trendConfig[type].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["line", "area", "bar"] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  chartType === type
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "line"
                  ? "Ligne"
                  : type === "area"
                    ? "Aire"
                    : "Barres"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {isFetching && (
            <RefreshCw
              size={14}
              className="animate-spin text-gray-400 ml-auto"
            />
          )}
        </div>
      </div>

      {seriesData.length > 0 && (
        <>
          {/* Résumé statistique */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Moyenne</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(average)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Minimum</p>
              <p className="text-2xl font-bold text-red-600">
                {formatValue(min)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Maximum</p>
              <p className="text-2xl font-bold text-green-600">
                {formatValue(max)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-primary-600">
                {trendType === "revenue" ? formatFCFA(total) : total}
              </p>
            </div>
          </div>

          {/* Graphique principal */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-500" />
              Évolution des {config.label.toLowerCase()}
              <span className="text-xs text-gray-400 ml-2">(journalière)</span>
            </h3>
            {renderChart()}
          </div>
        </>
      )}

      {seriesData.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Aucune donnée disponible pour cette période
          </p>
        </div>
      )}
    </div>
  );
};
