import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Wallet, Search, PlusCircle } from "lucide-react";
import { WalletsList } from "./WalletsList";
import { WalletLookupPanel } from "./WalletLookupPanel";
import { WalletTopUpPanel } from "./WalletTopUpPanel";

type TabId = "list" | "lookup" | "topup";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "list", label: "Portefeuilles", icon: Wallet },
  { id: "lookup", label: "Recherche / Création", icon: Search },
  { id: "topup", label: "Top-up rapide", icon: PlusCircle },
];

export const WalletMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("list");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["list"]));

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portefeuilles</h1>
        <p className="text-gray-600 mt-1">
          Recherchez, créez automatiquement, créditez et suivez les
          portefeuilles clients.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {visitedTabs.has("list") && (
        <div className={activeTab !== "list" ? "hidden" : ""}>
          <WalletsList
            onOpenLookup={() => switchTab("lookup")}
            onOpenTopUp={() => switchTab("topup")}
          />
        </div>
      )}
      {visitedTabs.has("lookup") && (
        <div className={activeTab !== "lookup" ? "hidden" : ""}>
          <WalletLookupPanel />
        </div>
      )}
      {visitedTabs.has("topup") && (
        <div className={activeTab !== "topup" ? "hidden" : ""}>
          <WalletTopUpPanel />
        </div>
      )}
    </AdminLayout>
  );
};
