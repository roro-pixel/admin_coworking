import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Eye, Power, Package, X, CheckCircle, XCircle } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';
import type { InventoryItem, InventoryCategory, InventoryUnit } from '../../../services/inventory.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

const itemTypes = [
  { value: 'CONSUMABLE', label: 'Consommable' },
  { value: 'ASSET', label: 'Actif' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'SPARE_PART', label: 'Pièce détachée' },
];

const trackingTypes = [
  { value: 'NONE', label: 'Aucun' },
  { value: 'LOT', label: 'Par lot' },
  { value: 'SERIAL', label: 'Par numéro de série' },
];

export const ItemsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specification: '',
    displayCode: '',
    identificationCode: '',
    shortCode: '',
    psku: '',
    categoryCode: '',
    unitCode: '',
    itemType: 'CONSUMABLE' as InventoryItem['itemType'],
    trackingType: 'NONE' as InventoryItem['trackingType'],
    defaultCost: 0,
    salePrice: 0,
    taxable: true,
    allowNegativeStock: false,
    requiresExpiryDate: false,
    requiresLotNumber: false,
    requiresSerialNumber: false,
    active: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['inventory-units'],
    queryFn: () => inventoryService.getUnits(),
  });

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: () => inventoryService.getItems({ query: search || undefined, size: 100 }),
  });

  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateItem(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteItem(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.activateItem(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deactivateItem(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        specification: item.specification || '',
        displayCode: item.displayCode || '',
        identificationCode: item.identificationCode || '',
        shortCode: item.shortCode || '',
        psku: item.psku || '',
        categoryCode: item.categoryCode || '',
        unitCode: item.unitCode || '',
        itemType: item.itemType,
        trackingType: item.trackingType,
        defaultCost: item.defaultCost,
        salePrice: item.salePrice || 0,
        taxable: item.taxable,
        allowNegativeStock: item.allowNegativeStock,
        requiresExpiryDate: item.requiresExpiryDate,
        requiresLotNumber: item.requiresLotNumber,
        requiresSerialNumber: item.requiresSerialNumber,
        active: item.active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        specification: '',
        displayCode: '',
        identificationCode: '',
        shortCode: '',
        psku: '',
        categoryCode: '',
        unitCode: '',
        itemType: 'CONSUMABLE',
        trackingType: 'NONE',
        defaultCost: 0,
        salePrice: 0,
        taxable: true,
        allowNegativeStock: false,
        requiresExpiryDate: false,
        requiresLotNumber: false,
        requiresSerialNumber: false,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleViewDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      name: formData.name,
      description: formData.description || undefined,
      specification: formData.specification || undefined,
      categoryCode: formData.categoryCode,
      unitCode: formData.unitCode,
      itemType: formData.itemType,
      trackingType: formData.trackingType,
      defaultCost: formData.defaultCost,
      salePrice: formData.salePrice,
      taxable: formData.taxable,
      allowNegativeStock: formData.allowNegativeStock,
      requiresExpiryDate: formData.requiresExpiryDate,
      requiresLotNumber: formData.requiresLotNumber,
      requiresSerialNumber: formData.requiresSerialNumber,
      active: formData.active,
    };
    
    if (editingItem) {
      updateMutation.mutate({ code: editingItem.itemCode, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleToggleActive = (item: InventoryItem) => {
    if (item.active) {
      deactivateMutation.mutate(item.itemCode);
    } else {
      activateMutation.mutate(item.itemCode);
    }
  };

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Articles</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvel article
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Catégorie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Unité</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Prix</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.itemCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{item.itemCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm">{item.categoryName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{itemTypes.find(t => t.value === item.itemType)?.label}</td>
                  <td className="px-4 py-3 text-sm">{item.unitName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.defaultCost.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleViewDetail(item)} className="p-1 text-gray-600 hover:text-primary-600 mr-1" title="Voir">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-600 hover:text-blue-800 mr-1" title="Modifier">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleToggleActive(item)} className="p-1 text-yellow-600 hover:text-yellow-800 mr-1" title={item.active ? 'Désactiver' : 'Activer'}>
                      <Power size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.itemCode)} className="p-1 text-red-600 hover:text-red-800" title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun article trouvé</p>
        </div>
      )}

      {/* ========== MODAL CRÉATION/ÉDITION ========== */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">{editingItem ? "Modifier l'article" : 'Nouvel article'}</h3>
            <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code affiché</label>
                <input
                  type="text"
                  value={formData.displayCode}
                  onChange={(e) => setFormData({ ...formData, displayCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Généré automatiquement"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spécification</label>
              <textarea
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code identification</label>
                <input
                  type="text"
                  value={formData.identificationCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Généré automatiquement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code court</label>
                <input
                  type="text"
                  value={formData.shortCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Généré automatiquement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU (PSKU)</label>
                <input
                  type="text"
                  value={formData.psku}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Généré automatiquement"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                <select
                  value={formData.categoryCode}
                  onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner</option>
                  {categories.map((cat: InventoryCategory) => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unité *</label>
                <select
                  value={formData.unitCode}
                  onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner</option>
                  {units.map((unit: InventoryUnit) => (
                    <option key={unit.code} value={unit.code}>{unit.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'article *</label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {itemTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de suivi</label>
                <select
                  value={formData.trackingType}
                  onChange={(e) => setFormData({ ...formData, trackingType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {trackingTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix par défaut (FCFA)</label>
                <input
                  type="text"
                  value={formData.defaultCost === 0 ? '' : formData.defaultCost}                  
                  inputMode="numeric"
                  onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, defaultCost: val === '' ? 0 : parseInt(val) });
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (FCFA)</label>
                <input
                  type="text"
                  value={formData.salePrice === 0 ? '' : formData.salePrice}                  
                  inputMode="numeric"
                  onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, salePrice: val === '' ? 0 : parseInt(val) });
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.taxable}
                  onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Taxable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowNegativeStock}
                  onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Autoriser stock négatif</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresExpiryDate}
                  onChange={(e) => setFormData({ ...formData, requiresExpiryDate: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Requiert date d'expiration</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresLotNumber}
                  onChange={(e) => setFormData({ ...formData, requiresLotNumber: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Requiert numéro de lot</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresSerialNumber}
                  onChange={(e) => setFormData({ ...formData, requiresSerialNumber: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Requiert numéro de série</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {editingItem ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}

      {/* ========== MODAL DÉTAIL ========== */}
      {isDetailOpen && selectedItem && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{selectedItem.name}</h3>
              <p className="text-sm text-gray-500 font-mono">{selectedItem.itemCode}</p>
            </div>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {/* Codes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Codes d'identification</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Code affiché</p>
                  <p className="font-mono text-sm">{selectedItem.displayCode || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Code identification</p>
                  <p className="font-mono text-sm">{selectedItem.identificationCode || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Code court</p>
                  <p className="font-mono text-sm">{selectedItem.shortCode || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">SKU (PSKU)</p>
                  <p className="font-mono text-sm">{selectedItem.psku || '-'}</p>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Classification</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Catégorie</p>
                  <p className="font-medium text-sm">{selectedItem.categoryName || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium text-sm">{itemTypes.find(t => t.value === selectedItem.itemType)?.label}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Unité</p>
                  <p className="font-medium text-sm">{selectedItem.unitName || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Type de suivi</p>
                  <p className="font-medium text-sm">{trackingTypes.find(t => t.value === selectedItem.trackingType)?.label}</p>
                </div>
              </div>
            </div>

            {/* Tarification */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tarification</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Prix par défaut</p>
                  <p className="font-bold text-sm">{selectedItem.defaultCost.toLocaleString()} FCFA</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Prix de vente</p>
                  <p className="font-bold text-sm">{(selectedItem.salePrice ?? 0).toLocaleString()} FCFA</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Taxable</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedItem.taxable ? (
                      <><CheckCircle size={14} className="text-green-600" /> Oui</>
                    ) : (
                      <><XCircle size={14} className="text-gray-400" /> Non</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Paramètres de stock */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Paramètres de stock</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Stock négatif autorisé</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedItem.allowNegativeStock ? (
                      <><CheckCircle size={14} className="text-amber-600" /> Oui</>
                    ) : (
                      <><XCircle size={14} className="text-gray-400" /> Non</>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Statut</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${selectedItem.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedItem.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Requiert expiration</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedItem.requiresExpiryDate ? (
                      <><CheckCircle size={14} className="text-amber-600" /> Oui</>
                    ) : (
                      <><XCircle size={14} className="text-gray-400" /> Non</>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Requiert n° lot</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedItem.requiresLotNumber ? (
                      <><CheckCircle size={14} className="text-amber-600" /> Oui</>
                    ) : (
                      <><XCircle size={14} className="text-gray-400" /> Non</>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Requiert n° série</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedItem.requiresSerialNumber ? (
                      <><CheckCircle size={14} className="text-amber-600" /> Oui</>
                    ) : (
                      <><XCircle size={14} className="text-gray-400" /> Non</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Description / Spécification */}
            {(selectedItem.description || selectedItem.specification) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Informations complémentaires</h4>
                <div className="space-y-2">
                  {selectedItem.description && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <p className="text-sm">{selectedItem.description}</p>
                    </div>
                  )}
                  {selectedItem.specification && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Spécification</p>
                      <p className="text-sm">{selectedItem.specification}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};