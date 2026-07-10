import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Search, ArrowRight, AlertTriangle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type {
  InventoryItem,
  StockLevel,
  StockOutReasonCode,
} from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface StockTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const reasonOptions: { value: StockOutReasonCode; label: string }[] = [
  { value: "INTERNAL_USE", label: "Usage interne" },
  { value: "CONSUMPTION", label: "Consommation" },
  { value: "DAMAGE", label: "Article endommagé" },
  { value: "LOSS", label: "Perte" },
  { value: "OTHER", label: "Autre" },
];

export const StockTransferForm: React.FC<StockTransferFormProps> = ({
  isOpen,
  onClose,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: "",
    locationFromCode: "",
    locationToCode: "",
    quantity: 1,
    reasonCode: "INTERNAL_USE" as StockOutReasonCode,
    reasonDetails: "",
    lotNumber: "",
    serialNumbers: [] as string[],
  });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [showItemResults, setShowItemResults] = useState(false);
  const [error, setError] = useState("");
  const [lotNotFound, setLotNotFound] = useState(false);

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
    queryKey: [
      "stock-levels-check",
      formData.itemCode,
      formData.locationFromCode,
    ],
    queryFn: () =>
      inventoryService.getStockLevels({
        itemCode: formData.itemCode,
        locationCode: formData.locationFromCode,
      }),
    enabled: !!formData.itemCode && !!formData.locationFromCode,
  });

  const { data: lots = [] } = useQuery({
    queryKey: [
      "item-lots-transfer",
      formData.itemCode,
      formData.locationFromCode,
    ],
    queryFn: () =>
      inventoryService.getItemLots(formData.itemCode, {
        locationCode: formData.locationFromCode,
        activeOnly: true,
      }),
    enabled:
      !!selectedItem?.requiresLotNumber &&
      !!formData.itemCode &&
      !!formData.locationFromCode,
  });

  const { data: serials = [] } = useQuery({
    queryKey: [
      "item-serials-transfer",
      formData.itemCode,
      formData.locationFromCode,
    ],
    queryFn: () =>
      inventoryService.getItemSerials(formData.itemCode, {
        locationCode: formData.locationFromCode,
        status: "AVAILABLE",
      }),
    enabled:
      !!selectedItem?.requiresSerialNumber &&
      !!formData.itemCode &&
      !!formData.locationFromCode,
  });

  const items = itemsData?.content || [];
  const stockLevels = Array.isArray(stockLevelsData)
    ? stockLevelsData
    : stockLevelsData?.data || stockLevelsData?.content || [];

  const createMutation = useMutation({
    mutationFn: (confirmCreateLot?: boolean) =>
      inventoryService.stockTransfer({
        itemCode: formData.itemCode,
        locationFromCode: formData.locationFromCode,
        locationToCode: formData.locationToCode,
        quantity: formData.quantity,
        reasonCode: formData.reasonCode,
        reasonDetails: formData.reasonDetails || undefined,
        performedBy: admin?.email || "admin",
        lotNumber: formData.lotNumber || undefined,
        confirmCreateLot: !!confirmCreateLot,
        serialNumbers: selectedItem?.requiresSerialNumber
          ? formData.serialNumbers
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-lots"] });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      setLotNotFound(code === "LOT_NOT_FOUND");
      setError(err?.response?.data?.message || "Erreur lors du transfert");
    },
  });

  const resetForm = () => {
    setFormData({
      itemCode: "",
      locationFromCode: "",
      locationToCode: "",
      quantity: 1,
      reasonCode: "INTERNAL_USE",
      reasonDetails: "",
      lotNumber: "",
      serialNumbers: [],
    });
    setSelectedItem(null);
    setItemSearch("");
    setAvailableStock(0);
    setError("");
    setLotNotFound(false);
  };

  const validate = () => {
    if (
      !formData.itemCode ||
      !formData.locationFromCode ||
      !formData.locationToCode
    )
      return "Article, source et destination sont obligatoires.";
    if (formData.locationFromCode === formData.locationToCode)
      return "Les emplacements source et destination doivent être différents.";
    if (formData.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (formData.quantity > availableStock)
      return `Stock insuffisant : disponible ${availableStock}.`;
    if (formData.reasonCode === "OTHER" && !formData.reasonDetails.trim())
      return "Le détail est obligatoire pour le motif Autre.";
    if (selectedItem?.requiresLotNumber && !formData.lotNumber)
      return "Le lot est obligatoire pour cet article.";
    if (
      selectedItem?.requiresSerialNumber &&
      formData.serialNumbers.length !== formData.quantity
    )
      return `Sélectionnez exactement ${formData.quantity} numéro(s) de série.`;
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError("");
    setLotNotFound(false);
    createMutation.mutate(false);
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData((f) => ({
      ...f,
      itemCode: item.itemCode,
      lotNumber: "",
      serialNumbers: [],
    }));
    setItemSearch(item.name);
    setShowItemResults(false);
    setError("");
  };

  const updateFromLocation = (locationCode: string) => {
    setFormData((f) => ({
      ...f,
      locationFromCode: locationCode,
      lotNumber: "",
      serialNumbers: [],
    }));
    const level = stockLevels.find(
      (l: StockLevel) => l.locationCode === locationCode,
    );
    setAvailableStock(level?.quantityAvailable || 0);
    setError("");
  };

  const toggleSerial = (serialNumber: string) => {
    setFormData((f) => ({
      ...f,
      serialNumbers: f.serialNumbers.includes(serialNumber)
        ? f.serialNumbers.filter((s) => s !== serialNumber)
        : [...f.serialNumbers, serialNumber],
    }));
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
        <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Transfert de stock</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl">
          <X size={24} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Article *
            </label>
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemResults(true);
                }}
                placeholder="Rechercher un article..."
                className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
              />
            </div>
            {showItemResults && items.length > 0 && (
              <div className="relative">
                <div className="absolute z-20 mt-1 w-full bg-white ring-1 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <button
                      key={item.itemCode}
                      type="button"
                      onClick={() => selectItem(item)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 ring-1 ring-gray-100 text-sm sm:text-base"
                    >
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.itemCode}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedItem && (
              <div className="mt-3 p-3 bg-gray-50 rounded-2xl">
                <p className="font-medium text-sm sm:text-base">{selectedItem.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedItem.itemCode} · {selectedItem.trackingType}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Emplacement source *
            </label>
            <select
              value={formData.locationFromCode}
              onChange={(e) => updateFromLocation(e.target.value)}
              required
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base bg-white"
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {formData.locationFromCode && (
            <div className="p-3 bg-gray-50 rounded-2xl text-center">
              <p className="text-base text-gray-600">
                Stock disponible source :{" "}
                <span className="font-bold text-lg sm:text-xl">{availableStock}</span>
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <ArrowRight size={28} className="text-gray-400" />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Emplacement destination *
            </label>
            <select
              value={formData.locationToCode}
              onChange={(e) =>
                setFormData({ ...formData, locationToCode: e.target.value })
              }
              required
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base bg-white"
            >
              <option value="">Sélectionner</option>
              {locations
                .filter(
                  (loc: any) => loc.locationCode !== formData.locationFromCode,
                )
                .map((loc: any) => (
                  <option key={loc.locationCode} value={loc.locationCode}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Quantité *
              </label>
              <input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: Number(e.target.value) || 0,
                  })
                }
                required
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Motif *
              </label>
              <select
                value={formData.reasonCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reasonCode: e.target.value as StockOutReasonCode,
                  })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base bg-white"
              >
                {reasonOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedItem?.requiresLotNumber && formData.locationFromCode && (
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Lot *
              </label>
              <select
                value={formData.lotNumber}
                onChange={(e) =>
                  setFormData({ ...formData, lotNumber: e.target.value })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base bg-white"
              >
                <option value="">Sélectionner un lot existant</option>
                {lots.map((lot) => (
                  <option
                    key={lot.lotCode || lot.lotNumber}
                    value={lot.lotNumber}
                  >
                    {lot.lotNumber} · dispo {lot.quantityAvailable}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedItem?.requiresSerialNumber && formData.locationFromCode && (
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Numéros de série disponibles *
              </label>
              <div className="border rounded-2xl space-y-2 md:space-y-0 max-h-56 overflow-y-auto">
                {serials.map((s) => (
                  <label
                    key={s.serialNumber}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.serialNumbers.includes(s.serialNumber)}
                      onChange={() => toggleSerial(s.serialNumber)}
                    />
                    <span className="font-mono text-sm">{s.serialNumber}</span>
                  </label>
                ))}
                {serials.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Aucun numéro disponible.
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formData.serialNumbers.length}/{formData.quantity}{" "}
                sélectionné(s)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Détail du motif
            </label>
            <textarea
              value={formData.reasonDetails}
              onChange={(e) =>
                setFormData({ ...formData, reasonDetails: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
              placeholder="Raison du transfert..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 ring-1 ring-1 ring-red-100 rounded-2xl flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              <span className="text-base">{error}</span>
              {lotNotFound && (
                <button
                  type="button"
                  onClick={() => createMutation.mutate(true)}
                  className="ml-auto px-3 py-2 bg-amber-600 text-white rounded-2xl"
                >
                  Créer le lot et relancer
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.itemCode ||
                !formData.locationFromCode ||
                !formData.locationToCode ||
                formData.quantity <= 0
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
            >
              {createMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : null}{" "}
              Transférer
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
