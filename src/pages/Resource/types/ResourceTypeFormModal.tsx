import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourceTypeResponse } from '../../../services/resource.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface ResourceTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingType: ResourceTypeResponse | null;
  onSuccess: () => void;
}

const buildDefaultFormData = (type: ResourceTypeResponse | null) => ({
  name: type?.name || '',
  description: type?.description || '',
  active: type?.active ?? true,
});

export const ResourceTypeFormModal: React.FC<ResourceTypeFormModalProps> = ({
  isOpen,
  onClose,
  editingType,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData(editingType));

  useEffect(() => {
    setFormData(buildDefaultFormData(editingType));
    setErrorMessage(null);
  }, [editingType, isOpen]);

  const createMutation = useMutation({
    mutationFn: () => resourceService.createResourceType({
      name: formData.name,
      description: formData.description || undefined,
      active: formData.active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types-list'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création du type.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => resourceService.updateResourceType(editingType!.code, {
      name: formData.name,
      description: formData.description || undefined,
      active: formData.active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types-list'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la mise à jour du type.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingType) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingType ? 'Modifier le type' : 'Nouveau type de ressource'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Actif</span>
        </label>

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
              : editingType ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};