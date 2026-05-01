import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { 
  Package, 
  MapPin, 
  Boxes, 
  TrendingUp, 
  Truck, 
  ClipboardList, 
  Bell, 
  ShoppingCart,
  FileText,
  Upload
} from 'lucide-react';
import { ItemsList } from './catalog/ItemsList';
import { CategoriesList } from './catalog/CategoriesList';
import { UnitsList } from './catalog/UnitsList';
import { LocationsList } from './locations/LocationsList';
import { StockLevels } from './stock/StockLevels';
import { StockMovements } from './stock/StockMovements';
import { SuppliersList } from './procurement/SuppliersList';
import { PurchaseRequestsList } from './procurement/PurchaseRequestsList';
import { PurchaseOrdersList } from './procurement/PurchaseOrdersList';
import { AssetsList } from './assets/AssetsList';
import { AlertsCenter } from './intelligence/AlertsCenter';
import { ReorderRulesList } from './intelligence/ReorderRulesList';
import { InventoryDashboard } from './admin/InventoryDashboard';
import { ReportsPage } from './admin/ReportsPage';
import { ImportPage } from './admin/ImportPage';
import { InventoryCountsList } from './control/InventoryCountsList';

const mainTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Package },
  { id: 'catalog', label: 'Catalogue', icon: Boxes },
  { id: 'locations', label: 'Emplacements', icon: MapPin },
  { id: 'stock', label: 'Stock', icon: TrendingUp },
  { id: 'procurement', label: 'Achats', icon: ShoppingCart },
  { id: 'assets', label: 'Actifs', icon: ClipboardList },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'reorder', label: 'Réappro', icon: Truck },
  { id: 'counts', label: 'Comptages', icon: ClipboardList },
  { id: 'reports', label: 'Rapports', icon: FileText },
  { id: 'import', label: 'Import', icon: Upload },
];

// Sous-onglets pour Catalogue
const catalogSubTabs = [
  { id: 'items', label: 'Articles', icon: Package },
  { id: 'categories', label: 'Catégories', icon: Boxes },
  { id: 'units', label: 'Unités', icon: TrendingUp },
];

// Sous-onglets pour Achats
const procurementSubTabs = [
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
  { id: 'requests', label: 'Demandes', icon: FileText },
  { id: 'orders', label: 'Bons de commande', icon: ShoppingCart },
];

export const InventoryMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(new Set(['dashboard']));

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => new Set([...prev, tabId]));
  };
  const [activeCatalogSubTab, setActiveCatalogSubTab] = useState('items');
  const [activeProcurementSubTab, setActiveProcurementSubTab] = useState('suppliers');

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion d'inventaire</h1>
        <p className="text-gray-600 mt-1">Gérez vos articles, stocks, achats et actifs</p>
      </div>

      {/* Onglets principaux - version responsive avec wrap */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {mainTabs.map((tab) => {
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

      {/* Contenu — visitedTabs évite de remonter les composants à chaque clic */}
      <div className="mt-6">
        {visitedTabs.has('dashboard') && <div className={activeTab !== 'dashboard' ? 'hidden' : ''}><InventoryDashboard /></div>}
        {visitedTabs.has('catalog') && (
          <div className={activeTab !== 'catalog' ? 'hidden' : ''}>
            <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
              {catalogSubTabs.map((subTab) => { const Icon = subTab.icon; return (
                <button key={subTab.id} onClick={() => setActiveCatalogSubTab(subTab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeCatalogSubTab === subTab.id ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  <Icon size={16} />{subTab.label}
                </button>
              ); })}
            </div>
            <div className={activeCatalogSubTab !== 'items' ? 'hidden' : ''}><ItemsList /></div>
            <div className={activeCatalogSubTab !== 'categories' ? 'hidden' : ''}><CategoriesList /></div>
            <div className={activeCatalogSubTab !== 'units' ? 'hidden' : ''}><UnitsList /></div>
          </div>
        )}
        {visitedTabs.has('locations') && <div className={activeTab !== 'locations' ? 'hidden' : ''}><LocationsList /></div>}
        {visitedTabs.has('stock') && (
          <div className={activeTab !== 'stock' ? 'hidden' : ''}>
            <div className="space-y-8"><StockLevels /><StockMovements /></div>
          </div>
        )}
        {visitedTabs.has('procurement') && (
          <div className={activeTab !== 'procurement' ? 'hidden' : ''}>
            <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
              {procurementSubTabs.map((subTab) => { const Icon = subTab.icon; return (
                <button key={subTab.id} onClick={() => setActiveProcurementSubTab(subTab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeProcurementSubTab === subTab.id ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  <Icon size={16} />{subTab.label}
                </button>
              ); })}
            </div>
            <div className={activeProcurementSubTab !== 'suppliers' ? 'hidden' : ''}><SuppliersList /></div>
            <div className={activeProcurementSubTab !== 'requests' ? 'hidden' : ''}><PurchaseRequestsList /></div>
            <div className={activeProcurementSubTab !== 'orders' ? 'hidden' : ''}><PurchaseOrdersList /></div>
          </div>
        )}
        {visitedTabs.has('assets') && <div className={activeTab !== 'assets' ? 'hidden' : ''}><AssetsList /></div>}
        {visitedTabs.has('alerts') && <div className={activeTab !== 'alerts' ? 'hidden' : ''}><AlertsCenter /></div>}
        {visitedTabs.has('reorder') && <div className={activeTab !== 'reorder' ? 'hidden' : ''}><ReorderRulesList /></div>}
        {visitedTabs.has('counts') && <div className={activeTab !== 'counts' ? 'hidden' : ''}><InventoryCountsList /></div>}
        {visitedTabs.has('reports') && <div className={activeTab !== 'reports' ? 'hidden' : ''}><ReportsPage /></div>}
        {visitedTabs.has('import') && <div className={activeTab !== 'import' ? 'hidden' : ''}><ImportPage /></div>}
      </div>
    </AdminLayout>
  );
};