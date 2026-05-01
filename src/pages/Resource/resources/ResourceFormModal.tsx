import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourceResponse, ResourceTypeResponse, ResourceGroupResponse, ResourcePolicyResponse } from '../../../services/resource.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingResource: ResourceResponse | null;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Hors service' },
  { value: 'ARCHIVED', label: 'Archivé' },
];

const buildDefaultFormData = (resource: ResourceResponse | null) => ({
  name: resource?.name || '',
  description: resource?.description || '',
  typeId: resource?.typeCode || '',
  groupId: resource?.groupCode || '',
  policyId: resource?.policyCode || '',
  capacity: resource?.capacity ?? 1,
  zone: resource?.zone || '',
  locationLabel: resource?.locationLabel || '',
  status: resource?.status || 'ACTIVE',
  bookingEnabled: resource?.bookingEnabled ?? true,
  portalVisible: resource?.portalVisible ?? true,
  active: resource?.active ?? true,
  displayOrder: resource?.displayOrder ?? 0,
});

export const ResourceFormModal: React.FC<ResourceFormModalProps> = ({
  isOpen,
  onClose,
  editingResource,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : réinitialisation à chaque ouverture ou changement de ressource
  const [formData, setFormData] = useState(() => buildDefaultFormData(editingResource));

  useEffect(() => {
    setFormData(buildDefaultFormData(editingResource));
    setErrorMessage(null);
  }, [editingResource, isOpen]);

  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['resource-types-list'],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
    enabled: isOpen,
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['resource-groups-list'],
    queryFn: () => resourceService.getResourceGroups({ size: 500 }),
    enabled: isOpen,
  });

  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ['resource-policies-list'],
    queryFn: () => resourceService.getResourcePolicies({ size: 500 }),
    enabled: isOpen,
  });

  const types: ResourceTypeResponse[] = typesData?.content || [];
  const groups: ResourceGroupResponse[] = groupsData?.content || [];
  const policies: ResourcePolicyResponse[] = policiesData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => resourceService.createResource({
      name: formData.name,
      description: formData.description || undefined,
      typeId: formData.typeId,
      groupId: formData.groupId || undefined,
      policyId: formData.policyId || undefined,
      capacity: formData.capacity,
      zone: formData.zone || undefined,
      locationLabel: formData.locationLabel || undefined,
      status: formData.status,
      bookingEnabled: formData.bookingEnabled,
      portalVisible: formData.portalVisible,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création de la ressource.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => resourceService.updateResource(editingResource!.code, {
      name: formData.name,
      description: formData.description || undefined,
      capacity: formData.capacity,
      zone: formData.zone || undefined,
      locationLabel: formData.locationLabel || undefined,
      status: formData.status,
      bookingEnabled: formData.bookingEnabled,
      portalVisible: formData.portalVisible,
      active: formData.active,
      displayOrder: formData.displayOrder,
    }),
    onSuccess: async () => {
      // CORRECTION : classification mise à jour en séquence APRÈS le update principal
      // pour éviter d'avoir une classification changée sur une ressource non mise à jour
      try {
        await resourceService.updateResourceClassification(editingResource!.code, {
          typeId: formData.typeId,
          groupId: formData.groupId || undefined,
          policyId: formData.policyId || undefined,
        });
      } catch (err: any) {
        setErrorMessage('Ressource mise à jour mais erreur sur la classification : ' + (err?.response?.data?.message || err.message));
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la mise à jour de la ressource.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingResource) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isLoadingData = typesLoading || groupsLoading || policiesLoading;
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingResource ? 'Modifier la ressource' : 'Nouvelle ressource'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {isLoadingData ? (
        <div className="p-8 text-center">
          <Loader2 size={24} className="animate-spin mx-auto text-primary-600" />
          <p className="mt-3 text-gray-500 text-sm">Chargement des données...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Classification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={formData.typeId}
              onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Sélectionner un type</option>
              {types.map((type) => (
                <option key={type.code} value={type.code}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Aucun groupe</option>
              {groups.map((group) => (
                <option key={group.code} value={group.code}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Politique de réservation</label>
            <select
              value={formData.policyId}
              onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Aucune politique</option>
              {policies.map((policy) => (
                <option key={policy.code} value={policy.code}>{policy.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacité *</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) || 1 })}
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="ex: Aile Nord"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
            <input
              type="text"
              value={formData.locationLabel}
              onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
              placeholder="ex: 2ème étage, porte A201"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ResourceResponse['status'] })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.bookingEnabled}
                onChange={(e) => setFormData({ ...formData, bookingEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Réservable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.portalVisible}
                onChange={(e) => setFormData({ ...formData, portalVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Visible sur le portail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Actif</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending
                ? <Loader2 size={16} className="animate-spin" />
                : editingResource ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      )}
    </ModalPortal>
  );
};