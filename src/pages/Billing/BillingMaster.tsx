import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  BarChart3,
  FileText,
  Package,
  User,
  CalendarClock,
  FilePlus2,
  Wrench,
  Search,
} from "lucide-react";
import { BillingDocumentsList } from "./BillingDocumentsList";
import { BillingCustomerStatement } from "./BillingCustomerStatement";
import { BillingCatalogManager } from "./BillingCatalogManager";
import { BillingAgingReport } from "./BillingAgingReport";
import { BillingScheduleManager } from "./BillingScheduleManager";
import { BillingSourceInvoiceManager } from "./BillingSourceInvoiceManager";
import { BillingDocumentTools } from "./BillingDocumentTools";
import { BillingCatalogLookupPanel } from "./BillingCatalogLookupPanel";

type TabId =
  | "documents"
  | "sources"
  | "tools"
  | "statement"
  | "schedules"
  | "catalog"
  | "lookup"
  | "aging";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "sources", label: "Sources métier", icon: FilePlus2 },
  { id: "tools", label: "Outils", icon: Wrench },
  { id: "statement", label: "Relevé client", icon: User },
  { id: "schedules", label: "Échéanciers", icon: CalendarClock },
  { id: "catalog", label: "Catalogue", icon: Package },
  { id: "lookup", label: "Recherche catalogue", icon: Search },
  { id: "aging", label: "Créances", icon: BarChart3 },
];

export const BillingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("documents");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["documents"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
        <p className="text-gray-600 mt-1">
          Gérez les factures, devis, avoirs et relevés clients
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {visitedTabs.has("documents") && (
          <div className={activeTab !== "documents" ? "hidden" : ""}>
            <BillingDocumentsList />
          </div>
        )}

        {visitedTabs.has("sources") && (
          <div className={activeTab !== "sources" ? "hidden" : ""}>
            <BillingSourceInvoiceManager />
          </div>
        )}
        {visitedTabs.has("tools") && (
          <div className={activeTab !== "tools" ? "hidden" : ""}>
            <BillingDocumentTools />
          </div>
        )}
        {visitedTabs.has("statement") && (
          <div className={activeTab !== "statement" ? "hidden" : ""}>
            <BillingCustomerStatement />
          </div>
        )}
        {visitedTabs.has("schedules") && (
          <div className={activeTab !== "schedules" ? "hidden" : ""}>
            <BillingScheduleManager />
          </div>
        )}
        {visitedTabs.has("catalog") && (
          <div className={activeTab !== "catalog" ? "hidden" : ""}>
            <BillingCatalogManager />
          </div>
        )}

        {visitedTabs.has("lookup") && (
          <div className={activeTab !== "lookup" ? "hidden" : ""}>
            <BillingCatalogLookupPanel />
          </div>
        )}
        {visitedTabs.has("aging") && (
          <div className={activeTab !== "aging" ? "hidden" : ""}>
            <BillingAgingReport />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
