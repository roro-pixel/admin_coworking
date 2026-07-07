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
  XCircle,
  CalendarDays,
  Search,
  Clock,
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
  | "schedule"
  | "closures"
  | "advancedSearch";

type ScheduleSubTab = "availability" | "planning";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "resources", label: "Ressources", icon: Building2 },
  { id: "types", label: "Types", icon: Tag },
  { id: "groups", label: "Groupes", icon: Users },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "amenities", label: "Équipements", icon: Package },
  { id: "pricing", label: "Tarifs", icon: DollarSign },
  { id: "schedule", label: "Agenda ressources", icon: CalendarDays },
  { id: "advancedSearch", label: "Recherche avancée", icon: Search },
  { id: "closures", label: "Fermetures", icon: XCircle },
];

const isTabId = (value: unknown): value is TabId =>
  typeof value === "string" && tabs.some((tab) => tab.id === value);

const isLegacyScheduleTab = (value: unknown): value is ScheduleSubTab =>
  value === "availability" || value === "planning";

const RoutedWithLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <AdminLayout>{children}</AdminLayout>;

const ResourceSchedulePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subTabParam = searchParams.get("view");
  const [activeSubTab, setActiveSubTab] = useState<ScheduleSubTab>(
    subTabParam === "planning" ? "planning" : "availability",
  );
  const [visitedSubTabs, setVisitedSubTabs] = useState<Set<ScheduleSubTab>>(
    new Set([activeSubTab]),
  );

  useEffect(() => {
    const next = searchParams.get("view");
    if ((next === "availability" || next === "planning") && next !== activeSubTab) {
      setActiveSubTab(next);
      setVisitedSubTabs((prev) => new Set([...prev, next]));
    }
  }, [activeSubTab, searchParams]);

  const handleSubTabChange = (tab: ScheduleSubTab) => {
    setActiveSubTab(tab);
    setVisitedSubTabs((prev) => new Set([...prev, tab]));
    setSearchParams({ tab: "schedule", view: tab });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Agenda ressources
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les créneaux disponibles et le planning d'occupation depuis un seul espace.
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-gray-100 p-1">
            {[
              { id: "availability", label: "Disponibilités", icon: CalendarDays },
              { id: "planning", label: "Planning admin", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSubTabChange(tab.id as ScheduleSubTab)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visitedSubTabs.has("availability") && (
        <div className={activeSubTab !== "availability" ? "hidden" : ""}>
          <ResourceAvailability />
        </div>
      )}

      {visitedSubTabs.has("planning") && (
        <div className={activeSubTab !== "planning" ? "hidden" : ""}>
          <ResourcePlanningAdminPage />
        </div>
      )}
    </div>
  );
};

const ResourceTabs: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromQuery = searchParams.get("tab");
  const tabFromState = (location.state as { activeTab?: string } | null)
    ?.activeTab;

  const initialTab: TabId = isTabId(tabFromQuery)
    ? tabFromQuery
    : isLegacyScheduleTab(tabFromQuery)
      ? "schedule"
      : isTabId(tabFromState)
        ? tabFromState
        : isLegacyScheduleTab(tabFromState)
          ? "schedule"
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
      : isLegacyScheduleTab(nextFromQuery)
        ? "schedule"
        : isTabId(nextFromState)
          ? nextFromState
          : isLegacyScheduleTab(nextFromState)
            ? "schedule"
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
          Gérez les ressources, types, groupes, politiques, équipements, tarifs,
          agenda et fermetures.
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
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
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
        {visitedTabs.has("schedule") && (
          <div className={activeTab !== "schedule" ? "hidden" : ""}>
            <ResourceSchedulePage />
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
