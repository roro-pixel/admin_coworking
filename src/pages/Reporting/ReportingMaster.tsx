import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  LayoutDashboard,
  CreditCard,
  Clock,
  Wallet,
  TrendingUp,
  Building2,
  Activity,
  GitCompare,
  LineChart,
  Trophy,
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
  | "occupancy";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  group: "analytics" | "reporting";
}

const tabs: Tab[] = [
  // Analytics
  {
    id: "live",
    label: "Temps réel",
    icon: Activity,
    description: "KPIs en direct",
    group: "analytics",
  },
  {
    id: "comparison",
    label: "Comparaison",
    icon: GitCompare,
    description: "Périodes vs précédentes",
    group: "analytics",
  },
  {
    id: "trends",
    label: "Tendances",
    icon: LineChart,
    description: "Évolution dans le temps",
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
  // Reporting
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    description: "Vue d'ensemble financière",
    group: "reporting",
  },
  {
    id: "payments",
    label: "Paiements",
    icon: CreditCard,
    description: "Répartition par méthode",
    group: "reporting",
  },
  {
    id: "aging",
    label: "Vieillissement",
    icon: Clock,
    description: "Analyse des impayés",
    group: "reporting",
  },
  {
    id: "cash-registers",
    label: "Caisses",
    icon: Wallet,
    description: "Performance par caisse",
    group: "reporting",
  },
  {
    id: "cash-flow",
    label: "Trésorerie",
    icon: TrendingUp,
    description: "Flux entrants/sortants",
    group: "reporting",
  },
  {
    id: "occupancy",
    label: "Occupation",
    icon: Building2,
    description: "Taux d'utilisation",
    group: "reporting",
  },
];

export const ReportingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["live"]));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Analytiques & Rapports
        </h1>
        <p className="text-gray-500 mt-1">
          Analysez vos performances financières et opérationnelles.
        </p>
      </div>

      <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
        <div className="flex min-w-max items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={tab.description}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTabInfo && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-50 p-2.5 text-primary-600 ring-1 ring-gray-100">
              <activeTabInfo.icon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTabInfo.label}
              </h2>
              <p className="text-sm text-gray-500">{activeTabInfo.description}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        {visitedTabs.has("live") && (
          <div className={activeTab !== "live" ? "hidden" : ""}>
            <LiveKpiDashboard />
          </div>
        )}
        {visitedTabs.has("comparison") && (
          <div className={activeTab !== "comparison" ? "hidden" : ""}>
            <ComparisonReport />
          </div>
        )}
        {visitedTabs.has("trends") && (
          <div className={activeTab !== "trends" ? "hidden" : ""}>
            <TrendsChart />
          </div>
        )}
        {visitedTabs.has("top-resources") && (
          <div className={activeTab !== "top-resources" ? "hidden" : ""}>
            <TopResourcesReport />
          </div>
        )}
        {visitedTabs.has("top-owners") && (
          <div className={activeTab !== "top-owners" ? "hidden" : ""}>
            <TopOwnersReport />
          </div>
        )}
        {visitedTabs.has("dashboard") && (
          <div className={activeTab !== "dashboard" ? "hidden" : ""}>
            <FinanceDashboard />
          </div>
        )}
        {visitedTabs.has("payments") && (
          <div className={activeTab !== "payments" ? "hidden" : ""}>
            <PaymentsReport />
          </div>
        )}
        {visitedTabs.has("aging") && (
          <div className={activeTab !== "aging" ? "hidden" : ""}>
            <AgingReport />
          </div>
        )}
        {visitedTabs.has("cash-registers") && (
          <div className={activeTab !== "cash-registers" ? "hidden" : ""}>
            <CashRegistersReport />
          </div>
        )}
        {visitedTabs.has("cash-flow") && (
          <div className={activeTab !== "cash-flow" ? "hidden" : ""}>
            <CashFlowReport />
          </div>
        )}
        {visitedTabs.has("occupancy") && (
          <div className={activeTab !== "occupancy" ? "hidden" : ""}>
            <OccupancyReport />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
