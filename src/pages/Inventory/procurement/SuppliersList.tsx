import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Eye, X, Loader2, BarChart3 } from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService } from '../../../services/inventory.service';
import type { Supplier } from '../../../services/inventory.service';

const statusOptions = [
  { value: 'ACTIVE', label: 'Actif', color: 'bg-green-100 text-green-700' },
  { value: 'INACTIVE', label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
  { value: 'BLACKLISTED', label: 'Blacklisté', color: 'bg-red-100 text-red-700' },
];

export const SuppliersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    status: 'ACTIVE' as Supplier['status'],
  });

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', statusFilter],
    queryFn: () => inventoryService.getSuppliers({ status: statusFilter || undefined, size: 100 }),
  });

  const suppliers = suppliersData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createSupplier(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => inventoryService.updateSupplier(editingSupplier!.code, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteSupplier(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const filteredSuppliers = suppliers.filter((sup: Supplier) =>
    sup.name.toLowerCase().includes(search.toLowerCase()) ||
    (sup.email && sup.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        taxId: supplier.taxId || '',
        address: supplier.address || '',
        status: supplier.status,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        taxId: '',
        address: '',
        status: 'ACTIVE',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      deleteMutation.mutate(code);
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
  };

  const handleViewPerformance = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowPerformance(true);
    setPerformanceData(null);
    try {
      const data = await inventoryService.getSupplierPerformance(supplier.code);
      setPerformanceData(data);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Fournisseurs</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau fournisseur
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Téléphone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSuppliers.map((sup: Supplier) => (
              <tr key={sup.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{sup.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{sup.name}</td>
                <td className="px-6 py-4 text-sm">{sup.email || '-'}</td>
                <td className="px-6 py-4 text-sm">{sup.phone || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusOptions.find(o => o.value === sup.status)?.color}`}>
                    {statusOptions.find(o => o.value === sup.status)?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleViewDetail(sup)}
                      className="p-1 text-gray-600 hover:text-primary-600"
                      title="Voir détail"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleViewPerformance(sup)}
                      className="p-1 text-purple-600 hover:text-purple-800"
                      title="Performance"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(sup)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(sup.code)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucun fournisseur trouvé</p>
        </div>
      )}

      {/* ========== MODAL DÉTAIL FOURNISSEUR ========== */}
      {isDetailOpen && selectedSupplier && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{selectedSupplier.name}</h3>
              <p className="text-sm text-gray-500 font-mono">{selectedSupplier.code}</p>
            </div>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <span className={`px-2 py-1 rounded-full text-xs ${statusOptions.find(o => o.value === selectedSupplier.status)?.color}`}>
                  {statusOptions.find(o => o.value === selectedSupplier.status)?.label}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{selectedSupplier.email || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="text-sm">{selectedSupplier.phone || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">N° Fiscal</p>
                <p className="text-sm font-mono">{selectedSupplier.taxId || '-'}</p>
              </div>
            </div>
            {selectedSupplier.address && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Adresse</p>
                <p className="text-sm">{selectedSupplier.address}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  handleViewPerformance(selectedSupplier);
                }}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <BarChart3 size={16} /> Voir performance
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL PERFORMANCE ========== */}
      {showPerformance && selectedSupplier && (
        <ModalPortal onClose={() => setShowPerformance(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Performance - {selectedSupplier.name}</h3>
            <button onClick={() => setShowPerformance(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-3">
            {!performanceData ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Commandes totales</p>
                  <p className="text-xl font-bold">{performanceData.totalOrders}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Taux livraison à temps</p>
                  <p className="text-xl font-bold">{(performanceData.onTimeDeliveryRate * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Taux acceptation qualité</p>
                  <p className="text-xl font-bold">{(performanceData.qualityAcceptanceRate * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Délai moyen (jours)</p>
                  <p className="text-xl font-bold">{performanceData.averageDeliveryDelayDays}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Commandes complétées</p>
                  <p className="text-xl font-bold">{performanceData.completedOrders}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Coût unitaire moyen</p>
                  <p className="text-xl font-bold">{performanceData.averageUnitCost?.toLocaleString()} FCFA</p>
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL CRÉATION/ÉDITION FOURNISSEUR ========== */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">{editingSupplier ? 'Modifier' : 'Nouveau'} fournisseur</h3>
            <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro fiscal</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  editingSupplier ? 'Mettre à jour' : 'Créer'
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};