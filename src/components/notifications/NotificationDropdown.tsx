import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../../services/notification.service";
import type { Notification } from "../../services/notification.service";

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
  BOOKING_REMINDER: "Rappel de réservation",
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60000),
  );

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffMinutes < 1440) return `il y a ${Math.floor(diffMinutes / 60)} h`;
  return date.toLocaleDateString("fr-FR");
};

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => notificationService.getUnreadNotifications({ limit: 10 }),
  });

  const { data: unreadCount = notifications.length } = useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: () => notificationService.getUnreadCount(),
    initialData: notifications.length,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationNumber: string) =>
      notificationService.markAsRead(notificationNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status === "SENT" && !notification.readAt) {
      markAsReadMutation.mutate(notification.notificationNumber);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[390px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Notifications
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Aucune notification non lue"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto px-2 pb-2">
            {notifications.length === 0 ? (
              <div className="mx-2 mb-2 rounded-xl bg-slate-50 px-4 py-8 text-center text-slate-500">
                <Bell size={34} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const tone =
                    notificationTone[notification.type] || notificationTone.default;
                  const isRead =
                    notification.status !== "SENT" || !!notification.readAt;

                  return (
                    <button
                      key={notification.notificationNumber}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="group w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}
                        >
                          <Icon size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="line-clamp-1 flex-1 text-sm font-semibold text-slate-900">
                              {notification.subject ||
                                typeLabels[notification.type] ||
                                notification.type}
                            </p>
                            {!isRead && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                            {notification.body}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                            <span>{formatDate(notification.createdAt)}</span>
                            {notification.channel && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-500">
                                {notification.channel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
