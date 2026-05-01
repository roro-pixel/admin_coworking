import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, Play, Pause, XCircle, RefreshCw } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { Subscription, SubscriptionEntitlement } from '../../../services/subscription.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface SubscriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  PENDING_ACTIVATION: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  PAST_DUE: { label: 'En retard', color: 'bg-red-100 text-red-700' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
  EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-500' },
};

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: 'Unique',
  DAILY: 'Journalier',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  YEARLY: 'Annuel',
};

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  isOpen,
  onClose,
  subscription: initialSubscription,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'entitlements' | 'history' | 'billing'>('info');

  // Refresh de la souscription pour avoir les données à jour après une action
  const { data: refreshedSubscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription', initialSubscription.subscriptionNumber],
    queryFn: () => subscriptionService.getSubscription(initialSubscription.subscriptionNumber),
    enabled: isOpen,
  });

  const { data: entitlements } = useQuery({
    queryKey: ['subscription-entitlements', initialSubscription.subscriptionNumber],
    queryFn: () => subscriptionService.getSubscriptionEntitlements(initialSubscription.subscriptionNumber),
    enabled: isOpen && activeTab === 'entitlements',
  });

  const { data: history } = useQuery({
    queryKey: ['subscription-history', initialSubscription.subscriptionNumber],
    queryFn: () => subscriptionService.getSubscriptionHistory(initialSubscription.subscriptionNumber),
    enabled: isOpen && activeTab === 'history',
  });

  const { data: billingScheduleRaw } = useQuery({
    queryKey: ['subscription-billing', initialSubscription.subscriptionNumber],
    queryFn: () => subscriptionService.getSubscriptionBillingSchedule(initialSubscription.subscriptionNumber),
    enabled: isOpen && activeTab === 'billing',
  });

  // CORRECTION : gestion défensive du format billing schedule
  // L'API peut retourner { items: [...] } ou directement un tableau
  const billingItems: any[] = Array.isArray(billingScheduleRaw)
    ? billingScheduleRaw
    : billingScheduleRaw?.items || billingScheduleRaw?.content || [];

  const subscription = refreshedSubscription || initialSubscription;

  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    refetchSubscription();
  };

  const activateMutation = useMutation({
    mutationFn: () => subscriptionService.activateSubscription(subscription.subscriptionNumber, 'Activé par admin'),
    onSuccess: invalidateAndRefetch,
    onError: () => alert('Erreur lors de l\'activation.'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => subscriptionService.suspendSubscription(subscription.subscriptionNumber, 'Suspendu par admin'),
    onSuccess: invalidateAndRefetch,
    onError: () => alert('Erreur lors de la suspension.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelSubscription(subscription.subscriptionNumber, 'Annulé par admin'),
    onSuccess: invalidateAndRefetch,
    onError: () => alert('Erreur lors de l\'annulation.'),
  });

  const renewMutation = useMutation({
    mutationFn: () => subscriptionService.renewSubscription(subscription.subscriptionNumber, 'Renouvelé par admin'),
    onSuccess: () => {
      invalidateAndRefetch();
      // Invalide aussi entitlements et billing qui changent au renouvellement
      queryClient.invalidateQueries({ queryKey: ['subscription-entitlements', subscription.subscriptionNumber] });
      queryClient.invalidateQueries({ queryKey: ['subscription-billing', subscription.subscriptionNumber] });
    },
    onError: () => alert('Erreur lors du renouvellement.'),
  });

  const anyPending = activateMutation.isPending || suspendMutation.isPending ||
    cancelMutation.isPending || renewMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
        <div>
          <h3 className="text-xl font-bold">{subscription.planName}</h3>
          <p className="text-sm text-gray-500">N° {subscription.subscriptionNumber}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2 p-4 border-b bg-gray-50">
        {subscription.status === 'PENDING_ACTIVATION' && (
          <button
            onClick={() => activateMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Play size={14} />
            Activer
          </button>
        )}
        {subscription.status === 'ACTIVE' && (
          <>
            <button
              onClick={() => suspendMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Pause size={14} />
              Suspendre
            </button>
            <button
              onClick={() => renewMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Renouveler
            </button>
          </>
        )}
        {(subscription.status === 'ACTIVE' || subscription.status === 'SUSPENDED') && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <XCircle size={14} />
            Annuler
          </button>
        )}
        {anyPending && (
          <span className="text-xs text-gray-500 self-center ml-2 animate-pulse">
            Opération en cours...
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {(['info', 'entitlements', 'history', 'billing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? 'Informations' :
               tab === 'entitlements' ? 'Droits' :
               tab === 'history' ? 'Historique' : 'Facturation'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Souscripteur */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-500 mb-1 font-medium">Souscripteur</p>
              <p className="font-semibold text-blue-900">{subscription.subscriberName || subscription.subscriberCode}</p>
              <p className="text-xs text-blue-600 font-mono">{subscription.subscriberType} · {subscription.subscriberCode}</p>
            </div>

            {/* Statut + montants */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs ${statusConfig[subscription.status]?.color}`}>
                  {statusConfig[subscription.status]?.label || subscription.status}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cycle de facturation</p>
                <p className="font-medium text-sm">{billingCycleLabels[subscription.billingCycle] || subscription.billingCycle}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Sous-total</p>
                <p className="font-medium">{(subscription.subtotalAmount ?? 0).toLocaleString('fr-FR')} {subscription.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total TTC</p>
                <p className="font-bold text-green-700">{(subscription.totalAmount ?? 0).toLocaleString('fr-FR')} {subscription.currency}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Début</p>
                <p className="font-medium text-sm">{new Date(subscription.startDate).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fin</p>
                <p className="font-medium text-sm">
                  {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              {subscription.currentPeriodStart && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Début période actuelle</p>
                  <p className="font-medium text-sm">{new Date(subscription.currentPeriodStart).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Fin période actuelle</p>
                  <p className="font-medium text-sm">{new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {subscription.nextBillingDate && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600">Prochaine facturation</p>
                  <p className="font-semibold text-amber-800 text-sm">{new Date(subscription.nextBillingDate).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Renouvellement auto</p>
                <p className="font-medium text-sm">{subscription.autoRenew ? '✅ Oui' : '❌ Non'}</p>
              </div>
            </div>

            {/* Plan + version + contrat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Plan</p>
                <p className="font-medium text-sm">{subscription.planName}</p>
                <p className="text-xs text-gray-400 font-mono">{subscription.planCode}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Version du plan</p>
                <p className="font-medium text-sm">v{subscription.planVersion}</p>
              </div>
              {subscription.contractCode && (
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Contrat lié</p>
                  <p className="font-mono text-sm text-primary-600">{subscription.contractCode}</p>
                </div>
              )}
              {subscription.cancelAtPeriodEnd !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Annulation en fin de période</p>
                  <p className="font-medium text-sm">{subscription.cancelAtPeriodEnd ? '✅ Oui' : 'Non'}</p>
                </div>
              )}
            </div>

            {subscription.metadataJson && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Métadonnées</p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {(() => {
                    try { return JSON.stringify(JSON.parse(subscription.metadataJson!), null, 2); }
                    catch { return subscription.metadataJson; }
                  })()}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'entitlements' && (
          <div className="space-y-3">
            {entitlements?.map((ent: SubscriptionEntitlement, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{ent.entitlementName}</p>
                    <p className="text-sm text-gray-500 font-mono">{ent.entitlementCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {ent.unlimited ? 'Illimité' : `${ent.remainingQuantity} / ${ent.quantity}`}
                    </p>
                    {!ent.unlimited && (
                      <p className="text-xs text-gray-500">
                        Utilisé : {ent.usedQuantity}
                      </p>
                    )}
                  </div>
                </div>
                {(ent.validFrom || ent.validUntil) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {ent.validFrom && `Du ${new Date(ent.validFrom).toLocaleDateString('fr-FR')}`}
                    {ent.validUntil && ` au ${new Date(ent.validUntil).toLocaleDateString('fr-FR')}`}
                  </p>
                )}
              </div>
            ))}
            {(!entitlements || entitlements.length === 0) && (
              <p className="text-center text-gray-500 py-8">Aucun droit associé</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {history?.map((event: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.eventType}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.occurredAt).toLocaleString('fr-FR')}
                  </p>
                  {event.description && (
                    <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
            {(!history || history.length === 0) && (
              <p className="text-center text-gray-500 py-8">Aucun historique</p>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-3">
            {billingItems.map((item: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      Échéance : {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Montant : {(item.amount ?? item.totalAmount ?? 0).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    item.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.status === 'PAID' ? 'Payé' :
                     item.status === 'PENDING' ? 'En attente' : 'En retard'}
                  </span>
                </div>
              </div>
            ))}
            {billingItems.length === 0 && (
              <p className="text-center text-gray-500 py-8">Aucune échéance de facturation</p>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};