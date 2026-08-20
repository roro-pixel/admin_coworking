import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  AlertTriangle,
  Key,
  Loader2,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminRolesPage } from "./AdminRolesPage";
import { AdminPermissionsPage } from "./AdminPermissionsPage";
import { adminMaintenanceService } from "../../services/adminMaintenance.service";
import { ModalPortal } from "../../components/ui/ModalPortal";

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
  const { hasPermission, isAdmin } = useAuth();

  const visibleTabs = isAdmin()
    ? allTabs
    : allTabs.filter((tab) =>
        tab.permissions.some((permission) => hasPermission(permission)),
      );

  const tabs = visibleTabs.length > 0 ? visibleTabs : allTabs;

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0]?.id || "users");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set([tabs[0]?.id || "users"]),
  );
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((previous) => new Set([...previous, tabId]));
  };

  const openPurgeModal = () => {
    setConfirmationText("");
    setPurgeError(null);
    setPurgeSuccess(null);
    setShowPurgeModal(true);
  };

  const closePurgeModal = () => {
    if (isPurging) return;
    setShowPurgeModal(false);
    setConfirmationText("");
    setPurgeError(null);
  };

  const handlePurgeData = async () => {
    if (confirmationText !== "PURGER") return;

    setIsPurging(true);
    setPurgeError(null);
    setPurgeSuccess(null);

    try {
      const response = await adminMaintenanceService.purgeData();

      setPurgeSuccess(
        response?.message ||
          "Les données applicatives ont été supprimées avec succès.",
      );
      setShowPurgeModal(false);
      setConfirmationText("");
    } catch (error: any) {
      setPurgeError(
        error?.response?.data?.message ||
          error?.message ||
          "Impossible de vider la base de données.",
      );
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="mt-1 text-gray-600">
            Gestion des utilisateurs, rôles et permissions
          </p>
        </div>

        {isAdmin() && (
          <button
            type="button"
            onClick={openPurgeModal}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <Trash2 size={16} />
            Vider la base de données
          </button>
        )}
      </div>

      {purgeSuccess && (
        <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-100">
          {purgeSuccess}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-sm transition-all ${
                activeTab === tab.id
                  ? "border-b-2 border-primary-600 bg-primary-50 text-primary-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
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

      {showPurgeModal && (
        <ModalPortal onClose={closePurgeModal} size="lg">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-950">
                    Vider la base de données
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Cette opération est irréversible.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePurgeModal}
                disabled={isPurging}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                Toutes les données applicatives ciblées par l’endpoint de
                maintenance seront supprimées. Vérifie que tu es bien sur le
                bon environnement avant de continuer.
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Saisis <span className="font-bold text-red-600">PURGER</span>{" "}
                  pour confirmer
                </label>
                <input
                  value={confirmationText}
                  onChange={(event) =>
                    setConfirmationText(event.target.value.toUpperCase())
                  }
                  disabled={isPurging}
                  placeholder="PURGER"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium uppercase outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
                />
              </div>

              {purgeError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {purgeError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePurgeModal}
                  disabled={isPurging}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handlePurgeData}
                  disabled={confirmationText !== "PURGER" || isPurging}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPurging ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
};