import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, AlertTriangle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

export const LotsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [locationCode, setLocationCode] = useState("");

  const { data: lotsData, isLoading } = useQuery({
    queryKey: ["stock-lots", itemCode, locationCode],
    queryFn: () =>
      inventoryService.getStockLots({
        itemCode: itemCode || undefined,
        locationCode: locationCode || undefined,
      }),
  });

  const lots = lotsData?.content || lotsData?.data || [];

  const filteredLots = lots.filter(
    (lot: any) =>
      lot.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      lot.lotNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) /
        (1000 * 3600 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Lots traçables</h3>
      </div>

      {/* Filtres - AGRANDIS */}
      <div className="flex flex-col md:flex-row gap-5 mb-8">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
          />
        </div>
        <input
          type="text"
          placeholder="Code article"
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-lg text-base min-w-[180px]"
        />
        <input
          type="text"
          placeholder="Emplacement"
          value={locationCode}
          onChange={(e) => setLocationCode(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-lg text-base min-w-[180px]"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Lot</th>
              <th className="px-5 py-4 text-left font-semibold">Article</th>
              <th className="px-5 py-4 text-left font-semibold">Emplacement</th>
              <th className="px-5 py-4 text-right font-semibold">Quantité</th>
              <th className="px-5 py-4 text-left font-semibold">Expiration</th>
              <th className="px-5 py-4 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLots.map((lot: any) => {
              const expired = isExpired(lot.expiryDate);
              const expiringSoon = isExpiringSoon(lot.expiryDate);
              return (
                <tr key={lot.lotCode} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm">
                    {lot.lotNumber}
                  </td>
                  <td className="px-5 py-4 font-medium">{lot.itemName}</td>
                  <td className="px-5 py-4">{lot.locationName}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {lot.quantityAvailable}
                  </td>
                  <td className="px-5 py-4">
                    {lot.expiryDate ? (
                      <span
                        className={
                          expired
                            ? "text-red-600"
                            : expiringSoon
                              ? "text-orange-600"
                              : "text-gray-600"
                        }
                      >
                        {new Date(lot.expiryDate).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {expired ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700">
                        <AlertTriangle size={14} />
                        Expiré
                      </span>
                    ) : expiringSoon ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                        <AlertTriangle size={14} />
                        Expire bientôt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        <Package size={14} />
                        Valide
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLots.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucun lot trouvé</p>
        </div>
      )}
    </div>
  );
};
