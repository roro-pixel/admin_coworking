import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Package,
  Tags,
  Users,
  Ticket,
  BarChart3,
  Ticket as PassIcon,
  Activity,
  CreditCard,
} from "lucide-react";
import { PlansList } from "./plans/PlansList";
import { EntitlementDefinitionsList } from "./entitlements/EntitlementDefinitionsList";
import { SubscriptionsList } from "./subscriptions/SubscriptionsList";
import { PromotionsList } from "./promotions/PromotionsList";
import { SubscriptionMetrics } from "./metrics/SubscriptionMetrics";
import { UsageRecordsList } from "./usage/UsageRecordsList";
import { BillableItemsList } from "./billing/BillableItemsList";
import { PassCommercialMaster } from "./PassCommercialMaster";

type TabId =
  | "metrics"
  | "plans"
  | "entitlements"
  | "subscriptions"
  | "passCommercial"
  | "usage"
  | "billable"
  | "promotions";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "metrics", label: "Métriques", icon: BarChart3 },
  { id: "plans", label: "Plans", icon: Package },
  { id: "entitlements", label: "Droits", icon: Tags },
  { id: "subscriptions", label: "Souscriptions", icon: Users },
  { id: "passCommercial", label: "Pass commercial", icon: PassIcon },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "billable", label: "Items facturables", icon: CreditCard },
  { id: "promotions", label: "Promotions", icon: Ticket },
];

const getTabFromPath = (pathname: string): TabId => {
  if (pathname.startsWith("/subscriptions/entitlements")) return "entitlements";
  if (pathname.startsWith("/subscriptions/plans")) return "plans";
  if (pathname.startsWith("/subscriptions/subscriptions"))
    return "subscriptions";
  if (pathname.startsWith("/subscriptions/passes")) return "passCommercial";
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

  // Lazy mounting : un composant n'est monté qu'à sa première visite,
  // puis conservé avec display:none pour éviter les re-fetch.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set([initialTab]),
  );

  useEffect(() => {
    const nextTab = getTabFromPath(location.pathname);
    setActiveTab(nextTab);
    setVisitedTabs((prev) => new Set([...prev, nextTab]));
  }, [location.pathname]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));

    if (location.pathname !== "/subscriptions") {
      navigate("/subscriptions", { replace: true });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-gray-600 mt-1">
          Gérez les plans, souscriptions, passes et promotions
        </p>
      </div>

      {/* Onglets — style nav arrondi comme ResourceMaster */}
      <div className="mb-8 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
        <div className="flex min-w-max items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`group flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    active
                      ? "text-white"
                      : "text-gray-500 group-hover:text-gray-800"
                  }
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lazy rendering : monté à la première visite, caché ensuite */}
      <div>
        {visitedTabs.has("metrics") && (
          <div className={activeTab !== "metrics" ? "hidden" : ""}>
            <SubscriptionMetrics />
          </div>
        )}
        {visitedTabs.has("plans") && (
          <div className={activeTab !== "plans" ? "hidden" : ""}>
            <PlansList />
          </div>
        )}
        {visitedTabs.has("entitlements") && (
          <div className={activeTab !== "entitlements" ? "hidden" : ""}>
            <EntitlementDefinitionsList />
          </div>
        )}
        {visitedTabs.has("subscriptions") && (
          <div className={activeTab !== "subscriptions" ? "hidden" : ""}>
            <SubscriptionsList />
          </div>
        )}
        {visitedTabs.has("passCommercial") && (
          <div className={activeTab !== "passCommercial" ? "hidden" : ""}>
            <PassCommercialMaster />
          </div>
        )}
        {visitedTabs.has("usage") && (
          <div className={activeTab !== "usage" ? "hidden" : ""}>
            <UsageRecordsList />
          </div>
        )}
        {visitedTabs.has("billable") && (
          <div className={activeTab !== "billable" ? "hidden" : ""}>
            <BillableItemsList />
          </div>
        )}
        {visitedTabs.has("promotions") && (
          <div className={activeTab !== "promotions" ? "hidden" : ""}>
            <PromotionsList />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
