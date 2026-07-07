import React, { useState } from "react";
import { TrendingUp, FileText } from "lucide-react";
import { CrmMaster } from "./Crmmaster";
import { ProposalsList } from "../../components/operations/proposals/ProposalsList";

type Tab = "crm" | "proposals";

export const CommercialCrmMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("crm");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["crm"]));
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-1">
        <button
          onClick={() => switchTab("crm")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "crm"
              ? "bg-primary-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <TrendingUp size={16} /> Leads & pipeline
        </button>
        <button
          onClick={() => switchTab("proposals")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "proposals"
              ? "bg-primary-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <FileText size={16} /> Propositions commerciales
        </button>
        </div>
      </div>

      {visitedTabs.has("crm") && (
  <div
    className={`${activeTab !== "crm" ? "hidden" : ""} w-full`}
  >
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
