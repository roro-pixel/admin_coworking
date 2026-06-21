import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  Search,
  XCircle,
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
  SUPPORT_CLIENT_REPLY: Bell,
  CASH_ANOMALY: AlertCircle,
  BILLING_OVERDUE: AlertCircle,
  BILLING_DOCUMENT_ISSUED: Bell,
  CONTRACT_SIGNING_REQUESTED: Bell,
  CONTRACT_SIGNED_VIA_ESIGN: CheckCircle,
};

const notificationTone: Record<string, string> = {
  BOOKING_CONFIRMATION: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  BOOKING_REMINDER: "text-sky-700 bg-sky-50 ring-sky-100",
  BOOKING_CANCELLATION: "text-rose-700 bg-rose-50 ring-rose-100",
  KYC_APPROVED: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  KYC_REJECTED: "text-rose-700 bg-rose-50 ring-rose-100",
  INVOICE_ISSUED: "text-slate-700 bg-slate-50 ring-slate-100",
  PAYMENT_RECEIVED: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  INVENTORY_ALERT: "text-amber-700 bg-amber-50 ring-amber-100",
  SUPPORT_CLIENT_REPLY: "text-sky-700 bg-sky-50 ring-sky-100",
  CASH_ANOMALY: "text-rose-700 bg-rose-50 ring-rose-100",
  BILLING_OVERDUE: "text-amber-700 bg-amber-50 ring-amber-100",
  BILLING_DOCUMENT_ISSUED: "text-slate-700 bg-slate-50 ring-slate-100",
  CONTRACT_SIGNING_REQUESTED: "text-violet-700 bg-violet-50 ring-violet-100",
  CONTRACT_SIGNED_VIA_ESIGN: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  default: "text-slate-700 bg-slate-50 ring-slate-100",
};

const typeLabels: Record<string, string> = {
  BOOKING_CONFIRMATION: "Réservation confirmée",
  BOOKING_REMINDER: "Rappel réservation",
  BOOKING_CANCELLATION: "Réservation annulée",
  KYC_APPROVED: "KYC approuvé",
  KYC_REJECTED: "KYC rejeté",
  INVOICE_ISSUED: "Facture émise",
  PAYMENT_RECEIVED: "Paiement reçu",
  INVENTORY_ALERT: "Alerte stock",
  SUPPORT_CLIENT_REPLY: "Réponse client support",
  CASH_ANOMALY: "Anomalie caisse",
  BILLING_OVERDUE: "Factures en retard",
  BILLING_DOCUMENT_ISSUED: "Facture émise",
  CONTRACT_SIGNING_REQUESTED: "Signature contrat requise",
  CONTRACT_SIGNED_VIA_ESIGN: "Contrat signé",
};

const statusLabels: Record<string, string> = {
  SENT: "Envoyée",
  PENDING: "En attente",
  FAILED: "Échouée",
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
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

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter((n) => {
      const subject = n.subject || typeLabels[n.type] || n.type;
      return [subject, n.body, n.type, n.channel, n.notificationNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [notifications, search]);

  const unreadCount = notifications.filter(
    (n) => n.status === "SENT" && !n.readAt,
  ).length;
  const failedCount = notifications.filter((n) => n.status === "FAILED").length;
  const sentCount = notifications.filter((n) => n.status === "SENT").length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Suivez les messages système, alertes, paiements et réservations.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <CheckCheck size={17} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="Non lues" value={unreadCount} />
          <MetricCard label="Envoyées" value={sentCount} />
          <MetricCard label="Échecs" value={failedCount} tone="danger" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Rechercher par objet, contenu, canal ou numéro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 lg:col-span-3"
            >
              <option value="">Tous les types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 lg:col-span-3"
            >
              <option value="">Tous les statuts</option>
              <option value="SENT">Envoyées</option>
              <option value="PENDING">En attente</option>
              <option value="FAILED">Échouées</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">Aucune notification</p>
              <p className="mt-1 text-sm text-slate-500">
                Ajustez les filtres ou réessayez plus tard.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const tone =
                  notificationTone[notification.type] || notificationTone.default;
                const isRead =
                  notification.status !== "SENT" || !!notification.readAt;

                return (
                  <div
                    key={notification.notificationNumber}
                    className="rounded-xl px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex gap-4">
                      <div
                        className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-slate-950">
                                {notification.subject ||
                                  typeLabels[notification.type] ||
                                  notification.type}
                              </h3>
                              {!isRead && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                              )}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {notification.body}
                            </p>
                          </div>

                          {!isRead && (
                            <button
                              type="button"
                              onClick={() =>
                                markAsReadMutation.mutate(
                                  notification.notificationNumber,
                                )
                              }
                              disabled={markAsReadMutation.isPending}
                              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{formatDate(notification.createdAt)}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {typeLabels[notification.type] || notification.type}
                          </span>
                          {notification.channel && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">
                              {notification.channel}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              notification.status === "FAILED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {statusLabels[notification.status] ||
                              notification.status}
                          </span>
                          {isRead && <span className="text-slate-400">Lu</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  tone?: "default" | "danger";
}> = ({ label, value, tone = "default" }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm text-slate-500">{label}</p>
    <p
      className={`mt-2 text-2xl font-bold ${
        tone === "danger" ? "text-rose-600" : "text-slate-950"
      }`}
    >
      {value.toLocaleString("fr-FR")}
    </p>
  </div>
);
