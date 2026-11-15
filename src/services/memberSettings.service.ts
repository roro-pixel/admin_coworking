import { apiClient } from "./api";
import { API } from "./pagination";

// Préférences d'un membre (back-office)
// GET : CLIENT:READ. PATCH : CLIENT:UPDATE avec en-tête Idempotency-Key.
// Le PATCH remplace tout : toujours renvoyer l'objet complet lu par le GET,
// sans notificationPref (géré par /notifications).

export type NotificationEvent =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "BOOKING_FAILED"
  | "INVOICE_ISSUED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED";

export type NotificationChannel = "SMS" | "WHATSAPP" | "IN_APP" | "PUSH" | "EMAIL";

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_REMINDER",
  "BOOKING_FAILED",
  "INVOICE_ISSUED",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
];

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ["SMS", "WHATSAPP", "IN_APP", "PUSH", "EMAIL"];

export interface NotificationPref {
  eventType: NotificationEvent;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface BillingPref {
  billingEntityType?: "COMPANY" | "PERSONAL" | null;
  billingCompanyName?: string | null;
  billingEmail?: string | null;
  /** Orthographe du backend : trois « l ». */
  billlingAddress?: string | null;
}

export interface WalletPref {
  autoTopupEnabled?: boolean | null;
  autoTopupThreshold?: number | null;
  autoTopupAmount?: number | null;
  spendingDailyLimit?: number | null;
  spendingWeeklyLimit?: number | null;
}

export interface MemberSettings {
  langage?: string | null;
  timeZone?: string | null;
  showNameOnDisplay?: boolean | null;
  showEmail?: boolean | null;
  showPhone?: boolean | null;
  billingPref?: BillingPref | null;
  walletPref?: WalletPref | null;
  notificationPref?: NotificationPref[] | null;
}

const idemKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const unwrap = <T>(d: any): T => (d && d.data !== undefined && !Array.isArray(d) ? d.data : d);

export const memberSettingsService = {
  async get(memberId: string): Promise<MemberSettings> {
    const { data } = await apiClient.get(`${API}/members/${encodeURIComponent(memberId)}/settings`);
    const s = unwrap<MemberSettings>(data);
    return { ...s, billingPref: { billingEntityType: "PERSONAL", ...s.billingPref }, walletPref: { ...s.walletPref } };
  },

  async update(memberId: string, settings: MemberSettings, reason?: string): Promise<MemberSettings> {
    // Le PATCH remplace tout : on envoie toujours l'objet complet.
    const { notificationPref: _ignored, ...rest } = settings;
    const body: MemberSettings = {
      ...rest,
      langage: rest.langage || "fr",
      timeZone: rest.timeZone || "Africa/Lagos",
      showNameOnDisplay: !!rest.showNameOnDisplay,
      showEmail: !!rest.showEmail,
      showPhone: !!rest.showPhone,
      billingPref: { ...rest.billingPref, billingEntityType: rest.billingPref?.billingEntityType || "PERSONAL" },
      walletPref: { ...rest.walletPref, autoTopupEnabled: !!rest.walletPref?.autoTopupEnabled },
    };
    const { data } = await apiClient.patch(`${API}/members/${encodeURIComponent(memberId)}/settings`, body, {
      params: reason?.trim() ? { reason: reason.trim() } : undefined,
      headers: { "Idempotency-Key": idemKey() },
    });
    return unwrap<MemberSettings>(data);
  },

  async getNotifications(memberId: string): Promise<NotificationPref[]> {
    const { data } = await apiClient.get(`${API}/members/${encodeURIComponent(memberId)}/settings/notifications`);
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  async setNotification(memberId: string, pref: NotificationPref): Promise<NotificationPref[]> {
    const { data } = await apiClient.patch(
      `${API}/members/${encodeURIComponent(memberId)}/settings/notifications`,
      pref,
      { headers: { "Idempotency-Key": idemKey() } },
    );
    return Array.isArray(data) ? data : (data?.data ?? []);
  },
};
