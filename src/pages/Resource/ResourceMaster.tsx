import React, { useState } from "react";
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
} from "lucide-react";
import { ResourcesList } from "./resources/ResourcesList";
import { ResourceTypesList } from "./types/ResourceTypesList";
import { ResourceGroupsList } from "./groups/ResourceGroupsList";
import { ResourcePoliciesList } from "./policies/ResourcePoliciesList";
import { AmenitiesList } from "./amenities/AmenitiesList";
import { PricingRulesList } from "./pricing/PricingRulesList";
import { ResourceAvailability } from "./resources/ResourceAvailability";
import { ResourceClosuresList } from "./closures/ResourceClosuresList";

type TabId =
  | "resources"
  | "types"
  | "groups"
  | "policies"
  | "amenities"
  | "pricing"
  | "availability"
  | "closures";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "resources", label: "Ressources", icon: Building2 },
  { id: "types", label: "Types", icon: Tag },
  { id: "groups", label: "Groupes", icon: Users },
  { id: "policies", label: "Politiques", icon: Shield },
  { id: "amenities", label: "Équipements", icon: Package },
  { id: "pricing", label: "Tarifs", icon: DollarSign },
  { id: "availability", label: "Disponibilités", icon: Calendar },
  { id: "closures", label: "Fermetures", icon: XCircle },
];

export const ResourceMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("resources");

  // CORRECTION : même pattern que SubscriptionMaster
  // Un composant n'est monté qu'à la première visite de son onglet,
  // puis reste dans le DOM masqué (display:none) pour éviter les re-fetches
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["resources"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestion des espaces
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez les ressources, types, groupes, politiques et équipements
        </p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu — monté à la première visite, masqué ensuite */}
      <div className="mt-6">
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
        {visitedTabs.has("closures") && (
          <div className={activeTab !== "closures" ? "hidden" : ""}>
            <ResourceClosuresList />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
