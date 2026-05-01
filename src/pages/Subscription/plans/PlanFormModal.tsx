import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { Plan } from '../../../services/subscription.service';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlan: Plan | null;
  onSuccess: () => void;
}

const planTypes = [
  { value: 'MEMBERSHIP', label: 'Adhésion' },
  { value: 'COWORKING_ACCESS', label: 'Accès coworking' },
  { value: 'DEDICATED_DESK', label: 'Bureau dédié' },
  { value: 'PRIVATE_OFFICE', label: 'Bureau privé' },
  { value: 'MEETING_ROOM_PACK', label: 'Pack salle de réunion' },
  { value: 'VIRTUAL_OFFICE', label: 'Bureau virtuel' },
  { value: 'COMPANY_PLAN', label: 'Plan entreprise' },
  { value: 'CUSTOM', label: 'Personnalisé' },
];

const targetAudiences = [
  { value: 'INDIVIDUAL', label: 'Particulier' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'BOTH', label: 'Les deux' },
];

// Valeurs par défaut extraites pour éviter la duplication
const buildDefaultFormData = (plan: Plan | null) => ({
  name: plan?.name || '',
  description: plan?.description || '',
  planType: plan?.planType || 'MEMBERSHIP',
  targetAudience: plan?.targetAudience || 'BOTH',
  visible: plan?.visible ?? false,
  sortOrder: plan?.sortOrder ?? 0,
});

export const PlanFormModal: React.FC<PlanFormModalProps> = ({ isOpen, onClose, editingPlan, onSuccess }) => {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : formData se réinitialise à chaque changement de editingPlan ou ouverture
  const [formData, setFormData] = useState(() => buildDefaultFormData(editingPlan));

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // CORRECTION : resynchronise le formulaire quand editingPlan change
  useEffect(() => {
    setFormData(buildDefaultFormData(editingPlan));
    setErrorMessage(null);
  }, [editingPlan, isOpen]);

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPlan({
      name: formData.name,
      description: formData.description || undefined,
      planType: formData.planType,
      targetAudience: formData.targetAudience,
      visible: formData.visible,
      sortOrder: formData.sortOrder,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Erreur lors de la création du plan.';
      setErrorMessage(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => subscriptionService.updatePlan(editingPlan!.code, {
      name: formData.name,
      description: formData.description || undefined,
      planType: formData.planType as Plan['planType'],
      targetAudience: formData.targetAudience as Plan['targetAudience'],
      visible: formData.visible,
      sortOrder: formData.sortOrder,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Erreur lors de la mise à jour du plan.';
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingPlan) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-xl"
        style={{ position: 'relative', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingPlan ? 'Modifier le plan' : 'Nouveau plan'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Message d'erreur */}
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de plan *</label>
              <select
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value as Plan['planType'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {planTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Public cible *</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as Plan['targetAudience'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {targetAudiences.map(ta => (
                  <option key={ta.value} value={ta.value}>{ta.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visible}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Visible dans le catalogue</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                editingPlan ? 'Mettre à jour' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};