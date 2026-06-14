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
          Recherchez, créez automatiquement, créditez et suivez les portefeuilles clients.
        </p>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex min-w-max rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {visitedTabs.has("list") && (
        <div className={activeTab !== "list" ? "hidden" : ""}>
          <WalletsList onOpenLookup={() => switchTab("lookup")} onOpenTopUp={() => switchTab("topup")} />
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
