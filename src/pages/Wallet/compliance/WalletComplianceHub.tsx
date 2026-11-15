import React, { useState } from "react";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { ComplianceDashboard } from "./ComplianceDashboard";
import { CasesPanel } from "./CasesPanel";
import { ScreeningPanel } from "./ScreeningPanel";
import { FreezesPanel } from "./FreezesPanel";
import { RulesPanel } from "./RulesPanel";
import { AuditPanel } from "./AuditPanel";

type ComplianceTab = "dashboard" | "cases" | "screening" | "freezes" | "rules" | "audit";

const TABS: TabItem<ComplianceTab>[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "cases", label: "Dossiers" },
  { id: "screening", label: "Filtrage" },
  { id: "freezes", label: "Gels" },
  { id: "rules", label: "Règles" },
  { id: "audit", label: "Audit" },
];

/** Onglet Conformité : dossiers, filtrage sur listes, gels, règles et audit. */
export const WalletComplianceHub: React.FC = () => {
  const [tab, setTab] = useState<ComplianceTab>("dashboard");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={TABS} active={tab} onChange={setTab} />
      {tab === "dashboard" && <ComplianceDashboard />}
      {tab === "cases" && <CasesPanel />}
      {tab === "screening" && <ScreeningPanel />}
      {tab === "freezes" && <FreezesPanel />}
      {tab === "rules" && <RulesPanel />}
      {tab === "audit" && <AuditPanel />}
    </div>
  );
};
