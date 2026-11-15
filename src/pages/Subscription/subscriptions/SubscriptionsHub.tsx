import React from "react";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { SubscriptionsList } from "./SubscriptionsList";
import { TerminationsList } from "../lifecycle/TerminationsList";
import { QuotesList } from "../lifecycle/QuotesList";
import { DerivationsList } from "../lifecycle/DerivationsList";
import { LifecyclePolicyPanel } from "../lifecycle/LifecyclePolicyPanel";

export type HubTab = "list" | "terminations" | "quotes" | "derivations" | "policy";

export const HUB_PATHS: Record<HubTab, string> = {
  list: "/subscriptions/subscriptions",
  terminations: "/subscriptions/terminations",
  quotes: "/subscriptions/quotes",
  derivations: "/subscriptions/derivations",
  policy: "/subscriptions/policy",
};

const HUB_TABS: TabItem<HubTab>[] = [
  { id: "list", label: "Souscriptions" },
  { id: "terminations", label: "Résiliations" },
  { id: "quotes", label: "Devis" },
  { id: "derivations", label: "Prix négociés" },
  { id: "policy", label: "Politique" },
];

/** Onglet Souscriptions : la liste et les écrans du cycle de vie, chacun avec sa propre adresse. */
export const SubscriptionsHub: React.FC<{ tab: HubTab; onTabChange: (tab: HubTab) => void }> = ({ tab, onTabChange }) => (
  <div className="space-y-5">
    <Tabs variant="soft" items={HUB_TABS} active={tab} onChange={onTabChange} />
    {tab === "list" && <SubscriptionsList />}
    {tab === "terminations" && <TerminationsList />}
    {tab === "quotes" && <QuotesList />}
    {tab === "derivations" && <DerivationsList />}
    {tab === "policy" && <LifecyclePolicyPanel />}
  </div>
);
