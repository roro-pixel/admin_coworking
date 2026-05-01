import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { CreditCard, Wallet, Clock, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { PaymentIntentsList } from './PaymentIntentsList';
import { CashRegistersList } from './CashRegistersList';
import { CashSessionsList } from './CashSessionsList';
import { CashMovementsList } from './CashMovementsList';
import { ReconciliationPanel } from './ReconciliationPanel';

type TabId = 'intents' | 'registers' | 'sessions' | 'movements' | 'reconciliation';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'intents',   label: 'Paiements',   icon: CreditCard     },
  { id: 'registers', label: 'Caisses',      icon: Wallet         },
  { id: 'sessions',  label: 'Sessions',     icon: Clock          },
  { id: 'movements',      label: 'Mouvements',      icon: ArrowLeftRight },
  { id: 'reconciliation', label: 'Réconciliation',  icon: BarChart3      },
];

export const PaymentMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('intents');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(['intents']));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paiements et Caisse</h1>
        <p className="text-gray-600 mt-1">Gérez les intentions de paiement et les sessions de caisse</p>
      </div>

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

      <div className="mt-6">
        {visitedTabs.has('intents') && (
          <div className={activeTab !== 'intents' ? 'hidden' : ''}>
            <PaymentIntentsList />
          </div>
        )}
        {visitedTabs.has('registers') && (
          <div className={activeTab !== 'registers' ? 'hidden' : ''}>
            <CashRegistersList />
          </div>
        )}
        {visitedTabs.has('sessions') && (
          <div className={activeTab !== 'sessions' ? 'hidden' : ''}>
            <CashSessionsList />
          </div>
        )}
        {visitedTabs.has('movements') && (
          <div className={activeTab !== 'movements' ? 'hidden' : ''}>
            <CashMovementsList />
          </div>
        )}
        {visitedTabs.has('reconciliation') && (
          <div className={activeTab !== 'reconciliation' ? 'hidden' : ''}>
            <ReconciliationPanel />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};