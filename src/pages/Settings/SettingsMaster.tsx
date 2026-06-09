import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Users, Shield, Key } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminRolesPage } from "./AdminRolesPage";
import { AdminPermissionsPage } from "./AdminPermissionsPage";

type TabId = "users" | "roles" | "permissions";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  permissions: string[];
}

const allTabs: Tab[] = [
  {
    id: "users",
    label: "Utilisateurs",
    icon: Users,
    permissions: ["USER:READ", "USER_READ", "SYSTEM:USERS"],
  },
  {
    id: "roles",
    label: "Rôles",
    icon: Shield,
    permissions: ["ROLE:READ", "ROLE_READ", "SYSTEM:ROLES"],
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: Key,
    permissions: ["PERMISSION:READ", "PERMISSION_READ", "SYSTEM:PERMISSIONS"],
  },
];

export const SettingsMaster: React.FC = () => {
  const { hasPermission, isAdmin, admin } = useAuth();
  console.log("isAdmin():", isAdmin());
  console.log("roleNames:", admin?.roleNames);
  console.log("authorities[0..4]:", (admin?.authorities || []).slice(0, 5));
  const visibleTabs = isAdmin()
    ? allTabs
    : allTabs.filter((tab) => tab.permissions.some((p) => hasPermission(p)));
  console.log(
    "visibleTabs:",
    visibleTabs.map((t) => t.id),
  );
  const tabs = visibleTabs.length > 0 ? visibleTabs : allTabs;

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0]?.id || "users");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set([tabs[0]?.id || "users"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-1">
          Gestion des utilisateurs, rôles et permissions
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {visitedTabs.has("users") && (
          <div className={activeTab !== "users" ? "hidden" : ""}>
            <AdminUsersPage />
          </div>
        )}
        {visitedTabs.has("roles") && (
          <div className={activeTab !== "roles" ? "hidden" : ""}>
            <AdminRolesPage />
          </div>
        )}
        {visitedTabs.has("permissions") && (
          <div className={activeTab !== "permissions" ? "hidden" : ""}>
            <AdminPermissionsPage />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
