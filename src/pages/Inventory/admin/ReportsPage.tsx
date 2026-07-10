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
    <div className="p-3 sm:p-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8">
        Rapports
      </h2>

      {/* Rapport de mouvements - AGRANDI */}
      <div className="bg-white rounded-3xl p-5 sm:p-5 sm:p-8 shadow-sm ring-1 ring-gray-100 mb-10 max-w-7xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Rapport de mouvements de stock
        </h3>
        <div className="flex flex-col lg:flex-row gap-5 sm:p-6 mb-8">
          <div className="flex-1">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Du
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Au
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Article (optionnel)
            </label>
            <input
              type="text"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              placeholder="Code article"
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 items-end">
            <button
              onClick={() => refetch()}
              className="px-4 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 flex items-center gap-2 text-sm sm:text-base"
            >
              <Search size={20} />
              Générer
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!fromDate || !toDate}
              className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm sm:text-base"
            >
              <FileSpreadsheet size={20} />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!fromDate || !toDate}
              className="px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm sm:text-base"
            >
              <FileText size={20} />
              PDF
            </button>
          </div>
        </div>

        {movementsReport && (
          <div className="overflow-x-auto mt-6">
            <table className="min-w-full text-sm sm:text-base">
              <thead className="bg-gray-50/70">
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
                  <tr key={idx} className="ring-0">
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
      <div className="bg-white rounded-3xl p-5 sm:p-5 sm:p-8 shadow-sm ring-1 ring-gray-100 max-w-7xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Rapport d'anomalies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:p-6">
          <div className="p-5 bg-red-50 rounded-2xl">
            <h4 className="font-medium text-red-800 mb-2 text-sm sm:text-base">
              Stocks négatifs
            </h4>
            <p className="text-red-600 text-sm sm:text-base">
              {anomaliesReport?.negativeStockItems?.length || 0} article(s)
            </p>
          </div>
          <div className="p-5 bg-orange-50 rounded-2xl">
            <h4 className="font-medium text-orange-800 mb-2 text-sm sm:text-base">
              Lots expirés
            </h4>
            <p className="text-orange-600 text-sm sm:text-base">
              {anomaliesReport?.expiredLots?.length || 0} lot(s)
            </p>
          </div>
          <div className="p-5 bg-yellow-50 rounded-2xl">
            <h4 className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">
              Actifs orphelins
            </h4>
            <p className="text-yellow-600 text-sm sm:text-base">
              {anomaliesReport?.orphanAssets?.length || 0} actif(s)
            </p>
          </div>
          <div className="p-5 bg-purple-50 rounded-2xl">
            <h4 className="font-medium text-purple-800 mb-2 text-sm sm:text-base">
              Généré le
            </h4>
            <p className="text-purple-600 text-sm sm:text-base">
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
