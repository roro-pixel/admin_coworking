import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { InvoicesPanel } from "./InvoicesPanel";
import { OrdersPanel } from "./OrdersPanel";
import { SuppliersPanel } from "./SuppliersPanel";
import { PayablesPanel } from "./PayablesPanel";
import { WithholdingsPanel } from "./WithholdingsPanel";

type Tab = "invoices" | "orders" | "suppliers" | "payables" | "withholdings";
const TABS: TabItem<Tab>[] = [
  { id: "invoices", label: "Factures" },
  { id: "orders", label: "Commandes" },
  { id: "suppliers", label: "Fournisseurs" },
  { id: "payables", label: "Échéancier" },
  { id: "withholdings", label: "Retenues" },
];

export const PurchasesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("invoices");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "invoices" && <InvoicesPanel />}
        {tab === "orders" && <OrdersPanel />}
        {tab === "suppliers" && <SuppliersPanel />}
        {tab === "payables" && <PayablesPanel />}
        {tab === "withholdings" && <WithholdingsPanel />}
      </div>
    </AccountingShell>
  );
};
