import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Package, Tags, Users, Ticket, BarChart3 } from 'lucide-react';
import { PlansList } from './plans/PlansList';
import { EntitlementDefinitionsList } from './entitlements/EntitlementDefinitionsList';
import { SubscriptionsList } from './subscriptions/SubscriptionsList';
import { PromotionsList } from './promotions/PromotionsList';
import { SubscriptionMetrics } from './metrics/SubscriptionMetrics';

type TabId = 'metrics' | 'plans' | 'entitlements' | 'subscriptions' | 'promotions';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'metrics', label: 'Métriques', icon: BarChart3 },
  { id: 'plans', label: 'Plans', icon: Package },
  { id: 'entitlements', label: 'Droits', icon: Tags },
  { id: 'subscriptions', label: 'Souscriptions', icon: Users },
  { id: 'promotions', label: 'Promotions', icon: Ticket },
];

export const SubscriptionMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('metrics');
  // CORRECTION : garde une trace des onglets déjà visités pour ne pas les démonter
  // Évite de re-fetcher les données à chaque changement d'onglet
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(['metrics']));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-gray-600 mt-1">Gérez les plans, souscriptions et promotions</p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CORRECTION : rendu conditionnel avec display:none sur les onglets déjà visités
          pour éviter de démonter/remonter les composants (et donc de re-fetcher)
          à chaque changement d'onglet, tout en ne montant un composant qu'à sa
          première visite (évite les fetches inutiles au chargement initial). */}
      <div className="mt-6">
        {visitedTabs.has('metrics') && (
          <div className={activeTab !== 'metrics' ? 'hidden' : ''}>
            <SubscriptionMetrics />
          </div>
        )}
        {visitedTabs.has('plans') && (
          <div className={activeTab !== 'plans' ? 'hidden' : ''}>
            <PlansList />
          </div>
        )}
        {visitedTabs.has('entitlements') && (
          <div className={activeTab !== 'entitlements' ? 'hidden' : ''}>
            <EntitlementDefinitionsList />
          </div>
        )}
        {visitedTabs.has('subscriptions') && (
          <div className={activeTab !== 'subscriptions' ? 'hidden' : ''}>
            <SubscriptionsList />
          </div>
        )}
        {visitedTabs.has('promotions') && (
          <div className={activeTab !== 'promotions' ? 'hidden' : ''}>
            <PromotionsList />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};