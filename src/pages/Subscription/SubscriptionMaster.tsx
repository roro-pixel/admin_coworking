import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Package,
  Tags,
  Repeat,
  Ticket,
  BarChart3,
  Activity,
  Receipt,
  Percent,
} from "lucide-react";
import { PlansList } from "./plans/PlansList";
import { EntitlementDefinitionsList } from "./entitlements/EntitlementDefinitionsList";
import { SubscriptionsHub, HUB_PATHS } from "./subscriptions/SubscriptionsHub";
import type { HubTab } from "./subscriptions/SubscriptionsHub";
import { PromotionsHub } from "./promotions/PromotionsHub";
import { SubscriptionMetrics } from "./metrics/SubscriptionMetrics";
import { UsageRecordsList } from "./usage/UsageRecordsList";
import { BillableItemsList } from "./billing/BillableItemsList";
import { PassCommercialMaster } from "./PassCommercialMaster";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";

type TabId =
  | "metrics"
  | "plans"
  | "entitlements"
  | "subscriptions"
  | "passCommercial"
  | "usage"
  | "billable"
  | "promotions";

const tabs: TabItem<TabId>[] = [
  { id: "metrics", label: "Métriques", icon: BarChart3 },
  { id: "plans", label: "Plans", icon: Package },
  { id: "entitlements", label: "Droits", icon: Tags },
  { id: "subscriptions", label: "Souscriptions", icon: Repeat },
  { id: "passCommercial", label: "Pass commercial", icon: Ticket },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "billable", label: "Items facturables", icon: Receipt },
  { id: "promotions", label: "Promotions", icon: Percent },
];

const getHubTab = (pathname: string): HubTab | null => {
  const found = (Object.entries(HUB_PATHS) as [HubTab, string][]).find(([, path]) => pathname.startsWith(path));
  return found ? found[0] : null;
};

const getTabFromPath = (pathname: string): TabId => {
  if (pathname.startsWith("/subscriptions/entitlements")) return "entitlements";
  if (pathname.startsWith("/subscriptions/plans")) return "plans";
  if (getHubTab(pathname)) return "subscriptions";
  if (pathname.startsWith("/subscriptions/passes") || pathname.startsWith("/subscriptions/pass-plans")) return "passCommercial";
  if (pathname.startsWith("/subscriptions/usage")) return "usage";
  if (pathname.startsWith("/subscriptions/billable")) return "billable";
  if (pathname.startsWith("/subscriptions/promotions")) return "promotions";
  return "metrics";
};

export const SubscriptionMaster: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = getTabFromPath(location.pathname);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Montage paresseux : un onglet n'est monté qu'à sa première visite,
  // puis conservé masqué pour éviter de recharger ses données.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set([initialTab]));

  useEffect(() => {
    const nextTab = getTabFromPath(location.pathname);
    setActiveTab(nextTab);
    setVisitedTabs((prev) => new Set([...prev, nextTab]));
  }, [location.pathname]);

  const hubTab = getHubTab(location.pathname) ?? "list";

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));

    if (location.pathname !== "/subscriptions") {
      navigate("/subscriptions", { replace: true });
    }
  };

  const handleHubTabChange = (tab: HubTab) => navigate(HUB_PATHS[tab]);

  const panel = (id: TabId, content: React.ReactNode) =>
    visitedTabs.has(id) && <div className={activeTab !== id ? "hidden" : ""}>{content}</div>;

  return (
    <AdminLayout>
      <div style={brandVars}>
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Abonnements
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Plans, souscriptions, passes, usages et promotions
          </p>
        </div>

        <div className="mb-6">
          <Tabs items={tabs} active={activeTab} onChange={handleTabChange} />
        </div>

        {panel("metrics", <SubscriptionMetrics />)}
        {panel("plans", <PlansList />)}
        {panel("entitlements", <EntitlementDefinitionsList />)}
        {panel("subscriptions", <SubscriptionsHub tab={hubTab} onTabChange={handleHubTabChange} />)}
        {panel("passCommercial", <PassCommercialMaster />)}
        {panel("usage", <UsageRecordsList />)}
        {panel("billable", <BillableItemsList />)}
        {panel("promotions", <PromotionsHub />)}

        {/* Un seul Toaster pour tous les onglets du hub */}
        <Toaster />
      </div>
    </AdminLayout>
  );
};
