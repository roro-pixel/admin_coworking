import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Power, X } from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService } from '../../../services/inventory.service';
import type { InventoryLocation } from '../../../services/inventory.service';

const locationTypes = [
  { value: 'WAREHOUSE', label: 'Entrepôt' },
  { value: 'OFFICE', label: 'Bureau' },
  { value: 'ROOM', label: 'Salle' },
  { value: 'ZONE', label: 'Zone' },
  { value: 'VIRTUAL', label: 'Virtuel' },
];

export const LocationsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [formData, setFormData] = useState({
    locationCode: '',
    name: '',
    locationType: 'WAREHOUSE' as InventoryLocation['locationType'],
    description: '',
    active: true,
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateLocation(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.activateLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deactivateLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
    },
  });

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    loc.locationCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (location?: InventoryLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        locationCode: location.locationCode,
        name: location.name,
        locationType: location.locationType,
        description: location.description || '',
        active: location.active,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        locationCode: '',
        name: '',
        locationType: 'WAREHOUSE',
        description: '',
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ code: editingLocation.locationCode, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (location: InventoryLocation) => {
    if (location.active) {
      deactivateMutation.mutate(location.locationCode);
    } else {
      activateMutation.mutate(location.locationCode);
    }
  };

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet emplacement ?')) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Emplacements</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvel emplacement
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un emplacement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLocations.map((loc) => (
              <tr key={loc.locationCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{loc.locationCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{loc.name}</td>
                <td className="px-6 py-4 text-sm">{locationTypes.find(t => t.value === loc.locationType)?.label}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{loc.description || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${loc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {loc.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenModal(loc)} className="p-1 text-blue-600 hover:text-blue-800 mr-1">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleToggleActive(loc)} className="p-1 text-yellow-600 hover:text-yellow-800 mr-1">
                    <Power size={16} />
                  </button>
                  <button onClick={() => handleDelete(loc.locationCode)} className="p-1 text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucun emplacement trouvé</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal}>
          <div className="relative bg-white rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingLocation ? 'Modifier l\'emplacement' : 'Nouvel emplacement'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.locationCode}
                  onChange={(e) => setFormData({ ...formData, locationCode: e.target.value.toUpperCase() })}
                  disabled={!!editingLocation}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  placeholder="ex: ENTREPOT-A"
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {locationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Actif</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {editingLocation ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
            </div>
        </ModalPortal>
      )}
    </div>
  );
};