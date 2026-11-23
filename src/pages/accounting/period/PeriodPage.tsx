import React, { useState } from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { EndpointConsole } from "../../../components/accounting/EndpointConsole";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { DEFERRAL_ENDPOINTS } from "./deferralEndpoints";
import { PROVISION_CLOSING, RECEIVABLE_ENDPOINTS, RISK_ENDPOINTS } from "./provisionEndpoints";
import { COMMITMENT_ENDPOINTS, LOAN_ENDPOINTS, PARTNER_ENDPOINTS, PAYROLL_ENDPOINTS } from "./financingEndpoints";
import { POSTING_ENDPOINTS } from "./postingEndpoints";

type Tab = "deferral" | "receivables" | "risks" | "closing" | "loans" | "partners" | "commitments" | "payroll" | "posting";
const TABS: TabItem<Tab>[] = [
  { id: "deferral", label: "Constatations d'avance" },
  { id: "receivables", label: "Créances douteuses" },
  { id: "risks", label: "Risques et provisions" },
  { id: "closing", label: "Revue et états" },
  { id: "loans", label: "Emprunts" },
  { id: "partners", label: "Associés" },
  { id: "commitments", label: "Hors bilan" },
  { id: "payroll", label: "Paie" },
  { id: "posting", label: "Comptabilisation" },
];

export const PeriodPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("deferral");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "deferral" && <EndpointConsole title="Constatations d'avance" subtitle="Produits et charges constatés d'avance, factures à établir, traitement de fin de période." endpoints={DEFERRAL_ENDPOINTS} />}
        {tab === "receivables" && <EndpointConsole title="Créances douteuses" subtitle="Balance âgée, revue, ajustement des dépréciations, passage en perte en deux temps." endpoints={RECEIVABLE_ENDPOINTS} />}
        {tab === "risks" && <EndpointConsole title="Risques et provisions" subtitle="Registre des risques, estimations et provisions." endpoints={RISK_ENDPOINTS} />}
        {tab === "closing" && <EndpointConsole title="Revue de clôture et états" subtitle="Provisions et créances douteuses." endpoints={PROVISION_CLOSING} />}
        {tab === "loans" && <EndpointConsole title="Emprunts" endpoints={LOAN_ENDPOINTS} />}
        {tab === "partners" && <EndpointConsole title="Comptes courants d'associés" endpoints={PARTNER_ENDPOINTS} />}
        {tab === "commitments" && <EndpointConsole title="Engagements hors bilan" endpoints={COMMITMENT_ENDPOINTS} />}
        {tab === "payroll" && <EndpointConsole title="Paie" endpoints={PAYROLL_ENDPOINTS} />}
        {tab === "posting" && <EndpointConsole title="Comptabilisation automatique" subtitle="Événements, règles et aperçus." endpoints={POSTING_ENDPOINTS} />}
      </div>
    </AccountingShell>
  );
};
