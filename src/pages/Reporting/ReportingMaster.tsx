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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Analytiques & Rapports
        </h1>
        <p className="text-gray-500 mt-1">
          Analysez vos performances financières et opérationnelles
        </p>
      </div>

      {/* Navigation tabs design moderne */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        {/* Section Analytics */}
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 bg-primary-500 rounded-full" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Analytique
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {tabs
              .filter((t) => t.group === "analytics")
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                    group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-primary-50 text-primary-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-primary-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {tab.description && (
                      <span
                        className={`text-xs ml-1 ${isActive ? "text-primary-400" : "text-gray-400"}`}
                      >
                        {tab.description}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-100 my-2" />

        {/* Section Reporting */}
        <div className="p-4 pt-2">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Reporting financier
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {tabs
              .filter((t) => t.group === "reporting")
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                    group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }
                  `}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-emerald-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Indicateur de section active */}
      {activeTabInfo && (
        <div className="mb-6 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`
              p-2 rounded-lg
              ${activeTabInfo.group === "analytics" ? "bg-primary-100" : "bg-emerald-100"}
            `}
            >
              <activeTabInfo.icon
                size={20}
                className={
                  activeTabInfo.group === "analytics"
                    ? "text-primary-600"
                    : "text-emerald-600"
                }
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {activeTabInfo.label}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTabInfo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenu dynamique */}
      <div className="mt-6">
        {/* Analytics */}
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

        {/* Reporting */}
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
