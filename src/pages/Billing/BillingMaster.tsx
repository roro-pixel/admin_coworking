import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { FileText, User } from 'lucide-react';
import { BillingDocumentsList } from './BillingDocumentsList';
import { BillingCustomerStatement } from './BillingCustomerStatement';

type TabId = 'documents' | 'statement';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'documents', label: 'Documents',    icon: FileText },
  { id: 'statement', label: 'Relevé client', icon: User     },
];

export const BillingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('documents');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(['documents']));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
        <p className="text-gray-600 mt-1">Gérez les factures, devis, avoirs et relevés clients</p>
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
        {visitedTabs.has('documents') && (
          <div className={activeTab !== 'documents' ? 'hidden' : ''}>
            <BillingDocumentsList />
          </div>
        )}
        {visitedTabs.has('statement') && (
          <div className={activeTab !== 'statement' ? 'hidden' : ''}>
            <BillingCustomerStatement />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};