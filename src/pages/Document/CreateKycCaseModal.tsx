import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { kycService } from '../../services/document.service';

interface CreateKycCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateKycCaseModal: React.FC<CreateKycCaseModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState('MEMBER');
  const [ownerCode, setOwnerCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOwnerType('MEMBER');
      setOwnerCode('');
      setError('');
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () => kycService.createKycCase(ownerType, ownerCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycCases'] });
      onClose();
      setOwnerCode('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerCode) {
      setError('Veuillez saisir un code propriétaire');
      return;
    }
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Créer un dossier KYC</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de propriétaire *
            </label>
            <select
              value={ownerType}
              onChange={(e) => setOwnerType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Customer</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code propriétaire *
            </label>
            <input
              type="text"
              value={ownerCode}
              onChange={(e) => setOwnerCode(e.target.value)}
              placeholder="Ex: MBR-00001, CUS-00001, BUS-00001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Créer
            </button>
          </div>
        </form>
    </ModalPortal>
  );
};