import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Award, BarChart3, Calendar, Clock, LogIn, Shield } from "lucide-react";
import { AdminBookings } from "./Bookings";
import { BookingPolicies } from "./BookingPolicies";
import { BookingQuotaOverrides } from "./BookingQuotaOverrides";
import { BookingMetrics } from "./BookingMetrics";
import { WaitlistManager } from "./WaitlistManager";
import { BookingCheckInTerminal } from "./BookingCheckInTerminal";

type TabId = "metrics" | "bookings" | "checkin" | "waitlist" | "policies" | "quotas";

const tabs: TabItem<TabId>[] = [
  { id: "metrics", label: "Métriques", icon: BarChart3 },
  { id: "bookings", label: "Réservations", icon: Calendar },
  { id: "checkin", label: "Check-in", icon: LogIn },
  { id: "waitlist", label: "Liste d'attente", icon: Clock },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "quotas", label: "Dérogations", icon: Award },
];

export const BookingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("bookings");

  // Montage paresseux : un onglet n'est monté qu'à sa première visite,
  // puis conservé masqué pour éviter de recharger ses données.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["bookings"]));

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  const panel = (id: TabId, content: React.ReactNode) =>
    visitedTabs.has(id) && <div className={activeTab !== id ? "hidden" : ""}>{content}</div>;

  return (
    <AdminLayout>
      <div style={brandVars}>
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Réservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Réservations, check-in, liste d'attente, politiques et dérogations
          </p>
        </div>

        <div className="mb-6">
          <Tabs items={tabs} active={activeTab} onChange={handleTabChange} />
        </div>

        {panel("metrics", <BookingMetrics />)}
        {panel("bookings", <AdminBookings />)}
        {panel("checkin", <BookingCheckInTerminal />)}
        {panel("waitlist", <WaitlistManager />)}
        {panel("policies", <BookingPolicies />)}
        {panel("quotas", <BookingQuotaOverrides />)}

        {/* Un seul Toaster pour tous les onglets du hub */}
        <Toaster />
      </div>
    </AdminLayout>
  );
};
