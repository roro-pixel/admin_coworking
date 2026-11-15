import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, GitPullRequestDraft } from "lucide-react";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { ContractShell } from "../../components/contracts/ContractShell";
import { TemplatesTab } from "../../components/contracts/templates/TemplatesTab";
import { DraftsTab } from "../../components/contracts/templates/DraftsTab";

type Tab = "templates" | "drafts";
const TABS: TabItem<Tab>[] = [
  { id: "templates", label: "Templates", icon: FileText },
  { id: "drafts", label: "Rédaction", icon: GitPullRequestDraft },
];

/** Bibliothèque de templates et rédaction contractuelle. Les onglets restent montés pour garder la position de chacun. */
export const ContractTemplatesDraftingPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("templates");
  const [seen, setSeen] = useState<Record<Tab, boolean>>({ templates: true, drafts: false });

  return (
    <ContractShell>
      <PageHeader
        title="Templates et rédaction"
        subtitle="Modèles, variables, rédactions contractuelles et génération PDF"
        onBack={() => navigate("/contracts")}
        backLabel="Retour aux contrats"
      />
      <div className="mb-5">
        <Tabs
          items={TABS}
          active={tab}
          onChange={(t) => {
            setTab(t);
            setSeen((s) => ({ ...s, [t]: true }));
          }}
        />
      </div>
      <div hidden={tab !== "templates"}>{seen.templates && <TemplatesTab />}</div>
      <div hidden={tab !== "drafts"}>{seen.drafts && <DraftsTab />}</div>
    </ContractShell>
  );
};
