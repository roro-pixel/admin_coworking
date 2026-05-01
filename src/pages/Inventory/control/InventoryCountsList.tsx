import React, { useState} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Play, CheckCircle, XCircle, Search, X, Loader2, ClipboardList } from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { InventoryCountEntry } from './InventoryCountEntry';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: ClipboardList },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Play },
  UNDER_REVIEW: { label: 'En revue', color: 'bg-yellow-100 text-yellow-700', icon: Eye },
  VALIDATED: { label: 'Validé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const InventoryCountsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [showEntry, setShowEntry] = useState(false);
  const [formData, setFormData] = useState({
    locationCode: '',
    notes: '',
  });

  const { data: countsData, isLoading } = useQuery({
    queryKey: ['inventory-counts', statusFilter],
    queryFn: () => inventoryService.getInventoryCounts({ status: statusFilter || undefined, size: 100 }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(true),
  });

  const counts = countsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createInventoryCount({
      locationCode: formData.locationCode,
      createdBy: admin?.email || 'admin',
      notes: formData.notes,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      setIsModalOpen(false);
      setFormData({ locationCode: '', notes: '' });
      // Ouvrir la session de comptage
      setSelectedCount(data);
      setShowEntry(true);
    },
  });

  const startMutation = useMutation({
    mutationFn: (countCode: string) => inventoryService.startInventoryCount(countCode),
    onSuccess: (_, countCode) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      // Ouvrir la session de comptage
      const count = counts.find((c: any) => c.countCode === countCode);
      setSelectedCount(count);
      setShowEntry(true);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (countCode: string) => inventoryService.reviewInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (countCode: string) => inventoryService.validateInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (countCode: string) => inventoryService.cancelInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  const filteredCounts = counts.filter((count: any) =>
    count.countCode.toLowerCase().includes(search.toLowerCase()) ||
    count.locationName.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = () => {
    setFormData({ locationCode: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleViewEntry = (count: any) => {
    setSelectedCount(count);
    setShowEntry(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Comptages physiques</h2>
        <button
          onClick={handleOpenModal}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau comptage
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un comptage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="UNDER_REVIEW">En revue</option>
          <option value="VALIDATED">Validés</option>
          <option value="CANCELLED">Annulés</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Emplacement</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Créé par</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCounts.map((count: any) => {
              const status = statusConfig[count.status];
              const StatusIcon = status?.icon;
              return (
                <tr key={count.countCode} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{count.countCode}</td>
                  <td className="px-6 py-4 text-sm">{count.locationName}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status?.color}`}>
                      {StatusIcon && <StatusIcon size={12} />}
                      {status?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{count.createdBy}</td>
                  <td className="px-6 py-4 text-sm">{new Date(count.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {count.status === 'DRAFT' && (
                        <button
                          onClick={() => startMutation.mutate(count.countCode)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Démarrer"
                        >
                          <Play size={18} />
                        </button>
                      )}
                      {count.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleViewEntry(count)}
                          className="p-1 text-primary-600 hover:text-primary-800"
                          title="Saisir"
                        >
                          <ClipboardList size={18} />
                        </button>
                      )}
                      {count.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => reviewMutation.mutate(count.countCode)}
                          className="p-1 text-yellow-600 hover:text-yellow-800"
                          title="Envoyer en revue"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {count.status === 'UNDER_REVIEW' && (
                        <button
                          onClick={() => validateMutation.mutate(count.countCode)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {(count.status === 'DRAFT' || count.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => cancelMutation.mutate(count.countCode)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Annuler"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCounts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun comptage trouvé</p>
        </div>
      )}

      {/* Modal de création */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold">Nouveau comptage physique</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement *</label>
                <select
                  value={formData.locationCode}
                  onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Sélectionner</option>
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                  Annuler
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!formData.locationCode || createMutation.isPending}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
                </button>
              </div>
            </div>
        </ModalPortal>
      )}

      {/* Écran de saisie */}
      {showEntry && selectedCount && (
        <InventoryCountEntry
          isOpen={showEntry}
          onClose={() => {
            setShowEntry(false);
            setSelectedCount(null);
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
          }}
          count={selectedCount}
        />
      )}
    </div>
  );
};