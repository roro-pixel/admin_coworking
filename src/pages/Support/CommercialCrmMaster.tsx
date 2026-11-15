import React, { useState } from "react";
import { TrendingUp, FileText } from "lucide-react";
import { Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { CrmMaster } from "./Crmmaster";
import { ProposalsList } from "../../components/operations/proposals/ProposalsList";

type Tab = "crm" | "proposals";

const tabs: TabItem<Tab>[] = [
  { id: "crm", label: "Leads & pipeline", icon: TrendingUp },
  { id: "proposals", label: "Propositions commerciales", icon: FileText },
];

export const CommercialCrmMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("crm");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["crm"]));
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <div className="w-full space-y-6">
      <Tabs variant="soft" items={tabs} active={activeTab} onChange={switchTab} />

      {visitedTabs.has("crm") && (
        <div className={`${activeTab !== "crm" ? "hidden" : ""} w-full`}>
          <CrmMaster />
        </div>
      )}
      {visitedTabs.has("proposals") && (
        <div className={`${activeTab !== "proposals" ? "hidden" : ""} w-full`}>
          <ProposalsList />
        </div>
      )}
    </div>
  );
};
