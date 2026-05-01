import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { BarChart3, CreditCard, Clock, Wallet, TrendingUp, Building2 } from 'lucide-react';
import { FinanceDashboard } from './FinanceDashboard';
import { PaymentsReport } from './PaymentsReport';
import { AgingReport } from './AgingReport';
import { CashRegistersReport } from './CashRegistersReport';
import { CashFlowReport } from './CashFlowReport';
import { OccupancyReport } from './OccupancyReport';

type TabId = 'dashboard' | 'payments' | 'aging' | 'cash-registers' | 'cash-flow' | 'occupancy';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',      label: 'Tableau de bord', icon: BarChart3 },
  { id: 'payments',       label: 'Paiements',       icon: CreditCard },
  { id: 'aging',          label: 'Vieillissement',  icon: Clock },
  { id: 'cash-registers', label: 'Caisses',         icon: Wallet },
  { id: 'cash-flow',      label: 'Flux trésorerie', icon: TrendingUp },
  { id: 'occupancy',      label: 'Occupation',      icon: Building2 },
];

export const ReportingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(['dashboard']));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-600 mt-1">Tableaux de bord financiers et taux d'occupation</p>
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
        {visitedTabs.has('dashboard') && (
          <div className={activeTab !== 'dashboard' ? 'hidden' : ''}>
            <FinanceDashboard />
          </div>
        )}
        {visitedTabs.has('payments') && (
          <div className={activeTab !== 'payments' ? 'hidden' : ''}>
            <PaymentsReport />
          </div>
        )}
        {visitedTabs.has('aging') && (
          <div className={activeTab !== 'aging' ? 'hidden' : ''}>
            <AgingReport />
          </div>
        )}
        {visitedTabs.has('cash-registers') && (
          <div className={activeTab !== 'cash-registers' ? 'hidden' : ''}>
            <CashRegistersReport />
          </div>
        )}
        {visitedTabs.has('cash-flow') && (
          <div className={activeTab !== 'cash-flow' ? 'hidden' : ''}>
            <CashFlowReport />
          </div>
        )}
        {visitedTabs.has('occupancy') && (
          <div className={activeTab !== 'occupancy' ? 'hidden' : ''}>
            <OccupancyReport />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};