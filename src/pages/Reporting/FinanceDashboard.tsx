import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  CreditCard,
  Building2,
} from "lucide-react";
import {
  reportingService,
  paymentMethodLabels,
} from "../../services/reporting.service";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { fromDate: format(firstDay), toDate: format(lastDay) };
};

const paymentColors: Record<string, string> = {
  CASH: "#10b981",
  WALLET: "#3b82f6",
  MOBILE_MONEY: "#8b5cf6",
  BANK_TRANSFER: "#f59e0b",
  CARD: "#06b6d4",
  CHEQUE: "#6b7280",
};

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

export const FinanceDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["finance-dashboard", dateRange.fromDate, dateRange.toDate],
    queryFn: () =>
      reportingService.getFinanceDashboard({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      }),
  });

  // Préparer données pour graphique camembert des paiements
  const paymentPieData = data?.payments
    ? [
        {
          name: "Espèces",
          value: data.payments.cashAmount || 0,
          color: paymentColors.CASH,
        },
        {
          name: "Wallet",
          value: data.payments.walletAmount || 0,
          color: paymentColors.WALLET,
        },
        {
          name: "Mobile Money",
          value: data.payments.mobileMoneyAmount || 0,
          color: paymentColors.MOBILE_MONEY,
        },
        {
          name: "Virement",
          value: data.payments.bankTransferAmount || 0,
          color: paymentColors.BANK_TRANSFER,
        },
        {
          name: "Carte",
          value: data.payments.cardAmount || 0,
          color: paymentColors.CARD,
        },
        {
          name: "Chèque",
          value: data.payments.chequeAmount || 0,
          color: paymentColors.CHEQUE,
        },
      ].filter((item) => item.value > 0)
    : [];

  // Préparer données pour graphique des revenus par source
  const revenueData =
    data?.revenueBySource?.map((source) => ({
      name: source.sourceType,
      facturé: source.totalInvoiced || 0,
      payé: source.totalPaid || 0,
      restant: source.outstandingAmount || 0,
    })) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw
            className="animate-spin mx-auto mb-4 text-primary-500"
            size={32}
          />
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Tableau de bord financier
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vue d'ensemble de vos performances financières
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1.5">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, fromDate: e.target.value }))
              }
              className="px-2 py-1 text-sm border-0 focus:ring-0 w-32"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, toDate: e.target.value }))
              }
              className="px-2 py-1 text-sm border-0 focus:ring-0 w-32"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Chiffre d'affaires
            </span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatFCFA(data.totalInvoiced)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {data.invoiceCount} factures émises
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Encaissements
            </span>
            <div className="p-2 bg-green-50 rounded-lg">
              <Wallet size={18} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatFCFA(data.totalPaid)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {data.payments?.transactionCount} transactions
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Taux de recouvrement
            </span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <CreditCard size={18} className="text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {(data.collectionRate ?? 0).toFixed(1)}%
          </p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(data.collectionRate ?? 0, 100)}%` }}
            />
          </div>
        </div>

        <div
          className={`bg-white rounded-xl p-5 shadow-sm border ${(data.overdueCount ?? 0) > 0 ? "border-red-200" : "border-gray-100"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Créances impayées
            </span>
            <div
              className={`p-2 rounded-lg ${(data.overdueCount ?? 0) > 0 ? "bg-red-50" : "bg-gray-50"}`}
            >
              <TrendingDown
                size={18}
                className={
                  (data.overdueCount ?? 0) > 0
                    ? "text-red-500"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
          <p
            className={`text-2xl font-bold ${(data.overdueCount ?? 0) > 0 ? "text-red-600" : "text-gray-600"}`}
          >
            {formatFCFA(data.overdueAmount)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {data.overdueCount} facture{(data.overdueCount ?? 0) > 1 ? "s" : ""}{" "}
            en retard
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camembert des paiements */}
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
            Répartition des paiements par méthode
          </h3>
          {paymentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentPieData}
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
                  {paymentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée de paiement</p>
            </div>
          )}
        </div>

        {/* Barres des revenus par source */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary-500" />
            Revenus par source
          </h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
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
                <Legend />
                <Bar
                  dataKey="facturé"
                  name="Facturé"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="payé"
                  name="Payé"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Détail des paiements par méthode */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">
            Détail des paiements par méthode
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
          {Object.entries({
            CASH: data.payments?.cashAmount,
            WALLET: data.payments?.walletAmount,
            MOBILE_MONEY: data.payments?.mobileMoneyAmount,
            BANK_TRANSFER: data.payments?.bankTransferAmount,
            CARD: data.payments?.cardAmount,
            CHEQUE: data.payments?.chequeAmount,
          }).map(([method, amount]) => (
            <div key={method} className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">
                {paymentMethodLabels[method] || method}
              </p>
              <p className="text-lg font-bold text-gray-800">
                {formatFCFA(amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
