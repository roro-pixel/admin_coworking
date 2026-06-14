import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Users,
  Crown,
  Calendar,
  Factory,
  User,
  Building2,
  Medal,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import type { RealOwnerActivity } from "../../services/reporting.service";
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

const formatFCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

const getOwnerIcon = (type: string) => {
  if (type === "BUSINESS")
    return <Factory size={20} className="text-purple-400" />;
  if (type === "MEMBER") return <User size={20} className="text-blue-400" />;
  return <Building2 size={20} className="text-green-400" />;
};

export const TopOwnersReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["top-owners", dateRange.from, dateRange.to, limit],
    queryFn: async () => {
      const response = await reportingService.getTopOwners({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        limit,
      });
      return response as unknown as RealOwnerActivity[];
    },
  });

  const owners = Array.isArray(data) ? data : [];

  const chartData = owners.slice(0, 8).map((owner) => ({
    name:
      owner.ownerName?.length > 15
        ? owner.ownerName.substring(0, 12) + "..."
        : owner.ownerName || "N/A",
    spent: owner.revenue || 0,
  }));

  const pieData = owners.slice(0, 5).map((owner, idx) => ({
    name:
      owner.ownerName?.length > 20
        ? owner.ownerName.substring(0, 17) + "..."
        : owner.ownerName || "N/A",
    value: owner.revenue || 0,
    color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][idx % 5],
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
          <h2 className="text-xl font-semibold text-gray-900">Top clients</h2>
          <p className="text-sm text-gray-500 mt-1">Clients les plus actifs</p>
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
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Aucune donnée disponible pour cette période
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartData.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-500" />
                  Dépenses par client
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                              <p className="font-semibold text-gray-700 mb-2">
                                {payload[0]?.payload?.name}
                              </p>
                              <div className="text-sm">
                                <span className="text-gray-600">
                                  Dépenses:{" "}
                                </span>
                                <span className="font-semibold text-green-600">
                                  {formatFCFA(
                                    (payload[0]?.value as number) || 0,
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="spent" radius={[0, 8, 8, 0]}>
                      {chartData.map((_entry, index) => (
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

            {pieData.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-primary-500" />
                  Répartition des dépenses
                </h3>
                <ResponsiveContainer width="100%" height={300}>
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
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                              <p className="font-semibold text-gray-700 mb-2">
                                {payload[0]?.name}
                              </p>
                              <div className="text-sm">
                                <span className="text-gray-600">Montant: </span>
                                <span className="font-semibold text-green-600">
                                  {formatFCFA(
                                    (payload[0]?.value as number) || 0,
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <table className="w-full border-separate border-spacing-y-2">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">
                    Réservations
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">
                    Dépenses
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Dernière réservation
                  </th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner, idx) => (
                  <tr key={owner.ownerCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getOwnerIcon(owner.ownerType)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {owner.ownerName}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {owner.ownerCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          owner.ownerType === "BUSINESS"
                            ? "bg-purple-100 text-purple-700"
                            : owner.ownerType === "MEMBER"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {owner.ownerType === "BUSINESS"
                          ? "Business"
                          : owner.ownerType === "MEMBER"
                            ? "Membre"
                            : "Client"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {owner.bookingCount || 0}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-bold text-green-700">
                        {formatFCFA(owner.revenue || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {owner.lastBookingAt && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar size={12} />
                          {new Date(owner.lastBookingAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Podium */}
          {owners[0] && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100 text-center shadow-sm">
                <Crown size={20} className="text-yellow-600 mx-auto mb-2" />
                <Medal size={28} className="mx-auto text-yellow-500 mb-1" />
                <p className="font-semibold text-gray-900 mt-1">
                  {owners[0].ownerName}
                </p>
                <p className="text-sm text-gray-500">
                  {owners[0].bookingCount || 0} réservations
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {formatFCFA(owners[0].revenue || 0)}
                </p>
              </div>
              {owners[1] && (
                <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100 text-center shadow-sm">
                  <Medal size={28} className="mx-auto text-gray-400 mb-1" />
                  <p className="font-semibold text-gray-900 mt-1">
                    {owners[1].ownerName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {owners[1].bookingCount || 0} réservations
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatFCFA(owners[1].revenue || 0)}
                  </p>
                </div>
              )}
              {owners[2] && (
                <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100 text-center shadow-sm">
                  <Medal size={28} className="mx-auto text-amber-600 mb-1" />
                  <p className="font-semibold text-gray-900 mt-1">
                    {owners[2].ownerName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {owners[2].bookingCount || 0} réservations
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatFCFA(owners[2].revenue || 0)}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
