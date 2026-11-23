import React, { useEffect, useState } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Award, BarChart3, ClipboardCheck, Banknote, Boxes, Building2, CalendarCheck, CalendarDays, Clock, LayoutDashboard, LogIn, Shield } from "lucide-react";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { useAuth } from "../../contexts/AuthContext";
import { BookingDeskPage } from "./BookingDeskPage";
import { BookingsList } from "./BookingsList";
import { BookingBatchesPage } from "./BookingBatchesPage";
import { BookingWaitlistPage } from "./BookingWaitlistPage";
import { PayOnSitePage } from "./PayOnSitePage";
import { BookingCompaniesPage } from "./BookingCompaniesPage";
import { BookingPolicies } from "./BookingPolicies";
import { BookingQuotaOverrides } from "./BookingQuotaOverrides";
import { BookingDashboardPage } from "./BookingDashboardPage";
import { BookingAnalyticsPage } from "./BookingAnalyticsPage";
import { BookingCheckInTerminal } from "./BookingCheckInTerminal";
import { BookingApprovalDetail, BookingApprovals } from "./BookingApprovals";
import { approvalService } from "../../services/approval.service";

type TabId = "desk" | "bookings" | "approvals" | "batches" | "waitlist" | "payOnSite" | "companies" | "policies" | "quotas" | "dashboard" | "analytics" | "checkin";

const ALL: TabItem<TabId>[] = [
  { id: "desk", label: "Accueil du jour", icon: CalendarCheck },
  { id: "bookings", label: "Réservations", icon: CalendarDays },
  { id: "approvals", label: "Approbations", icon: ClipboardCheck },
  { id: "batches", label: "Lots", icon: Boxes },
  { id: "waitlist", label: "Liste d'attente", icon: Clock },
  { id: "payOnSite", label: "Sur place", icon: Banknote },
  { id: "companies", label: "Entreprises", icon: Building2 },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "quotas", label: "Dérogations", icon: Award },
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "analytics", label: "Pilotage", icon: BarChart3 },
  { id: "checkin", label: "Check-in", icon: LogIn },
];

const isTab = (v: string | null): v is TabId => !!v && ALL.some((t) => t.id === v);

export const BookingMaster: React.FC = () => {
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const pending = useQuery({ queryKey: ["approval", "BOOKING", "to-approve"], queryFn: () => approvalService.toApprove("BOOKING"), retry: false, refetchInterval: 60_000 });
  const tabs = ALL.map((t) => (t.id === "approvals" && (pending.data?.length ?? 0) > 0 ? { ...t, count: pending.data!.length } : t)).filter((t) => (t.id === "analytics" ? hasPermission("REPORT:VIEW") || hasPermission("RESOURCE:PRICE") : t.id === "checkin" ? hasPermission("BOOKING:CHECKIN") : true));
  const initial: TabId = isTab(params.get("tab")) ? (params.get("tab") as TabId) : "bookings";
  const [active, setActive] = useState<TabId>(initial);
  const [visited, setVisited] = useState<Set<TabId>>(new Set([initial]));

  useEffect(() => {
    const next = params.get("tab");
    if (isTab(next) && next !== active) {
      setActive(next);
      setVisited((v) => new Set([...v, next]));
    }
  }, [params, active]);

  const change = (tab: TabId) => {
    setActive(tab);
    setVisited((v) => new Set([...v, tab]));
    setParams(tab === "bookings" ? {} : { tab });
  };

  const panes: Record<TabId, React.ReactNode> = {
    desk: <BookingDeskPage />,
    bookings: <BookingsList />,
    approvals: <BookingApprovals />,
    batches: <BookingBatchesPage />,
    waitlist: <BookingWaitlistPage />,
    payOnSite: <PayOnSitePage />,
    companies: <BookingCompaniesPage />,
    policies: <BookingPolicies />,
    quotas: <BookingQuotaOverrides />,
    dashboard: <BookingDashboardPage />,
    analytics: <BookingAnalyticsPage />,
    checkin: <BookingCheckInTerminal />,
  };

  const tabsView = (
    <>
      <PageHeader title="Gestion des réservations" subtitle="Accueil, réservations, approbations, lots, liste d'attente, règles et pilotage" />
      <Tabs items={tabs} active={active} onChange={change} />
      <div className="mt-6">
        {tabs.map((t) => visited.has(t.id) && <div key={t.id} className={active !== t.id ? "hidden" : ""}>{panes[t.id]}</div>)}
      </div>
    </>
  );

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <Routes>
          <Route path="approvals/:number" element={<BookingApprovalDetail />} />
          <Route path="*" element={tabsView} />
        </Routes>
      </div>
    </AdminLayout>
  );
};

export default BookingMaster;
