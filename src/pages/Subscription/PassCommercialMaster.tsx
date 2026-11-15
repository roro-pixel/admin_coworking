import React, { useState } from "react";
import { Ticket, Layers, ScanLine } from "lucide-react";
import { PassPlansList } from "./pass-plans/PassPlansList";
import { PassesList } from "./passes/PassesList";
import { PassAccessPanel } from "./passes/PassAccessPanel";
import { Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";

type Tab = "plans" | "passes" | "access";

const tabs: TabItem<Tab>[] = [
  { id: "plans", label: "Plans de pass", icon: Layers },
  { id: "passes", label: "Passes", icon: Ticket },
  { id: "access", label: "Contrôle d'accès", icon: ScanLine },
];

/** Rendu dans l'onglet "Pass commercial" de SubscriptionMaster (qui fournit layout, thème et Toaster). */
export const PassCommercialMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["plans"]));

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <div className="space-y-6">
      <Tabs variant="soft" items={tabs} active={activeTab} onChange={switchTab} />

      {visitedTabs.has("plans") && (
        <div className={activeTab !== "plans" ? "hidden" : ""}>
          <PassPlansList />
        </div>
      )}
      {visitedTabs.has("passes") && (
        <div className={activeTab !== "passes" ? "hidden" : ""}>
          <PassesList />
        </div>
      )}
      {visitedTabs.has("access") && (
        <div className={activeTab !== "access" ? "hidden" : ""}>
          <PassAccessPanel />
        </div>
      )}
    </div>
  );
};