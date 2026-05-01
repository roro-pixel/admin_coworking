import React, { useState, useEffect } from 'react';
import { useQuery, useMutation} from '@tanstack/react-query';
import { X, Save, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';

interface InventoryCountEntryProps {
  isOpen: boolean;
  onClose: () => void;
  count: any;
}

export const InventoryCountEntry: React.FC<InventoryCountEntryProps> = ({ isOpen, onClose, count }) => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: countDetail, refetch } = useQuery({
    queryKey: ['inventory-count-detail', count.countCode],
    queryFn: () => inventoryService.getInventoryCount(count.countCode),
    enabled: isOpen && !!count.countCode,
  });

  const saveLineMutation = useMutation({
    mutationFn: ({ itemCode, countedQuantity }: { itemCode: string; countedQuantity: number }) =>
      inventoryService.saveInventoryCountLine(count.countCode, itemCode, countedQuantity),
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (countDetail?.items) {
      setItems(countDetail.items);
    }
  }, [countDetail]);

  const handleQuantityChange = (itemCode: string, value: number) => {
    setItems(prev => prev.map(item =>
      item.itemCode === itemCode ? { ...item, countedQuantity: value } : item
    ));
  };

  const handleSaveLine = async (itemCode: string, countedQuantity: number) => {
    setSaving(true);
    await saveLineMutation.mutateAsync({ itemCode, countedQuantity });
    setSaving(false);
  };

  const filteredItems = items.filter(item =>
    item.itemName.toLowerCase().includes(search.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = items.filter(i => i.countedQuantity !== null && i.countedQuantity !== undefined).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Comptage physique - {count.countCode}</h3>
            <p className="text-sm text-gray-500">Emplacement: {count.locationName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Barre de progression */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>{completedCount} / {totalCount} articles</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Recherche */}
          <div className="relative mb-6">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          {/* Liste des articles à compter */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => {
              const variance = item.countedQuantity !== null && item.countedQuantity !== undefined
                ? item.countedQuantity - item.systemQuantity
                : null;
              const hasVariance = variance !== null && variance !== 0;
              
              return (
                <div key={item.itemCode} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-500">Code: {item.itemCode}</p>
                      <p className="text-sm text-gray-500">Stock système: {item.systemQuantity}</p>
                      {hasVariance && (
                        <p className={`text-sm font-medium ${variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Écart: {variance > 0 ? `+${variance}` : variance}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                      type="text"
                      inputMode="numeric"
                      value={item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : ''}
                      onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleQuantityChange(item.itemCode, val === '' ? 0 : parseInt(val));
                       }}
                      placeholder="Quantité comptée"
                      className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-center"
                      />
                      <button
                        onClick={() => handleSaveLine(item.itemCode, item.countedQuantity || 0)}
                        disabled={saving || item.countedQuantity === null || item.countedQuantity === undefined}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun article trouvé</p>
            </div>
          )}

          {/* Résumé des écarts */}
          {completedCount === totalCount && totalCount > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Tous les articles ont été comptés. Vous pouvez maintenant envoyer en revue.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};