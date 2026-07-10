import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Wrench,
  TrendingDown,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

const alertTypeConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  LOW_STOCK: {
    label: "Stock bas",
    color: "bg-yellow-100 text-yellow-700",
    icon: TrendingDown,
  },
  OUT_OF_STOCK: {
    label: "Rupture de stock",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  NEGATIVE_STOCK: {
    label: "Stock négatif",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  EXPIRY_SOON: {
    label: "Expiration proche",
    color: "bg-orange-100 text-orange-700",
    icon: Calendar,
  },
  LOT_EXPIRED: {
    label: "Lot expiré",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  ASSET_WARRANTY_EXPIRING: {
    label: "Garantie expire",
    color: "bg-orange-100 text-orange-700",
    icon: Calendar,
  },
  ASSET_MAINTENANCE_DUE: {
    label: "Maintenance due",
    color: "bg-blue-100 text-blue-700",
    icon: Wrench,
  },
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  OPEN: {
    label: "Ouverte",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  ACKNOWLEDGED: {
    label: "Accusée",
    color: "bg-yellow-100 text-yellow-700",
    icon: Eye,
  },
  RESOLVED: {
    label: "Résolue",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  DISMISSED: {
    label: "Ignorée",
    color: "bg-gray-100 text-gray-700",
    icon: XCircle,
  },
};

export const AlertsCenter: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] = useState("");
  const [resolveModal, setResolveModal] = useState<{
    alertCode: string;
  } | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ["alerts", statusFilter, alertTypeFilter],
    queryFn: () =>
      inventoryService.getAlerts({
        status: statusFilter || undefined,
        alertType: alertTypeFilter || undefined,
        size: 100,
      }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertCode: string) =>
      inventoryService.acknowledgeAlert(alertCode, admin?.email || "admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      alertCode,
      resolutionNote,
    }: {
      alertCode: string;
      resolutionNote: string;
    }) =>
      inventoryService.resolveAlert(
        alertCode,
        admin?.email || "admin",
        resolutionNote,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (alertCode: string) => inventoryService.dismissAlert(alertCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const alerts = alertsData?.content || [];

  const filteredAlerts = alerts.filter(
    (alert: any) =>
      alert.message.toLowerCase().includes(search.toLowerCase()) ||
      (alert.itemName &&
        alert.itemName.toLowerCase().includes(search.toLowerCase())),
  );

  const openCount = alerts.filter((a: any) => a.status === "OPEN").length;
  const acknowledgedCount = alerts.filter(
    (a: any) => a.status === "ACKNOWLEDGED",
  ).length;
  const resolvedCount = alerts.filter(
    (a: any) => a.status === "RESOLVED",
  ).length;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-lg sm:text-xl sm:text-2xl font-semibold text-gray-900">
          Centre d'alertes
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-sm sm:text-base font-medium">
            {openCount} ouvertes
          </div>
          <div className="px-4 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm sm:text-base font-medium">
            {acknowledgedCount} accusées
          </div>
          <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm sm:text-base font-medium">
            {resolvedCount} résolues
          </div>
        </div>
      </div>

      {/* Filtres - AGRANDIS */}
      <div className="flex flex-col md:flex-row gap-5 mb-8">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher une alerte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 ring-1 ring-gray-100 rounded-2xl bg-white text-sm sm:text-base min-w-[160px]"
        >
          <option value="">Tous les statuts</option>
          <option value="OPEN">Ouvertes</option>
          <option value="ACKNOWLEDGED">Accusées</option>
          <option value="RESOLVED">Résolues</option>
          <option value="DISMISSED">Ignorées</option>
        </select>
        <select
          value={alertTypeFilter}
          onChange={(e) => setAlertTypeFilter(e.target.value)}
          className="px-5 py-3 ring-1 ring-gray-100 rounded-2xl bg-white text-sm sm:text-base min-w-[200px]"
        >
          <option value="">Tous les types</option>
          <option value="LOW_STOCK">Stock bas</option>
          <option value="OUT_OF_STOCK">Rupture</option>
          <option value="EXPIRY_SOON">Expiration proche</option>
          <option value="LOT_EXPIRED">Lot expiré</option>
          <option value="ASSET_WARRANTY_EXPIRING">Garantie expire</option>
          <option value="ASSET_MAINTENANCE_DUE">Maintenance due</option>
        </select>
      </div>

      {/* Liste des alertes - AGRANDIE */}
      <div className="space-y-5">
        {filteredAlerts.map((alert: any) => {
          const AlertIcon =
            alertTypeConfig[alert.alertType]?.icon || AlertTriangle;
          const alertColor =
            alertTypeConfig[alert.alertType]?.color ||
            "bg-gray-100 text-gray-700";
          const StatusIcon = statusConfig[alert.status]?.icon;
          const statusColor =
            statusConfig[alert.status]?.color || "bg-gray-100 text-gray-700";

          return (
            <div
              key={alert.alertCode}
              className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${alertColor}`}
                    >
                      <AlertIcon size={14} />
                      {alertTypeConfig[alert.alertType]?.label ||
                        alert.alertType}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${statusColor}`}
                    >
                      {StatusIcon && <StatusIcon size={14} />}
                      {statusConfig[alert.status]?.label || alert.status}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm sm:text-base mb-3">
                    {alert.message}
                  </p>
                  <div className="flex flex-wrap gap-5 text-sm text-gray-500">
                    {alert.itemName && <span>Article: {alert.itemName}</span>}
                    {alert.locationName && (
                      <span>Emplacement: {alert.locationName}</span>
                    )}
                    {alert.currentQuantity !== undefined && (
                      <span className="font-medium">
                        Stock: {alert.currentQuantity} / seuil{" "}
                        {alert.thresholdQuantity}
                      </span>
                    )}
                    <span className="text-xs">
                      {new Date(alert.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  {alert.status === "OPEN" && (
                    <button
                      onClick={() =>
                        acknowledgeMutation.mutate(alert.alertCode)
                      }
                      className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-2xl hover:bg-yellow-200 font-medium"
                    >
                      Accuser réception
                    </button>
                  )}
                  {(alert.status === "OPEN" ||
                    alert.status === "ACKNOWLEDGED") && (
                    <button
                      onClick={() => {
                        setResolveModal({ alertCode: alert.alertCode });
                        setResolveNote("");
                      }}
                      className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-2xl hover:bg-green-200 font-medium"
                    >
                      Résoudre
                    </button>
                  )}
                  {alert.status !== "DISMISSED" && (
                    <button
                      onClick={() => dismissMutation.mutate(alert.alertCode)}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 font-medium"
                    >
                      Ignorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <CheckCircle size={64} className="mx-auto text-green-300 mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">Aucune alerte trouvée</p>
          <p className="text-sm text-gray-400 mt-2">Tout est sous contrôle !</p>
        </div>
      )}

      {/* Modal de résolution - AGRANDI */}
      {resolveModal && (
        <ModalPortal onClose={() => setResolveModal(null)}>
          <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
            <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Résoudre l'alerte</h3>
            <button
              onClick={() => setResolveModal(null)}
              className="p-2 hover:bg-gray-100 rounded-2xl text-lg sm:text-xl"
            >
              ✕
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Note de résolution *
              </label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={4}
                placeholder="Décrivez comment le problème a été résolu..."
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl resize-none text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (resolveNote && resolveModal) {
                    resolveMutation.mutate({
                      alertCode: resolveModal.alertCode,
                      resolutionNote: resolveNote,
                    });
                    setResolveModal(null);
                  }
                }}
                disabled={!resolveNote || resolveMutation.isPending}
                className="flex-1 bg-green-600 text-white py-3 rounded-2xl hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
