import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Package, Search } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface StockInFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const parseSerialNumbers = (value: string) =>
  value
    .split(/[\n,;]/)
    .map((v) => v.trim())
    .filter(Boolean);

export const StockInForm: React.FC<StockInFormProps> = ({
  isOpen,
  onClose,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    itemCode: "",
    locationCode: "",
    quantity: 1,
    unitCost: 0,
    lotNumber: "",
    expiryDate: "",
    referenceType: "",
    referenceCode: "",
    reasonDetails: "",
    assetSerialNumbersText: "",
  });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
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

  const items = itemsData?.content || [];
  const serialNumbers = useMemo(
    () => parseSerialNumbers(formData.assetSerialNumbersText),
    [formData.assetSerialNumbersText],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.stockIn({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
        quantity: formData.quantity,
        unitCost: formData.unitCost,
        lotNumber: formData.lotNumber || undefined,
        expiryDate: formData.expiryDate || undefined,
        referenceType: formData.referenceType || undefined,
        referenceCode: formData.referenceCode || undefined,
        reasonDetails: formData.reasonDetails || undefined,
        performedBy: admin?.email || "admin",
        assetSerialNumbers: selectedItem?.requiresSerialNumber
          ? serialNumbers
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onClose();
      resetForm();
    },
    onError: (err: any) =>
      setError(
        err?.response?.data?.message || "Erreur lors de l'entrée de stock",
      ),
  });

  const resetForm = () => {
    setFormData({
      itemCode: "",
      locationCode: "",
      quantity: 1,
      unitCost: 0,
      lotNumber: "",
      expiryDate: "",
      referenceType: "",
      referenceCode: "",
      reasonDetails: "",
      assetSerialNumbersText: "",
    });
    setSelectedItem(null);
    setItemSearch("");
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemCode || !formData.locationCode)
      return setError("Article et emplacement sont obligatoires.");
    if (formData.quantity <= 0)
      return setError("La quantité doit être supérieure à 0.");
    if (formData.unitCost < 0)
      return setError("Le coût unitaire ne peut pas être négatif.");
    if (formData.referenceType && !formData.referenceCode)
      return setError(
        "Le code de référence est obligatoire quand le type de référence est renseigné.",
      );
    if (selectedItem?.requiresLotNumber && !formData.lotNumber.trim())
      return setError("Le numéro de lot est obligatoire pour cet article.");
    if (selectedItem?.requiresExpiryDate && !formData.expiryDate)
      return setError("La date d'expiration est obligatoire pour cet article.");
    if (
      selectedItem?.requiresSerialNumber &&
      serialNumbers.length !== formData.quantity
    ) {
      return setError(
        `Vous devez saisir exactement ${formData.quantity} numéro(s) de série.`,
      );
    }
    setError("");
    createMutation.mutate();
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData((f) => ({
      ...f,
      itemCode: item.itemCode,
      lotNumber: item.requiresLotNumber ? f.lotNumber : "",
      expiryDate: item.requiresExpiryDate ? f.expiryDate : "",
      assetSerialNumbersText: item.requiresSerialNumber
        ? f.assetSerialNumbersText
        : "",
    }));
    setItemSearch(item.name);
    setShowItemResults(false);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-2xl font-bold">Entrée de stock</h3>
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
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            {showItemResults && items.length > 0 && (
              <div className="relative">
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {items.map((item) => (
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
              </div>
            )}
            {selectedItem && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="text-base font-medium text-gray-900">
                  {selectedItem.name}
                </p>
                <p>Code : {selectedItem.itemCode}</p>
                <p>
                  Suivi : {selectedItem.trackingType}{" "}
                  {selectedItem.requiresLotNumber ? "· Lot obligatoire" : ""}{" "}
                  {selectedItem.requiresSerialNumber
                    ? "· Séries obligatoires"
                    : ""}
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
              onChange={(e) =>
                setFormData({ ...formData, locationCode: e.target.value })
              }
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base bg-white"
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Coût unitaire *
              </label>
              <input
                type="number"
                min={0}
                value={formData.unitCost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitCost: Number(e.target.value) || 0,
                  })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
          </div>

          {selectedItem?.requiresLotNumber && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Numéro de lot *
              </label>
              <input
                value={formData.lotNumber}
                onChange={(e) =>
                  setFormData({ ...formData, lotNumber: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                placeholder="LOT-2026-06"
              />
            </div>
          )}

          {selectedItem?.requiresExpiryDate && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Date d'expiration *
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
          )}

          {selectedItem?.requiresSerialNumber && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Numéros de série *
              </label>
              <textarea
                value={formData.assetSerialNumbersText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assetSerialNumbersText: e.target.value,
                  })
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                placeholder="Un numéro par ligne ou séparé par virgule"
              />
              <p className="text-sm text-gray-500 mt-1">
                {serialNumbers.length}/{formData.quantity} numéro(s) saisi(s)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              value={formData.referenceType}
              onChange={(e) =>
                setFormData({ ...formData, referenceType: e.target.value })
              }
              placeholder="Type de référence"
              className="px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
            <input
              value={formData.referenceCode}
              onChange={(e) =>
                setFormData({ ...formData, referenceCode: e.target.value })
              }
              placeholder="Code de référence"
              className="px-4 py-3 border border-gray-200 rounded-lg text-base"
            />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Motif / détail
            </label>
            <textarea
              value={formData.reasonDetails}
              onChange={(e) =>
                setFormData({ ...formData, reasonDetails: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              placeholder="Réception commande, retour, régularisation..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">
              {error}
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
                !formData.locationCode
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Package size={20} />
              )}{" "}
              Enregistrer l'entrée
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
