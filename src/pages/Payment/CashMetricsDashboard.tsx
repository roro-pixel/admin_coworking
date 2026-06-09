import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";

const formatAmount = (amount?: number) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;

export const CashMetricsDashboard: React.FC = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [registerCode, setRegisterCode] = useState("");

  const params = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
  const { data: overview, isLoading } = useQuery({
    queryKey: ["cash-metrics-overview", registerCode, fromDate, toDate],
    queryFn: () =>
      paymentService.getCashMetricsOverview({
        ...params,
        registerCode: registerCode || undefined,
      }),
  });
  const { data: registers = [] } = useQuery({
    queryKey: ["cash-metrics-registers", fromDate, toDate],
    queryFn: () => paymentService.getCashMetricsRegisters(params),
  });
  const { data: selectedRegisterStats } = useQuery({
    queryKey: ["cash-register-stats", registerCode, fromDate, toDate],
    queryFn: () =>
      paymentService.getCashRegisterStatistics(registerCode, params),
    enabled: !!registerCode,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Métriques de caisse
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Suivi des revenus, flux cash, sessions et activité par caisse.
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          value={registerCode}
          onChange={(e) => setRegisterCode(e.target.value)}
          placeholder="Code caisse"
          className="px-3 py-2 border rounded-lg font-mono"
        />
        <div className="px-3 py-2 border rounded-lg text-sm text-gray-500 flex items-center gap-2">
          <BarChart3 size={16} /> Données actualisées automatiquement
        </div>
      </div>
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      )}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Metric
    icon={Wallet}
  label="Paiements"
  value={formatAmount(overview.totalPayments)}
/>

<Metric
  icon={TrendingUp}
  label="Entrées caisse"
  value={formatAmount(overview.totalCashIn)}
/>

<Metric
  icon={TrendingDown}
  label="Sorties caisse"
  value={formatAmount(overview.totalCashOut)}
/>

<Metric
  icon={Wallet}
  label="Position nette"
  value={formatAmount(overview.netCashPosition)}
/>

<Metric
  icon={BarChart3}
  label="Sessions ouvertes"
  value={String(overview.openSessionCount ?? 0)}
/>

<Metric
  icon={BarChart3}
  label="Mouvements"
  value={String(overview.movementCount ?? 0)}
/>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Statistiques par caisse</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Caisse</th>
              <th className="px-4 py-3 text-right text-sm">Sessions</th>
              <th className="px-4 py-3 text-right text-sm">Mouvements</th>
              <th className="px-4 py-3 text-right text-sm">Durée moyenne</th>
              <th className="px-4 py-3 text-right text-sm">Écart moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registers.map((r) => (
              <tr key={r.registerCode}>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.registerName}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {r.registerCode}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">{r.sessionCount}</td>
                <td className="px-4 py-3 text-right">{r.movementCount}</td>
                <td className="px-4 py-3 text-right">
                  {Math.round(r.averageSessionDurationMinutes || 0)} min
                </td>
                <td className="px-4 py-3 text-right">
                  {formatAmount(r.averageVarianceAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRegisterStats && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold mb-3">
            Détail {selectedRegisterStats.registerCode}
          </h3>
          <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto">
            {JSON.stringify(selectedRegisterStats, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-xl shadow-sm p-4">
    <Icon size={18} className="text-primary-600 mb-2" />
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);
