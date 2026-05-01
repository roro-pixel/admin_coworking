import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, DollarSign, FileText, Percent, RefreshCw } from 'lucide-react';
import { reportingService } from '../../services/reporting.service';

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { from: format(firstDay), to: format(lastDay) };
};

export const FinanceDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['finance-dashboard', dateRange.from, dateRange.to],
    queryFn: () => reportingService.getFinanceDashboard({ from: dateRange.from, to: dateRange.to }),
    refetchInterval: 60000,
  });

  const setThisMonth = () => setDateRange(getCurrentMonthRange());

  const formatFCFA = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement des indicateurs...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête avec sélecteur de période */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Tableau de bord financier</h2>
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
          <button
            onClick={setThisMonth}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            Ce mois
          </button>
          {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total facturé</p>
                <FileText size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatFCFA(data.totalInvoiced)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.invoiceCount} factures</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total encaissé</p>
                <DollarSign size={18} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-700">{formatFCFA(data.totalPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.payments.transactionCount} transactions</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Taux de recouvrement</p>
                <Percent size={18} className="text-purple-500" />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-purple-700">{data.collectionRate.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
                />
              </div>
            </div>

            <div className={`bg-white rounded-xl p-5 shadow-sm ${data.overdueCount > 0 ? 'border border-red-200' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Impayés en retard</p>
                <AlertCircle size={18} className={data.overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} />
              </div>
              <p className={`text-2xl font-bold ${data.overdueCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {formatFCFA(data.overdueAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{data.overdueCount} facture{data.overdueCount > 1 ? 's' : ''} en retard</p>
            </div>
          </div>

          {/* KPIs secondaires */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">TVA collectée</p>
              <p className="text-lg font-bold text-gray-900">{formatFCFA(data.totalVat)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Centimes additionnels</p>
              <p className="text-lg font-bold text-gray-900">{formatFCFA(data.totalAdditionalCent)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Remises accordées</p>
              <p className="text-lg font-bold text-red-600">{formatFCFA(data.totalDiscounts)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Factures annulées</p>
              <p className="text-lg font-bold text-gray-900">{data.cancelledInvoiceCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Paiements échoués</p>
              <p className={`text-lg font-bold ${data.payments.failedCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {data.payments.failedCount}
              </p>
            </div>
          </div>

          {/* Paiements par méthode */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paiements par méthode</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600">Espèces</p>
                <p className="text-lg font-bold text-green-800">{formatFCFA(data.payments.cashAmount)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">Wallet</p>
                <p className="text-lg font-bold text-blue-800">{formatFCFA(data.payments.walletAmount)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600">Mobile Money</p>
                <p className="text-lg font-bold text-purple-800">{formatFCFA(data.payments.mobileMoneyAmount)}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600">Virement bancaire</p>
                <p className="text-lg font-bold text-amber-800">{formatFCFA(data.payments.bankTransferAmount)}</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg">
                <p className="text-xs text-cyan-600">Carte bancaire</p>
                <p className="text-lg font-bold text-cyan-800">{formatFCFA(data.payments.cardAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Chèque</p>
                <p className="text-lg font-bold text-gray-700">{formatFCFA(data.payments.chequeAmount)}</p>
              </div>
            </div>
          </div>

          {/* Revenus par source */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus par source</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Source</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Factures</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Facturé</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Payé</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Restant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.revenueBySource.map((source) => (
                    <tr key={source.sourceType} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{source.sourceType}</td>
                      <td className="px-4 py-3 text-sm text-right">{source.invoiceCount}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatFCFA(source.totalInvoiced)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{formatFCFA(source.totalPaid)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {source.outstandingAmount > 0 ? formatFCFA(source.outstandingAmount) : '—'}
                      </td>
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
          <p className="text-gray-500">Aucune donnée disponible pour cette période</p>
        </div>
      )}
    </div>
  );
};