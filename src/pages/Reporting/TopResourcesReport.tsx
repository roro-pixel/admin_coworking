import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Building2,
  Award,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { from: format(firstDay), to: format(lastDay) };
};

const formatFCFA = (amount: number | undefined | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;
const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}min` : ""}` : `${m}min`;
};

const getRankColor = (index: number) => {
  if (index === 0) return "bg-yellow-500";
  if (index === 1) return "bg-gray-400";
  if (index === 2) return "bg-amber-600";
  return "bg-gray-300";
};

const tooltipFormatter = (value: any, name: any): [string, string] => {
  if (typeof value === "number") {
    if (name === "revenueGenerated" || name === "Revenu")
      return [formatFCFA(value), "Revenu"];
    if (name === "utilizationRate" || name === "Taux d'utilisation")
      return [`${value.toFixed(1)}%`, "Taux d'utilisation"];
    if (name === "totalBookings" || name === "Réservations")
      return [String(value), "Réservations"];
    return [formatMinutes(value), "Temps utilisé"];
  }
  return [String(value), name];
};

export const TopResourcesReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["top-resources", dateRange.from, dateRange.to, limit],
    queryFn: () =>
      reportingService.getTopResources({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        limit,
      }),
  });

  const resources = data || [];

  // Données pour le graphique des revenus
  const revenueData = resources.slice(0, 8).map((resource) => ({
    name:
      resource.resourceName.length > 15
        ? resource.resourceName.substring(0, 12) + "..."
        : resource.resourceName,
    fullName: resource.resourceName,
    revenueGenerated: resource.revenueGenerated,
    utilizationRate: resource.utilizationRate,
    totalBookings: resource.totalBookings,
  }));

  // Données pour le camembert d'utilisation
  const pieData = resources.slice(0, 6).map((resource, idx) => ({
    name:
      resource.resourceName.length > 20
        ? resource.resourceName.substring(0, 17) + "..."
        : resource.resourceName,
    value: resource.totalMinutesBooked,
    color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"][
      idx % 6
    ],
  }));

  const barColors = [
    "#10b981",
    "#34d399",
    "#6ee7b7",
    "#a7f3d0",
    "#d1fae5",
    "#059669",
    "#047857",
    "#065f46",
  ];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement du classement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Top ressources
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Ressources les plus utilisées
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
          </select>
          {isFetching && (
            <RefreshCw size={14} className="animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Aucune donnée disponible pour cette période
          </p>
        </div>
      ) : (
        <>
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique à barres des revenus */}
            {revenueData.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-500" />
                  Revenus par ressource
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={revenueData}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Bar
                      dataKey="revenueGenerated"
                      name="Revenu"
                      radius={[0, 8, 8, 0]}
                    >
                      {revenueData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={barColors[index % barColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Camembert du temps d'utilisation */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-primary-500" />
                  Répartition du temps d'utilisation
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatMinutes(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Graphique des taux d'utilisation */}
          {revenueData.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-primary-500" />
                Taux d'utilisation par ressource
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={revenueData}
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Bar
                    dataKey="utilizationRate"
                    name="Taux d'utilisation"
                    radius={[8, 8, 0, 0]}
                  >
                    {revenueData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.utilizationRate >= 70
                            ? "#10b981"
                            : entry.utilizationRate >= 40
                              ? "#f59e0b"
                              : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Liste des ressources */}
          <div className="space-y-3">
            {resources.map((resource, idx) => (
              <div
                key={resource.resourceCode}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankColor(idx)}`}
                    >
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <p className="font-semibold text-gray-900">
                          {resource.resourceName}
                        </p>
                        <span className="text-xs text-gray-400 font-mono">
                          {resource.resourceCode}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {resource.resourceTypeCode}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-xs text-gray-400">Réservations</p>
                      <p className="text-xl font-bold text-gray-900">
                        {resource.totalBookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Temps utilisé</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatMinutes(resource.totalMinutesBooked)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Revenu</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatFCFA(resource.revenueGenerated)}
                      </p>
                    </div>
                  </div>
                  <div className="w-48">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Taux d'utilisation</span>
                      <span className="font-medium">
                        {(resource.utilizationRate ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          resource.utilizationRate >= 70
                            ? "bg-green-500"
                            : resource.utilizationRate >= 40
                              ? "bg-yellow-500"
                              : "bg-red-400"
                        }`}
                        style={{
                          width: `${Math.min(resource.utilizationRate ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Médaille d'or */}
          {resources[0] && (
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award size={24} className="text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Ressource la plus utilisée
                  </p>
                  <p className="text-lg font-bold text-yellow-900">
                    {resources[0].resourceName}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-yellow-700">
                {(resources[0].utilizationRate ?? 0).toFixed(1)}%
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
