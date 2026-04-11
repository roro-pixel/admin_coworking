import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Building2 } from 'lucide-react';
import { contractService } from '../../services/contract.service';
import type { TemplateResponse, CreateContractRequest } from '../../services/contract.service';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateContractRequest) => void;
  initialData?: any;
  isEditing?: boolean;
}

const ownerTypes = [
  { value: 'MEMBER', label: 'Membre', icon: User },
  { value: 'CUSTOMER', label: 'Customer', icon: Building2 },
  { value: 'BUSINESS', label: 'Business', icon: Building2 },
];

const renewalTypes = [
  { value: 'FIXED_TERM', label: 'Durée déterminée' },
  { value: 'AUTO_RENEW', label: 'Renouvellement automatique' },
  { value: 'INDEFINITE', label: 'Durée indéterminée' },
];

const partyRoles = [
  { value: 'SIGNATORY', label: 'Signataire' },
  { value: 'BENEFICIARY', label: 'Bénéficiaire' },
  { value: 'WITNESS', label: 'Témoin' },
];

const partyTypes = [
  { value: 'MEMBER', label: 'Membre' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'BUSINESS', label: 'Business' },
];

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    templateCode: '',
    ownerType: 'MEMBER',
    ownerCode: '',
    businessCode: '',
    renewalType: 'FIXED_TERM',
    effectiveDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    createdBy: 1,
    parties: [] as {
      partyType: string;
      partyCode: string;
      displayName: string;
      email: string;
      phone: string;
      role: string;
      signOrder: number;
      mustSign: boolean;
    }[],
  });

  const [newParty, setNewParty] = useState({
    partyType: 'MEMBER',
    partyCode: '',
    displayName: '',
    email: '',
    phone: '',
    role: 'SIGNATORY',
    signOrder: 1,
    mustSign: true,
  });

  useEffect(() => {
    if (isOpen) {
      contractService.getTemplates().then(setTemplates);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        effectiveDate: initialData.effectiveDate?.split('T')[0] || '',
        startDate: initialData.startDate?.split('T')[0] || '',
        endDate: initialData.endDate?.split('T')[0] || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addParty = () => {
    if (newParty.partyCode && newParty.displayName && newParty.email) {
      setFormData({
        ...formData,
        parties: [...formData.parties, { ...newParty, signOrder: formData.parties.length + 1 }],
      });
      setNewParty({
        partyType: 'MEMBER',
        partyCode: '',
        displayName: '',
        email: '',
        phone: '',
        role: 'SIGNATORY',
        signOrder: formData.parties.length + 2,
        mustSign: true,
      });
    }
  };

  const removeParty = (index: number) => {
    setFormData({
      ...formData,
      parties: formData.parties.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construction du payload exactement comme attendu par le backend
    const payload: CreateContractRequest = {
      title: formData.title,
      description: formData.description || undefined,
      templateCode: formData.templateCode,
      ownerType: formData.ownerType as 'MEMBER' | 'CUSTOMER' | 'BUSINESS',
      ownerCode: formData.ownerCode,
      businessCode: formData.businessCode || undefined,
      renewalType: formData.renewalType as 'FIXED_TERM' | 'AUTO_RENEW' | 'INDEFINITE',
      effectiveDate: formData.effectiveDate,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      createdBy: parseInt(localStorage.getItem('admin_id') || '1'),
      parties: formData.parties.map((party, idx) => ({
        partyType: party.partyType as 'MEMBER' | 'CUSTOMER' | 'BUSINESS',
        partyCode: party.partyCode,
        displayName: party.displayName,
        email: party.email,
        phone: party.phone || undefined,
        role: party.role as 'SIGNATORY' | 'BENEFICIARY' | 'WITNESS',
        signOrder: idx + 1,
        mustSign: party.role === 'SIGNATORY',
      })),
    };
    
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Modifier le contrat' : 'Nouveau contrat'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations générales */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Informations générales</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template *</label>
                  <select
                    name="templateCode"
                    value={formData.templateCode}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner un template</option>
                    {templates.map(t => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de propriétaire *</label>
                  <select
                    name="ownerType"
                    value={formData.ownerType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {ownerTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code propriétaire *</label>
                  <input
                    type="text"
                    name="ownerCode"
                    value={formData.ownerCode}
                    onChange={handleChange}
                    required
                    placeholder="Ex: MBR-00001, CUS-00001, BUS-00001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code business</label>
                  <input
                    type="text"
                    name="businessCode"
                    value={formData.businessCode}
                    onChange={handleChange}
                    placeholder="Ex: BUS-00001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Dates</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'effet *</label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de renouvellement *</label>
                <select
                  name="renewalType"
                  value={formData.renewalType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {renewalTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Parties signataires */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Parties prenantes</h4>
            
            <div className="space-y-3 mb-4">
              {formData.parties.map((party, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{party.displayName}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">{party.partyType}</span>
                      <span className="text-xs text-gray-500">{party.partyCode}</span>
                      <span className="text-xs text-gray-500">{party.email}</span>
                      <span className="text-xs text-primary-600">{party.role === 'SIGNATORY' ? 'Signataire' : party.role === 'BENEFICIARY' ? 'Bénéficiaire' : 'Témoin'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeParty(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Ajouter une partie</p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newParty.partyType}
                  onChange={(e) => setNewParty({ ...newParty, partyType: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {partyTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Code (ex: MBR-00001)"
                  value={newParty.partyCode}
                  onChange={(e) => setNewParty({ ...newParty, partyCode: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="Nom affiché"
                  value={newParty.displayName}
                  onChange={(e) => setNewParty({ ...newParty, displayName: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newParty.email}
                  onChange={(e) => setNewParty({ ...newParty, email: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={newParty.phone}
                  onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <select
                  value={newParty.role}
                  onChange={(e) => setNewParty({ ...newParty, role: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {partyRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addParty}
                  disabled={!newParty.partyCode || !newParty.displayName || !newParty.email}
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Ajouter
                </button>
              </div>
            </div>

            {formData.parties.length === 0 && (
              <p className="text-sm text-red-500 mt-2">Au moins une partie signataire est requise</p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={formData.parties.length === 0 || !formData.templateCode || !formData.ownerCode}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isEditing ? 'Mettre à jour' : 'Créer le contrat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};