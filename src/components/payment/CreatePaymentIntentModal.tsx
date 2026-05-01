import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { paymentService } from '../../services/payment.service';
import type { CustomerSummaryResponse } from '../../services/customer.service';
import type { MemberSummaryResponse } from '../../services/member.service';
import { CustomerAutocomplete } from '../customers/CustomerAutocomplete';
import { MemberAutocomplete } from '../members/MemberAutocomplete';
import { ModalPortal } from '../ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface CreatePaymentIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const customerTypes = [
  { value: 'CUSTOMER',        label: 'Customer'   },
  { value: 'MEMBER',          label: 'Membre'     },
  { value: 'BUSINESS_ENTITY', label: 'Entreprise' },
];

// CORRECTION : valeurs alignées sur le MD (MANUAL_PAYMENT au lieu de MANUAL)
const purposes = [
  { value: 'MANUAL_PAYMENT', label: 'Paiement manuel'  },
  { value: 'BOOKING',        label: 'Réservation'      },
  { value: 'SUBSCRIPTION',   label: 'Abonnement'       },
  { value: 'PASS',           label: 'Pass'             },
];

// Expiration par défaut : 24h
const defaultExpiresAt = (): string => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
};

const buildDefaultFormData = () => ({
  customerType: 'CUSTOMER',
  customerCode: '',
  amount: 0,
  currency: 'XAF',
  purpose: 'MANUAL_PAYMENT',
  // CORRECTION : sourceType aligné sur le MD pour les intentions manuelles
  sourceType: 'MANUAL',
  sourceCode: '',
  description: '',
  expiresAt: defaultExpiresAt().slice(0, 16), // format datetime-local
});

export const CreatePaymentIntentModal: React.FC<CreatePaymentIntentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState(buildDefaultFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);

  // CORRECTION : reset complet à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setFormData(buildDefaultFormData());
      setSelectedCustomer(null);
      setSelectedMember(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleCustomerTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, customerType: type, customerCode: '' }));
    setSelectedCustomer(null);
    setSelectedMember(null);
  };

  const handleCustomerSelect = (customer: CustomerSummaryResponse | null) => {
    setSelectedCustomer(customer);
    setSelectedMember(null);
    setFormData(prev => ({
      ...prev,
      customerType: 'CUSTOMER',
      customerCode: customer?.customerId || '',
    }));
  };

  const handleMemberSelect = (member: MemberSummaryResponse | null) => {
    setSelectedMember(member);
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      customerType: 'MEMBER',
      customerCode: member?.memberId || '',
    }));
  };

  const createMutation = useMutation({
    mutationFn: () => paymentService.createPaymentIntent({
      customerType: formData.customerType,
      customerCode: formData.customerCode,
      amount: parseFloat(String(formData.amount)) || 0,
      currency: formData.currency,
      purpose: formData.purpose,
      sourceType: formData.sourceType,
      sourceCode: formData.sourceCode || undefined,
      description: formData.description || undefined,
      // CORRECTION : idempotencyKey pour éviter les doublons
      idempotencyKey: `intent-${formData.customerCode}-${formData.amount}-${Date.now()}`,
      // CORRECTION : expiresAt envoyé au format ISO
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
      createdBy: admin?.email || admin?.id || 'admin',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-intents'] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Erreur lors de la création de l\'intention.';
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerCode) {
      setErrorMessage('Veuillez sélectionner un client.');
      return;
    }
    if (formData.amount <= 0) {
      setErrorMessage('Le montant doit être supérieur à 0.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  if (!isOpen) return null;

  // CORRECTION : ModalPortal au lieu du fixed interne
  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Nouvelle intention de paiement</h3>
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

        {/* Type de client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de client *</label>
          <select
            value={formData.customerType}
            onChange={(e) => handleCustomerTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            {customerTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Sélection client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.customerType === 'MEMBER' ? 'Membre *' :
             formData.customerType === 'BUSINESS_ENTITY' ? 'Entreprise *' : 'Customer *'}
          </label>
          {formData.customerType === 'MEMBER' ? (
            <MemberAutocomplete
              onSelect={handleMemberSelect}
              selectedMember={selectedMember}
              placeholder="Rechercher un membre..."
            />
          ) : (
            <CustomerAutocomplete
              onSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
              typeFilter={formData.customerType === 'BUSINESS_ENTITY' ? 'COMPANY' : undefined}
              placeholder={
                formData.customerType === 'BUSINESS_ENTITY'
                  ? 'Rechercher une entreprise...'
                  : 'Rechercher un customer...'
              }
            />
          )}
          {formData.customerCode && (
            <p className="text-xs text-gray-400 mt-1">Code : {formData.customerCode}</p>
          )}
        </div>

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
          <input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            min="1"
            step="100"
            required
            placeholder="50000"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
          <p className="text-xs text-gray-400 mt-1">
            Paiements cash en XAF uniquement
          </p>
        </div>

        {/* Objectif */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objectif *</label>
          <select
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            {purposes.map(purpose => (
              <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
            ))}
          </select>
        </div>

        {/* Code source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code source</label>
          <input
            type="text"
            value={formData.sourceCode}
            onChange={(e) => setFormData(prev => ({ ...prev, sourceCode: e.target.value }))}
            placeholder="Ex: BOOK-001, SUB-001"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
          <p className="text-xs text-gray-400 mt-1">
            Optionnel — lie l'intention à une réservation ou un abonnement
          </p>
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
          <input
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
          <p className="text-xs text-gray-400 mt-1">Par défaut 24h</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            placeholder="Motif du paiement..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !formData.customerCode || formData.amount <= 0}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : 'Créer l\'intention'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};