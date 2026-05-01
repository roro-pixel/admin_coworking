import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, X, Loader2, Calendar, Power } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourceResponse, ResourceClosureResponse } from '../../../services/resource.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

const buildDefaultFormData = (resourceCode: string = '') => ({
  resourceCode,
  startedAt: '',
  endedAt: '',
  reason: '',
  active: true,
});

export const ResourceClosuresList: React.FC = () => {
  const queryClient = useQueryClient();

  // resourceFilter : select API
  const [resourceFilter, setResourceFilter] = useState('');
  // search : filtre client-side sur resourceCode (doublon du select mais utile si filtre vide)
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData());

  // CORRECTION : resynchronisation du formData à chaque ouverture du modal
  useEffect(() => {
    if (isModalOpen) {
      setFormData(buildDefaultFormData(resourceFilter));
      setErrorMessage(null);
    }
  }, [isModalOpen, resourceFilter]);

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-list-closures'],
    queryFn: () => resourceService.getResources({ size: 500 }),
  });

  const { data: closuresData, isLoading } = useQuery({
    queryKey: ['resource-closures', resourceFilter],
    queryFn: () => resourceService.getResourceClosures(resourceFilter || undefined, { size: 200 }),
  });

  const resources: ResourceResponse[] = resourcesData?.content || [];
  const closures: ResourceClosureResponse[] = closuresData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => resourceService.createResourceClosure({
      resourceCode: formData.resourceCode,
      startedAt: formData.startedAt,
      endedAt: formData.endedAt,
      reason: formData.reason || undefined,
      active: formData.active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-closures'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création de la fermeture.');
    },
  });

  const updateActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      resourceService.updateResourceClosureActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-closures'] }),
    onError: () => alert('Erreur lors de la mise à jour du statut.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceService.deleteResourceClosure(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-closures'] }),
    onError: () => alert('Erreur lors de la suppression de la fermeture.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // CORRECTION : validation endedAt > startedAt
    if (new Date(formData.endedAt) <= new Date(formData.startedAt)) {
      setErrorMessage('La date de fin doit être postérieure à la date de début.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette fermeture ?')) {
      deleteMutation.mutate(id);
    }
  };

  // Filtre client-side sur resourceCode (utile quand resourceFilter est vide)
  const filteredClosures = search
    ? closures.filter(c => c.resourceCode.toLowerCase().includes(search.toLowerCase()))
    : closures;

  // Nom de ressource depuis le code pour affichage
  const getResourceName = (code: string) =>
    resources.find(r => r.code === code)?.name || code;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Fermetures de ressources</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle fermeture
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Select API — filtre les fermetures par ressource côté serveur */}
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white w-full md:w-64"
        >
          <option value="">Toutes les ressources</option>
          {resources.map((res) => (
            <option key={res.code} value={res.code}>{res.name}</option>
          ))}
        </select>
        {/* Recherche client-side si filtre API vide */}
        {!resourceFilter && (
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrer par code ressource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}
        {(resourceFilter || search) && (
          <button
            onClick={() => { setResourceFilter(''); setSearch(''); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ressource</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Début</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Fin</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredClosures.map((closure) => (
              <tr key={closure.id} className={`hover:bg-gray-50 ${!closure.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-sm text-gray-500">{closure.id}</td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-medium">{getResourceName(closure.resourceCode)}</p>
                  <p className="text-xs text-gray-400 font-mono">{closure.resourceCode}</p>
                </td>
                <td className="px-6 py-4 text-sm">{new Date(closure.startedAt).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 text-sm">{new Date(closure.endedAt).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updateActiveMutation.mutate({ id: closure.id, active: !closure.active })}
                    disabled={updateActiveMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${
                      closure.active
                        ? 'text-green-600 hover:text-green-800'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={closure.active ? 'Désactiver' : 'Activer'}
                  >
                    <Power size={16} />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(closure.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredClosures.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune fermeture trouvée</p>
        </div>
      )}

      {/* Modal de création — CORRECTION : ModalPortal au lieu du fixed interne */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Nouvelle fermeture</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ressource *</label>
              <select
                value={formData.resourceCode}
                onChange={(e) => setFormData({ ...formData, resourceCode: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Sélectionner une ressource</option>
                {resources.map((res) => (
                  <option key={res.code} value={res.code}>{res.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                <input
                  type="datetime-local"
                  value={formData.startedAt}
                  onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
                <input
                  type="datetime-local"
                  value={formData.endedAt}
                  min={formData.startedAt}
                  onChange={(e) => setFormData({ ...formData, endedAt: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            {/* CORRECTION : champ reason exposé dans l'UI (était dans formData mais absent du formulaire) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="ex: Maintenance, Événement exceptionnel..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Actif immédiatement</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !formData.resourceCode}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : 'Créer'}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};