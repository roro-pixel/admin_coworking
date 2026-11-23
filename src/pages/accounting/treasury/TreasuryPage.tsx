import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { BanksPanel } from "./BanksPanel";
import { ChequesPanel } from "./ChequesPanel";
import { RatesPanel } from "./RatesPanel";
import { CashPanel } from "./CashPanel";
import { BankSettingsPanel } from "./BankSettingsPanel";

type Tab = "banks" | "cheques" | "cash" | "rates" | "settings";
const TABS: TabItem<Tab>[] = [
  { id: "banks", label: "Banques" },
  { id: "cheques", label: "Chèques et remises" },
  { id: "cash", label: "Caisses" },
  { id: "rates", label: "Taux de change" },
  { id: "settings", label: "Paramétrage" },
];

export const TreasuryPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("banks");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "banks" && <BanksPanel />}
        {tab === "cheques" && <ChequesPanel />}
        {tab === "cash" && <CashPanel />}
        {tab === "rates" && <RatesPanel />}
        {tab === "settings" && <BankSettingsPanel />}
      </div>
    </AccountingShell>
  );
};
