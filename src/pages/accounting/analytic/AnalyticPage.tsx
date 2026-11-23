import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { SectionsPanel } from "./SectionsPanel";
import { AxesPanel, DistributionPanel, KeysPanel, RulesPanel } from "./SettingsPanels";
import { AnalyticReportsPanel } from "./ReportsPanel";

type Tab = "sections" | "reports" | "distribution" | "rules" | "keys" | "axes";
const TABS: TabItem<Tab>[] = [
  { id: "sections", label: "Sections" },
  { id: "reports", label: "États" },
  { id: "distribution", label: "Ventilation" },
  { id: "rules", label: "Règles" },
  { id: "keys", label: "Clés" },
  { id: "axes", label: "Axes" },
];

export const AnalyticPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("sections");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "sections" && <SectionsPanel />}
        {tab === "reports" && <AnalyticReportsPanel />}
        {tab === "distribution" && <DistributionPanel />}
        {tab === "rules" && <RulesPanel />}
        {tab === "keys" && <KeysPanel />}
        {tab === "axes" && <AxesPanel />}
      </div>
    </AccountingShell>
  );
};
