import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourcePolicyResponse } from '../../../services/resource.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface ResourcePolicyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPolicy: ResourcePolicyResponse | null;
  onSuccess: () => void;
}

const buildDefaultFormData = (policy: ResourcePolicyResponse | null) => ({
  name: policy?.name || '',
  description: policy?.description || '',
  minBookingDurationMinutes: policy?.minBookingDurationMinutes ?? 30,
  maxBookingDurationMinutes: policy?.maxBookingDurationMinutes ?? 480,
  minBookingNoticeMinutes: policy?.minBookingNoticeMinutes ?? 60,
  cancellationNoticeMinutes: policy?.cancellationNoticeMinutes ?? 120,
  allowCancellation: policy?.allowCancellation ?? true,
  active: policy?.active ?? true,
});

// Affichage lisible des durées
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export const ResourcePolicyFormModal: React.FC<ResourcePolicyFormModalProps> = ({
  isOpen,
  onClose,
  editingPolicy,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData(editingPolicy));

  // CORRECTION : resynchronisation à chaque ouverture ou changement de politique
  useEffect(() => {
    setFormData(buildDefaultFormData(editingPolicy));
    setErrorMessage(null);
  }, [editingPolicy, isOpen]);

  const buildPayload = () => ({
    name: formData.name,
    description: formData.description || undefined,
    minBookingDurationMinutes: formData.minBookingDurationMinutes,
    maxBookingDurationMinutes: formData.maxBookingDurationMinutes,
    minBookingNoticeMinutes: formData.minBookingNoticeMinutes,
    allowCancellation: formData.allowCancellation,
    // CORRECTION : cancellationNoticeMinutes envoyé seulement si annulation autorisée
    cancellationNoticeMinutes: formData.allowCancellation
      ? formData.cancellationNoticeMinutes
      : undefined,
    active: formData.active,
  });

  const createMutation = useMutation({
    mutationFn: () => resourceService.createResourcePolicy(buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
      queryClient.invalidateQueries({ queryKey: ['resource-policies-list'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création de la politique.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => resourceService.updateResourcePolicy(editingPolicy!.code, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-policies'] });
      queryClient.invalidateQueries({ queryKey: ['resource-policies-list'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la mise à jour de la politique.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // CORRECTION : validation minDuration < maxDuration
    if (formData.minBookingDurationMinutes >= formData.maxBookingDurationMinutes) {
      setErrorMessage('La durée minimale doit être inférieure à la durée maximale.');
      return;
    }
    setErrorMessage(null);
    if (editingPolicy) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  // CORRECTION : suppression du double overlay
  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingPolicy ? 'Modifier la politique' : 'Nouvelle politique de réservation'}
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
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* Durées */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durée min (min)
              {formData.minBookingDurationMinutes > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  = {formatDuration(formData.minBookingDurationMinutes)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={formData.minBookingDurationMinutes}
              onChange={(e) => setFormData({ ...formData, minBookingDurationMinutes: Number(e.target.value) || 0 })}
              min="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durée max (min)
              {formData.maxBookingDurationMinutes > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  = {formatDuration(formData.maxBookingDurationMinutes)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={formData.maxBookingDurationMinutes}
              onChange={(e) => setFormData({ ...formData, maxBookingDurationMinutes: Number(e.target.value) || 0 })}
              min="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Délai minimum avant réservation (min)
            {formData.minBookingNoticeMinutes > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                = {formatDuration(formData.minBookingNoticeMinutes)}
              </span>
            )}
          </label>
          <input
            type="number"
            value={formData.minBookingNoticeMinutes}
            onChange={(e) => setFormData({ ...formData, minBookingNoticeMinutes: Number(e.target.value) || 0 })}
            min="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        {/* Annulation */}
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowCancellation}
              onChange={(e) => setFormData({ ...formData, allowCancellation: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">Autoriser l'annulation</span>
          </label>

          {/* CORRECTION : délai annulation affiché seulement si annulation autorisée */}
          {formData.allowCancellation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai d'annulation (min)
                {formData.cancellationNoticeMinutes > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    = {formatDuration(formData.cancellationNoticeMinutes)}
                  </span>
                )}
              </label>
              <input
                type="number"
                value={formData.cancellationNoticeMinutes}
                onChange={(e) => setFormData({ ...formData, cancellationNoticeMinutes: Number(e.target.value) || 0 })}
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              />
            </div>
          )}
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
              : editingPolicy ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};