import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Search, AlertTriangle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type {
  InventoryItem,
  StockLevel,
} from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface StockAdjustmentFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({
  isOpen,
  onClose,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: "",
    locationCode: "",
    quantityDelta: 0,
    reason: "",
    referenceType: "",
    referenceCode: "",
  });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [showItemResults, setShowItemResults] = useState(false);
  const [error, setError] = useState("");

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

  const { data: stockLevels } = useQuery({
    queryKey: ["stock-levels-check", formData.itemCode, formData.locationCode],
    queryFn: () =>
      inventoryService.getStockLevels({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
      }),
    enabled: !!formData.itemCode && !!formData.locationCode,
  });

  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.stockAdjust({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
        quantityDelta: formData.quantityDelta,
        reason: formData.reason,
        referenceType: formData.referenceType || undefined,
        referenceCode: formData.referenceCode || undefined,
        performedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Erreur lors de l'ajustement");
    },
  });

  const resetForm = () => {
    setFormData({
      itemCode: "",
      locationCode: "",
      quantityDelta: 0,
      reason: "",
      referenceType: "",
      referenceCode: "",
    });
    setSelectedItem(null);
    setItemSearch("");
    setCurrentStock(0);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantityDelta === 0) {
      setError("La variation ne peut pas être nulle");
      return;
    }
    if (
      formData.quantityDelta < 0 &&
      Math.abs(formData.quantityDelta) > currentStock
    ) {
      setError(
        `Ajustement négatif trop important! Stock actuel: ${currentStock}`,
      );
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
    const level = stockLevels?.data?.find(
      (l: StockLevel) => l.locationCode === locationCode,
    );
    setCurrentStock(level?.quantityAvailable || 0);
  };

  const isIncrease = formData.quantityDelta > 0;
  const newStock = currentStock + formData.quantityDelta;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-2xl font-bold">Ajustement de stock</h3>
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
                Stock actuel:{" "}
                <span className="font-bold text-xl">{currentStock}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Variation (+, -) *
            </label>
            <input
              type="number"
              value={formData.quantityDelta}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantityDelta: Number(e.target.value) || 0,
                })
              }
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              placeholder="Ex: +10 ou -5"
            />
            {formData.quantityDelta !== 0 && (
              <div
                className={`mt-3 p-3 rounded-lg text-base ${isIncrease ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {isIncrease ? (
                  <>
                    Nouveau stock:{" "}
                    <span className="font-bold">
                      {currentStock} → {newStock}
                    </span>{" "}
                    (+{formData.quantityDelta})
                  </>
                ) : (
                  <>
                    Nouveau stock:{" "}
                    <span className="font-bold">
                      {currentStock} → {newStock}
                    </span>{" "}
                    ({formData.quantityDelta})
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Motif *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows={3}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              placeholder="Raison de l'ajustement (comptage, correction, etc.)"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              <span className="text-base">{error}</span>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-base"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.itemCode ||
                !formData.locationCode ||
                formData.quantityDelta === 0 ||
                !formData.reason
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : null}
              Appliquer l'ajustement
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
