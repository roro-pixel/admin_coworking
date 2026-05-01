import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourcePolicyResponse } from '../../../services/resource.service';
import { ResourcePolicyFormModal } from './ResourcePolicyFormModal';

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export const ResourcePoliciesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ResourcePolicyResponse | null>(null);

  // CORRECTION : size: 500 (faible volume, pas de pagination nécessaire)
  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['resource-policies'],
    queryFn: () => resourceService.getResourcePolicies({ size: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResourcePolicy(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
      queryClient.invalidateQueries({ queryKey: ['resource-policies-list'] });
    },
    onError: () => alert('Erreur lors de la suppression. Cette politique est peut-être utilisée par des ressources.'),
  });

  // updateResourcePolicyStatus : toggle actif/inactif sans supprimer
  const toggleStatusMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      resourceService.updateResourcePolicyStatus(code, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
      queryClient.invalidateQueries({ queryKey: ['resource-policies-list'] });
    },
    onError: () => alert('Erreur lors de la mise à jour du statut.'),
  });

  // updateResourcePolicyAllowCancellation : toggle annulation
  const toggleCancellationMutation = useMutation({
    mutationFn: ({ code, allowCancellation }: { code: string; allowCancellation: boolean }) =>
      resourceService.updateResourcePolicyAllowCancellation(code, allowCancellation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
      queryClient.invalidateQueries({ queryKey: ['resource-policies-list'] });
    },
    onError: () => alert('Erreur lors de la mise à jour de l autorisation d annulation.'),
  });

  const policies: ResourcePolicyResponse[] = policiesData?.content || [];

  const filteredPolicies = search
    ? policies.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      )
    : policies;

  const handleDelete = (code: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette politique ?')) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Politiques de réservation</h2>
        <button
          onClick={() => {
            setEditingPolicy(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle politique
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
              <th className="px-6 py-3 text-center text-sm font-semibold">Durée min</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Durée max</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Délai résa</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Annulation</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPolicies.map((policy) => (
              <tr key={policy.code} className={`hover:bg-gray-50 ${!policy.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-sm font-mono">{policy.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{policy.name}</td>
                <td className="px-6 py-4 text-center text-sm">{formatDuration(policy.minBookingDurationMinutes)}</td>
                <td className="px-6 py-4 text-center text-sm">{formatDuration(policy.maxBookingDurationMinutes)}</td>
                <td className="px-6 py-4 text-center text-sm">{formatDuration(policy.minBookingNoticeMinutes)}</td>
                <td className="px-6 py-4 text-center">
                  {/* Toggle annulation rapide */}
                  <button
                    onClick={() => toggleCancellationMutation.mutate({ code: policy.code, allowCancellation: !policy.allowCancellation })}
                    disabled={toggleCancellationMutation.isPending}
                    className={`text-xs px-2 py-1 rounded-full cursor-pointer disabled:opacity-40 ${
                      policy.allowCancellation ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    title={policy.allowCancellation ? "Désactiver l'annulation" : "Autoriser l'annulation"}
                  >
                    {policy.allowCancellation
                      ? (policy.cancellationNoticeMinutes ? formatDuration(policy.cancellationNoticeMinutes) : 'Oui')
                      : 'Non'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  {/* Toggle actif/inactif rapide sans supprimer */}
                  <button
                    onClick={() => toggleStatusMutation.mutate({ code: policy.code, active: !policy.active })}
                    disabled={toggleStatusMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${
                      policy.active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={policy.active ? 'Désactiver' : 'Activer'}
                  >
                    {policy.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingPolicy(policy); setIsModalOpen(true); }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.code)}
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

      {filteredPolicies.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune politique trouvée</p>
        </div>
      )}

      <ResourcePolicyFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingPolicy(null); }}
        editingPolicy={editingPolicy}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
          setIsModalOpen(false);
          setEditingPolicy(null);
        }}
      />
    </div>
  );
};