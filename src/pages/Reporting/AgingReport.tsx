import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Clock } from 'lucide-react';
import { reportingService, agingColors } from '../../services/reporting.service';

const agingKeys = ['current', 'days1to30', 'days31to60', 'days61to90', 'over90'] as const;

export const AgingReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['aging-report'],
    queryFn: () => reportingService.getAgingReport(),
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Vieillissement des factures</h2>
        <p className="text-sm text-gray-500 mt-1">Analyse des factures impayées par ancienneté</p>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total impayé</p>
              <p className="text-2xl font-bold text-red-700">{formatFCFA(data.totalOutstanding)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Factures impayées</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalInvoices}</p>
            </div>
          </div>

          {/* Buckets */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {agingKeys.map((key) => {
              const bucket = data[key];
              return (
                <div key={key} className={`bg-white rounded-xl p-5 shadow-sm ${bucket.amount > 0 ? 'border-l-4' : ''}`}>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${agingColors[key]}`}>
                    {bucket.label}
                  </span>
                  <p className="text-xl font-bold mt-3">{formatFCFA(bucket.amount)}</p>
                  <p className="text-sm text-gray-500 mt-1">{bucket.count} facture{bucket.count > 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400 mt-1">{bucket.percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>

          {/* Tableau récapitulatif */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail par tranche</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Tranche</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Factures</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Montant</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Part</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agingKeys.map((key) => {
                    const bucket = data[key];
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${agingColors[key]}`}>
                            {bucket.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{bucket.count}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatFCFA(bucket.amount)}</td>
                        <td className="px-4 py-3 text-sm text-right">{bucket.percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3 w-48">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                key === 'current' ? 'bg-gray-400' :
                                key === 'days1to30' ? 'bg-yellow-400' :
                                key === 'days31to60' ? 'bg-orange-400' :
                                key === 'days61to90' ? 'bg-red-400' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune donnée disponible</p>
        </div>
      )}
    </div>
  );
};