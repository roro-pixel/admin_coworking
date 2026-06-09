import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const agingKeys = [
  "current",
  "days1to30",
  "days31to60",
  "days61to90",
  "over90",
] as const;

const agingLabels: Record<string, string> = {
  current: "À échéance",
  days1to30: "1-30 jours",
  days31to60: "31-60 jours",
  days61to90: "61-90 jours",
  over90: "+90 jours",
};

const agingChartColors = [
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#dc2626",
];

const formatFCFA = (amount: number | undefined | null): string => {
  const value = amount ?? 0;
  return `${value.toLocaleString("fr-FR")} FCFA`;
};

// Formatter sécurisé pour Tooltip - gestion du type any pour Recharts
const tooltipFormatter = (value: any, name: any): [string, string] => {
  if (typeof value === "number") {
    return [formatFCFA(value), name];
  }
  if (typeof value === "string") {
    return [value, name];
  }
  return ["0 FCFA", name];
};

export const AgingReport: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["aging-report"],
    queryFn: () => reportingService.getAgingReport(),
  });

  // Préparer les données pour les graphiques
  const pieData = agingKeys
    .map((key, idx) => ({
      name: agingLabels[key],
      value: data?.[key]?.amount || 0,
      count: data?.[key]?.count || 0,
      percentage: data?.[key]?.percentage || 0,
      color: agingChartColors[idx],
    }))
    .filter((item) => item.value > 0);

  const barData = agingKeys.map((key, idx) => ({
    name: agingLabels[key],
    montant: data?.[key]?.amount || 0,
    factures: data?.[key]?.count || 0,
    pourcentage: data?.[key]?.percentage || 0,
    color: agingChartColors[idx],
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw
            className="animate-spin mx-auto mb-4 text-primary-500"
            size={32}
          />
          <p className="text-gray-500">Chargement de l'analyse...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header avec rafraîchissement */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Vieillissement des créances
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyse des factures impayées par ancienneté
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

      {/* Cartes récapitulatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">
              Total impayé
            </span>
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-700">
            {formatFCFA(data.totalOutstanding)}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {data.totalInvoices} facture{data.totalInvoices > 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">
              Délai moyen
            </span>
            <Clock size={20} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-700">32 jours</p>
          <p className="text-xs text-yellow-600 mt-1">
            Délai de paiement moyen
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Créances &gt;60j
            </span>
            <TrendingUp size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {(
              (data.days61to90?.amount || 0) + (data.over90?.amount || 0)
            ).toLocaleString("fr-FR")}{" "}
            FCFA
          </p>
          <p className="text-xs text-blue-600 mt-1">À risque élevé</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">
              Taux de recouvrement
            </span>
            <Wallet size={20} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700">
            {(
              (1 -
                data.totalOutstanding /
                  (data.totalOutstanding + (data.current?.amount || 0))) *
              100
            ).toFixed(1)}
            %
          </p>
          <p className="text-xs text-green-600 mt-1">Estimé</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique camembert */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary-500"
            >
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Répartition par ancienneté
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
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
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Graphique à barres */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary-500"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            Montant par tranche d'âge
          </h3>
          {barData.some((d) => d.montant > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="montant" radius={[0, 8, 8, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">
            Détail des créances par tranche
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tranche
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Factures
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Part
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Progression
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {barData.map((bucket) => (
                <tr
                  key={bucket.name}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full`}
                        style={{ backgroundColor: bucket.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {bucket.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {bucket.factures}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
                    {formatFCFA(bucket.montant)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {bucket.pourcentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(bucket.pourcentage, 100)}%`,
                            backgroundColor: bucket.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {bucket.pourcentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
