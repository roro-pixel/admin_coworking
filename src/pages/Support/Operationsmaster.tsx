import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { HeadphonesIcon, Users, TrendingUp, CheckSquare } from "lucide-react";
import { SupportMaster } from "./Supportmaster";
import { VisitorMaster } from "./Visitormaster";
import { CommercialCrmMaster } from "./CommercialCrmMaster";
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
        <h1 className="text-lg sm:text-xl sm:text-2xl font-bold text-gray-900">Opérations</h1>
        <p className="text-gray-600 mt-1">
          Support, Visiteurs, CRM et Gestion des tâches
        </p>
      </div>

      {/* Onglets principaux */}
      <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
        </div>
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
            <CommercialCrmMaster />
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
