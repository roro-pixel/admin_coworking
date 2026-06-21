import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Building2,
  Tag,
  Users,
  Shield,
  Package,
  DollarSign,
  Calendar,
  XCircle,
  CalendarDays,
  Search,
} from "lucide-react";
import { ResourcesList } from "./resources/ResourcesList";
import { ResourceTypesList } from "./types/ResourceTypesList";
import { ResourceGroupsList } from "./groups/ResourceGroupsList";
import { ResourcePoliciesList } from "./policies/ResourcePoliciesList";
import { AmenitiesList } from "./amenities/AmenitiesList";
import { PricingRulesList } from "./pricing/PricingRulesList";
import { PricingRuleCreatePage } from "./pricing/PricingRuleCreatePage";
import { PricingRuleDetailPage } from "./pricing/PricingRuleDetailPage";
import { ResourceAvailability } from "./resources/ResourceAvailability";
import { ResourceClosuresList } from "./closures/ResourceClosuresList";
import { ResourceCreatePage } from "./resources/ResourceCreatePage";
import { ResourceDetailPage } from "./resources/ResourceDetailPage";
import { ResourcePolicyDetailPage } from "./policies/ResourcePolicyDetailPage";
import { ResourcePlanningAdminPage } from "./resources/ResourcePlanningAdminPage";
import { ResourceAdvancedSearchPage } from "./resources/ResourceAdvancedSearchPage";

type TabId =
  | "resources"
  | "types"
  | "groups"
  | "policies"
  | "amenities"
  | "pricing"
  | "availability"
  | "closures"
  | "planning"
  | "advancedSearch";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "resources", label: "Ressources", icon: Building2 },
  { id: "types", label: "Types", icon: Tag },
  { id: "groups", label: "Groupes", icon: Users },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "amenities", label: "Équipements", icon: Package },
  { id: "pricing", label: "Tarifs", icon: DollarSign },
  { id: "availability", label: "Disponibilités", icon: Calendar },
  { id: "planning", label: "Planning admin", icon: CalendarDays },
  { id: "advancedSearch", label: "Recherche avancée", icon: Search },
  { id: "closures", label: "Fermetures", icon: XCircle },
];

const isTabId = (value: unknown): value is TabId =>
  typeof value === "string" && tabs.some((tab) => tab.id === value);

const RoutedWithLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <AdminLayout>{children}</AdminLayout>;

const ResourceTabs: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromQuery = searchParams.get("tab");
  const tabFromState = (location.state as { activeTab?: string } | null)
    ?.activeTab;

  const initialTab: TabId = isTabId(tabFromQuery)
    ? tabFromQuery
    : isTabId(tabFromState)
      ? tabFromState
      : "resources";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set([initialTab]),
  );

  useEffect(() => {
    const nextFromQuery = searchParams.get("tab");
    const nextFromState = (location.state as { activeTab?: string } | null)
      ?.activeTab;
    const next = isTabId(nextFromQuery)
      ? nextFromQuery
      : isTabId(nextFromState)
        ? nextFromState
        : null;

    if (next && next !== activeTab) {
      setActiveTab(next);
      setVisitedTabs((prev) => new Set([...prev, next]));
    }
  }, [location.state, searchParams, activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
    setSearchParams(tabId === "resources" ? {} : { tab: tabId });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestion des espaces
        </h1>
        <p className="mt-1 text-gray-600">
          Gérez les ressources, types, groupes, politiques, équipements,
          tarifs, disponibilités et fermetures.
        </p>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex min-w-max gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {visitedTabs.has("resources") && (
          <div className={activeTab !== "resources" ? "hidden" : ""}>
            <ResourcesList />
          </div>
        )}
        {visitedTabs.has("types") && (
          <div className={activeTab !== "types" ? "hidden" : ""}>
            <ResourceTypesList />
          </div>
        )}
        {visitedTabs.has("groups") && (
          <div className={activeTab !== "groups" ? "hidden" : ""}>
            <ResourceGroupsList />
          </div>
        )}
        {visitedTabs.has("policies") && (
          <div className={activeTab !== "policies" ? "hidden" : ""}>
            <ResourcePoliciesList />
          </div>
        )}
        {visitedTabs.has("amenities") && (
          <div className={activeTab !== "amenities" ? "hidden" : ""}>
            <AmenitiesList />
          </div>
        )}
        {visitedTabs.has("pricing") && (
          <div className={activeTab !== "pricing" ? "hidden" : ""}>
            <PricingRulesList />
          </div>
        )}
        {visitedTabs.has("availability") && (
          <div className={activeTab !== "availability" ? "hidden" : ""}>
            <ResourceAvailability />
          </div>
        )}
        {visitedTabs.has("planning") && (
          <div className={activeTab !== "planning" ? "hidden" : ""}>
            <ResourcePlanningAdminPage />
          </div>
        )}
        {visitedTabs.has("advancedSearch") && (
          <div className={activeTab !== "advancedSearch" ? "hidden" : ""}>
            <ResourceAdvancedSearchPage />
          </div>
        )}
        {visitedTabs.has("closures") && (
          <div className={activeTab !== "closures" ? "hidden" : ""}>
            <ResourceClosuresList />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const ResourceMaster: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ResourceTabs />} />
      <Route path="create" element={<ResourceCreatePage />} />
      <Route path="policies/:code" element={<ResourcePolicyDetailPage />} />
      <Route
        path="pricing/create"
        element={
          <RoutedWithLayout>
            <PricingRuleCreatePage />
          </RoutedWithLayout>
        }
      />
      <Route
        path="pricing/:ruleId"
        element={
          <RoutedWithLayout>
            <PricingRuleDetailPage />
          </RoutedWithLayout>
        }
      />
      <Route path=":code" element={<ResourceDetailPage />} />
      <Route path="*" element={<ResourceTabs />} />
    </Routes>
  );
};
