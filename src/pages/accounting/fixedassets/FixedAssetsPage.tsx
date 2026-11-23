import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { AssetsPanel } from "./AssetsPanel";
import { CategoriesPanel, ProfilesPanel } from "./SettingsPanels";
import { DepreciationPanel } from "./DepreciationPanel";
import { InventoriesPanel } from "./InventoriesPanel";
import { ReportsPanel } from "./ReportsPanel";
import { ControlsPanel } from "./ControlsPanel";

type Tab = "assets" | "depreciation" | "inventories" | "reports" | "controls" | "categories" | "profiles";
const TABS: TabItem<Tab>[] = [
  { id: "assets", label: "Fichier" },
  { id: "depreciation", label: "Dotations" },
  { id: "inventories", label: "Inventaires" },
  { id: "reports", label: "États" },
  { id: "controls", label: "Contrôles" },
  { id: "categories", label: "Catégories" },
  { id: "profiles", label: "Profils" },
];

export const FixedAssetsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("assets");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "assets" && <AssetsPanel />}
        {tab === "depreciation" && <DepreciationPanel />}
        {tab === "inventories" && <InventoriesPanel />}
        {tab === "reports" && <ReportsPanel />}
        {tab === "controls" && <ControlsPanel />}
        {tab === "categories" && <CategoriesPanel />}
        {tab === "profiles" && <ProfilesPanel />}
      </div>
    </AccountingShell>
  );
};
