import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Key, ScrollText, Shield, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { ActionButton, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { useAuth } from "../../contexts/AuthContext";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminRolesPage } from "./AdminRolesPage";
import { AdminPermissionsPage } from "./AdminPermissionsPage";
import { PurgePanel } from "../../components/admin/PurgePanel";
import { PlatformSettingsTab } from "../../components/settings/PlatformSettingsTab";

type TabId = "users" | "roles" | "permissions" | "platform" | "audit";

interface Tab extends TabItem<TabId> {
  permissions: string[];
}

const allTabs: Tab[] = [
  { id: "users", label: "Utilisateurs", icon: Users, permissions: ["USER:READ", "USER_READ", "SYSTEM:USERS"] },
  { id: "roles", label: "Rôles", icon: Shield, permissions: ["ROLE:READ", "ROLE_READ", "SYSTEM:ROLES"] },
  {
    id: "permissions",
    label: "Permissions",
    icon: Key,
    permissions: ["PERMISSION:READ", "PERMISSION_READ", "SYSTEM:PERMISSIONS"],
  },
  // Réservé aux rôles ADMIN et SUPER_ADMIN (le serveur contrôle aussi SYSTEM:SETTINGS)
  { id: "platform", label: "Plateforme", icon: SlidersHorizontal, permissions: ["SYSTEM:SETTINGS"] },
  // Ouvre le centre d'audit (/audit), page à part avec ses propres onglets
  { id: "audit", label: "Audit", icon: ScrollText, permissions: ["SYSTEM:AUDIT"] },
];

export const SettingsMaster: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const admin = isAdmin();
  const visibleTabs = admin
    ? allTabs
    : allTabs.filter((tab) => tab.id !== "platform" && tab.permissions.some((permission) => hasPermission(permission)));

  const tabs = visibleTabs.length > 0 ? visibleTabs : allTabs.filter((t) => t.id !== "platform");

  // « ?tab=users » (lien de retour de la fiche utilisateur) ouvre l'onglet demandé s'il est visible
  const requested = tabs.find((t) => t.id !== "audit" && t.id === searchParams.get("tab"))?.id;
  const firstTab: TabId = requested ?? tabs.find((t) => t.id !== "audit")?.id ?? "users";

  const [activeTab, setActiveTab] = useState<TabId>(firstTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set([firstTab]));
  const [showPurge, setShowPurge] = useState(false);

  const handleTabChange = (tabId: TabId) => {
    if (tabId === "audit") {
      navigate("/audit");
      return;
    }
    setActiveTab(tabId);
    setVisitedTabs((previous) => new Set([...previous, tabId]));
  };

  const panel = (id: TabId, content: React.ReactNode) =>
    visitedTabs.has(id) && <div className={activeTab !== id ? "hidden" : ""}>{content}</div>;

  return (
    <AdminLayout>
      <div style={brandVars}>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Paramètres</h1>
            <p className="mt-1 text-sm text-gray-500">Utilisateurs, rôles, permissions et réglages de la plateforme</p>
          </div>

          {admin && !showPurge && (
            <ActionButton variant="danger" icon={Trash2} className="self-start" onClick={() => setShowPurge(true)}>
              Vider la base de données
            </ActionButton>
          )}
        </div>

        {showPurge && <PurgePanel onClose={() => setShowPurge(false)} />}

        <div className="mb-6">
          <Tabs items={tabs} active={activeTab} onChange={handleTabChange} />
        </div>

        {panel("users", <AdminUsersPage />)}
        {panel("roles", <AdminRolesPage />)}
        {panel("permissions", <AdminPermissionsPage />)}
        {admin && panel("platform", <PlatformSettingsTab />)}

        <Toaster />
      </div>
    </AdminLayout>
  );
};
