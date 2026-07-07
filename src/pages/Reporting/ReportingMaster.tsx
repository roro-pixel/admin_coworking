import React, { useMemo, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Activity,
  Archive,
  BarChart3,
  Building2,
  Clock,
  CreditCard,
  FileText,
  GitCompare,
  LayoutDashboard,
  LineChart,
  Repeat,
  Search,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import { FinanceDashboard } from "./FinanceDashboard";
import { PaymentsReport } from "./PaymentsReport";
import { AgingReport } from "./AgingReport";
import { CashRegistersReport } from "./CashRegistersReport";
import { CashFlowReport } from "./CashFlowReport";
import { OccupancyReport } from "./OccupancyReport";
import { LiveKpiDashboard } from "./LiveKpiDashboard";
import { ComparisonReport } from "./ComparisonReport";
import { TrendsChart } from "./TrendsChart";
import { TopResourcesReport } from "./TopResourcesReport";
import { TopOwnersReport } from "./TopOwnersReport";
import { ActivityReport } from "./ActivityReport";
import { MemberProfileReport } from "./MemberProfileReport";
import { DebtRecoveryReport } from "./DebtRecoveryReport";
import { ResourceUtilizationReport } from "./ResourceUtilizationReport";
import { StockValuationReport } from "./StockValuationReport";
import { SubscriptionAnalyticsReport } from "./SubscriptionAnalyticsReport";

type TabId =
  | "live"
  | "comparison"
  | "trends"
  | "top-resources"
  | "top-owners"
  | "dashboard"
  | "payments"
  | "aging"
  | "cash-registers"
  | "cash-flow"
  | "occupancy"
  | "activity"
  | "member-profile"
  | "debt-recovery"
  | "resource-utilization"
  | "stock-valuation"
  | "subscription-analytics";

type ReportCategory = "analytics" | "financial" | "business" | "all";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  group: Exclude<ReportCategory, "all">;
}

const categoryLabels: Record<ReportCategory, string> = {
  all: "Tous les rapports",
  analytics: "Analytics",
  financial: "Financier",
  business: "Métier",
};

const tabs: Tab[] = [
  {
    id: "live",
    label: "Temps réel",
    icon: Activity,
    description: "KPIs opérationnels en direct",
    group: "analytics",
  },
  {
    id: "comparison",
    label: "Comparaison",
    icon: GitCompare,
    description: "Comparer deux périodes",
    group: "analytics",
  },
  {
    id: "trends",
    label: "Tendances",
    icon: LineChart,
    description: "Évolution réservations, revenus et occupation",
    group: "analytics",
  },
  {
    id: "top-resources",
    label: "Top ressources",
    icon: Building2,
    description: "Ressources les plus utilisées",
    group: "analytics",
  },
  {
    id: "top-owners",
    label: "Top clients",
    icon: Trophy,
    description: "Clients les plus actifs",
    group: "analytics",
  },
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    description: "Vue financière globale",
    group: "financial",
  },
  {
    id: "payments",
    label: "Paiements",
    icon: CreditCard,
    description: "Répartition par méthode",
    group: "financial",
  },
  {
    id: "aging",
    label: "Vieillissement",
    icon: Clock,
    description: "Créances par ancienneté",
    group: "financial",
  },
  {
    id: "cash-registers",
    label: "Caisses",
    icon: Wallet,
    description: "Sessions et écarts de caisse",
    group: "financial",
  },
  {
    id: "cash-flow",
    label: "Trésorerie",
    icon: BarChart3,
    description: "Flux entrants et sortants",
    group: "financial",
  },
  {
    id: "occupancy",
    label: "Occupation",
    icon: Building2,
    description: "Taux d’utilisation des ressources",
    group: "financial",
  },
  {
    id: "activity",
    label: "Activité",
    icon: FileText,
    description: "Rapport consolidé cross-module",
    group: "business",
  },
  {
    id: "member-profile",
    label: "Membre 360",
    icon: UserRound,
    description: "Dossier complet d’un membre",
    group: "business",
  },
  {
    id: "debt-recovery",
    label: "Recouvrement",
    icon: Clock,
    description: "Factures impayées et relance",
    group: "business",
  },
  {
    id: "resource-utilization",
    label: "Utilisation ressources",
    icon: Building2,
    description: "Heatmap, occupation et revenu par heure",
    group: "business",
  },
  {
    id: "stock-valuation",
    label: "Stock",
    icon: Archive,
    description: "Valorisation, stock faible et stock mort",
    group: "business",
  },
  {
    id: "subscription-analytics",
    label: "Abonnements",
    icon: Repeat,
    description: "MRR, churn et renouvellements",
    group: "business",
  },
];

export const ReportingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [category, setCategory] = useState<ReportCategory>("all");
  const [search, setSearch] = useState("");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["live"]));

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  const filteredTabs = useMemo(() => {
    const value = search.trim().toLowerCase();

    return tabs.filter((tab) => {
      const matchesCategory = category === "all" || tab.group === category;
      const matchesSearch =
        !value ||
        tab.label.toLowerCase().includes(value) ||
        tab.description.toLowerCase().includes(value);

      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">
                Reporting
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Analytiques & rapports
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Consultez les rapports financiers, opérationnels et métier depuis un
                même espace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr] xl:w-[560px]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">
                  Catégorie
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="all">Tous les rapports</option>
                  <option value="analytics">Analytics</option>
                  <option value="financial">Financier</option>
                  <option value="business">Métier</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">
                  Recherche
                </span>
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un rapport..."
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  />
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center justify-between px-2 pt-2">
            <div>
              <p className="text-sm font-black text-gray-900">
                {categoryLabels[category]}
              </p>
              <p className="text-xs font-semibold text-gray-400">
                {filteredTabs.length} rapport{filteredTabs.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-[1.35rem] p-4 text-left transition-all ${
                    active
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                      : "bg-gray-50 text-gray-700 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-white text-primary-600 ring-1 ring-gray-100"
                      }`}
                    >
                      <Icon size={19} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {tab.label}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-5 ${
                          active ? "text-white/80" : "text-gray-500"
                        }`}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {activeTabInfo && (
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">
                  {categoryLabels[activeTabInfo.group]}
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  {activeTabInfo.label}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTabInfo.description}
                </p>
              </div>
            </div>

            {visitedTabs.has("live") && (
              <Panel active={activeTab === "live"}>
                <LiveKpiDashboard />
              </Panel>
            )}
            {visitedTabs.has("comparison") && (
              <Panel active={activeTab === "comparison"}>
                <ComparisonReport />
              </Panel>
            )}
            {visitedTabs.has("trends") && (
              <Panel active={activeTab === "trends"}>
                <TrendsChart />
              </Panel>
            )}
            {visitedTabs.has("top-resources") && (
              <Panel active={activeTab === "top-resources"}>
                <TopResourcesReport />
              </Panel>
            )}
            {visitedTabs.has("top-owners") && (
              <Panel active={activeTab === "top-owners"}>
                <TopOwnersReport />
              </Panel>
            )}
            {visitedTabs.has("dashboard") && (
              <Panel active={activeTab === "dashboard"}>
                <FinanceDashboard />
              </Panel>
            )}
            {visitedTabs.has("payments") && (
              <Panel active={activeTab === "payments"}>
                <PaymentsReport />
              </Panel>
            )}
            {visitedTabs.has("aging") && (
              <Panel active={activeTab === "aging"}>
                <AgingReport />
              </Panel>
            )}
            {visitedTabs.has("cash-registers") && (
              <Panel active={activeTab === "cash-registers"}>
                <CashRegistersReport />
              </Panel>
            )}
            {visitedTabs.has("cash-flow") && (
              <Panel active={activeTab === "cash-flow"}>
                <CashFlowReport />
              </Panel>
            )}
            {visitedTabs.has("occupancy") && (
              <Panel active={activeTab === "occupancy"}>
                <OccupancyReport />
              </Panel>
            )}
            {visitedTabs.has("activity") && (
              <Panel active={activeTab === "activity"}>
                <ActivityReport />
              </Panel>
            )}
            {visitedTabs.has("member-profile") && (
              <Panel active={activeTab === "member-profile"}>
                <MemberProfileReport />
              </Panel>
            )}
            {visitedTabs.has("debt-recovery") && (
              <Panel active={activeTab === "debt-recovery"}>
                <DebtRecoveryReport />
              </Panel>
            )}
            {visitedTabs.has("resource-utilization") && (
              <Panel active={activeTab === "resource-utilization"}>
                <ResourceUtilizationReport />
              </Panel>
            )}
            {visitedTabs.has("stock-valuation") && (
              <Panel active={activeTab === "stock-valuation"}>
                <StockValuationReport />
              </Panel>
            )}
            {visitedTabs.has("subscription-analytics") && (
              <Panel active={activeTab === "subscription-analytics"}>
                <SubscriptionAnalyticsReport />
              </Panel>
            )}
          </section>
        )}
      </div>
    </AdminLayout>
  );
};

const Panel: React.FC<{ active: boolean; children: React.ReactNode }> = ({
  active,
  children,
}) => <div className={active ? "" : "hidden"}>{children}</div>;
