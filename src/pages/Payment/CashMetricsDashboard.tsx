import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CircleDollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";

const formatAmount = (amount?: number) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;

const compactAmount = (amount?: number) => {
  const value = amount ?? 0;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString("fr-FR");
};

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
    queryFn: () => paymentService.getCashRegisterStatistics(registerCode, params),
    enabled: !!registerCode,
  });

  const cashIn = overview?.totalCashIn ?? 0;
  const cashOut = overview?.totalCashOut ?? 0;
  const payments = overview?.totalPayments ?? 0;
  const netPosition = overview?.netCashPosition ?? 0;
  const movementCount = overview?.movementCount ?? 0;
  const openSessions = overview?.openSessionCount ?? 0;
  const maxFlow = Math.max(cashIn, cashOut, payments, 1);

  const chartRows = useMemo(
    () => [
      { label: "Paiements", value: payments, tone: "bg-primary-600" },
      { label: "Entrées caisse", value: cashIn, tone: "bg-emerald-500" },
      { label: "Sorties caisse", value: cashOut, tone: "bg-rose-500" },
      { label: "Position nette", value: netPosition, tone: "bg-slate-700" },
    ],
    [payments, cashIn, cashOut, netPosition],
  );

  const registerMax = Math.max(
    ...registers.map((r: any) => Number(r.movementCount || 0)),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Métriques de caisse</h2>
          <p className="text-sm text-gray-500 mt-1">
            Vue consolidée des flux, sessions et performances par caisse.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100 md:grid-cols-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
          <input
            value={registerCode}
            onChange={(e) => setRegisterCode(e.target.value)}
            placeholder="Code caisse"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto text-primary-600" />
        </div>
      )}

      {overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Metric icon={CircleDollarSign} label="Paiements encaissés" value={formatAmount(payments)} hint={`${movementCount} mouvements`} />
            <Metric icon={TrendingUp} label="Entrées caisse" value={formatAmount(cashIn)} hint="Flux entrants" />
            <Metric icon={TrendingDown} label="Sorties caisse" value={formatAmount(cashOut)} hint="Flux sortants" danger />
            <Metric icon={Wallet} label="Position nette" value={formatAmount(netPosition)} hint={`${openSessions} session(s) ouverte(s)`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <div className="xl:col-span-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-gray-900">Flux de caisse</h3>
                  <p className="text-xs text-gray-500 mt-1">Comparaison des montants sur la période sélectionnée.</p>
                </div>
                <BarChart3 size={18} className="text-primary-600" />
              </div>
              <div className="space-y-4">
                {chartRows.map((row) => {
                  const width = Math.max(4, Math.min(100, (Math.abs(row.value) / maxFlow) * 100));
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{row.label}</span>
                        <span className="font-semibold text-gray-900">{compactAmount(row.value)} FCFA</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="font-semibold text-gray-900 mb-1">Activité opérationnelle</h3>
              <p className="text-xs text-gray-500 mb-5">Sessions, mouvements et écart en attente.</p>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Caisses" value={overview.registerCount ?? 0} />
                <MiniStat label="Actives" value={overview.activeRegisterCount ?? 0} />
                <MiniStat label="Sessions ouvertes" value={openSessions} />
                <MiniStat label="En revue" value={overview.closingReviewSessionCount ?? 0} />
              </div>
              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Écart en attente</p>
                <p className="text-lg font-semibold text-gray-900">{formatAmount(overview.pendingVarianceAmount)}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Statistiques par caisse</h3>
            <p className="text-xs text-gray-500 mt-1">Activité observée par point d'encaissement.</p>
          </div>
          <span className="text-xs text-gray-400">{registers.length} caisse(s)</span>
        </div>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="bg-transparent">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Caisse</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Sessions</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Mouvements</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Activité</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Durée moyenne</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Écart moyen</th>
              </tr>
            </thead>
            <tbody>
              {registers.map((r: any) => (
                <tr key={r.registerCode} className="bg-gray-50/70 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 rounded-l-2xl">
                    <p className="font-medium text-gray-900">{r.registerName}</p>
                    <p className="text-xs text-gray-400 font-mono">{r.registerCode}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{r.sessionCount}</td>
                  <td className="px-4 py-3 text-right text-sm">{r.movementCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-2 w-28 rounded-full bg-white overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(4, (Number(r.movementCount || 0) / registerMax) * 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{Math.round(r.averageSessionDurationMinutes || 0)} min</td>
                  <td className="px-4 py-3 text-right text-sm rounded-r-2xl">{formatAmount(r.averageVarianceAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRegisterStats && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h3 className="font-semibold mb-3">Détail {selectedRegisterStats.registerCode}</h3>
          <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-auto">
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
  hint: string;
  danger?: boolean;
}> = ({ icon: Icon, label, value, hint, danger }) => (
  <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${danger ? "text-rose-600" : "text-gray-900"}`}>{value}</p>
        <p className="mt-2 text-xs text-gray-400">{hint}</p>
      </div>
      <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-xl font-semibold text-gray-900 mt-1">{value.toLocaleString("fr-FR")}</p>
  </div>
);
