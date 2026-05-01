import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { reportingService, movementTypeLabels } from '../../services/reporting.service';

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { from: format(firstDay), to: format(lastDay) };
};

export const CashFlowReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cash-flow-report', dateRange.from, dateRange.to],
    queryFn: () => reportingService.getCashFlowReport({ from: dateRange.from, to: dateRange.to }),
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
        <h2 className="text-xl font-semibold text-gray-900">Flux de trésorerie</h2>
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
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total entrées</p>
              <div className="flex items-center gap-2">
                <ArrowUp size={18} className="text-green-500" />
                <p className="text-2xl font-bold text-green-700">{formatFCFA(data.totalInflows)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total sorties</p>
              <div className="flex items-center gap-2">
                <ArrowDown size={18} className="text-red-500" />
                <p className="text-2xl font-bold text-red-600">{formatFCFA(data.totalOutflows)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Flux net</p>
              <p className={`text-2xl font-bold ${data.netCashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatFCFA(data.netCashFlow)}
              </p>
            </div>
          </div>

          {/* Par type de mouvement */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Par type de mouvement</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Direction</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Nombre</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byMovementType.map((item) => (
                    <tr key={item.movementType} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {movementTypeLabels[item.movementType] || item.movementType}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.direction === 'IN' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatFCFA(item.totalAmount)}</td>
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
                      <th className="px-4 py-2 text-right text-sm font-semibold">Entrées</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Sorties</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.dailySeries.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">{formatFCFA(day.inflows)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">{formatFCFA(day.outflows)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          <span className={day.net >= 0 ? 'text-green-700' : 'text-red-600'}>
                            {day.net >= 0 ? '+' : ''}{formatFCFA(day.net)}
                          </span>
                        </td>
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