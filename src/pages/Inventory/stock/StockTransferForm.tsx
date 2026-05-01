import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Search, ArrowRight, AlertTriangle } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';
import type { InventoryItem, StockLevel } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface StockTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockTransferForm: React.FC<StockTransferFormProps> = ({ isOpen, onClose }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    itemCode: '',
    locationFromCode: '',
    locationToCode: '',
    quantity: 1,
    reason: '',
  });
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [showItemResults, setShowItemResults] = useState(false);
  const [error, setError] = useState('');

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items-search', itemSearch],
    queryFn: () => inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations-active'],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: stockLevelsData } = useQuery({
    queryKey: ['stock-levels-check', formData.itemCode, formData.locationFromCode],
    queryFn: () => inventoryService.getStockLevels({
      itemCode: formData.itemCode,
      locationCode: formData.locationFromCode,
    }),
    enabled: !!formData.itemCode && !!formData.locationFromCode,
  });

  const items = itemsData?.content || [];  
  const stockLevels = Array.isArray(stockLevelsData) ? stockLevelsData : stockLevelsData?.data || stockLevelsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createStockTransferWorkflow({
      itemCode: formData.itemCode,
      locationFromCode: formData.locationFromCode,
      locationToCode: formData.locationToCode,
      quantity: formData.quantity,
      reason: formData.reason,
      requestedBy: admin?.email || 'admin',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erreur lors du transfert');
    },
  });

  const resetForm = () => {
    setFormData({
      itemCode: '',
      locationFromCode: '',
      locationToCode: '',
      quantity: 1,
      reason: '',
    });
    setSelectedItem(null);
    setItemSearch('');
    setAvailableStock(0);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity > availableStock) {
      setError(`Stock insuffisant! Disponible: ${availableStock}`);
      return;
    }
    if (formData.locationFromCode === formData.locationToCode) {
      setError('Les emplacements source et destination doivent être différents');
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

  const updateFromLocation = (locationCode: string) => {
    setFormData({ ...formData, locationFromCode: locationCode });
    const level = stockLevels.find((l: StockLevel) => l.locationCode === locationCode);
    setAvailableStock(level?.quantityAvailable || 0);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Transfert de stock</h3>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement source *</label>
            <select
              value={formData.locationFromCode}
              onChange={(e) => updateFromLocation(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
              ))}
            </select>
          </div>

          {formData.locationFromCode && (
            <div className="p-2 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                Stock disponible source: <span className="font-bold text-lg">{availableStock}</span>
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <ArrowRight size={24} className="text-gray-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement destination *</label>
            <select
              value={formData.locationToCode}
              onChange={(e) => setFormData({ ...formData, locationToCode: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Sélectionner</option>
              {locations
                .filter((loc: any) => loc.locationCode !== formData.locationFromCode)
                .map((loc: any) => (
                  <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité à transférer *</label>
            <input
  type="text"
  inputMode="numeric"
  value={formData.quantity === 0 ? '' : formData.quantity}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    const num = val === '' ? 0 : parseInt(val);
    setFormData({ ...formData, quantity: num > availableStock ? availableStock : num });
  }}
  required
  placeholder="1"
  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Raison du transfert..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.itemCode || !formData.locationFromCode || !formData.locationToCode || formData.quantity <= 0}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Transférer'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};