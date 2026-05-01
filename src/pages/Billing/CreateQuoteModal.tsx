import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { billingService } from '../../services/billing.service';
import type { BillingLineType } from '../../services/billing.service';
import { CustomerAutocomplete } from '../../components/customers/CustomerAutocomplete';
import { MemberAutocomplete } from '../../components/members/MemberAutocomplete';
import type { CustomerSummaryResponse } from '../../services/customer.service';
import type { MemberSummaryResponse } from '../../services/member.service';
import { ModalPortal } from '../../components/ui/ModalPortal';

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const lineTypeOptions: { value: BillingLineType; label: string }[] = [
  { value: 'SERVICE',      label: 'Service'     },
  { value: 'PRODUCT',      label: 'Produit'     },
  { value: 'BOOKING',      label: 'Réservation' },
  { value: 'SUBSCRIPTION', label: 'Abonnement'  },
  { value: 'PASS',         label: 'Pass'        },
  { value: 'ADDON',        label: 'Option'      },
  { value: 'FEE',          label: 'Frais'       },
  { value: 'DISCOUNT',     label: 'Remise'      },
  { value: 'OTHER',        label: 'Autre'       },
];

const buildDefaultLine = () => ({
  lineType: 'SERVICE' as BillingLineType,
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxable: true,
});

const buildDefaultFormData = () => ({
  title: '',
  description: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  currency: 'XAF',
  lines: [buildDefaultLine()],
});

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();

  const [customerType, setCustomerType] = useState<'CUSTOMER' | 'MEMBER' | 'EXTERNAL'>('CUSTOMER');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [externalInfo, setExternalInfo] = useState({ name: '', email: '', phone: '' });
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : reset à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setCustomerType('CUSTOMER');
      setSelectedCustomer(null);
      setSelectedMember(null);
      setExternalInfo({ name: '', email: '', phone: '' });
      setFormData(buildDefaultFormData());
      setErrorMessage(null);
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () => {
      const validLines = formData.lines.filter(l => l.description && l.quantity > 0 && l.unitPrice >= 0);
      const payload: any = {
        title:       formData.title || 'Devis manuel',
        description: formData.description || undefined,
        currency:    formData.currency,
        issueDate:   formData.issueDate,
        dueDate:     formData.dueDate || undefined,
        lines:       validLines,
      };
      if (customerType === 'CUSTOMER' && selectedCustomer) {
        payload.customerType = 'CUSTOMER';
        payload.customerCode = selectedCustomer.customerId;
      } else if (customerType === 'MEMBER' && selectedMember) {
        payload.customerType = 'MEMBER';
        payload.customerCode = selectedMember.memberId;
      } else {
        payload.customerName  = externalInfo.name;
        payload.customerEmail = externalInfo.email;
        if (externalInfo.phone) payload.customerPhone = externalInfo.phone;
      }
      return billingService.createManualQuote(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-documents'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création du devis.');
    },
  });

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const isValid = () => {
    if (customerType === 'CUSTOMER' && !selectedCustomer) return false;
    if (customerType === 'MEMBER' && !selectedMember) return false;
    if (customerType === 'EXTERNAL' && (!externalInfo.name || !externalInfo.email)) return false;
    return formData.lines.some(l => l.description && l.quantity > 0 && l.unitPrice >= 0);
  };

  const totalEstimated = formData.lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Nouveau devis</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (isValid()) createMutation.mutate(); }}
        className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* Type client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type de client *</label>
          <div className="flex gap-4">
            {(['CUSTOMER', 'MEMBER', 'EXTERNAL'] as const).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={customerType === type}
                  onChange={() => { setCustomerType(type); setSelectedCustomer(null); setSelectedMember(null); }} />
                {type === 'CUSTOMER' ? 'Customer' : type === 'MEMBER' ? 'Membre' : 'Client externe'}
              </label>
            ))}
          </div>
        </div>

        {customerType === 'CUSTOMER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <CustomerAutocomplete onSelect={setSelectedCustomer} selectedCustomer={selectedCustomer}
              placeholder="Rechercher un customer..." />
          </div>
        )}
        {customerType === 'MEMBER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Membre *</label>
            <MemberAutocomplete onSelect={setSelectedMember} selectedMember={selectedMember}
              placeholder="Rechercher un membre..." />
          </div>
        )}
        {customerType === 'EXTERNAL' && (
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Nom *" value={externalInfo.name}
              onChange={(e) => setExternalInfo({ ...externalInfo, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input type="email" placeholder="Email *" value={externalInfo.email}
              onChange={(e) => setExternalInfo({ ...externalInfo, email: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input type="tel" placeholder="Téléphone" value={externalInfo.phone}
              onChange={(e) => setExternalInfo({ ...externalInfo, phone: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm col-span-2" />
          </div>
        )}

        {/* Infos générales */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input type="text" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Devis prestation" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;émission *</label>
            <input type="date" value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validité jusqu&apos;au</label>
            <input type="date" value={formData.dueDate} min={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>

        {/* Lignes */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Lignes *</label>
            <button type="button" onClick={() => setFormData({ ...formData, lines: [...formData.lines, buildDefaultLine()] })}
              className="text-primary-600 text-xs flex items-center gap-1 hover:underline">
              <Plus size={12} /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {formData.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select value={line.lineType}
                  onChange={(e) => updateLine(idx, 'lineType', e.target.value as BillingLineType)}
                  className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs">
                  {lineTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input type="text" placeholder="Description *" value={line.description}
                  onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                <input type="number" placeholder="Qté" value={line.quantity} min="1"
                  onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="col-span-1 px-2 py-2 border border-gray-200 rounded-lg text-sm" />
               <input
  type="text"
  inputMode="numeric"
  placeholder="Prix"
  value={line.unitPrice === 0 ? '' : line.unitPrice}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    updateLine(idx, 'unitPrice', val === '' ? 0 : parseInt(val));
  }}
  className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm"
/>
                <label className="col-span-2 flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={line.taxable}
                    onChange={(e) => updateLine(idx, 'taxable', e.target.checked)} className="rounded" />
                  TVA 18%
                </label>
                <button type="button" onClick={() => setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== idx) })}
                  disabled={formData.lines.length === 1}
                  className="col-span-1 p-1.5 text-red-500 hover:text-red-700 disabled:opacity-30">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {totalEstimated > 0 && (
            <p className="text-right text-sm text-gray-500 mt-2">
              Total estimé HT : <span className="font-semibold">{totalEstimated.toLocaleString('fr-FR')} FCFA</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Annuler
          </button>
          <button type="submit" disabled={createMutation.isPending || !isValid()}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer le devis'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};