import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, FileSpreadsheet, Search } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';

export const ReportsPage: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [locationFilter] = useState('');
  const { data: movementsReport, refetch } = useQuery({
    queryKey: ['movements-report', fromDate, toDate, itemFilter, locationFilter],
    queryFn: () => inventoryService.getMovementsReport({
      from: fromDate || undefined,
      to: toDate || undefined,
      itemCode: itemFilter || undefined,
      locationCode: locationFilter || undefined,
    }),
    enabled: false,
  });

  const { data: anomaliesReport } = useQuery({
    queryKey: ['anomalies-report'],
    queryFn: () => inventoryService.getAnomaliesReport(),
  });

  const handleExportCSV = async () => {
    const blob = await inventoryService.exportMovementsCSV({ from: fromDate, to: toDate });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mouvements_${fromDate}_${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const blob = await inventoryService.exportMovementsPDF({ from: fromDate, to: toDate });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mouvements_${fromDate}_${toDate}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Rapports</h2>

      {/* Rapport de mouvements */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapport de mouvements de stock</h3>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Article (optionnel)</label>
            <input
              type="text"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              placeholder="Code article"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex gap-2 items-end">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Search size={16} />
              Générer
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!fromDate || !toDate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FileSpreadsheet size={16} />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!fromDate || !toDate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={16} />
              PDF
            </button>
          </div>
        </div>

        {movementsReport && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Article</th>
                  <th className="px-4 py-2 text-right">Quantité</th>
                  <th className="px-4 py-2 text-right">Coût</th>
                  <th className="px-4 py-2 text-left">Référence</th>
                </tr>
              </thead>
              <tbody>
                {movementsReport?.data?.map((mov: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{new Date(mov.performedAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2">{mov.movementType}</td>
                    <td className="px-4 py-2">{mov.itemName}</td>
                    <td className="px-4 py-2 text-right">{mov.quantity}</td>
                    <td className="px-4 py-2 text-right">{mov.totalCost?.toLocaleString()} FCFA</td>
                    <td className="px-4 py-2">{mov.referenceCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rapport d'anomalies */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapport d'anomalies</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Stocks négatifs</h4>
            <p className="text-sm text-red-600">{anomaliesReport?.negativeStockItems?.length || 0} article(s)</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Lots expirés</h4>
            <p className="text-sm text-orange-600">{anomaliesReport?.expiredLots?.length || 0} lot(s)</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Actifs orphelins</h4>
            <p className="text-sm text-yellow-600">{anomaliesReport?.orphanAssets?.length || 0} actif(s)</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Généré le</h4>
            <p className="text-sm text-purple-600">{anomaliesReport?.generatedAt ? new Date(anomaliesReport.generatedAt).toLocaleString('fr-FR') : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};