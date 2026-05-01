import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourceGroupResponse } from '../../../services/resource.service';
import { ResourceGroupFormModal } from './ResourceGroupFormModal';

export const ResourceGroupsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ResourceGroupResponse | null>(null);

  // CORRECTION : size: 500 (faible volume, pas de pagination nécessaire)
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['resource-groups'],
    queryFn: () => resourceService.getResourceGroups({ size: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResourceGroup(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-groups'] });
      queryClient.invalidateQueries({ queryKey: ['resource-groups-list'] });
    },
    onError: () => alert('Erreur lors de la suppression. Ce groupe est peut-être utilisé par des ressources.'),
  });

  const groups: ResourceGroupResponse[] = groupsData?.content || [];

  const filteredGroups = search
    ? groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.code.toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Groupes de ressources</h2>
        <button
          onClick={() => {
            setEditingGroup(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau groupe
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom ou code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Portail</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredGroups.map((group) => (
              <tr key={group.code} className={`hover:bg-gray-50 ${!group.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-sm font-mono">{group.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{group.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{group.description || '—'}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    group.portalVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {group.portalVisible ? 'Visible' : 'Masqué'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    group.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {group.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingGroup(group); setIsModalOpen(true); }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(group.code)}
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

      {filteredGroups.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun groupe trouvé</p>
        </div>
      )}

      <ResourceGroupFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingGroup(null); }}
        editingGroup={editingGroup}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['resource-groups'] });
          setIsModalOpen(false);
          setEditingGroup(null);
        }}
      />
    </div>
  );
};