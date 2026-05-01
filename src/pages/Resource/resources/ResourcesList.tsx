import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Eye, Power, EyeOff, Building2, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourceResponse, ResourceTypeResponse, ResourceGroupResponse } from '../../../services/resource.service';
import { ResourceFormModal } from './ResourceFormModal';
import { ResourceDetailModal } from './ResourceDetailModal';

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
  OUT_OF_SERVICE: { label: 'Hors service', color: 'bg-red-100 text-red-700' },
  ARCHIVED: { label: 'Archivé', color: 'bg-gray-100 text-gray-500' },
};

const PAGE_SIZE = 20;

export const ResourcesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceResponse | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceResponse | null>(null);

  // CORRECTION : changement de filtre remet à la page 0
  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['resources', page, typeFilter, groupFilter, statusFilter],
    queryFn: () => resourceService.getResources({
      typeCode: typeFilter || undefined,
      groupCode: groupFilter || undefined,
      status: statusFilter || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  const { data: typesData } = useQuery({
    queryKey: ['resource-types-list'],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['resource-groups-list'],
    queryFn: () => resourceService.getResourceGroups({ size: 500 }),
  });

  const resources: ResourceResponse[] = resourcesData?.content || [];
  const types: ResourceTypeResponse[] = typesData?.content || [];
  const groups: ResourceGroupResponse[] = groupsData?.content || [];
  const totalPages = resourcesData?.totalPages ?? 0;
  const totalElements = resourcesData?.totalElements ?? 0;

  // Filtre client-side sur la page courante (pas d'endpoint search par nom dans getResources)
  const filteredResources = search
    ? resources.filter(res =>
        res.name.toLowerCase().includes(search.toLowerCase()) ||
        res.code.toLowerCase().includes(search.toLowerCase())
      )
    : resources;

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResource(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
    onError: () => alert('Erreur lors de la suppression de la ressource.'),
  });

  const updateBookingEnabledMutation = useMutation({
    mutationFn: ({ code, bookingEnabled }: { code: string; bookingEnabled: boolean }) =>
      resourceService.updateResourceBookingEnabled(code, bookingEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
    onError: () => alert('Erreur lors de la mise à jour de la réservabilité.'),
  });

  const updatePortalVisibleMutation = useMutation({
    mutationFn: ({ code, portalVisible }: { code: string; portalVisible: boolean }) =>
      resourceService.updateResourcePortalVisible(code, portalVisible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
    onError: () => alert('Erreur lors de la mise à jour de la visibilité.'),
  });

  const updateActiveMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      resourceService.updateResourceActive(code, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
    onError: () => alert('Erreur lors de la mise à jour du statut actif.'),
  });

  const updateDisplayOrderMutation = useMutation({
    mutationFn: ({ code, displayOrder }: { code: string; displayOrder: number }) =>
      resourceService.updateResourceDisplayOrder(code, displayOrder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
    onError: () => alert('Erreur lors de la mise à jour de l ordre d affichage.'),
  });

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      deleteMutation.mutate(code);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setGroupFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const hasActiveFilters = search || typeFilter || groupFilter || statusFilter;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Ressources</h2>
        <button
          onClick={() => {
            setEditingResource(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle ressource
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les types</option>
          {types.map((type) => (
            <option key={type.code} value={type.code}>{type.name}</option>
          ))}
        </select>
        <select
          value={groupFilter}
          onChange={(e) => handleFilterChange(setGroupFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les groupes</option>
          {groups.map((group) => (
            <option key={group.code} value={group.code}>{group.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OUT_OF_SERVICE">Hors service</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Groupe</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Capacité</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Réservable</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Visible</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Ordre</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredResources.map((resource) => (
              <tr key={resource.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{resource.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{resource.name}</td>
                <td className="px-6 py-4 text-sm">{resource.typeCode}</td>
                <td className="px-6 py-4 text-sm">{resource.groupCode || '—'}</td>
                <td className="px-6 py-4 text-center text-sm">{resource.capacity}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[resource.status]?.color}`}>
                    {statusConfig[resource.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updateBookingEnabledMutation.mutate({
                      code: resource.code,
                      bookingEnabled: !resource.bookingEnabled,
                    })}
                    disabled={updateBookingEnabledMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${
                      resource.bookingEnabled
                        ? 'text-green-600 hover:text-green-800'
                        : 'text-red-600 hover:text-red-800'
                    }`}
                    title={resource.bookingEnabled ? 'Désactiver la réservation' : 'Activer la réservation'}
                  >
                    <Power size={16} />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updatePortalVisibleMutation.mutate({
                      code: resource.code,
                      portalVisible: !resource.portalVisible,
                    })}
                    disabled={updatePortalVisibleMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${
                      resource.portalVisible
                        ? 'text-blue-600 hover:text-blue-800'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={resource.portalVisible ? 'Masquer du portail' : 'Afficher sur le portail'}
                  >
                    {resource.portalVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updateActiveMutation.mutate({ code: resource.code, active: !resource.active })}
                    disabled={updateActiveMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${resource.active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                    title={resource.active ? 'Désactiver' : 'Activer'}
                  >
                    {resource.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs text-gray-500 w-6 text-right">{resource.displayOrder}</span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => updateDisplayOrderMutation.mutate({ code: resource.code, displayOrder: resource.displayOrder - 1 })}
                        disabled={updateDisplayOrderMutation.isPending || resource.displayOrder <= 0}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Monter"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => updateDisplayOrderMutation.mutate({ code: resource.code, displayOrder: resource.displayOrder + 1 })}
                        disabled={updateDisplayOrderMutation.isPending}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Descendre"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setSelectedResource(resource); setIsDetailOpen(true); }}
                      className="p-1 text-gray-600 hover:text-primary-600"
                      title="Voir détail"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => { setEditingResource(resource); setIsModalOpen(true); }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.code)}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
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

      {filteredResources.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune ressource trouvée</p>
          {hasActiveFilters && (
            <button onClick={handleResetFilters} className="mt-2 text-primary-600 hover:underline text-sm">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} ressource{totalElements > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <ResourceFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingResource(null); }}
        editingResource={editingResource}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['resources'] });
          setIsModalOpen(false);
          setEditingResource(null);
        }}
      />

      {selectedResource && (
        <ResourceDetailModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedResource(null); }}
          resource={selectedResource}
        />
      )}
    </div>
  );
};