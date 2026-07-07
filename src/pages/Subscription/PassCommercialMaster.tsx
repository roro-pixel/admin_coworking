import React, { useState } from "react";
import { Ticket, Layers } from "lucide-react";
import { PassPlansList } from "./pass-plans/PassPlansList";
import { PassesList } from "./passes/PassesList";

type Tab = "plans" | "passes";
export const PassCommercialMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["plans"]));
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pass plans & passes
        </h1>
        <p className="mt-1 text-gray-600">
          Catalogue de pass, achat, activation, renouvellement et suivi.
        </p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => switchTab("plans")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${activeTab === "plans" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Layers size={16} /> Plans de pass
        </button>
        <button
          onClick={() => switchTab("passes")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${activeTab === "passes" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Ticket size={16} /> Passes
        </button>
      </div>
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
    </div>
  );
};
