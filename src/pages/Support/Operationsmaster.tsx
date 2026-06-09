import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { HeadphonesIcon, Users, TrendingUp, CheckSquare } from "lucide-react";
import { SupportMaster } from "./Supportmaster";
import { VisitorMaster } from "./Visitormaster";
import { CrmMaster } from "./Crmmaster";
import { TaskMaster } from "./Taskmaster";

type MainTab = "support" | "visitor" | "crm" | "task";

const tabs: { id: MainTab; label: string; icon: React.FC<any> }[] = [
  { id: "support", label: "Support", icon: HeadphonesIcon },
  { id: "visitor", label: "Visiteurs", icon: Users },
  { id: "crm", label: "CRM", icon: TrendingUp },
  { id: "task", label: "Tâches", icon: CheckSquare },
];

export const OperationsMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>("support");
  const [visitedTabs, setVisitedTabs] = useState<Set<MainTab>>(
    new Set(["support"]),
  );

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opérations</h1>
        <p className="text-gray-600 mt-1">
          Support, Visiteurs, CRM et Gestion des tâches
        </p>
      </div>

      {/* Onglets principaux */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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

      {/* Contenu — visitedTabs évite de remonter les composants */}
      <div>
        {visitedTabs.has("support") && (
          <div className={activeTab !== "support" ? "hidden" : ""}>
            <SupportMaster />
          </div>
        )}
        {visitedTabs.has("visitor") && (
          <div className={activeTab !== "visitor" ? "hidden" : ""}>
            <VisitorMaster />
          </div>
        )}
        {visitedTabs.has("crm") && (
          <div className={activeTab !== "crm" ? "hidden" : ""}>
            <CrmMaster />
          </div>
        )}
        {visitedTabs.has("task") && (
          <div className={activeTab !== "task" ? "hidden" : ""}>
            <TaskMaster />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
