import { apiClient } from "./api";

export type NotificationChannel =
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "IN_APP"
  | "WEBHOOK";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";
export type NotificationType =
  | "BOOKING_REMINDER"
  | "BOOKING_CONFIRMATION"
  | "BOOKING_CANCELLATION"
  | "BILLING_REMINDER"
  | "INVOICE_ISSUED"
  | "PAYMENT_RECEIVED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_SUSPENDED"
  | "KYC_REMINDER"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "WAITLIST_OFFER"
  | "WAITLIST_PROMOTED"
  | "CONTRACT_SIGNATURE_REQUEST"
  | "CONTRACT_SIGNED"
  | "INVENTORY_ALERT"
  | "TASK_ASSIGNED"
  | "SUPPORT_CLIENT_REPLY"
  | "CASH_ANOMALY"
  | "BILLING_OVERDUE"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_NO_SHOW"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_RENEWAL_PAYMENT_DUE"
  | "SUBSCRIPTION_DIRECT_DEBIT_FAILED"
  | "BILLING_DOCUMENT_ISSUED"
  | "CONTRACT_SIGNING_REQUESTED"
  | "CONTRACT_SIGNED_VIA_ESIGN";

export interface Notification {
  notificationNumber: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  recipientName?: string;
  ownerType?: string;
  ownerCode?: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  retryCount: number;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  scheduledAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface ClientNotificationPayload {
  notificationNumber: string;
  title: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payloadJson: string;
  createdAt: string;
  read: boolean;
}

export interface AdminAlertEvent {
  alertType: string;
  module: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  payloadJson: string | null;
  createdAt: string;
}

export interface InventoryAlertEvent {
  alertCode: string;
  alertType: string;
  itemCode: string | null;
  locationCode: string | null;
  assetCode: string | null;
  message: string;
  createdAt: string;
}

export interface UnreadCountSignal {
  action: "INCREMENT";
}

export const normalizeRealtimeNotification = (
  payload: ClientNotificationPayload,
): Notification => ({
  notificationNumber: payload.notificationNumber,
  type: payload.eventType as NotificationType,
  channel: "IN_APP",
  recipient: "",
  subject: payload.title,
  body: payload.title,
  status: "SENT",
  retryCount: 0,
  readAt: payload.read ? payload.createdAt : undefined,
  createdAt: payload.createdAt,
});

export interface NotificationTemplate {
  code: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationService = {
  // Récupérer les notifications non lues (pour le header)
  getUnreadNotifications: async (params?: {
    limit?: number;
  }): Promise<Notification[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/admin/notifications/unread",
      {
        params,
      },
    );
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response.data?.content)) return response.data.content;
    return [];
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get(
      "/sni/api/v1/admin/notifications/unread-count",
    );
    return Number(response.data?.count ?? response.data ?? 0);
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationNumber: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/admin/notifications/${notificationNumber}/read`,
    );
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch("/sni/api/v1/admin/notifications/read-all");
  },

  // Récupérer toutes les notifications (page dédiée)
  getNotifications: async (params?: {
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: Notification[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/notifications", {
      params,
    });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) {
      return {
        content: response.data,
        totalElements: response.data.length,
        totalPages: 1,
      };
    }
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Templates
  getTemplates: async (params?: {
    type?: string;
    channel?: string;
    isActive?: boolean;
  }): Promise<NotificationTemplate[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/notifications/templates",
      { params },
    );
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },
};
