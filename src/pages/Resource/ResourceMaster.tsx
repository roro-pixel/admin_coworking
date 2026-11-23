import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Building2, Tag, Users, Shield, Package, DollarSign, XCircle, CalendarDays, Search, Clock, MapPin, Boxes, Wrench, DoorOpen } from "lucide-react";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
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
import { ResourceSitesPage } from "./sites/ResourceSitesPage";
import { ResourceBundlesPanel } from "./bundles/ResourceBundlesPanel";
import { ResourceOperationsPage } from "./operations/ResourceOperationsPage";
import { FindRoomPanel } from "./find/FindRoomPanel";
import { CalendarDaysPanel } from "./closures/CalendarDaysPanel";
import { PricingSimulator, PricingConflictsPanel } from "../../components/resources/PricingTools";

type TabId = "resources" | "types" | "groups" | "policies" | "amenities" | "pricing" | "schedule" | "closures" | "advancedSearch" | "sites" | "bundles" | "operations" | "find";
type ScheduleSubTab = "availability" | "planning";

const tabs: TabItem<TabId>[] = [
  { id: "resources", label: "Ressources", icon: Building2 },
  { id: "types", label: "Types", icon: Tag },
  { id: "groups", label: "Groupes", icon: Users },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "amenities", label: "Équipements", icon: Package },
  { id: "pricing", label: "Tarifs", icon: DollarSign },
  { id: "schedule", label: "Agenda", icon: CalendarDays },
  { id: "advancedSearch", label: "Recherche avancée", icon: Search },
  { id: "find", label: "Trouver une salle", icon: DoorOpen },
  { id: "closures", label: "Fermetures", icon: XCircle },
  { id: "sites", label: "Sites et plan", icon: MapPin },
  { id: "bundles", label: "Lots", icon: Boxes },
  { id: "operations", label: "Exploitation", icon: Wrench },
];
const subTabs: TabItem<ScheduleSubTab>[] = [
  { id: "availability", label: "Disponibilités", icon: CalendarDays },
  { id: "planning", label: "Planning", icon: Clock },
];

const isTabId = (v: unknown): v is TabId => typeof v === "string" && tabs.some((t) => t.id === v);
const isLegacySchedule = (v: unknown): v is ScheduleSubTab => v === "availability" || v === "planning";

const resolveTab = (query: string | null, state?: string): TabId | null =>
  isTabId(query) ? query : isLegacySchedule(query) ? "schedule" : isTabId(state) ? state : isLegacySchedule(state) ? "schedule" : null;

const PricingPane: React.FC = () => (
  <div className="space-y-8">
    <PricingRulesList />
    <PricingSimulator />
    <PricingConflictsPanel />
  </div>
);

const ClosuresPane: React.FC = () => {
  const [sub, setSub] = useState<"closures" | "days">("closures");
  const items: TabItem<"closures" | "days">[] = [
    { id: "closures", label: "Fermetures", icon: XCircle },
    { id: "days", label: "Jours particuliers", icon: CalendarDays },
  ];
  return (
    <div className="space-y-5">
      <Tabs items={items} active={sub} onChange={setSub} variant="soft" />
      {sub === "closures" ? <ResourceClosuresList /> : <CalendarDaysPanel />}
    </div>
  );
};

const ResourceSchedulePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState<ScheduleSubTab>(searchParams.get("view") === "planning" ? "planning" : "availability");
  const [visited, setVisited] = useState<Set<ScheduleSubTab>>(new Set([active]));

  useEffect(() => {
    const next = searchParams.get("view");
    if ((next === "availability" || next === "planning") && next !== active) {
      setActive(next);
      setVisited((prev) => new Set([...prev, next]));
    }
  }, [active, searchParams]);

  const change = (tab: ScheduleSubTab) => {
    setActive(tab);
    setVisited((prev) => new Set([...prev, tab]));
    setSearchParams({ tab: "schedule", view: tab });
  };

  return (
    <div className="space-y-5">
      <Tabs items={subTabs} active={active} onChange={change} variant="soft" />
      {visited.has("availability") && <div className={active !== "availability" ? "hidden" : ""}><ResourceAvailability /></div>}
      {visited.has("planning") && <div className={active !== "planning" ? "hidden" : ""}><ResourcePlanningAdminPage /></div>}
    </div>
  );
};

const ResourceTabs: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateTab = (location.state as { activeTab?: string } | null)?.activeTab;

  const initial: TabId = resolveTab(searchParams.get("tab"), stateTab) ?? "resources";
  const [active, setActive] = useState<TabId>(initial);
  const [visited, setVisited] = useState<Set<TabId>>(new Set([initial]));

  useEffect(() => {
    const next = resolveTab(searchParams.get("tab"), stateTab);
    if (next && next !== active) {
      setActive(next);
      setVisited((prev) => new Set([...prev, next]));
    }
  }, [stateTab, searchParams, active]);

  const change = (tab: TabId) => {
    setActive(tab);
    setVisited((prev) => new Set([...prev, tab]));
    setSearchParams(tab === "resources" ? {} : { tab });
  };

  const panes: Record<TabId, React.ReactNode> = {
    resources: <ResourcesList />,
    types: <ResourceTypesList />,
    groups: <ResourceGroupsList />,
    policies: <ResourcePoliciesList />,
    amenities: <AmenitiesList />,
    pricing: <PricingPane />,
    schedule: <ResourceSchedulePage />,
    advancedSearch: <ResourceAdvancedSearchPage />,
    closures: <ClosuresPane />,
    sites: <ResourceSitesPage />,
    bundles: <ResourceBundlesPanel />,
    operations: <ResourceOperationsPage />,
    find: <FindRoomPanel />,
  };

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Gestion des espaces" subtitle="Ressources, référentiels, tarifs, agenda et fermetures" />
        <Tabs items={tabs} active={active} onChange={change} />
        <div className="mt-6">
          {tabs.map((t) => visited.has(t.id) && (
            <div key={t.id} className={active !== t.id ? "hidden" : ""}>{panes[t.id]}</div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export const ResourceMaster: React.FC = () => (
  <Routes>
    <Route index element={<ResourceTabs />} />
    <Route path="create" element={<ResourceCreatePage />} />
    <Route path="policies/:code" element={<ResourcePolicyDetailPage />} />
    <Route path="pricing/create" element={<PricingRuleCreatePage />} />
    <Route path="pricing/:ruleId" element={<PricingRuleDetailPage />} />
    <Route path=":code" element={<ResourceDetailPage />} />
    <Route path="*" element={<ResourceTabs />} />
  </Routes>
);
