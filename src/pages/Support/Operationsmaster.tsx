import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { HeadphonesIcon, Users, TrendingUp, CheckSquare } from "lucide-react";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { SupportMaster } from "./Supportmaster";
import { VisitorMaster } from "./Visitormaster";
import { CommercialCrmMaster } from "./CommercialCrmMaster";
import { TaskMaster } from "./Taskmaster";

type MainTab = "support" | "visitor" | "crm" | "task";

const tabs: TabItem<MainTab>[] = [
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
      <div style={brandVars}>
        <Toaster />
        <PageHeader
          title="Opérations"
          subtitle="Support, visiteurs, CRM et gestion des tâches"
        />

        <Tabs items={tabs} active={activeTab} onChange={handleTabChange} />

        {/* Contenu : visitedTabs évite de remonter les composants */}
        <div className="mt-6">
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
      </div>
    </AdminLayout>
  );
};
