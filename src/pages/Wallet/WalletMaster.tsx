import React, { useState } from "react";
import { PlusCircle, Scale, Search, ShieldCheck, Wallet } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { WalletsList } from "./WalletsList";
import { WalletLookupPanel } from "./WalletLookupPanel";
import { WalletTopUpPanel } from "./WalletTopUpPanel";
import { WalletControlHub } from "./control/WalletControlHub";
import { WalletComplianceHub } from "./compliance/WalletComplianceHub";

type TabId = "list" | "lookup" | "topup" | "control" | "compliance";

const tabs: TabItem<TabId>[] = [
  { id: "list", label: "Portefeuilles", icon: Wallet },
  { id: "lookup", label: "Recherche et création", icon: Search },
  { id: "topup", label: "Top-up rapide", icon: PlusCircle },
  { id: "control", label: "Contrôle", icon: ShieldCheck },
  { id: "compliance", label: "Conformité", icon: Scale },
];

export const WalletMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("list");
  // Un onglet visité reste monté (état des formulaires conservé), les autres ne sont chargés qu'à la première visite.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["list"]));

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Portefeuilles" subtitle="Recherchez, créez, créditez, suivez et contrôlez les portefeuilles" />
        <div className="mb-6">
          <Tabs items={tabs} active={activeTab} onChange={switchTab} />
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
        {visitedTabs.has("control") && (
          <div className={activeTab !== "control" ? "hidden" : ""}>
            <WalletControlHub />
          </div>
        )}
        {visitedTabs.has("compliance") && (
          <div className={activeTab !== "compliance" ? "hidden" : ""}>
            <WalletComplianceHub />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
