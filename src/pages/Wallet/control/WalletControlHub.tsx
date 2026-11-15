import React, { useState } from "react";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { ControlDashboard } from "./ControlDashboard";
import { PendingActionsPanel } from "./PendingActionsPanel";
import { FlagsPanel } from "./FlagsPanel";
import { TreasuryPanel } from "./TreasuryPanel";

type ControlTab = "dashboard" | "approvals" | "flags" | "treasury";

const TABS: TabItem<ControlTab>[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "approvals", label: "Approbations" },
  { id: "flags", label: "Alertes" },
  { id: "treasury", label: "Trésorerie" },
];

/** Onglet Contrôle : tableau de bord, second visa, alertes et trésorerie. */
export const WalletControlHub: React.FC = () => {
  const [tab, setTab] = useState<ControlTab>("dashboard");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={TABS} active={tab} onChange={setTab} />
      {tab === "dashboard" && <ControlDashboard />}
      {tab === "approvals" && <PendingActionsPanel />}
      {tab === "flags" && <FlagsPanel />}
      {tab === "treasury" && <TreasuryPanel />}
    </div>
  );
};
