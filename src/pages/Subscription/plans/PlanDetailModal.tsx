import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Calendar, Tag } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { Plan, PlanVersion, EntitlementDefinition } from '../../../services/subscription.service';
import { PlanVersionFormModal } from './PlanVersionFormModal';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
}

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: 'Unique',
  DAILY: 'Journalier',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  YEARLY: 'Annuel',
};

const planTypeLabels: Record<string, string> = {
  MEMBERSHIP: 'Adhésion',
  COWORKING_ACCESS: 'Accès coworking',
  DEDICATED_DESK: 'Bureau dédié',
  PRIVATE_OFFICE: 'Bureau privé',
  MEETING_ROOM_PACK: 'Pack salle de réunion',
  VIRTUAL_OFFICE: 'Bureau virtuel',
  COMPANY_PLAN: 'Plan entreprise',
  CUSTOM: 'Personnalisé',
};

const targetAudienceLabels: Record<string, string> = {
  INDIVIDUAL: 'Particulier',
  COMPANY: 'Entreprise',
  BOTH: 'Les deux',
};

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ isOpen, onClose, plan }) => {
  const queryClient = useQueryClient();
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);

  // CORRECTION : `enabled: isOpen` garanti qu'on ne fetch que quand le modal est ouvert
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['plan-versions', plan.code],
    queryFn: () => subscriptionService.getPlanVersions(plan.code),
    enabled: isOpen,
  });

  // CORRECTION : récupération des entitlementDefinitions avec gestion correcte du wrapper data
  const { data: entitlementDefinitionsData } = useQuery({
    queryKey: ['entitlement-definitions'],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
    enabled: isOpen,
  });

  // CORRECTION : accès sécurisé à content, compatible avec les deux formats de réponse API
  const entitlementDefinitions: EntitlementDefinition[] = entitlementDefinitionsData?.content || [];

  const publishMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: number }) =>
      subscriptionService.publishPlanVersion(plan.code, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', plan.code] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: () => {
      alert('Erreur lors de la publication de la version.');
    },
  });

  // CORRECTION : recherche dans la liste correcte (entitlementDefinitions et non entitlementDefinitionsData?.content)
  const getEntitlementName = (code: string): string => {
    const def = entitlementDefinitions.find((d: EntitlementDefinition) => d.code === code);
    return def?.name || code;
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
        <div>
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-sm text-gray-500">Code: {plan.code}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {/* Informations du plan */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium">{planTypeLabels[plan.planType] || plan.planType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Public cible</p>
            <p className="font-medium">{targetAudienceLabels[plan.targetAudience] || plan.targetAudience}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Statut</p>
            <p className="font-medium">{plan.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Visible</p>
            <p className="font-medium">{plan.visible ? 'Oui' : 'Non'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ordre d'affichage</p>
            <p className="font-medium">{plan.sortOrder}</p>
          </div>
          {plan.description && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm">{plan.description}</p>
            </div>
          )}
        </div>

        {/* Versions */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Versions</h4>
          <button
            onClick={() => {
              setSelectedVersion(null);
              setIsVersionModalOpen(true);
            }}
            className="bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 flex items-center gap-1 text-sm"
          >
            <Plus size={14} />
            Nouvelle version
          </button>
        </div>

        {versionsLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Aucune version pour ce plan. Créez-en une !
          </div>
        ) : (
          <div className="space-y-4">
            {/* CORRECTION : tri des versions par numéro décroissant (la plus récente en premier) */}
            {[...versions]
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((version) => (
              <div key={version.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold">Version {version.versionNumber}</h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        version.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        version.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {version.status === 'ACTIVE' ? 'Active' :
                         version.status === 'DRAFT' ? 'Brouillon' : 'Archivée'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{version.name}</p>
                    {version.description && (
                      <p className="text-xs text-gray-500 mt-1">{version.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Effet: {new Date(version.effectiveFrom).toLocaleDateString('fr-FR')}
                      </span>
                      {version.effectiveTo && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Fin: {new Date(version.effectiveTo).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {/* CORRECTION : termsJson affiché de manière lisible si c'est du JSON valide */}
                    {version.termsJson && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                        <span className="font-medium">Conditions: </span>
                        {(() => {
                          try {
                            const parsed = JSON.parse(version.termsJson);
                            return Object.entries(parsed)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ');
                          } catch {
                            return version.termsJson;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {version.status === 'DRAFT' && (
                      <button
                        onClick={() => publishMutation.mutate({ versionId: version.id })}
                        disabled={publishMutation.isPending}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                      >
                        {publishMutation.isPending ? '...' : 'Publier'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedVersion(version);
                        setIsVersionModalOpen(true);
                      }}
                      className="px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Voir détails
                    </button>
                  </div>
                </div>

                {/* Prix */}
                {version.prices && version.prices.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Tarifs</p>
                    <div className="flex flex-wrap gap-2">
                      {version.prices.map((price, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {price.amount.toLocaleString('fr-FR')} {price.currency}
                          {' / '}
                          {billingCycleLabels[price.billingCycle] || price.billingCycle}
                          {price.setupFee > 0 && ` + ${price.setupFee.toLocaleString('fr-FR')} ${price.currency} setup`}
                          {price.commitmentMonths > 0 && ` (${price.commitmentMonths} mois)`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bénéfices */}
                {version.benefits && version.benefits.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Avantages</p>
                    <div className="flex flex-wrap gap-2">
                      {version.benefits
                        .slice()
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((benefit, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${
                            benefit.highlighted ? 'bg-primary-50 text-primary-700' : 'bg-gray-100'
                          }`}
                        >
                          {benefit.icon && <span className="text-xs">{benefit.icon}</span>}
                          {benefit.title}
                          {benefit.category && (
                            <span className="text-xs text-gray-400">({benefit.category})</span>
                          )}
                          {benefit.highlighted && <Tag size={12} className="text-primary-600" />}
                          {!benefit.included && (
                            <span className="text-xs text-gray-400 line-through">non inclus</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Droits */}
                {version.entitlements && version.entitlements.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Droits inclus</p>
                    <div className="flex flex-wrap gap-2">
                      {version.entitlements
                        .slice()
                        .sort((a, b) => a.priority - b.priority)
                        .map((ent, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 rounded-full text-sm"
                          title={ent.restrictionsJson || ''}
                        >
                          <span className="font-medium">{getEntitlementName(ent.entitlementCode)}</span>
                          {': '}
                          {ent.unlimited ? 'Illimité' : ent.quantity}
                          {ent.rolloverAllowed && ` (report: ${ent.rolloverLimit})`}
                          {ent.validForDays > 0 && ` — ${ent.validForDays}j`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PlanVersionFormModal
        isOpen={isVersionModalOpen}
        onClose={() => {
          setIsVersionModalOpen(false);
          setSelectedVersion(null);
        }}
        planCode={plan.code}
        editingVersion={selectedVersion}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['plan-versions', plan.code] });
          setIsVersionModalOpen(false);
          setSelectedVersion(null);
        }}
      />
    </ModalPortal>
  );
};