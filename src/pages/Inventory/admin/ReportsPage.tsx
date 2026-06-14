import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FileSpreadsheet, Search } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

export const ReportsPage: React.FC = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [locationFilter] = useState("");
  const { data: movementsReport, refetch } = useQuery({
    queryKey: [
      "movements-report",
      fromDate,
      toDate,
      itemFilter,
      locationFilter,
    ],
    queryFn: () =>
      inventoryService.getMovementsReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        itemCode: itemFilter || undefined,
        locationCode: locationFilter || undefined,
      }),
    enabled: false,
  });

  const { data: anomaliesReport } = useQuery({
    queryKey: ["anomalies-report"],
    queryFn: () => inventoryService.getAnomaliesReport(),
  });

  const handleExportCSV = async () => {
    const blob = await inventoryService.exportMovementsCSV({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mouvements_${fromDate}_${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const blob = await inventoryService.exportMovementsPDF({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mouvements_${fromDate}_${toDate}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-8 text-2xl">
        Rapports
      </h2>

      {/* Rapport de mouvements - AGRANDI */}
      <div className="bg-white rounded-xl p-8 shadow-sm mb-10 max-w-7xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Rapport de mouvements de stock
        </h3>
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Du
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
          </div>
          <div className="flex-1">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Au
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
          </div>
          <div className="flex-1">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Article (optionnel)
            </label>
            <input
              type="text"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              placeholder="Code article"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
          </div>
          <div className="flex gap-3 items-end">
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base"
            >
              <Search size={20} />
              Générer
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!fromDate || !toDate}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-base"
            >
              <FileSpreadsheet size={20} />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!fromDate || !toDate}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-base"
            >
              <FileText size={20} />
              PDF
            </button>
          </div>
        </div>

        {movementsReport && (
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Article</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                  <th className="px-4 py-3 text-right">Coût</th>
                  <th className="px-4 py-3 text-left">Référence</th>
                </tr>
              </thead>
              <tbody>
                {movementsReport?.data?.map((mov: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-3">
                      {new Date(mov.performedAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">{mov.movementType}</td>
                    <td className="px-4 py-3">{mov.itemName}</td>
                    <td className="px-4 py-3 text-right">{mov.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {mov.totalCost?.toLocaleString()} FCFA
                    </td>
                    <td className="px-4 py-3">{mov.referenceCode || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rapport d'anomalies - AGRANDI */}
      <div className="bg-white rounded-xl p-8 shadow-sm max-w-7xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Rapport d'anomalies
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2 text-base">
              Stocks négatifs
            </h4>
            <p className="text-red-600 text-base">
              {anomaliesReport?.negativeStockItems?.length || 0} article(s)
            </p>
          </div>
          <div className="p-5 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2 text-base">
              Lots expirés
            </h4>
            <p className="text-orange-600 text-base">
              {anomaliesReport?.expiredLots?.length || 0} lot(s)
            </p>
          </div>
          <div className="p-5 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2 text-base">
              Actifs orphelins
            </h4>
            <p className="text-yellow-600 text-base">
              {anomaliesReport?.orphanAssets?.length || 0} actif(s)
            </p>
          </div>
          <div className="p-5 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2 text-base">
              Généré le
            </h4>
            <p className="text-purple-600 text-base">
              {anomaliesReport?.generatedAt
                ? new Date(anomaliesReport.generatedAt).toLocaleString("fr-FR")
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
