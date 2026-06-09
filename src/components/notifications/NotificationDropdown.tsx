import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CheckCheck,
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

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => notificationService.getUnreadNotifications({ limit: 10 }),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationNumber: string) =>
      notificationService.markAsRead(notificationNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
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
    if (notification.status === "SENT") {
      markAsReadMutation.mutate(notification.notificationNumber);
    }
    setIsOpen(false);
  };

  // Compter les notifications non lues (status SENT et pas de readAt)
  const unreadCount = notifications.filter(
    (n) => n.status === "SENT" && !n.readAt,
  ).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    if (diffMinutes < 1440) return `il y a ${Math.floor(diffMinutes / 60)} h`;
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const colorClass =
                  notificationColors[notification.type] ||
                  notificationColors.default;
                const isRead =
                  notification.status !== "SENT" || !!notification.readAt;

                return (
                  <button
                    key={notification.notificationNumber}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
                      !isRead ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.subject || notification.type}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.body}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.createdAt)}
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 border-t bg-gray-50 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
