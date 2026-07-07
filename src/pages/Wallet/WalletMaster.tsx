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
      <div className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
        <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">Portefeuilles</h1>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Recherchez, créez automatiquement, créditez et suivez les
          portefeuilles clients.
        </p>
      </div>

      <div className="mb-6 overflow-x-auto rounded-[1.35rem] bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-black transition-all whitespace-nowrap sm:px-4 sm:text-sm ${
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
