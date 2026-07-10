import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Repeat,
  Settings,
  Package,
  X,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { StockLevel } from "../../../services/inventory.service";
import { StockInForm } from "./StockInForm";
import { StockOutForm } from "./StockOutForm";
import { StockTransferForm } from "./StockTransferForm";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import { ReservationsList } from "./ReservationsList";
import { LotsList } from "./LotsList";

export const StockLevels: React.FC = () => {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [belowMinimum, setBelowMinimum] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [showStockOutForm, setShowStockOutForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [showReservations, setShowReservations] = useState(false);
  const [showLotsList, setShowLotsList] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: stockData, isLoading } = useQuery({
    queryKey: ["stock-levels", locationFilter, belowMinimum],
    queryFn: () =>
      inventoryService.getStockLevels({
        locationCode: locationFilter || undefined,
        belowMinimum: belowMinimum || undefined,
        size: 100,
      }),
  });

  const stockLevels: StockLevel[] = Array.isArray(stockData)
    ? stockData
    : stockData?.data || stockData?.content || [];

  const filteredLevels = stockLevels.filter(
    (level: StockLevel) =>
      level.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      level.itemCode?.toLowerCase().includes(search.toLowerCase()),
  );

  const getStockStatus = (level: StockLevel) => {
    if (level.quantityAvailable <= 0) {
      return {
        label: "Rupture",
        color: "bg-red-100 text-red-700",
        icon: AlertTriangle,
      };
    }
    if (level.quantityAvailable < 10) {
      return {
        label: "Stock bas",
        color: "bg-orange-100 text-orange-700",
        icon: TrendingDown,
      };
    }
    return {
      label: "Normal",
      color: "bg-green-100 text-green-700",
      icon: null,
    };
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      {/* En-tête avec tous les boutons - AGRANDIS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          Niveaux de stock
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <button
            onClick={() => setShowStockInForm(true)}
            className="bg-green-600 text-white px-4 py-2.5 rounded-2xl hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <ArrowUp size={18} />
            Entrée
          </button>
          <button
            onClick={() => setShowStockOutForm(true)}
            className="bg-red-600 text-white px-4 py-2.5 rounded-2xl hover:bg-red-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <ArrowDown size={18} />
            Sortie
          </button>
          <button
            onClick={() => setShowTransferForm(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <Repeat size={18} />
            Transfert
          </button>
          <button
            onClick={() => setShowAdjustmentForm(true)}
            className="bg-orange-600 text-white px-4 py-2.5 rounded-2xl hover:bg-orange-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <Settings size={18} />
            Ajustement
          </button>
          <button
            onClick={() => setShowReservations(true)}
            className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl hover:bg-purple-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <Package size={18} />
            Réservations
          </button>
          <button
            onClick={() => setShowLotsList(true)}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl hover:bg-indigo-700 flex items-center gap-2 text-sm sm:text-base font-medium"
          >
            <Package size={18} />
            Lots
          </button>
          <label className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              checked={belowMinimum}
              onChange={(e) => setBelowMinimum(e.target.checked)}
              className="rounded w-5 h-5"
            />
            <span className="text-base whitespace-nowrap">
              Stocks bas uniquement
            </span>
          </label>
        </div>
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
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
          />
        </div>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-5 py-3 ring-1 ring-gray-100 rounded-2xl bg-white text-sm sm:text-base min-w-[200px]"
        >
          <option value="">Tous les emplacements</option>
          {locations.map((loc: any) => (
            <option key={loc.locationCode} value={loc.locationCode}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau des stocks - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-visible md:overflow-x-auto">
          <table className="w-full text-sm sm:text-base block md:table">
            <thead className="bg-gray-50 ring-1 ring-gray-100 hidden md:table-header-group">
              <tr>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Article</th>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">
                  Emplacement
                </th>
                <th className="px-5 py-4 text-right font-semibold hidden md:table-cell">En stock</th>
                <th className="px-5 py-4 text-right font-semibold hidden md:table-cell">Réservé</th>
                <th className="px-5 py-4 text-right font-semibold hidden md:table-cell">
                  Disponible
                </th>
                <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Statut</th>
              </tr>
            </thead>
            <tbody className="space-y-2 md:space-y-0 block md:table-row-group">
              {filteredLevels.map((level: StockLevel, idx: number) => {
                const status = getStockStatus(level);
                const StatusIcon = status.icon;
                return (
                  <tr key={idx} className="hover:bg-gray-50 block md:table-row rounded-3xl bg-white p-4 mb-3 shadow-sm ring-1 ring-gray-100">
                    <td className="px-5 py-4 flex justify-between gap-4 md:table-cell text-sm">
                      <p className="font-medium">{level.itemName}</p>
                      <p className="text-sm text-gray-500">{level.itemCode}</p>
                    </td>
                    <td className="px-5 py-4 flex justify-between gap-4 md:table-cell text-sm">{level.locationName}</td>
                    <td className="px-5 py-4 text-right font-medium flex justify-between gap-4 md:table-cell text-sm">
                      {level.quantityOnHand}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-500 flex justify-between gap-4 md:table-cell text-sm">
                      {level.quantityReserved}
                    </td>
                    <td className="px-5 py-4 text-right font-bold flex justify-between gap-4 md:table-cell text-sm">
                      {level.quantityAvailable}
                    </td>
                    <td className="px-5 py-4 flex justify-between gap-4 md:table-cell text-sm">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${status.color}`}
                      >
                        {StatusIcon && <StatusIcon size={14} />}
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLevels.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <p className="text-gray-500 text-sm sm:text-base">
            Aucun niveau de stock trouvé
          </p>
        </div>
      )}

      {/* Modals */}
      <StockInForm
        isOpen={showStockInForm}
        onClose={() => setShowStockInForm(false)}
      />
      <StockOutForm
        isOpen={showStockOutForm}
        onClose={() => setShowStockOutForm(false)}
      />
      <StockTransferForm
        isOpen={showTransferForm}
        onClose={() => setShowTransferForm(false)}
      />
      <StockAdjustmentForm
        isOpen={showAdjustmentForm}
        onClose={() => setShowAdjustmentForm(false)}
      />

      {showReservations && (
        <ModalPortal onClose={() => setShowReservations(false)} size="2xl">
          <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
            <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Réservations de stock</h3>
            <button
              onClick={() => setShowReservations(false)}
              className="p-2 hover:bg-gray-100 rounded-2xl"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <ReservationsList />
          </div>
        </ModalPortal>
      )}

      {showLotsList && (
        <ModalPortal onClose={() => setShowLotsList(false)} size="2xl">
          <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
            <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Lots traçables</h3>
            <button
              onClick={() => setShowLotsList(false)}
              className="p-2 hover:bg-gray-100 rounded-2xl"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <LotsList />
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
