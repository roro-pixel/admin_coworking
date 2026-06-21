import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeService } from "../services/realtime.service";
import {
  normalizeRealtimeNotification,
  type AdminAlertEvent,
  type ClientNotificationPayload,
  type InventoryAlertEvent,
  type Notification,
  type UnreadCountSignal,
} from "../services/notification.service";

const prependUniqueNotification = (
  current: Notification[] | undefined,
  notification: Notification,
) => {
  const list = Array.isArray(current) ? current : [];
  if (list.some((item) => item.notificationNumber === notification.notificationNumber)) {
    return list;
  }
  return [notification, ...list].slice(0, 20);
};

const emitRealtimeToast = (detail: {
  title: string;
  message?: string;
  tone?: "info" | "warning" | "critical" | "success";
}) => {
  window.dispatchEvent(new CustomEvent("admin-realtime-toast", { detail }));
};

export const useAdminRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    realtimeService.connect(token);

    const subscribe = () => {
      const unsubscribeNotifications = realtimeService.subscribe<ClientNotificationPayload>(
        "/user/queue/notifications",
        (payload) => {
          const notification = normalizeRealtimeNotification(payload);

          queryClient.setQueryData<Notification[]>(
            ["unread-notifications"],
            (current) => prependUniqueNotification(current, notification),
          );

          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });

          emitRealtimeToast({
            title: notification.subject || "Nouvelle notification",
            message: notification.body,
            tone: "info",
          });
        },
      );

      const unsubscribeUnreadCount = realtimeService.subscribe<UnreadCountSignal>(
        "/user/queue/notifications/unread-count",
        (payload) => {
          if (payload.action === "INCREMENT") {
            queryClient.setQueryData<number>(
              ["unread-notifications-count"],
              (current) => Number(current ?? 0) + 1,
            );
          } else {
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
          }
          queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        },
      );

      const unsubscribeAdminAlerts = realtimeService.subscribe<AdminAlertEvent>(
        "/topic/admin/alerts",
        (alert) => {
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
          queryClient.invalidateQueries({ queryKey: ["payment-cash-metrics"] });
          queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });

          emitRealtimeToast({
            title: alert.title,
            message: alert.message,
            tone:
              alert.severity === "CRITICAL"
                ? "critical"
                : alert.severity === "WARNING"
                  ? "warning"
                  : "info",
          });
        },
      );

      const unsubscribeInventoryAlerts = realtimeService.subscribe<InventoryAlertEvent>(
        "/topic/inventory/alerts",
        (alert) => {
          queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
          queryClient.invalidateQueries({ queryKey: ["inventory-metrics"] });
          queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });

          emitRealtimeToast({
            title: alert.alertType,
            message: alert.message,
            tone: "warning",
          });
        },
      );

      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });

      return () => {
        unsubscribeNotifications();
        unsubscribeUnreadCount();
        unsubscribeAdminAlerts();
        unsubscribeInventoryAlerts();
      };
    };

    let unsubscribeTopics = subscribe();
    const offReconnect = realtimeService.onConnect(() => {
      unsubscribeTopics?.();
      unsubscribeTopics = subscribe();
    });

    return () => {
      unsubscribeTopics?.();
      offReconnect();
    };
  }, [queryClient]);
};
