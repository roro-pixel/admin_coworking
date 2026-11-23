import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { BudgetsPanel } from "./BudgetsPanel";
import { FollowUpPanel } from "./FollowUpPanel";
import { ItemsPanel } from "./ItemsPanel";
import { ForecastsPanel, TransfersPanel } from "./ForecastsTransfersPanel";

type Tab = "budgets" | "follow" | "forecasts" | "transfers" | "items";
const TABS: TabItem<Tab>[] = [
  { id: "budgets", label: "Budgets" },
  { id: "follow", label: "Suivi" },
  { id: "forecasts", label: "Prévisions" },
  { id: "transfers", label: "Virements" },
  { id: "items", label: "Nomenclature" },
];

export const BudgetPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("budgets");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "budgets" && <BudgetsPanel />}
        {tab === "follow" && <FollowUpPanel />}
        {tab === "forecasts" && <ForecastsPanel />}
        {tab === "transfers" && <TransfersPanel />}
        {tab === "items" && <ItemsPanel />}
      </div>
    </AccountingShell>
  );
};
