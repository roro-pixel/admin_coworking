import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Package, Search, AlertTriangle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, StockLevel, StockOutReasonCode } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface StockOutFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const reasonOptions: { value: StockOutReasonCode; label: string }[] = [
  { value: "CONSUMPTION", label: "Consommation normale" },
  { value: "DAMAGE", label: "Article endommagé" },
  { value: "LOSS", label: "Perte / introuvable" },
  { value: "INTERNAL_USE", label: "Usage interne" },
  { value: "SAMPLE", label: "Échantillon" },
  { value: "DONATION", label: "Don" },
  { value: "OTHER", label: "Autre" },
];

export const StockOutForm: React.FC<StockOutFormProps> = ({ isOpen, onClose }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: "",
    locationCode: "",
    quantity: 1,
    referenceType: "",
    referenceCode: "",
    reasonCode: "CONSUMPTION" as StockOutReasonCode,
    reasonDetails: "",
    allowNegativeOverride: false,
    lotNumber: "",
    serialNumbers: [] as string[],
  });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [showItemResults, setShowItemResults] = useState(false);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [error, setError] = useState("");
  const [lotNotFound, setLotNotFound] = useState(false);

  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-search", itemSearch],
    queryFn: () => inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations-active"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: stockLevelsData } = useQuery({
    queryKey: ["stock-levels-check", formData.itemCode, formData.locationCode],
    queryFn: () => inventoryService.getStockLevels({ itemCode: formData.itemCode, locationCode: formData.locationCode }),
    enabled: !!formData.itemCode && !!formData.locationCode,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ["item-lots", formData.itemCode, formData.locationCode],
    queryFn: () => inventoryService.getItemLots(formData.itemCode, { locationCode: formData.locationCode, activeOnly: true }),
    enabled: !!selectedItem?.requiresLotNumber && !!formData.itemCode && !!formData.locationCode,
  });

  const { data: serials = [] } = useQuery({
    queryKey: ["item-serials", formData.itemCode, formData.locationCode],
    queryFn: () => inventoryService.getItemSerials(formData.itemCode, { locationCode: formData.locationCode, status: "AVAILABLE" }),
    enabled: !!selectedItem?.requiresSerialNumber && !!formData.itemCode && !!formData.locationCode,
  });

  const items = itemsData?.content || [];
  const stockLevels = Array.isArray(stockLevelsData) ? stockLevelsData : stockLevelsData?.data || stockLevelsData?.content || [];
  const selectedSerialCount = formData.serialNumbers.length;

  const createMutation = useMutation({
    mutationFn: (confirmCreateLot?: boolean) =>
      inventoryService.stockOut({
        itemCode: formData.itemCode,
        locationCode: formData.locationCode,
        quantity: formData.quantity,
        reasonCode: formData.reasonCode,
        reasonDetails: formData.reasonDetails || undefined,
        referenceType: formData.referenceType || undefined,
        referenceCode: formData.referenceCode || undefined,
        allowNegativeOverride: formData.allowNegativeOverride,
        performedBy: admin?.email || "admin",
        lotNumber: formData.lotNumber || undefined,
        confirmCreateLot: !!confirmCreateLot,
        serialNumbers: selectedItem?.requiresSerialNumber ? formData.serialNumbers : undefined,
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
      setError(err?.response?.data?.message || "Erreur lors de la sortie de stock");
    },
  });

  const resetForm = () => {
    setFormData({ itemCode: "", locationCode: "", quantity: 1, referenceType: "", referenceCode: "", reasonCode: "CONSUMPTION", reasonDetails: "", allowNegativeOverride: false, lotNumber: "", serialNumbers: [] });
    setSelectedItem(null);
    setItemSearch("");
    setAvailableStock(0);
    setShowStockWarning(false);
    setError("");
    setLotNotFound(false);
  };

  const validate = () => {
    if (!formData.itemCode || !formData.locationCode) return "Article et emplacement sont obligatoires.";
    if (formData.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (formData.referenceType && !formData.referenceCode) return "Le code de référence est obligatoire quand le type de référence est renseigné.";
    if (formData.reasonCode === "OTHER" && !formData.reasonDetails.trim()) return "Le détail du motif est obligatoire pour le motif Autre.";
    if (selectedItem?.requiresLotNumber && !formData.lotNumber) return "Le lot est obligatoire pour cet article.";
    if (selectedItem?.requiresSerialNumber && selectedSerialCount !== formData.quantity) return `Sélectionnez exactement ${formData.quantity} numéro(s) de série.`;
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    if (!formData.allowNegativeOverride && formData.quantity > availableStock) {
      setShowStockWarning(true);
      return;
    }
    setError("");
    setLotNotFound(false);
    createMutation.mutate(false);
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData((f) => ({ ...f, itemCode: item.itemCode, lotNumber: "", serialNumbers: [] }));
    setItemSearch(item.name);
    setShowItemResults(false);
    setError("");
  };

  const updateLocation = (locationCode: string) => {
    setFormData((f) => ({ ...f, locationCode, lotNumber: "", serialNumbers: [] }));
    const level = stockLevels.find((l: StockLevel) => l.locationCode === locationCode);
    setAvailableStock(level?.quantityAvailable || 0);
    setShowStockWarning(false);
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
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-2xl font-bold">Sortie de stock</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Article *</label>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setShowItemResults(true); }} placeholder="Rechercher un article..." className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base" />
            </div>
            {showItemResults && items.length > 0 && (
              <div className="relative"><div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {items.map((item) => <button key={item.itemCode} type="button" onClick={() => selectItem(item)} className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b text-base"><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500">{item.itemCode}</p></button>)}
              </div></div>
            )}
            {selectedItem && <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600"><p className="text-base font-medium text-gray-900">{selectedItem.name}</p><p>{selectedItem.itemCode} · {selectedItem.trackingType}</p></div>}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Emplacement *</label>
            <select value={formData.locationCode} onChange={(e) => updateLocation(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base bg-white">
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>)}
            </select>
          </div>

          {formData.locationCode && <div className="p-3 bg-gray-50 rounded-lg text-center"><p className="text-base text-gray-600">Stock disponible : <span className="font-bold text-xl">{availableStock}</span> unités</p></div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Quantité à sortir *</label>
              <input type="number" min={1} value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })} required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Motif *</label>
              <select value={formData.reasonCode} onChange={(e) => setFormData({ ...formData, reasonCode: e.target.value as StockOutReasonCode })} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base bg-white">
                {reasonOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {selectedItem?.requiresLotNumber && formData.locationCode && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Lot *</label>
              <select value={formData.lotNumber} onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base bg-white">
                <option value="">Sélectionner un lot existant</option>
                {lots.map((lot) => <option key={lot.lotCode || lot.lotNumber} value={lot.lotNumber}>{lot.lotNumber} · dispo {lot.quantityAvailable}</option>)}
              </select>
              {lots.length === 0 && <p className="text-sm text-amber-600 mt-1">Aucun lot disponible pour cet article/emplacement. Le backend peut demander une création avec confirmation.</p>}
            </div>
          )}

          {selectedItem?.requiresSerialNumber && formData.locationCode && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Numéros de série disponibles *</label>
              <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                {serials.map((s) => (
                  <label key={s.serialNumber} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <input type="checkbox" checked={formData.serialNumbers.includes(s.serialNumber)} onChange={() => toggleSerial(s.serialNumber)} />
                    <span className="font-mono text-sm">{s.serialNumber}</span>
                    {s.lotNumber && <span className="text-xs text-gray-500">Lot {s.lotNumber}</span>}
                  </label>
                ))}
                {serials.length === 0 && <div className="px-4 py-3 text-sm text-gray-500">Aucun numéro disponible.</div>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedSerialCount}/{formData.quantity} sélectionné(s)</p>
            </div>
          )}

          {showStockWarning && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle size={18} /><span className="text-base">Stock insuffisant : {formData.quantity} demandé, {availableStock} disponible.</span></div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input value={formData.referenceType} onChange={(e) => setFormData({ ...formData, referenceType: e.target.value })} placeholder="Type de référence" className="px-4 py-3 border border-gray-200 rounded-lg text-base" />
            <input value={formData.referenceCode} onChange={(e) => setFormData({ ...formData, referenceCode: e.target.value })} placeholder="Code de référence" className="px-4 py-3 border border-gray-200 rounded-lg text-base" />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Détail du motif</label>
            <textarea value={formData.reasonDetails} onChange={(e) => setFormData({ ...formData, reasonDetails: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base" placeholder="Description complémentaire..." />
          </div>

          <label className="flex items-center gap-3"><input type="checkbox" checked={formData.allowNegativeOverride} onChange={(e) => setFormData({ ...formData, allowNegativeOverride: e.target.checked })} className="rounded w-5 h-5" /><span className="text-base">Autoriser la sortie même si stock insuffisant</span></label>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">{error}{lotNotFound && <div className="mt-3"><button type="button" onClick={() => createMutation.mutate(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg">Créer le lot et relancer</button></div>}</div>}

          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base">Annuler</button>
            <button type="submit" disabled={createMutation.isPending || !formData.itemCode || !formData.locationCode || formData.quantity <= 0} className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium">
              {createMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Package size={20} />} Sortir le stock
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
