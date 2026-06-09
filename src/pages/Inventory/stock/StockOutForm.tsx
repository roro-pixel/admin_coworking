import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Package, Search, AlertTriangle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type {
  InventoryItem,
  StockLevel,
} from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface StockOutFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockOutForm: React.FC<StockOutFormProps> = ({
  isOpen,
  onClose,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: "",
    locationCode: "",
    quantity: 1,
    referenceType: "",
    referenceCode: "",
    reason: "",
    allowNegativeOverride: false,
  });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [showItemResults, setShowItemResults] = useState(false);
  const [showStockWarning, setShowStockWarning] = useState(false);

  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-search", itemSearch],
    queryFn: () =>
      inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations-active"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: stockLevelsData } = useQuery({
    queryKey: ["stock-levels-check", formData.itemCode, formData.locationCode],
    queryFn: () =>
      inventoryService.getStockLevels({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
      }),
    enabled: !!formData.itemCode && !!formData.locationCode,
  });

  const items = itemsData?.content || [];
  const stockLevels = Array.isArray(stockLevelsData)
    ? stockLevelsData
    : stockLevelsData?.data || stockLevelsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.stockOut({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
        quantity: formData.quantity,
        referenceType: formData.referenceType || undefined,
        referenceCode: formData.referenceCode || undefined,
        reason: formData.reason,
        allowNegativeOverride: formData.allowNegativeOverride,
        performedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      console.error("Inventory operation error:", err);
    },
  });

  const resetForm = () => {
    setFormData({
      itemCode: "",
      locationCode: "",
      quantity: 1,
      referenceType: "",
      referenceCode: "",
      reason: "",
      allowNegativeOverride: false,
    });
    setSelectedItem(null);
    setItemSearch("");
    setAvailableStock(0);
    setShowStockWarning(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.allowNegativeOverride && formData.quantity > availableStock) {
      setShowStockWarning(true);
      return;
    }
    createMutation.mutate();
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ ...formData, itemCode: item.itemCode });
    setItemSearch(item.name);
    setShowItemResults(false);
  };

  const updateLocation = (locationCode: string) => {
    setFormData({ ...formData, locationCode });
    const level = stockLevels.find(
      (l: StockLevel) => l.locationCode === locationCode,
    );
    setAvailableStock(level?.quantityAvailable || 0);
    setShowStockWarning(false);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-2xl font-bold">Sortie de stock</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={24} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Article *
            </label>
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemResults(true);
                }}
                placeholder="Rechercher un article..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            {showItemResults && items.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {items.map((item: InventoryItem) => (
                  <button
                    key={item.itemCode}
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b text-base"
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.itemCode}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-base font-medium">{selectedItem.name}</p>
                <p className="text-sm text-gray-500">
                  Code: {selectedItem.itemCode}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Emplacement *
            </label>
            <select
              value={formData.locationCode}
              onChange={(e) => updateLocation(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {formData.locationCode && (
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-base text-gray-600">
                Stock disponible:{" "}
                <span className="font-bold text-xl">{availableStock}</span>{" "}
                unités
              </p>
            </div>
          )}

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Quantité à sortir *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.quantity === 0 ? "" : formData.quantity}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFormData({
                  ...formData,
                  quantity: val === "" ? 0 : parseInt(val),
                });
              }}
              required
              placeholder="1"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
          </div>

          {showStockWarning && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              <span className="text-base">
                Stock insuffisant! {formData.quantity} demandé, {availableStock}{" "}
                disponible
              </span>
            </div>
          )}

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Motif
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              placeholder="Attribution, utilisation, etc."
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.allowNegativeOverride}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allowNegativeOverride: e.target.checked,
                })
              }
              className="rounded w-5 h-5"
            />
            <span className="text-base">
              Autoriser la sortie même si stock insuffisant
            </span>
          </label>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.itemCode ||
                !formData.locationCode ||
                formData.quantity <= 0
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Package size={20} />
              )}
              Valider la sortie
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
