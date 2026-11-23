import React from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { DashboardPanel } from "./DashboardPanel";
import { TimelinePanel } from "./TimelinePanel";
import { ActionsPanel } from "./ActionsPanel";
import { OperationsPanel } from "./OperationsPanel";
import { TrafficPanel } from "./TrafficPanel";
import { IntegrityPanel } from "./IntegrityPanel";

type Tab = "dashboard" | "timeline" | "actions" | "operations" | "traffic" | "integrity";
const TABS: TabItem<Tab>[] = [
  { id: "dashboard", label: "Tableau de bord" }, { id: "timeline", label: "Chronologie" }, { id: "actions", label: "Journal des actions" },
  { id: "operations", label: "Exploitation" }, { id: "traffic", label: "Trafic" }, { id: "integrity", label: "Intégrité" },
];

export const AuditPage: React.FC = () => {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "dashboard";
  return (
    <AdminLayout>
      <div style={brandVars} className="space-y-6">
        <Toaster />
        <PageHeader title="Audit" subtitle="Qui a fait quoi, ce que fait l'application, le trafic et les alertes. Chaque consultation de ce centre est elle-même journalisée." />
        <Tabs items={TABS} active={tab} onChange={(t) => setSp({ tab: t })} />
        {tab === "dashboard" && <DashboardPanel />}
        {tab === "timeline" && <TimelinePanel />}
        {tab === "actions" && <ActionsPanel />}
        {tab === "operations" && <OperationsPanel />}
        {tab === "traffic" && <TrafficPanel />}
        {tab === "integrity" && <IntegrityPanel />}
      </div>
    </AdminLayout>
  );
};
