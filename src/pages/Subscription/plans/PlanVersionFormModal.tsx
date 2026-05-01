import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { PlanVersion, EntitlementDefinition, PlanEntitlement } from '../../../services/subscription.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface PlanVersionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  planCode: string;
  editingVersion: PlanVersion | null;
  onSuccess: () => void;
}

interface KeyValuePair {
  key: string;
  value: string;
}

const billingCycles = [
  { value: 'ONE_TIME', label: 'Unique' },
  { value: 'DAILY', label: 'Journalier' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'MONTHLY', label: 'Mensuel' },
  { value: 'QUARTERLY', label: 'Trimestriel' },
  { value: 'YEARLY', label: 'Annuel' },
];

const currencies = [
  { value: 'XAF', label: 'FCFA (XAF)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' },
  { value: 'GBP', label: 'Livre sterling (GBP)' },
  { value: 'CAD', label: 'Dollar canadien (CAD)' },
  { value: 'CFA', label: 'CFA (XOF)' },
];

const ENTITLEMENTS_PER_PAGE = 5;

const createEmptyEntitlement = (priority: number): PlanEntitlement => ({
  entitlementCode: '',
  quantity: 0,
  unlimited: false,
  rolloverAllowed: false,
  rolloverLimit: 0,
  validForDays: 0,
  priority,
  restrictionsJson: '',
});

// Helpers pour reconstruire l'état depuis editingVersion
const buildFormData = (v: PlanVersion | null) => ({
  name: v?.name || '',
  description: v?.description || '',
  effectiveFrom: v?.effectiveFrom?.split('T')[0] || new Date().toISOString().split('T')[0],
  effectiveTo: v?.effectiveTo?.split('T')[0] || '',
  prices: v?.prices?.length
    ? v.prices
    : [{ billingCycle: 'MONTHLY', currency: 'XAF', amount: 0, setupFee: 0, depositAmount: 0, taxIncluded: true, commitmentMonths: 1 }],
  benefits: v?.benefits?.length
    ? v.benefits
    : [{ title: '', description: '', icon: '', category: '', displayOrder: 1, highlighted: false, included: true }],
});

const buildConditions = (v: PlanVersion | null): KeyValuePair[] => {
  if (!v?.termsJson) return [];
  try {
    const parsed = JSON.parse(v.termsJson);
    return Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
  } catch {
    return [];
  }
};

const buildMetadata = (v: PlanVersion | null): KeyValuePair[] => {
  if (!v?.metadataJson) return [];
  try {
    const parsed = JSON.parse(v.metadataJson);
    return Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
  } catch {
    return [];
  }
};

const buildEntitlements = (v: PlanVersion | null): PlanEntitlement[] => {
  if (v?.entitlements?.length) return v.entitlements;
  return [createEmptyEntitlement(1)];
};

export const PlanVersionFormModal: React.FC<PlanVersionFormModalProps> = ({
  isOpen,
  onClose,
  planCode,
  editingVersion,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [entitlementsPage, setEntitlementsPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : états initialisés dynamiquement, resynchronisés via useEffect
  const [formData, setFormData] = useState(() => buildFormData(editingVersion));
  const [localEntitlements, setLocalEntitlements] = useState<PlanEntitlement[]>(() => buildEntitlements(editingVersion));
  const [conditions, setConditions] = useState<KeyValuePair[]>(() => buildConditions(editingVersion));
  const [metadataFields, setMetadataFields] = useState<KeyValuePair[]>(() => buildMetadata(editingVersion));
  const [newCondition, setNewCondition] = useState<KeyValuePair>({ key: '', value: '' });
  const [newMetadataField, setNewMetadataField] = useState<KeyValuePair>({ key: '', value: '' });

  // CORRECTION : resynchronisation quand editingVersion ou isOpen change
  useEffect(() => {
    setFormData(buildFormData(editingVersion));
    setLocalEntitlements(buildEntitlements(editingVersion));
    setConditions(buildConditions(editingVersion));
    setMetadataFields(buildMetadata(editingVersion));
    setEntitlementsPage(0);
    setErrorMessage(null);
    setNewCondition({ key: '', value: '' });
    setNewMetadataField({ key: '', value: '' });
  }, [editingVersion, isOpen]);

  const { data: entitlementDefinitionsData } = useQuery({
    queryKey: ['entitlement-definitions'],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
    enabled: isOpen,
  });

  const entitlementDefinitions: EntitlementDefinition[] = entitlementDefinitionsData?.content || [];

  // Construit le payload commun pour create (pas d'update version dans le service)
  const buildPayload = () => {
    const termsJsonObj: Record<string, string> = {};
    conditions.forEach(c => { if (c.key && c.value) termsJsonObj[c.key] = c.value; });

    const metadataObj: Record<string, string> = {};
    metadataFields.forEach(f => { if (f.key && f.value) metadataObj[f.key] = f.value; });

    return {
      name: formData.name,
      description: formData.description || undefined,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || undefined,
      // CORRECTION : parseFloat pour les montants (XAF entier, EUR peut être décimal)
      prices: formData.prices.map(p => ({
        ...p,
        amount: parseFloat(String(p.amount)) || 0,
        setupFee: parseFloat(String(p.setupFee)) || 0,
        depositAmount: parseFloat(String(p.depositAmount)) || 0,
      })),
      benefits: formData.benefits.filter(b => b.title.trim() !== ''),
      // CORRECTION : filtre les entitlements sans code sélectionné
      entitlements: localEntitlements.filter(e => e.entitlementCode.trim() !== ''),
      termsJson: Object.keys(termsJsonObj).length > 0 ? JSON.stringify(termsJsonObj) : undefined,
      metadataJson: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined,
    };
  };

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPlanVersion(planCode, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', planCode] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Erreur lors de la création de la version.';
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation minimale
    if (formData.prices.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un tarif.');
      return;
    }
    if (formData.prices.some(p => p.amount <= 0)) {
      setErrorMessage('Le montant de chaque tarif doit être supérieur à 0.');
      return;
    }

    // NOTE : l'API ne propose pas d'endpoint PATCH/PUT pour une version existante.
    // On crée toujours une nouvelle version (même en mode "voir détails").
    createMutation.mutate();
  };

  // --- Conditions ---
  const addCondition = () => {
    if (newCondition.key && newCondition.value) {
      setConditions([...conditions, { ...newCondition }]);
      setNewCondition({ key: '', value: '' });
    }
  };
  const removeCondition = (index: number) => setConditions(conditions.filter((_, i) => i !== index));

  // --- Métadonnées ---
  const addMetadataField = () => {
    if (newMetadataField.key && newMetadataField.value) {
      setMetadataFields([...metadataFields, { ...newMetadataField }]);
      setNewMetadataField({ key: '', value: '' });
    }
  };
  const removeMetadataField = (index: number) => setMetadataFields(metadataFields.filter((_, i) => i !== index));

  // --- Prix ---
  const addPrice = () => {
    setFormData({
      ...formData,
      prices: [...formData.prices, { billingCycle: 'MONTHLY', currency: 'XAF', amount: 0, setupFee: 0, depositAmount: 0, taxIncluded: true, commitmentMonths: 1 }],
    });
  };
  const removePrice = (index: number) => {
    setFormData({ ...formData, prices: formData.prices.filter((_, i) => i !== index) });
  };
  const updatePrice = (index: number, field: string, value: any) => {
    const newPrices = [...formData.prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setFormData({ ...formData, prices: newPrices });
  };

  // --- Bénéfices ---
  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...formData.benefits, {
        title: '', description: '', icon: '', category: '',
        displayOrder: formData.benefits.length + 1,
        highlighted: false, included: true,
      }],
    });
  };
  const removeBenefit = (index: number) => {
    setFormData({ ...formData, benefits: formData.benefits.filter((_, i) => i !== index) });
  };
  const updateBenefit = (index: number, field: string, value: any) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = { ...newBenefits[index], [field]: value };
    setFormData({ ...formData, benefits: newBenefits });
  };

  // --- Entitlements ---
  const addEntitlement = () => {
    const updated = [...localEntitlements, createEmptyEntitlement(localEntitlements.length + 1)];
    setLocalEntitlements(updated);
    setEntitlementsPage(Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE) - 1);
  };
  const removeEntitlement = (index: number) => {
    const updated = localEntitlements.filter((_, i) => i !== index);
    setLocalEntitlements(updated);
    const newTotalPages = Math.max(1, Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE));
    if (entitlementsPage >= newTotalPages) setEntitlementsPage(newTotalPages - 1);
  };
  const updateEntitlement = (index: number, field: string, value: any) => {
    const updated = [...localEntitlements];
    updated[index] = { ...updated[index], [field]: value };
    setLocalEntitlements(updated);
  };

  // Pagination entitlements
  const totalEntitlements = localEntitlements.length;
  const totalEntitlementPages = Math.max(1, Math.ceil(totalEntitlements / ENTITLEMENTS_PER_PAGE));
  const paginatedEntitlements = localEntitlements.slice(
    entitlementsPage * ENTITLEMENTS_PER_PAGE,
    (entitlementsPage + 1) * ENTITLEMENTS_PER_PAGE,
  );

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="6xl">
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">
            {editingVersion ? `Version ${editingVersion.versionNumber} — ${editingVersion.name}` : 'Nouvelle version'}
          </h3>
          {/* CORRECTION : message clair sur le comportement réel (création d'une nouvelle version) */}
          {editingVersion && (
            <p className="text-xs text-amber-600 mt-0.5">
              Les versions existantes ne sont pas modifiables. Ce formulaire crée une nouvelle version basée sur celle-ci.
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-6xl">

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* Infos générales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'effet *</label>
            <input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Conditions générales */}
        <div>
          <h4 className="font-semibold mb-3">Conditions générales</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Clé</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Valeur</th>
                  <th className="px-4 py-2 text-center text-sm font-medium w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conditions.map((condition, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-mono">{condition.key}</td>
                    <td className="px-4 py-2 text-sm">{condition.value}</td>
                    <td className="px-4 py-2 text-center">
                      <button type="button" onClick={() => removeCondition(idx)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Clé (ex: commitment)"
                      value={newCondition.key}
                      onChange={(e) => setNewCondition({ ...newCondition, key: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Valeur (ex: monthly)"
                      value={newCondition.value}
                      onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={addCondition}
                      disabled={!newCondition.key || !newCondition.value}
                      className="text-primary-600 hover:text-primary-800 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Métadonnées */}
        <div>
          <h4 className="font-semibold mb-3">Métadonnées</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Clé</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Valeur</th>
                  <th className="px-4 py-2 text-center text-sm font-medium w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metadataFields.map((field, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-mono">{field.key}</td>
                    <td className="px-4 py-2 text-sm">{field.value}</td>
                    <td className="px-4 py-2 text-center">
                      <button type="button" onClick={() => removeMetadataField(idx)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Clé (ex: internal_note)"
                      value={newMetadataField.key}
                      onChange={(e) => setNewMetadataField({ ...newMetadataField, key: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMetadataField())}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Valeur (ex: Tarif spécial Q1)"
                      value={newMetadataField.value}
                      onChange={(e) => setNewMetadataField({ ...newMetadataField, value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMetadataField())}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={addMetadataField}
                      disabled={!newMetadataField.key || !newMetadataField.value}
                      className="text-primary-600 hover:text-primary-800 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarifs */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Tarifs *</h4>
            <button type="button" onClick={addPrice} className="text-primary-600 text-sm flex items-center gap-1">
              <Plus size={14} /> Ajouter un tarif
            </button>
          </div>
          <div className="space-y-2">
            {formData.prices.map((price, idx) => (
              <div key={idx} className="flex gap-2 items-end p-2 bg-gray-50 rounded-lg flex-wrap">
                <div className="w-28">
                  <label className="block text-xs text-gray-500">Cycle</label>
                  <select
                    value={price.billingCycle}
                    onChange={(e) => updatePrice(idx, 'billingCycle', e.target.value)}
                    className="w-full px-2 py-1 border rounded-lg text-sm"
                  >
                    {billingCycles.map(cycle => (
                      <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs text-gray-500">Devise</label>
                  <select
                    value={price.currency}
                    onChange={(e) => updatePrice(idx, 'currency', e.target.value)}
                    className="w-full px-2 py-1 border rounded-lg text-sm"
                  >
                    {currencies.map(currency => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[80px]">
                  <label className="block text-xs text-gray-500">Montant *</label>
                  <input
  type="text"
  inputMode="decimal"
  value={price.amount === 0 ? '' : price.amount}
  onChange={(e) => {
    const val = e.target.value.replace(/[^\d.]/g, '');
    updatePrice(idx, 'amount', val === '' ? 0 : parseFloat(val));
  }}
  placeholder="0.00"
  className="w-full px-2 py-1 border rounded-lg text-sm"
/>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500">Setup fee</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price.setupFee}
                    onChange={(e) => updatePrice(idx, 'setupFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border rounded-lg text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500">Dépôt</label>
                  <input
  type="text"
  inputMode="decimal"
  value={price.depositAmount === 0 ? '' : price.depositAmount}
  onChange={(e) => {
    const val = e.target.value.replace(/[^\d.]/g, '');
    updatePrice(idx, 'depositAmount', val === '' ? 0 : parseFloat(val));
  }}
  placeholder="0.00"
  className="w-full px-2 py-1 border rounded-lg text-sm"
/>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500">Engagement (mois)</label>
                  <input
  type="text"
  inputMode="numeric"
  value={price.commitmentMonths === 0 ? '' : price.commitmentMonths}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    updatePrice(idx, 'commitmentMonths', val === '' ? 0 : parseInt(val));
  }}
  placeholder="0"
  className="w-full px-2 py-1 border rounded-lg text-sm"
/>
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap pb-1">
                  <input
                    type="checkbox"
                    checked={price.taxIncluded}
                    onChange={(e) => updatePrice(idx, 'taxIncluded', e.target.checked)}
                    className="rounded"
                  />
                  TTC
                </label>
                <button
                  type="button"
                  onClick={() => removePrice(idx)}
                  disabled={formData.prices.length === 1}
                  className="p-1 text-red-600 mb-1 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Avantages */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Avantages</h4>
            <button type="button" onClick={addBenefit} className="text-primary-600 text-sm flex items-center gap-1">
              <Plus size={14} /> Ajouter un avantage
            </button>
          </div>
          <div className="space-y-2">
            {formData.benefits.map((benefit, idx) => (
              <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 rounded-lg flex-wrap">
                <input
                  type="text"
                  placeholder="Icône"
                  value={benefit.icon || ''}
                  onChange={(e) => updateBenefit(idx, 'icon', e.target.value)}
                  className="w-16 px-2 py-1 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Titre *"
                  value={benefit.title}
                  onChange={(e) => updateBenefit(idx, 'title', e.target.value)}
                  className="flex-1 min-w-[100px] px-2 py-1 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={benefit.description || ''}
                  onChange={(e) => updateBenefit(idx, 'description', e.target.value)}
                  className="flex-1 min-w-[100px] px-2 py-1 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Catégorie"
                  value={benefit.category || ''}
                  onChange={(e) => updateBenefit(idx, 'category', e.target.value)}
                  className="w-28 px-2 py-1 border rounded-lg text-sm"
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={benefit.highlighted}
                    onChange={(e) => updateBenefit(idx, 'highlighted', e.target.checked)}
                  />
                  Mis en avant
                </label>
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={benefit.included}
                    onChange={(e) => updateBenefit(idx, 'included', e.target.checked)}
                  />
                  Inclus
                </label>
                <button type="button" onClick={() => removeBenefit(idx)} className="p-1 text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Droits inclus */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Droits inclus</h4>
            <button type="button" onClick={addEntitlement} className="text-primary-600 text-sm flex items-center gap-1">
              <Plus size={14} /> Ajouter un droit
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium">Droit</th>
                  <th className="px-3 py-2 text-center text-sm font-medium w-20">Quantité</th>
                  <th className="px-3 py-2 text-center text-sm font-medium w-20">Illimité</th>
                  <th className="px-3 py-2 text-center text-sm font-medium w-24">Report</th>
                  <th className="px-3 py-2 text-center text-sm font-medium w-24">Validité (jours)</th>
                  <th className="px-3 py-2 text-center text-sm font-medium w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedEntitlements.map((ent, idx) => {
                  const globalIdx = entitlementsPage * ENTITLEMENTS_PER_PAGE + idx;
                  return (
                    <tr key={globalIdx}>
                      <td className="px-3 py-2">
                        <select
                          value={ent.entitlementCode}
                          onChange={(e) => updateEntitlement(globalIdx, 'entitlementCode', e.target.value)}
                          className="w-full px-2 py-1 border rounded-lg text-sm"
                        >
                          <option value="">Sélectionner un droit</option>
                          {entitlementDefinitions.map((def) => (
                            <option key={def.code} value={def.code}>
                              {def.name} ({def.code})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={ent.quantity}
                          onChange={(e) => updateEntitlement(globalIdx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded-lg text-sm text-center"
                          disabled={ent.unlimited}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={ent.unlimited}
                          onChange={(e) => updateEntitlement(globalIdx, 'unlimited', e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            checked={ent.rolloverAllowed}
                            onChange={(e) => updateEntitlement(globalIdx, 'rolloverAllowed', e.target.checked)}
                            className="rounded"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Limite"
                            value={ent.rolloverLimit}
                            onChange={(e) => updateEntitlement(globalIdx, 'rolloverLimit', parseInt(e.target.value) || 0)}
                            className="w-16 px-1 py-1 border rounded text-sm text-center"
                            disabled={!ent.rolloverAllowed}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={ent.validForDays}
                          onChange={(e) => updateEntitlement(globalIdx, 'validForDays', parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border rounded-lg text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeEntitlement(globalIdx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {totalEntitlements === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      Aucun droit. Cliquez sur "Ajouter un droit"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalEntitlementPages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setEntitlementsPage(Math.max(0, entitlementsPage - 1))}
                disabled={entitlementsPage === 0}
                className="p-1 rounded border disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                Page {entitlementsPage + 1} / {totalEntitlementPages}
              </span>
              <button
                type="button"
                onClick={() => setEntitlementsPage(Math.min(totalEntitlementPages - 1, entitlementsPage + 1))}
                disabled={entitlementsPage === totalEntitlementPages - 1}
                className="p-1 rounded border disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-4 border-t">
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
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Créer la version'
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};