import { apiClient } from "./api";
import { API, toList } from "./pagination";

// Catalogue de services et services souscrits
// Base /services · rôles ADMIN, SUPER_ADMIN, STAFF.

const BASE = `${API}/services`;

export type ServiceDeliveryMode =
  | "CONTINUOUS"
  | "ON_DEMAND"
  | "SCHEDULED"
  | "METERED";

export type ServiceCategory =
  | "DOMICILIATION"
  | "MAIL_HANDLING"
  | "PHONE_ANSWERING"
  | "STORAGE"
  | "MEETING_ROOM"
  | "COWORKING_ACCESS"
  | "PRIVATE_OFFICE"
  | "ADMIN_SUPPORT"
  | "LEGAL_SUPPORT"
  | "ACCOUNTING_SUPPORT"
  | "IT_SUPPORT"
  | "EVENT_SPACE"
  | "PARKING"
  | "LOCKER"
  | "OTHER";

/** PENDING : attend un contrat ou une ressource. */
export type SubscribedServiceStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export interface ServiceDefinitionView {
  code: string;
  name: string;
  description?: string | null;
  serviceCategory: ServiceCategory | string;
  deliveryMode: ServiceDeliveryMode | string;
  requiresContract: boolean;
  requiresKycLevel: number;
  requiresPhysicalResource: boolean;
  hasRegulatoryObligations: boolean;
  defaultBillingCycle?: string | null;
  defaultNoticePeriodDays?: number | null;
  defaultCommitmentMonths?: number | null;
  unitPrice?: number | null;
  currency?: string | null;
  usageEntitlementCode?: string | null;
  active: boolean;
}

/** Création ou remplacement par code (PUT /catalogue) ; code absent pour une création. */
export type ServiceDefinitionRequest = Partial<ServiceDefinitionView> &
  Pick<ServiceDefinitionView, "name" | "serviceCategory" | "deliveryMode">;

export interface SubscriptionServiceView {
  serviceNumber: string;
  subscriptionNumber?: string;
  serviceCode: string;
  serviceName?: string;
  quantity?: number;
  unitPrice?: number | null;
  status: SubscribedServiceStatus | string;
  [key: string]: unknown;
}

export const serviceCatalogService = {
  getCatalogue: async (
    includeInactive = false,
  ): Promise<ServiceDefinitionView[]> =>
    toList<ServiceDefinitionView>(
      (await apiClient.get(`${BASE}/catalogue`, { params: { includeInactive } }))
        .data,
    ),

  upsertServiceDefinition: async (
    data: ServiceDefinitionRequest,
  ): Promise<ServiceDefinitionView> =>
    (await apiClient.put(`${BASE}/catalogue`, data)).data,

  getSubscriptionServices: async (
    subscriptionNumber: string,
  ): Promise<SubscriptionServiceView[]> =>
    toList<SubscriptionServiceView>(
      (
        await apiClient.get(
          `${BASE}/subscriptions/${encodeURIComponent(subscriptionNumber)}`,
        )
      ).data,
    ),

  /**
   * Reste PENDING tant que le contrat exigé n'est pas actif.
   * 409 si le niveau KYC est insuffisant (message à afficher tel quel).
   */
  addSubscriptionService: async (
    subscriptionNumber: string,
    data: {
      serviceCode: string;
      quantity: number;
      unitPrice?: number | null;
      metadataJson?: string | null;
    },
  ): Promise<SubscriptionServiceView> =>
    (
      await apiClient.post(
        `${BASE}/subscriptions/${encodeURIComponent(subscriptionNumber)}`,
        data,
      )
    ).data,

  suspendSubscribedService: async (
    serviceNumber: string,
    reason?: string,
  ): Promise<SubscriptionServiceView> =>
    (
      await apiClient.post(
        `${BASE}/subscribed/${encodeURIComponent(serviceNumber)}/suspend`,
        { reason },
      )
    ).data,

  terminateSubscribedService: async (
    serviceNumber: string,
  ): Promise<SubscriptionServiceView> =>
    (
      await apiClient.post(
        `${BASE}/subscribed/${encodeURIComponent(serviceNumber)}/terminate`,
      )
    ).data,
};
