import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Calendar, Shield, Award, BarChart3, Clock, LogIn } from "lucide-react";
import { AdminBookings } from "./Bookings";
import { BookingPolicies } from "./BookingPolicies";
import { BookingQuotaOverrides } from "./BookingQuotaOverrides";
import { BookingMetrics } from "./BookingMetrics";
import { WaitlistManager } from "./WaitlistManager";
import { BookingCheckInTerminal } from "./BookingCheckInTerminal";

type TabId = "metrics" | "bookings" | "checkin" | "waitlist" | "policies" | "quotas";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "metrics", label: "Métriques", icon: BarChart3 },
  { id: "bookings", label: "Réservations", icon: Calendar },
  { id: "checkin", label: "Check-in", icon: LogIn },
  { id: "waitlist", label: "Liste d'attente", icon: Clock },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "quotas", label: "Dérogations", icon: Award },
];

export const BookingMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("bookings");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["bookings"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
          Gestion des réservations
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez les réservations, liste d'attente, politiques et dérogations.
        </p>
      </div>

      <div className="mb-7 overflow-x-auto rounded-[1.35rem] bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5 pr-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-black transition-all whitespace-nowrap sm:px-4 sm:py-3 sm:text-sm ${
                  isActive
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {visitedTabs.has("metrics") && (
          <div className={activeTab !== "metrics" ? "hidden" : ""}>
            <BookingMetrics />
          </div>
        )}
        {visitedTabs.has("bookings") && (
          <div className={activeTab !== "bookings" ? "hidden" : ""}>
            <AdminBookings />
          </div>
        )}
        {visitedTabs.has("checkin") && (
          <div className={activeTab !== "checkin" ? "hidden" : ""}>
            <BookingCheckInTerminal />
          </div>
        )}
        {visitedTabs.has("waitlist") && (
          <div className={activeTab !== "waitlist" ? "hidden" : ""}>
            <WaitlistManager />
          </div>
        )}
        {visitedTabs.has("policies") && (
          <div className={activeTab !== "policies" ? "hidden" : ""}>
            <BookingPolicies />
          </div>
        )}
        {visitedTabs.has("quotas") && (
          <div className={activeTab !== "quotas" ? "hidden" : ""}>
            <BookingQuotaOverrides />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
