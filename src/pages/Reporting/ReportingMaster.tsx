import React, { useState } from "react";
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
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
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

type GroupId = "analytics" | "financial" | "business";

interface Report extends TabItem<TabId> {
  group: GroupId;
  view: React.ReactNode;
}

const REPORTS: Report[] = [
  { id: "live", label: "Temps réel", icon: Activity, group: "analytics", view: <LiveKpiDashboard /> },
  { id: "comparison", label: "Comparaison", icon: GitCompare, group: "analytics", view: <ComparisonReport /> },
  { id: "trends", label: "Tendances", icon: LineChart, group: "analytics", view: <TrendsChart /> },
  { id: "top-resources", label: "Top ressources", icon: Building2, group: "analytics", view: <TopResourcesReport /> },
  { id: "top-owners", label: "Top clients", icon: Trophy, group: "analytics", view: <TopOwnersReport /> },
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, group: "financial", view: <FinanceDashboard /> },
  { id: "payments", label: "Paiements", icon: CreditCard, group: "financial", view: <PaymentsReport /> },
  { id: "aging", label: "Vieillissement", icon: Clock, group: "financial", view: <AgingReport /> },
  { id: "cash-registers", label: "Caisses", icon: Wallet, group: "financial", view: <CashRegistersReport /> },
  { id: "cash-flow", label: "Trésorerie", icon: BarChart3, group: "financial", view: <CashFlowReport /> },
  { id: "occupancy", label: "Occupation", icon: Building2, group: "financial", view: <OccupancyReport /> },
  { id: "activity", label: "Activité", icon: FileText, group: "business", view: <ActivityReport /> },
  { id: "member-profile", label: "Membre 360", icon: UserRound, group: "business", view: <MemberProfileReport /> },
  { id: "debt-recovery", label: "Recouvrement", icon: Clock, group: "business", view: <DebtRecoveryReport /> },
  { id: "resource-utilization", label: "Utilisation ressources", icon: Building2, group: "business", view: <ResourceUtilizationReport /> },
  { id: "stock-valuation", label: "Stock", icon: Archive, group: "business", view: <StockValuationReport /> },
  { id: "subscription-analytics", label: "Abonnements", icon: Repeat, group: "business", view: <SubscriptionAnalyticsReport /> },
];

const GROUPS: TabItem<GroupId>[] = [
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "financial", label: "Financier", icon: CreditCard },
  { id: "business", label: "Métier", icon: FileText },
];

export const ReportingMaster: React.FC = () => {
  const [group, setGroup] = useState<GroupId>("analytics");
  const [activeTab, setActiveTab] = useState<TabId>("live");
  // Un rapport visité reste monté (filtres conservés), les autres ne sont chargés qu'à la première visite.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["live"]));

  const openReport = (id: TabId) => {
    setActiveTab(id);
    setVisitedTabs((prev) => new Set([...prev, id]));
  };

  const openGroup = (g: GroupId) => {
    setGroup(g);
    const current = REPORTS.find((r) => r.id === activeTab);
    if (current?.group !== g) {
      const first = REPORTS.find((r) => r.group === g);
      if (first) openReport(first.id);
    }
  };

  const inGroup: TabItem<TabId>[] = REPORTS.filter((r) => r.group === group).map(({ id, label, icon }) => ({ id, label, icon }));

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Analytiques et rapports" subtitle="Les chiffres financiers, opérationnels et métier au même endroit" />
        <div className="mb-4">
          <Tabs items={GROUPS} active={group} onChange={openGroup} />
        </div>
        <div className="mb-6">
          <Tabs variant="soft" items={inGroup} active={activeTab} onChange={openReport} />
        </div>

        {REPORTS.map((r) =>
          visitedTabs.has(r.id) ? (
            <div key={r.id} className={activeTab !== r.id ? "hidden" : ""}>
              {r.view}
            </div>
          ) : null,
        )}
      </div>
    </AdminLayout>
  );
};
