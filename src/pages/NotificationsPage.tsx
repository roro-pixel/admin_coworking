import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CheckCheck,
  Search,
} from "lucide-react";
import { notificationService } from "../services/notification.service";

const notificationIcons: Record<string, React.ElementType> = {
  BOOKING_CONFIRMATION: CheckCircle,
  BOOKING_REMINDER: Clock,
  BOOKING_CANCELLATION: XCircle,
  KYC_APPROVED: CheckCircle,
  KYC_REJECTED: XCircle,
  INVOICE_ISSUED: Bell,
  PAYMENT_RECEIVED: CheckCircle,
  INVENTORY_ALERT: AlertCircle,
};

const notificationColors: Record<string, string> = {
  BOOKING_CONFIRMATION: "text-green-600 bg-green-50",
  BOOKING_REMINDER: "text-blue-600 bg-blue-50",
  BOOKING_CANCELLATION: "text-red-600 bg-red-50",
  KYC_APPROVED: "text-green-600 bg-green-50",
  KYC_REJECTED: "text-red-600 bg-red-50",
  INVOICE_ISSUED: "text-purple-600 bg-purple-50",
  PAYMENT_RECEIVED: "text-green-600 bg-green-50",
  INVENTORY_ALERT: "text-orange-600 bg-orange-50",
  default: "text-gray-600 bg-gray-50",
};

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", typeFilter, statusFilter],
    queryFn: () =>
      notificationService.getNotifications({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        size: 100,
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationNumber: string) =>
      notificationService.markAsRead(notificationNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const notifications = data?.content || [];
  const unreadCount = notifications.filter(
    (n) => n.status === "SENT" && !n.readAt,
  ).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Chargement...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} notification(s) non lue(s)`
                : "Toutes vos notifications"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <CheckCheck size={18} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher une notification..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">Tous les types</option>
            <option value="BOOKING_CONFIRMATION">Réservation confirmée</option>
            <option value="BOOKING_REMINDER">Rappel réservation</option>
            <option value="BOOKING_CANCELLATION">Réservation annulée</option>
            <option value="KYC_APPROVED">KYC approuvé</option>
            <option value="KYC_REJECTED">KYC rejeté</option>
            <option value="INVOICE_ISSUED">Facture émise</option>
            <option value="PAYMENT_RECEIVED">Paiement reçu</option>
            <option value="INVENTORY_ALERT">Alerte stock</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="SENT">Envoyées</option>
            <option value="PENDING">En attente</option>
            <option value="FAILED">Échouées</option>
          </select>
        </div>

        {/* Liste des notifications */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <Bell size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const colorClass =
                notificationColors[notification.type] ||
                notificationColors.default;
              const isRead =
                notification.status !== "SENT" || notification.readAt;

              return (
                <div
                  key={notification.notificationNumber}
                  className={`bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all ${
                    !isRead ? "border-l-4 border-primary-500" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {notification.subject || notification.type}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
                        </div>
                        {!isRead && (
                          <button
                            onClick={() =>
                              markAsReadMutation.mutate(
                                notification.notificationNumber,
                              )
                            }
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.channel && (
                            <span className="capitalize">
                              {notification.channel}
                            </span>
                          )}
                          {notification.status === "FAILED" && (
                            <span className="text-red-600">Échec d'envoi</span>
                          )}
                        </div>
                        {isRead && (
                          <span className="text-xs text-gray-400">Lu</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
