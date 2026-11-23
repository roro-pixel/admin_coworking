import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { EndpointConsole } from "../../../components/accounting/EndpointConsole";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { CLOSING_ENDPOINTS, CONFIRMATION_ENDPOINTS, STATEMENT_ENDPOINTS } from "./closingEndpoints";
import { MANAGEMENT_ENDPOINTS, TAX_ENDPOINTS } from "./managementEndpoints";

type Tab = "statements" | "closing" | "confirmations" | "management" | "tax";
const TABS: TabItem<Tab>[] = [
  { id: "statements", label: "États financiers" },
  { id: "closing", label: "Clôture" },
  { id: "confirmations", label: "Confirmations" },
  { id: "management", label: "Gestion" },
  { id: "tax", label: "Fiscal et liasse" },
];

export const ClosingPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("statements");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "statements" && <EndpointConsole title="États financiers" subtitle="Bilan, compte de résultat, tableau des flux et correspondance des comptes. Format csv ou pdf pour télécharger." endpoints={STATEMENT_ENDPOINTS} />}
        {tab === "closing" && <EndpointConsole title="Clôture de l'exercice" subtitle="Liste de clôture, à-nouveaux, éditions définitives, notes annexes et justification des soldes." endpoints={CLOSING_ENDPOINTS} />}
        {tab === "confirmations" && <EndpointConsole title="Confirmations de solde" endpoints={CONFIRMATION_ENDPOINTS} />}
        {tab === "management" && <EndpointConsole title="Pilotage de gestion" endpoints={MANAGEMENT_ENDPOINTS} />}
        {tab === "tax" && <EndpointConsole title="Résultat fiscal et liasse" endpoints={TAX_ENDPOINTS} />}
      </div>
    </AccountingShell>
  );
};
