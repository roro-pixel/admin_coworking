import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Package, Search } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';
import type { InventoryItem } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface StockInFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockInForm: React.FC<StockInFormProps> = ({ isOpen, onClose }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: '',
    locationCode: '',
    quantity: 1,
    unitCost: 0,
    lotNumber: '',
    expiryDate: '',
    referenceType: '',
    referenceCode: '',
    reason: '',
  });
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemResults, setShowItemResults] = useState(false);

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items-search', itemSearch],
    queryFn: () => inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations-active'],
    queryFn: () => inventoryService.getLocations(true),
  });

  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.stockIn({
      itemCode: formData.itemCode,
      locationCode: formData.locationCode,
      quantity: formData.quantity,
      unitCost: formData.unitCost,
      lotNumber: formData.lotNumber || undefined,
      expiryDate: formData.expiryDate || undefined,
      referenceType: formData.referenceType || undefined,
      referenceCode: formData.referenceCode || undefined,
      reason: formData.reason,
      performedBy: admin?.email || 'admin',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      console.error('Inventory operation error:', err);
    },
  });

  const resetForm = () => {
    setFormData({
      itemCode: '',
      locationCode: '',
      quantity: 1,
      unitCost: 0,
      lotNumber: '',
      expiryDate: '',
      referenceType: '',
      referenceCode: '',
      reason: '',
    });
    setSelectedItem(null);
    setItemSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ ...formData, itemCode: item.itemCode });
    setItemSearch(item.name);
    setShowItemResults(false);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Entrée de stock</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article *</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemResults(true);
                }}
                placeholder="Rechercher un article..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {showItemResults && items.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {items.map((item: InventoryItem) => (
                  <button
                    key={item.itemCode}
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.itemCode}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedItem.name}</p>
                <p className="text-xs text-gray-500">Code: {selectedItem.itemCode}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement *</label>
            <select
              value={formData.locationCode}
              onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
  <input
    type="text"
    inputMode="numeric"
    value={formData.quantity === 0 ? '' : formData.quantity}
    onChange={(e) => {
      const val = e.target.value.replace(/\D/g, '');
      setFormData({ ...formData, quantity: val === '' ? 0 : parseInt(val) });
    }}
    required
    placeholder="1"
    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Coût unitaire *</label>
  <input
    type="text"
    inputMode="numeric"
    value={formData.unitCost === 0 ? '' : formData.unitCost}
    onChange={(e) => {
      const val = e.target.value.replace(/\D/g, '');
      setFormData({ ...formData, unitCost: val === '' ? 0 : parseInt(val) });
    }}
    required
    placeholder="0"
    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
  />
</div>

          {selectedItem?.requiresLotNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de lot</label>
              <input
                type="text"
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {selectedItem?.requiresExpiryDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Réception commande, retour, etc."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.itemCode || !formData.locationCode}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
              Valider l'entrée
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};