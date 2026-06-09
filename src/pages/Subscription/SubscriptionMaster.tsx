import React, { useState } from "react";
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
import { PassesList } from "./passes/PassesList";
import { UsageRecordsList } from "./usage/UsageRecordsList";
import { BillableItemsList } from "./billing/BillableItemsList";

type TabId =
  | "metrics"
  | "plans"
  | "entitlements"
  | "subscriptions"
  | "promotions"
  | "passes"
  | "usage"
  | "billable";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "metrics", label: "Métriques", icon: BarChart3 },
  { id: "plans", label: "Plans", icon: Package },
  { id: "entitlements", label: "Droits", icon: Tags },
  { id: "subscriptions", label: "Souscriptions", icon: Users },
  { id: "promotions", label: "Promotions", icon: Ticket },
  { id: "passes", label: "Passes", icon: PassIcon },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "billable", label: "Items facturables", icon: CreditCard },
];

export const SubscriptionMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("metrics");
  // Lazy mounting : un composant n'est monté qu'à sa première visite,
  // puis conservé avec display:none pour éviter les re-fetch
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["metrics"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-gray-600 mt-1">
          Gérez les plans, souscriptions, passes et promotions
        </p>
      </div>

      {/* Onglets — scroll horizontal pour les petits écrans */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-gray-200 mb-6 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap text-sm
                  ${
                    activeTab === tab.id
                      ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600 font-medium"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <Icon size={16} />
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
        {visitedTabs.has("promotions") && (
          <div className={activeTab !== "promotions" ? "hidden" : ""}>
            <PromotionsList />
          </div>
        )}
        {visitedTabs.has("passes") && (
          <div className={activeTab !== "passes" ? "hidden" : ""}>
            <PassesList />
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
      </div>
    </AdminLayout>
  );
};
