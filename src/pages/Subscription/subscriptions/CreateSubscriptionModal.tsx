import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, CalendarDays, User, RefreshCw, Info } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { Plan, PlanVersion } from '../../../services/subscription.service';
import type { CustomerSummaryResponse } from '../../../services/customer.service';
import type { MemberSummaryResponse } from '../../../services/member.service';
import { CustomerAutocomplete } from '../../../components/customers/CustomerAutocomplete';
import { MemberAutocomplete } from '../../../components/members/MemberAutocomplete';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const billingCycles = [
  { value: 'ONE_TIME',  label: 'Unique'        },
  { value: 'DAILY',     label: 'Journalier'    },
  { value: 'WEEKLY',    label: 'Hebdomadaire'  },
  { value: 'MONTHLY',   label: 'Mensuel'       },
  { value: 'QUARTERLY', label: 'Trimestriel'   },
  { value: 'YEARLY',    label: 'Annuel'        },
];

const subscriberTypeOptions = [
  { value: 'MEMBER',          label: 'Membre'     },
  { value: 'CUSTOMER',        label: 'Customer'   },
  { value: 'BUSINESS_ENTITY', label: 'Entreprise' },
];

const buildDefaultFormData = () => ({
  planCode:       '',
  planVersionId:  '',
  billingCycle:   'MONTHLY',
  subscriberType: 'MEMBER',
  subscriberCode: '',
  startDate:      new Date().toISOString().split('T')[0],
  autoRenew:      true,
  metadataJson:   '',
});

export const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [formData, setFormData]                 = useState(buildDefaultFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember]     = useState<MemberSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage]         = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildDefaultFormData());
      setSelectedCustomer(null);
      setSelectedMember(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans-active'],
    queryFn: () => subscriptionService.getPlans({ status: 'ACTIVE', size: 100 }),
    enabled: isOpen,
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['plan-versions', formData.planCode],
    queryFn: () => subscriptionService.getPlanVersions(formData.planCode),
    enabled: isOpen && !!formData.planCode,
  });

  const plans             = plansData?.content || [];
  const versions          = versionsData || [];
  const availableVersions = versions.filter((v: PlanVersion) => v.status === 'ACTIVE' || v.status === 'DRAFT');
  const selectedPlan      = plans.find((p: Plan) => p.code === formData.planCode);
  const activeVersion     = selectedPlan?.activeVersion;
  const selectedVersion   = (formData.planVersionId
    ? availableVersions.find((v: PlanVersion) => v.id?.toString() === formData.planVersionId)
    : activeVersion) as PlanVersion | undefined;

  const handleSubscriberTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, subscriberType: type, subscriberCode: '' }));
    setSelectedCustomer(null);
    setSelectedMember(null);
  };

  const isMetadataJsonValid = !formData.metadataJson.trim() || (() => {
    try { JSON.parse(formData.metadataJson); return true; } catch { return false; }
  })();

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof subscriptionService.createSubscription>[0] = {
        planCode:       formData.planCode,
        subscriberType: formData.subscriberType as 'MEMBER' | 'CUSTOMER' | 'BUSINESS_ENTITY',
        subscriberCode: formData.subscriberCode,
        startDate:      formData.startDate,
        autoRenew:      formData.autoRenew,
      };
      if (formData.planVersionId)
        payload.planVersionId = parseInt(formData.planVersionId);
      if (formData.billingCycle)
        payload.billingCycle = formData.billingCycle;
      if (formData.metadataJson.trim() && isMetadataJsonValid)
        payload.metadataJson = formData.metadataJson;
      return subscriptionService.createSubscription(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMetadataJsonValid) { setErrorMessage('Le JSON des métadonnées est invalide.'); return; }
    setErrorMessage(null);
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Nouvelle souscription</h3>
          <p className="text-sm text-gray-500 mt-0.5">Abonnez un membre ou un client à un plan</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {plansLoading ? (
        <div className="p-12 text-center">
          <Loader2 size={36} className="animate-spin mx-auto text-primary-600 mb-4" />
          <p className="text-gray-500">Chargement des plans disponibles...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          {/* ── Section 1 : Plan et facturation ─────────── */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b">
              Plan et facturation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan *</label>
                <select
                  value={formData.planCode}
                  onChange={(e) => setFormData({ ...formData, planCode: e.target.value, planVersionId: '' })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Sélectionner un plan</option>
                  {plans.map((plan: Plan) => (
                    <option key={plan.code} value={plan.code}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cycle de facturation *</label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                >
                  {billingCycles.map(cycle => (
                    <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                  ))}
                </select>
              </div>

              {formData.planCode && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Version du plan
                    {versionsLoading && <Loader2 size={11} className="inline ml-2 animate-spin text-gray-400" />}
                  </label>
                  <select
                    value={formData.planVersionId}
                    onChange={(e) => setFormData({ ...formData, planVersionId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                    disabled={versionsLoading}
                  >
                    <option value="">
                      Version active par défaut{activeVersion ? ` (v${activeVersion.versionNumber})` : ''}
                    </option>
                    {availableVersions.map((v: PlanVersion) => (
                      <option key={v.id} value={v.id?.toString()}>
                        v{v.versionNumber} — {v.name}
                        {' '}({v.status === 'ACTIVE' ? 'Active' : 'Brouillon'})
                        {v.effectiveFrom && ` · dès le ${new Date(v.effectiveFrom).toLocaleDateString('fr-FR')}`}
                      </option>
                    ))}
                  </select>

                  {selectedVersion && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                      <Info size={13} className="text-blue-400 flex-shrink-0" />
                      <span>
                        Prix : <strong className="text-blue-700">
                          {((selectedVersion as any).price ?? 0).toLocaleString('fr-FR')} XAF
                        </strong>
                        {(selectedVersion as any).trialDays
                          ? ` · Essai : ${(selectedVersion as any).trialDays} jour(s)`
                          : ''}
                        {(selectedVersion as any).setupFee
                          ? ` · Frais d'activation : ${((selectedVersion as any).setupFee).toLocaleString('fr-FR')} XAF`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Section 2 : Souscripteur ──────────────────── */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b flex items-center gap-2">
              <User size={13} /> Souscripteur
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
                <select
                  value={formData.subscriberType}
                  onChange={(e) => handleSubscriberTypeChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                >
                  {subscriberTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {formData.subscriberType === 'MEMBER' ? 'Membre *' :
                   formData.subscriberType === 'CUSTOMER' ? 'Customer *' : 'Entreprise *'}
                </label>
                {formData.subscriberType === 'MEMBER' ? (
                  <MemberAutocomplete
                    onSelect={(member) => {
                      setSelectedMember(member);
                      setSelectedCustomer(null);
                      setFormData(prev => ({
                        ...prev,
                        subscriberCode: member?.memberId || '',
                        subscriberType: 'MEMBER',
                      }));
                    }}
                    selectedMember={selectedMember}
                    placeholder="Rechercher un membre..."
                  />
                ) : (
                  <CustomerAutocomplete
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                      setSelectedMember(null);
                      setFormData(prev => ({
                        ...prev,
                        subscriberCode: customer?.customerId || '',
                      }));
                    }}
                    selectedCustomer={selectedCustomer}
                    typeFilter={formData.subscriberType === 'BUSINESS_ENTITY' ? 'COMPANY' : undefined}
                    placeholder={
                      formData.subscriberType === 'BUSINESS_ENTITY'
                        ? 'Rechercher une entreprise...'
                        : 'Rechercher un customer...'
                    }
                  />
                )}
                {formData.subscriberCode && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Code : {formData.subscriberCode}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Section 3 : Dates et options ─────────────── */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b flex items-center gap-2">
              <CalendarDays size={13} /> Dates et options
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de début *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex items-center pt-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.autoRenew}
                    onClick={() => setFormData(prev => ({ ...prev, autoRenew: !prev.autoRenew }))}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                      formData.autoRenew ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      formData.autoRenew ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Renouvellement automatique</p>
                    <p className="text-xs text-gray-400">Se renouvelle à la fin de chaque période</p>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* ── Section 4 : Métadonnées ───────────────────── */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b flex items-center gap-2">
              <RefreshCw size={13} /> Métadonnées
              <span className="normal-case font-normal text-gray-300">— optionnel</span>
            </h4>
            <textarea
              value={formData.metadataJson}
              onChange={(e) => setFormData({ ...formData, metadataJson: e.target.value })}
              placeholder='{"source": "backoffice", "campaign": "..."}'
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg font-mono text-sm resize-none ${
                formData.metadataJson && !isMetadataJsonValid
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
            {formData.metadataJson && !isMetadataJsonValid && (
              <p className="text-xs text-red-500 mt-1">⚠ JSON invalide</p>
            )}
          </section>

          {/* ── Récapitulatif ─────────────────────────────── */}
          {formData.planCode && formData.subscriberCode && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-3">Récapitulatif</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <span className="text-primary-400">Plan</span>
                <span className="text-primary-900 font-medium">{selectedPlan?.name || formData.planCode}</span>
                <span className="text-primary-400">Souscripteur</span>
                <span className="text-primary-900 font-mono text-xs">{formData.subscriberCode}</span>
                <span className="text-primary-400">Type</span>
                <span className="text-primary-900">{subscriberTypeOptions.find(o => o.value === formData.subscriberType)?.label}</span>
                <span className="text-primary-400">Cycle</span>
                <span className="text-primary-900">{billingCycles.find(c => c.value === formData.billingCycle)?.label}</span>
                <span className="text-primary-400">Début</span>
                <span className="text-primary-900">{new Date(formData.startDate).toLocaleDateString('fr-FR')}</span>
                <span className="text-primary-400">Renouvellement</span>
                <span className="text-primary-900">{formData.autoRenew ? '✅ Automatique' : 'Manuel'}</span>
              </div>
            </div>
          )}

          {/* ── Boutons ───────────────────────────────────── */}
          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-3 border rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.planCode ||
                !formData.subscriberCode ||
                !isMetadataJsonValid
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {createMutation.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Création...</>
                : 'Créer la souscription'}
            </button>
          </div>
        </form>
      )}
    </ModalPortal>
  );
};