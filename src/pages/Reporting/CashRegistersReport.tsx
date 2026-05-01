import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Wallet, AlertCircle, TrendingUp } from 'lucide-react';
import { reportingService } from '../../services/reporting.service';

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { from: format(firstDay), to: format(lastDay) };
};

export const CashRegistersReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cash-registers-report', dateRange.from, dateRange.to],
    queryFn: () => reportingService.getCashRegistersReport({ from: dateRange.from, to: dateRange.to }),
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
        <h2 className="text-xl font-semibold text-gray-900">Rapport par caisse</h2>
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
          {/* Résumé global */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total entrées</p>
              <p className="text-2xl font-bold text-green-700">{formatFCFA(data.totalCashIn)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total sorties</p>
              <p className="text-2xl font-bold text-red-600">{formatFCFA(data.totalCashOut)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Flux net</p>
              <p className={`text-2xl font-bold ${data.netFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatFCFA(data.netFlow)}
              </p>
            </div>
          </div>

          {/* Tableau par caisse */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail par caisse</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Caisse</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Sessions</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Fond initial</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Entrées</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Sorties</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Flux net</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Écart</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Mouvements</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.registers.map((reg) => (
                    <tr key={reg.registerCode} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Wallet size={14} className="text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{reg.registerName}</p>
                            <p className="text-xs text-gray-400 font-mono">{reg.registerCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{reg.sessionsCount}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatFCFA(reg.openingAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">+{formatFCFA(reg.cashIn)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">-{formatFCFA(reg.cashOut)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={reg.netFlow >= 0 ? 'text-green-700' : 'text-red-600'}>
                          {reg.netFlow >= 0 ? '+' : ''}{formatFCFA(reg.netFlow)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reg.totalVariance !== 0 ? (
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${reg.totalVariance < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            <AlertCircle size={12} />
                            {reg.totalVariance > 0 ? '+' : ''}{formatFCFA(reg.totalVariance)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Aucun</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{reg.movementsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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