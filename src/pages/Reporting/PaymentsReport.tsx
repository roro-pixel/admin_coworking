import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { reportingService, paymentMethodLabels } from '../../services/reporting.service';

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { from: format(firstDay), to: format(lastDay) };
};

const methodColors: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700',
  WALLET: 'bg-blue-100 text-blue-700',
  MOBILE_MONEY: 'bg-purple-100 text-purple-700',
  BANK_TRANSFER: 'bg-amber-100 text-amber-700',
  CARD: 'bg-cyan-100 text-cyan-700',
  CHEQUE: 'bg-gray-100 text-gray-700',
};

export const PaymentsReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['payments-report', dateRange.from, dateRange.to],
    queryFn: () => reportingService.getPaymentsReport({ from: dateRange.from, to: dateRange.to }),
  });

  const formatFCFA = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement du rapport...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Répartition des paiements</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total encaissé</p>
              <p className="text-2xl font-bold text-green-700">{formatFCFA(data.totalReceived)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Nombre de transactions</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalTransactions}</p>
            </div>
          </div>

          {/* Par méthode */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Par méthode de paiement</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Méthode</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Transactions</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Montant</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byMethod.map((item) => (
                    <tr key={item.method} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${methodColors[item.method] || 'bg-gray-100 text-gray-700'}`}>
                          {paymentMethodLabels[item.method] || item.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatFCFA(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Série journalière */}
          {data.dailySeries.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Série journalière</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Espèces</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Wallet</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Mobile Money</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Virement</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Carte</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.dailySeries.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-sm text-right">{day.cash > 0 ? formatFCFA(day.cash) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right">{day.wallet > 0 ? formatFCFA(day.wallet) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right">{day.mobileMoney > 0 ? formatFCFA(day.mobileMoney) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right">{day.bankTransfer > 0 ? formatFCFA(day.bankTransfer) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right">{day.card > 0 ? formatFCFA(day.card) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{formatFCFA(day.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune donnée disponible pour cette période</p>
        </div>
      )}
    </div>
  );
};