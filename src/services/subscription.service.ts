import { apiClient } from "./api";

// ==================== TYPES ====================

export interface Plan {
  code: string;
  name: string;
  description?: string;
  planType:
    | "MEMBERSHIP"
    | "COWORKING_ACCESS"
    | "DEDICATED_DESK"
    | "PRIVATE_OFFICE"
    | "MEETING_ROOM_PACK"
    | "VIRTUAL_OFFICE"
    | "COMPANY_PLAN"
    | "CUSTOM";
  targetAudience: "INDIVIDUAL" | "COMPANY" | "BOTH";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  visible: boolean;
  sortOrder: number;
  activeVersion?: PlanVersion;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  // Chaîne opaque : les IDs backend peuvent dépasser Number.MAX_SAFE_INTEGER
  id: string;
  versionNumber: number;
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  termsJson?: string;
  metadataJson?: string;
  prices: Price[];
  benefits: Benefit[];
  entitlements: PlanEntitlement[];
}

export interface Price {
  billingCycle:
    | "ONE_TIME"
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY";
  currency: string;
  amount: number;
  setupFee: number;
  depositAmount: number;
  taxIncluded: boolean;
  commitmentMonths: number;
}

export interface Benefit {
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  displayOrder: number;
  highlighted: boolean;
  included: boolean;
  metadataJson?: string;
}

export interface PlanEntitlement {
  entitlementCode: string;
  entitlementName?: string;
  quantity: number;
  unlimited: boolean;
  rolloverAllowed: boolean;
  rolloverLimit: number;
  validForDays: number;
  priority: number;
  restrictionsJson?: string;
}

export interface EntitlementDefinition {
  code: string;
  name: string;
  description?: string;
  entitlementType:
    | "ACCESS"
    | "CREDIT"
    | "TIME"
    | "DISCOUNT"
    | "QUOTA"
    | "FEATURE_FLAG"
    | "SERVICE_ALLOWANCE";
  unit:
    | "DAY"
    | "HOUR"
    | "CREDIT"
    | "BOOKING"
    | "VISIT"
    | "MEMBER"
    | "PERCENT"
    | "AMOUNT"
    | "BOOLEAN";
  consumptionMode:
    | "CHECK_ONLY"
    | "RESERVABLE"
    | "CONSUMABLE"
    | "RESERVE_THEN_CONSUME";
  resetPolicy: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY" | "PER_BILLING_CYCLE";
  stackable: boolean;
  transferable: boolean;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
  metadataJson?: string;
  active: boolean;
}

/**
 * Statuts d'abonnement.
 * - PENDING_DOCUMENTS : l'activation attend le niveau KYC exigé (réessayée chaque heure)
 * - GRACE_PERIOD : échéance impayée, droits maintenus, suspension à venir
 * - PENDING_TERMINATION : un préavis court, pas de renouvellement
 * - TRIALING / PAUSED : essai en cours / gel
 */
export type SubscriptionStatus =
  | "DRAFT"
  | "PENDING_ACTIVATION"
  | "PENDING_DOCUMENTS"
  | "TRIALING"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "PAST_DUE"
  | "PAUSED"
  | "SUSPENDED"
  | "PENDING_TERMINATION"
  | "CANCELLED"
  | "EXPIRED";

export interface Subscription {
  subscriptionNumber: string;
  planCode: string;
  planName: string;
  planVersion?: number;
  planVersionId?: string;
  billingCycle: string;
  subscriberType: "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";
  subscriberCode: string;
  subscriberName?: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  cancelAtPeriodEnd?: boolean;
  currency?: string;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  contractCode?: string;
  metadataJson?: string;
  /** Facture de renouvellement à régler ; vide si rien n'attend. */
  pendingRenewalInvoice?: string | null;
  /** Période prévue ; payée en retard, elle repart du jour du paiement. */
  pendingRenewalStart?: string | null;
  pendingRenewalEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  code: string;
  name: string;
  description?: string;
  discountType:
    | "PERCENTAGE"
    | "FIXED_AMOUNT"
    | "FREE_ENTITLEMENT"
    | "WAIVE_SETUP_FEE";
  discountValue: number;
  startsAt: string;
  endsAt?: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  maxRedemptions?: number;
  redeemedCount: number;
  metadataJson?: string;
}

export interface SubscriptionEntitlement {
  entitlementCode: string;
  entitlementName: string;
  quantity: number;
  unlimited: boolean;
  usedQuantity: number;
  remainingQuantity: number;
  validFrom?: string;
  validUntil?: string;
}

// ==================== PASS ====================

export interface Pass {
  passNumber: string;
  passType:
    | "DAY_PASS"
    | "TIME_PACK"
    | "VISITOR_PASS"
    | "MEETING_ROOM_PACK"
    | "PROMOTIONAL_PASS"
    | "SUBSCRIPTION_PASS"
    | "COMPANY_SHARED_PASS"
    | "CUSTOM";
  ownerType: string;
  ownerCode: string;
  subscriptionNumber?: string;
  planVersionId?: string;
  name: string;
  description?: string;
  validFrom: string;
  validUntil?: string;
  transferable: boolean;
  shareable: boolean;
  maxUses?: number;
  status: string;
  metadataJson?: string;
  entitlements?: PassEntitlement[];
  usedCount?: number | null;
  contractCode?: string | null;
  planCode?: string | null;
  planName?: string | null;
  planVersion?: number | null;
  currency?: string | null;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  autoRenew?: boolean;
  nextRenewalDate?: string | null;
  renewalCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PassEntitlement {
  entitlementCode: string;
  quantity: number;
  unlimited: boolean;
  validFrom?: string;
  validUntil?: string;
}

// ==================== PASS PLANS ====================

export type PassType =
  | "DAY_PASS"
  | "TIME_PACK"
  | "VISITOR_PASS"
  | "MEETING_ROOM_PACK"
  | "PROMOTIONAL_PASS"
  | "SUBSCRIPTION_PASS"
  | "COMPANY_SHARED_PASS"
  | "CUSTOM";

export type PassDurationUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type PassPlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type PassTargetAudience = "INDIVIDUAL" | "COMPANY" | "BOTH";
export type PassSubscriberType = "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";
export type PassLifecycleStatus =
  | "DRAFT"
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "PARTIALLY_USED"
  | "CONSUMED"
  | "PAST_DUE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export interface PassPlanRequest {
  name: string;
  description?: string | null;
  passType: PassType;
  targetAudience: PassTargetAudience;
  visible?: boolean;
  sortOrder?: number;
  requiredKycLevel?: number;
}

export interface PassPlanResponse {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  passType: PassType | string;
  targetAudience: PassTargetAudience | string;
  status: PassPlanStatus | string;
  visible: boolean;
  sortOrder: number;
  requiredKycLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface PassPlanVersionRequest {
  name: string;
  description?: string | null;
  duration: number;
  durationUnit: PassDurationUnit;
  maxUses?: number | null;
  autoRenewable?: boolean;
  requiredKycLevel?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  termsJson?: string | null;
}

export interface PassPlanVersionResponse {
  id: number;
  planCode: string;
  versionNumber: number;
  name: string;
  description?: string | null;
  status: PassPlanStatus | string;
  duration: number;
  durationUnit: PassDurationUnit | string;
  maxUses?: number | null;
  autoRenewable: boolean;
  requiredKycLevel: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PassPlanPriceRequest {
  currency: string;
  amount: number;
  setupFee?: number;
  depositAmount?: number;
  taxIncluded?: boolean;
  taxCode?: string | null;
}

export interface PassPlanPriceResponse extends PassPlanPriceRequest {
  id: number;
  versionId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PassPlanEntitlementRequest {
  entitlementCode: string;
  quantity?: number | null;
  unlimited?: boolean;
  rolloverAllowed?: boolean;
  rolloverLimit?: number | null;
  validForDays?: number | null;
  priority?: number;
}

export interface PassPlanEntitlementResponse extends PassPlanEntitlementRequest {
  id: number;
  versionId: number;
  entitlementName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PassPurchaseRequest {
  ownerType: PassSubscriberType;
  ownerCode: string;
  planVersionId?: number | null;
  currency?: string | null;
  validFrom?: string | null;
  autoRenew?: boolean;
  metadataJson?: string | null;
}

export interface PassEventResponse {
  id: number;
  eventType: string;
  payloadJson?: string | null;
  occurredAt: string;
}

export interface PassStatusHistoryResponse {
  id: number;
  fromStatus?: PassLifecycleStatus | string | null;
  toStatus: PassLifecycleStatus | string;
  reason?: string | null;
  changedBy?: string | null;
  changedAt: string;
}

export interface PassRenewalScheduleResponse {
  id: number;
  duration: number;
  durationUnit: PassDurationUnit | string;
  nextRenewalDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  status: string;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== SEAT ====================

export interface Seat {
  memberCode: string;
  subscriptionNumber: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  status: string;
}

// ==================== CHANGE REQUEST ====================

export interface SubscriptionChange {
  changeNumber: string;
  subscriptionNumber: string;
  changeType:
    | "UPGRADE"
    | "DOWNGRADE"
    | "ADD_ADDON"
    | "REMOVE_ADDON"
    | "QUANTITY_CHANGE";
  targetPlanVersionId?: string;
  effectivePolicy: "IMMEDIATE" | "NEXT_BILLING_PERIOD" | "CUSTOM_DATE";
  effectiveDate?: string;
  prorationAmount?: number;
  reason?: string;
  requestedBy?: string;
  status: string;
  createdAt: string;
}

// ==================== ADD-ON ====================

export interface Addon {
  addonId: string;
  subscriptionNumber: string;
  planVersionId: string;
  quantity: number;
  startsAt: string;
  endsAt?: string;
  status: string;
  metadataJson?: string;
}

// ==================== USAGE ====================

export interface UsageRecord {
  usageNumber: string;
  ownerType: string;
  ownerCode: string;
  entitlementCode: string;
  quantity: number;
  unit: string;
  referenceType?: string;
  referenceId?: string;
  consumeEntitlement: boolean;
  billable: boolean;
  billableAmount?: number;
  currency?: string;
  billableNumber?: string;
  occurredAt: string;
  status: string;
  metadataJson?: string;
}

// ==================== OVERAGE ====================

export interface OveragePolicy {
  id: string;
  planVersionId: string;
  entitlementCode: string;
  mode: "BLOCK" | "BILLABLE" | "ALLOW_UNBILLED";
  unitPrice?: number;
  currency?: string;
  freeQuantity?: number;
  metadataJson?: string;
  active: boolean;
}

export interface OverageCharge {
  chargeNumber: string;
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  entitlementCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

// ==================== ROLLOVER ====================

export interface Rollover {
  rolloverNumber: string;
  subscriptionNumber: string;
  entitlementCode: string;
  quantity: number;
  rolledAt: string;
}

// ==================== TIMELINE ====================

export interface TimelineEvent {
  eventNumber: string;
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  eventType: string;
  sourceType?: string;
  sourceId?: string;
  title: string;
  description?: string;
  payloadJson?: string;
  occurredAt: string;
}

// ==================== NOTIFICATION ====================

export interface SubscriptionNotification {
  notificationNumber: string;
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  notificationType: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "WEBHOOK";
  recipient: string;
  subject?: string;
  body: string;
  payloadJson?: string;
  scheduledAt: string;
  status: string;
}

// ==================== BILLABLE ITEM ====================

export interface BillableItem {
  billableNumber: string;
  status: string;
  subscriberType: string;
  subscriberCode: string;
  sourceType: string;
  sourceId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

// ==================== ENTITLEMENT GRANT & BALANCE ====================

export interface EntitlementGrant {
  grantNumber: string;
  ownerType: string;
  ownerCode: string;
  entitlementCode: string;
  quantity: number;
  unlimited: boolean;
  status: string;
  validFrom?: string;
  validUntil?: string;
}

export interface EntitlementBalance {
  ownerType: string;
  ownerCode: string;
  entitlementCode: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  unlimited: boolean;
}

// ==================== PAGINATED RESPONSE ====================

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

// ==================== HELPER ====================

function normalizePaginated<T>(responseData: any): PaginatedResponse<T> {
  if (Array.isArray(responseData?.data)) {
    const pageable = responseData.pageable ?? {};
    const totalElements = pageable.totalElements ?? responseData.data.length;
    const size = pageable.size || responseData.data.length || 1;
    return {
      content: responseData.data,
      totalElements,
      totalPages: pageable.totalPages ?? Math.max(1, Math.ceil(totalElements / size)),
    };
  }
  if (Array.isArray(responseData?.content)) {
    // totalPages peut manquer : on le déduit du total et de la taille de page
    const totalElements = responseData.totalElements ?? responseData.content.length;
    const size = responseData.size || responseData.content.length || 1;
    return {
      ...responseData,
      totalElements,
      totalPages: responseData.totalPages ?? Math.max(1, Math.ceil(totalElements / size)),
    } as PaginatedResponse<T>;
  }
  if (Array.isArray(responseData)) {
    return {
      content: responseData,
      totalElements: responseData.length,
      totalPages: 1,
    };
  }
  return { content: [], totalElements: 0, totalPages: 0 };
}

/** Normalise une liste non paginée ({ data: [...] } ou tableau). */
function normalizeList<T>(responseData: any): T[] {
  if (responseData?.data && Array.isArray(responseData.data))
    return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
}

// ==================== SERVICES ====================

export const subscriptionService = {
  // ────────────────────────────────────────────────────────────
  // PLANS
  // ────────────────────────────────────────────────────────────

  getPlans: async (params?: {
    code?: string;
    name?: string;
    planType?: string;
    targetAudience?: string;
    status?: string;
    visible?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Plan>> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions/plans", {
      params,
    });
    return normalizePaginated<Plan>(response.data);
  },

  getPlan: async (planCode: string): Promise<Plan> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/plans/${planCode}`,
    );
    return response.data;
  },

  createPlan: async (data: {
    name: string;
    description?: string;
    planType: string;
    targetAudience: string;
    visible: boolean;
    sortOrder: number;
  }): Promise<Plan> => {
    const response = await apiClient.post(
      "/sni/api/v1/subscriptions/plans",
      data,
    );
    return response.data;
  },

  updatePlan: async (planCode: string, data: Partial<Plan>): Promise<Plan> => {
    const response = await apiClient.put(
      `/sni/api/v1/subscriptions/plans/${planCode}`,
      data,
    );
    return response.data;
  },

  deletePlan: async (planCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/subscriptions/plans/${planCode}`);
  },

  // ────────────────────────────────────────────────────────────
  // PLAN VERSIONS
  // ────────────────────────────────────────────────────────────

  getPlanVersions: async (planCode: string): Promise<PlanVersion[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/plans/${planCode}/versions`,
    );
    return normalizeList<PlanVersion>(response.data);
  },

  createPlanVersion: async (
    planCode: string,
    data: {
      name: string;
      description?: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
      termsJson?: string;
      metadataJson?: string;
      prices: Omit<Price, never>[];
      benefits: Omit<Benefit, never>[];
      entitlements: Omit<PlanEntitlement, "entitlementName">[];
    },
  ): Promise<PlanVersion> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/plans/${planCode}/versions`,
      data,
    );
    return response.data;
  },

  // versionId : chaîne opaque, ne pas la convertir en number.
  publishPlanVersion: async (
    planCode: string,
    versionId: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/plans/${planCode}/versions/${versionId}/publish`,
    );
  },

  // ────────────────────────────────────────────────────────────
  // ENTITLEMENT DEFINITIONS
  // ────────────────────────────────────────────────────────────

  getEntitlementDefinitions: async (params?: {
    query?: string;
    code?: string;
    name?: string;
    entitlementType?: string;
    unit?: string;
    consumptionMode?: string;
    resetPolicy?: string;
    resourceTypeCode?: string;
    resourceGroupCode?: string;
    stackable?: boolean;
    transferable?: boolean;
    active?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<EntitlementDefinition>> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscriptions/entitlement-definitions",
      {
        params,
      },
    );
    return normalizePaginated<EntitlementDefinition>(response.data);
  },

  getEntitlementDefinition: async (
    code: string,
  ): Promise<EntitlementDefinition> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/entitlement-definitions/${code}`,
    );
    return response.data;
  },

  searchEntitlementDefinitions: async (
    query: string,
  ): Promise<EntitlementDefinition[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscriptions/entitlement-definitions/search/basic",
      { params: { query } },
    );
    return normalizeList<EntitlementDefinition>(response.data);
  },

  createEntitlementDefinition: async (data: {
    name: string;
    description?: string;
    entitlementType: string;
    unit: string;
    consumptionMode: string;
    resetPolicy: string;
    stackable: boolean;
    transferable: boolean;
    resourceTypeCode?: string;
    resourceGroupCode?: string | null;
    metadataJson?: string | null;
    active: boolean;
  }): Promise<EntitlementDefinition> => {
    const response = await apiClient.post(
      "/sni/api/v1/subscriptions/entitlement-definitions",
      data,
    );
    return response.data;
  },

  updateEntitlementDefinition: async (
    code: string,
    data: Partial<EntitlementDefinition>,
  ): Promise<EntitlementDefinition> => {
    const response = await apiClient.put(
      `/sni/api/v1/subscriptions/entitlement-definitions/${code}`,
      data,
    );
    return response.data;
  },

  // ────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ────────────────────────────────────────────────────────────

  getSubscriptions: async (params?: {
    subscriberType?: string;
    subscriberCode?: string;
    planCode?: string;
    status?: string;
    nextBillingBefore?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Subscription>> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions", {
      params,
    });
    return normalizePaginated<Subscription>(response.data);
  },

  getSubscription: async (
    subscriptionNumber: string,
  ): Promise<Subscription> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/${subscriptionNumber}`,
    );
    return response.data;
  },

  getCurrentSubscription: async (
    subscriberType: string,
    subscriberCode: string,
  ): Promise<Subscription> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions/current", {
      params: { subscriberType, subscriberCode },
    });
    return response.data;
  },

  createSubscription: async (data: {
    planCode: string;
    planVersionId?: string;
    billingCycle?: string;
    subscriberType: string;
    subscriberCode: string;
    startDate: string;
    autoRenew: boolean;
    metadataJson?: string;
    /** Coupons consommés à la création : la retenue est capturée. */
    couponCodes?: string[];
  }): Promise<Subscription> => {
    const response = await apiClient.post("/sni/api/v1/subscriptions", data);
    return response.data;
  },

  /**
   * Gel : respecte l'allowance de la politique (409 sinon). Voir
   * subscriptionLifecycleService.getFreezeAllowance pour l'afficher avant.
   */
  pauseSubscription: async (
    subscriptionNumber: string,
    data?: { until?: string | null; reason?: string; changedBy?: string },
  ): Promise<Subscription> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/pause`,
      data ?? {},
    );
    return response.data;
  },

  /** Reprise d'un gel → ACTIVE. */
  resumeSubscription: async (
    subscriptionNumber: string,
  ): Promise<Subscription> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/resume`,
    );
    return response.data;
  },

  activateSubscription: async (
    subscriptionNumber: string,
    reason?: string,
    changedBy?: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/activate`,
      {
        reason,
        changedBy,
      },
    );
  },

  suspendSubscription: async (
    subscriptionNumber: string,
    reason?: string,
    changedBy?: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/suspend`,
      {
        reason,
        changedBy,
      },
    );
  },

  cancelSubscription: async (
    subscriptionNumber: string,
    reason?: string,
    changedBy?: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/cancel`,
      {
        reason,
        changedBy,
      },
    );
  },

  /**
   * Émet la facture de renouvellement (une seule à la fois). L'abonnement reste sur sa
   * période en cours avec pendingRenewalInvoice renseigné : annoncer « facture à régler »,
   * jamais « renouvelé » ; le renouvellement n'est acquis que quand ce champ redevient vide.
   */
  renewSubscription: async (
    subscriptionNumber: string,
    reason?: string,
  ): Promise<Subscription> => {
    const response = await apiClient.patch(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/renew`,
      { reason },
    );
    return response.data;
  },

  // ────────────────────────────────────────────────────────────
  // SUBSCRIPTION — DONNÉES LIÉES
  // ────────────────────────────────────────────────────────────

  getSubscriptionEntitlements: async (
    subscriptionNumber: string,
  ): Promise<SubscriptionEntitlement[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/entitlements`,
    );
    return response.data;
  },

  getSubscriptionHistory: async (
    subscriptionNumber: string,
  ): Promise<any[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/history`,
    );
    return response.data;
  },

  getSubscriptionBillingSchedule: async (
    subscriptionNumber: string,
  ): Promise<any> => {
    const response = await apiClient.get(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/billing-schedule`,
    );
    return response.data;
  },

  // ────────────────────────────────────────────────────────────
  // SEATS
  // ────────────────────────────────────────────────────────────

  addSeat: async (
    subscriptionNumber: string,
    data: { memberCode: string; role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST" },
  ): Promise<Seat> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/seats`,
      data,
    );
    return response.data;
  },

  getSeats: async (params?: {
    subscriptionNumber?: string;
    memberCode?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Seat>> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions/seats", {
      params,
    });
    return normalizePaginated<Seat>(response.data);
  },

  removeSeat: async (
    subscriptionNumber: string,
    memberCode: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/seats/${memberCode}`,
    );
  },

  // ────────────────────────────────────────────────────────────
  // CHANGE REQUESTS
  // ────────────────────────────────────────────────────────────

  createChange: async (
    subscriptionNumber: string,
    data: {
      changeType:
        | "UPGRADE"
        | "DOWNGRADE"
        | "ADD_ADDON"
        | "REMOVE_ADDON"
        | "QUANTITY_CHANGE";
      targetPlanVersionId?: string;
      effectivePolicy: "IMMEDIATE" | "NEXT_BILLING_PERIOD" | "CUSTOM_DATE";
      effectiveDate?: string | null;
      prorationAmount?: number;
      reason?: string;
      requestedBy?: string;
    },
  ): Promise<SubscriptionChange> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/changes`,
      data,
    );
    return response.data;
  },

  approveChange: async (
    changeNumber: string,
    approvedBy: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/changes/${changeNumber}/approve`,
      {
        approvedBy,
      },
    );
  },

  applyChange: async (changeNumber: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/changes/${changeNumber}/apply`,
    );
  },

  getChanges: async (params?: {
    subscriptionNumber?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<SubscriptionChange>> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions/changes", {
      params,
    });
    return normalizePaginated<SubscriptionChange>(response.data);
  },

  // ────────────────────────────────────────────────────────────
  // ADD-ONS
  // ────────────────────────────────────────────────────────────

  addAddon: async (
    subscriptionNumber: string,
    data: {
      planVersionId: string;
      quantity: number;
      startsAt: string;
      endsAt?: string | null;
      metadataJson?: string | null;
    },
  ): Promise<Addon> => {
    const response = await apiClient.post(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/addons`,
      data,
    );
    return response.data;
  },

  getAddons: async (params?: {
    subscriptionNumber?: string;
    planCode?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Addon>> => {
    const response = await apiClient.get("/sni/api/v1/subscriptions/addons", {
      params,
    });
    return normalizePaginated<Addon>(response.data);
  },

  cancelAddon: async (addonId: string, reason?: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/addons/${addonId}/cancel`,
      { reason },
    );
  },

  // ────────────────────────────────────────────────────────────
  // PASS PLANS
  // ────────────────────────────────────────────────────────────

  createPassPlan: async (data: PassPlanRequest): Promise<PassPlanResponse> => {
    const response = await apiClient.post("/sni/api/v1/pass-plans", data);
    return response.data;
  },

  getPassPlans: async (params?: {
    passType?: PassType | string;
    status?: PassPlanStatus | string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<PassPlanResponse>> => {
    const response = await apiClient.get("/sni/api/v1/pass-plans", { params });
    return normalizePaginated<PassPlanResponse>(response.data);
  },

  getPassPlan: async (planCode: string): Promise<PassPlanResponse> => {
    const response = await apiClient.get(`/sni/api/v1/pass-plans/${planCode}`);
    return response.data;
  },

  updatePassPlan: async (
    planCode: string,
    data: Partial<PassPlanRequest>,
  ): Promise<PassPlanResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/pass-plans/${planCode}`,
      data,
    );
    return response.data;
  },

  publishPassPlan: async (planCode: string): Promise<PassPlanResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/pass-plans/${planCode}/publish`,
    );
    return response.data;
  },

  archivePassPlan: async (planCode: string): Promise<PassPlanResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/pass-plans/${planCode}/archive`,
    );
    return response.data;
  },

  createPassPlanVersion: async (
    planCode: string,
    data: PassPlanVersionRequest,
  ): Promise<PassPlanVersionResponse> => {
    const response = await apiClient.post(
      `/sni/api/v1/pass-plans/${planCode}/versions`,
      data,
    );
    return response.data;
  },

  getPassPlanVersions: async (
    planCode: string,
  ): Promise<PassPlanVersionResponse[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/pass-plans/${planCode}/versions`,
    );
    return normalizeList<PassPlanVersionResponse>(response.data);
  },

  publishPassPlanVersion: async (
    planCode: string,
    id: number,
  ): Promise<PassPlanVersionResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/pass-plans/${planCode}/versions/${id}/publish`,
    );
    return response.data;
  },

  upsertPassPlanPrice: async (
    versionId: number,
    data: PassPlanPriceRequest,
  ): Promise<PassPlanPriceResponse> => {
    const response = await apiClient.post(
      `/sni/api/v1/pass-plans/versions/${versionId}/prices`,
      data,
    );
    return response.data;
  },

  getPassPlanPrices: async (
    versionId: number,
  ): Promise<PassPlanPriceResponse[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/pass-plans/versions/${versionId}/prices`,
    );
    return normalizeList<PassPlanPriceResponse>(response.data);
  },

  addPassPlanEntitlement: async (
    versionId: number,
    data: PassPlanEntitlementRequest,
  ): Promise<PassPlanEntitlementResponse> => {
    const response = await apiClient.post(
      `/sni/api/v1/pass-plans/versions/${versionId}/entitlements`,
      data,
    );
    return response.data;
  },

  getPassPlanEntitlements: async (
    versionId: number,
  ): Promise<PassPlanEntitlementResponse[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/pass-plans/versions/${versionId}/entitlements`,
    );
    return normalizeList<PassPlanEntitlementResponse>(response.data);
  },

  deletePassPlanEntitlement: async (
    versionId: number,
    id: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/pass-plans/versions/${versionId}/entitlements/${id}`,
    );
  },

  purchasePassPlan: async (
    planCode: string,
    data: PassPurchaseRequest,
  ): Promise<Pass> => {
    const response = await apiClient.post(
      `/sni/api/v1/pass-plans/${planCode}/purchase`,
      data,
    );
    return response.data;
  },

  getPasses: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    passType?: string;
    status?: string;
    expiringBefore?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Pass>> => {
    const response = await apiClient.get("/sni/api/v1/passes", { params });
    return normalizePaginated<Pass>(response.data);
  },

  getPass: async (passNumber: string): Promise<Pass> => {
    const response = await apiClient.get(`/sni/api/v1/passes/${passNumber}`);
    return response.data;
  },

  activatePass: async (passNumber: string): Promise<Pass> => {
    const response = await apiClient.post(
      `/sni/api/v1/passes/${passNumber}/activate`,
    );
    return response.data;
  },

  getPassEvents: async (passNumber: string): Promise<PassEventResponse[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/passes/${passNumber}/events`,
    );
    return normalizeList<PassEventResponse>(response.data);
  },

  getPassStatusHistory: async (
    passNumber: string,
  ): Promise<PassStatusHistoryResponse[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/passes/${passNumber}/history`,
    );
    return normalizeList<PassStatusHistoryResponse>(response.data);
  },

  getPassRenewalSchedule: async (
    passNumber: string,
  ): Promise<PassRenewalScheduleResponse | null> => {
    const response = await apiClient.get(
      `/sni/api/v1/passes/${passNumber}/renewal`,
    );
    return response.data?.data ?? response.data ?? null;
  },

  createPass: async (data: {
    passType: string;
    ownerType: string;
    ownerCode: string;
    subscriptionNumber?: string | null;
    planVersionId?: string;
    name: string;
    description?: string;
    validFrom: string;
    validUntil?: string;
    transferable: boolean;
    shareable: boolean;
    maxUses?: number;
    metadataJson?: string | null;
    entitlements?: PassEntitlement[];
  }): Promise<Pass> => {
    const response = await apiClient.post("/sni/api/v1/passes", data);
    return response.data;
  },

  cancelPass: async (passNumber: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/passes/${passNumber}/cancel`, {
      reason,
    });
  },

  // ────────────────────────────────────────────────────────────
  // ENTITLEMENT GRANTS & BALANCES
  // ────────────────────────────────────────────────────────────

  getEntitlementGrants: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    entitlementCode?: string;
    status?: string;
    validAt?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<EntitlementGrant>> => {
    const response = await apiClient.get("/sni/api/v1/entitlements/grants", {
      params,
    });
    return normalizePaginated<EntitlementGrant>(response.data);
  },

  getEntitlementBalances: async (params: {
    ownerType: string;
    ownerCode: string;
  }): Promise<EntitlementBalance[]> => {
    const response = await apiClient.get("/sni/api/v1/entitlements/balances", {
      params,
    });
    return normalizeList<EntitlementBalance>(response.data);
  },

  deleteSubscriptionEntitlement: async (
  subscriptionNumber: string,
  entitlementCode: string,
): Promise<void> => {
  await apiClient.delete(
    `/sni/api/v1/subscriptions/${subscriptionNumber}/entitlements/${entitlementCode}`,
  );
},

  // ────────────────────────────────────────────────────────────
  // USAGE RECORDS
  // ────────────────────────────────────────────────────────────

  createUsageRecord: async (data: {
    ownerType: string;
    ownerCode: string;
    entitlementCode: string;
    quantity: number;
    unit: string;
    referenceType?: string;
    referenceId?: string;
    consumeEntitlement: boolean;
    billable: boolean;
    billableAmount?: number;
    currency?: string;
    occurredAt: string;
    metadataJson?: string | null;
  }): Promise<UsageRecord> => {
    const response = await apiClient.post("/sni/api/v1/usage-records", data);
    return response.data;
  },

  getUsageRecords: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    entitlementCode?: string;
    referenceType?: string;
    referenceId?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<UsageRecord>> => {
    const response = await apiClient.get("/sni/api/v1/usage-records", {
      params,
    });
    return normalizePaginated<UsageRecord>(response.data);
  },

  // ────────────────────────────────────────────────────────────
  // OVERAGE
  // ────────────────────────────────────────────────────────────

  createOveragePolicy: async (data: {
    planVersionId: string;
    entitlementCode: string;
    mode: "BLOCK" | "BILLABLE" | "ALLOW_UNBILLED";
    unitPrice?: number;
    currency?: string;
    freeQuantity?: number;
    metadataJson?: string | null;
    active: boolean;
  }): Promise<OveragePolicy> => {
    const response = await apiClient.post(
      "/sni/api/v1/subscription-overage/policies",
      data,
    );
    return response.data;
  },

  getOveragePolicies: async (params?: {
    planVersionId?: string;
    entitlementCode?: string;
    active?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<OveragePolicy>> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscription-overage/policies",
      { params },
    );
    return normalizePaginated<OveragePolicy>(response.data);
  },

  getOverageCharges: async (params?: {
    subscriptionNumber?: string;
    ownerType?: string;
    ownerCode?: string;
    entitlementCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<OverageCharge>> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscription-overage/charges",
      { params },
    );
    return normalizePaginated<OverageCharge>(response.data);
  },

  // ────────────────────────────────────────────────────────────
  // ROLLOVER
  // ────────────────────────────────────────────────────────────

  applyDueRollovers: async (): Promise<void> => {
    await apiClient.post("/sni/api/v1/subscription-rollovers/apply-due");
  },

  getRollovers: async (params?: {
    subscriptionNumber?: string;
    entitlementCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Rollover>> => {
    const response = await apiClient.get("/sni/api/v1/subscription-rollovers", {
      params,
    });
    return normalizePaginated<Rollover>(response.data);
  },

  // ────────────────────────────────────────────────────────────
  // TIMELINE
  // ────────────────────────────────────────────────────────────

  getTimeline: async (params?: {
    subscriptionNumber?: string;
    ownerType?: string;
    ownerCode?: string;
    eventType?: string;
    occurredFrom?: string;
    occurredTo?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<TimelineEvent>> => {
    const response = await apiClient.get("/sni/api/v1/subscription-timeline", {
      params,
    });
    return normalizePaginated<TimelineEvent>(response.data);
  },

  createTimelineEvent: async (data: {
    subscriptionNumber: string;
    ownerType: string;
    ownerCode: string;
    eventType: string;
    sourceType?: string;
    sourceId?: string;
    title: string;
    description?: string;
    payloadJson?: string | null;
    occurredAt: string;
  }): Promise<TimelineEvent> => {
    const response = await apiClient.post(
      "/sni/api/v1/subscription-timeline",
      data,
    );
    return response.data;
  },

  // ────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ────────────────────────────────────────────────────────────

  getNotifications: async (params?: {
    subscriptionNumber?: string;
    ownerType?: string;
    ownerCode?: string;
    notificationType?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<SubscriptionNotification>> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscription-notifications",
      { params },
    );
    return normalizePaginated<SubscriptionNotification>(response.data);
  },

  createNotification: async (data: {
    subscriptionNumber: string;
    ownerType: string;
    ownerCode: string;
    notificationType: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "WEBHOOK";
    recipient: string;
    subject?: string;
    body: string;
    payloadJson?: string | null;
    scheduledAt: string;
  }): Promise<SubscriptionNotification> => {
    const response = await apiClient.post(
      "/sni/api/v1/subscription-notifications",
      data,
    );
    return response.data;
  },

  cancelNotification: async (notificationNumber: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscription-notifications/${notificationNumber}/cancel`,
    );
  },

  dispatchDueNotifications: async (limit = 100): Promise<void> => {
    await apiClient.post(
      `/sni/api/v1/subscription-notifications/dispatch-due?limit=${limit}`,
    );
  },

  // ────────────────────────────────────────────────────────────
  // BILLABLE ITEMS
  // ────────────────────────────────────────────────────────────

  getBillableItems: async (params?: {
    status?: string;
    subscriberType?: string;
    subscriberCode?: string;
    sourceType?: string;
    sourceId?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<BillableItem>> => {
    const response = await apiClient.get("/sni/api/v1/billable-items", {
      params,
    });
    return normalizePaginated<BillableItem>(response.data);
  },

  // ────────────────────────────────────────────────────────────
  // PROMOTIONS
  // ────────────────────────────────────────────────────────────

  getPromotions: async (params?: {
    code?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Promotion>> => {
    const response = await apiClient.get("/sni/api/v1/promotions", { params });
    return normalizePaginated<Promotion>(response.data);
  },

  createPromotion: async (data: {
    name: string;
    description?: string;
    discountType:
      | "PERCENTAGE"
      | "FIXED_AMOUNT"
      | "FREE_ENTITLEMENT"
      | "WAIVE_SETUP_FEE";
    discountValue: number;
    startsAt: string;
    endsAt?: string | null;
    maxRedemptions?: number;
    metadataJson?: string | null;
  }): Promise<Promotion> => {
    const response = await apiClient.post("/sni/api/v1/promotions", data);
    return response.data;
  },

  updatePromotion: async (
    code: string,
    data: Partial<Promotion>,
  ): Promise<Promotion> => {
    const response = await apiClient.put(
      `/sni/api/v1/promotions/${code}`,
      data,
    );
    return response.data;
  },

  activatePromotion: async (code: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/promotions/${code}/activate`);
  },

  redeemPromotion: async (
    code: string,
    data: {
      subscriberType: string;
      subscriberCode: string;
      subscriptionNumber?: string;
    },
  ): Promise<any> => {
    const response = await apiClient.post(
      `/sni/api/v1/promotions/${code}/redeem`,
      data,
    );
    return response.data;
  },

  // ────────────────────────────────────────────────────────────
  // METRICS
  // ────────────────────────────────────────────────────────────

  getSubscriptionMetrics: async (): Promise<{
    activeSubscriptions: number;
    pendingSubscriptions: number;
    suspendedSubscriptions: number;
    cancelledSubscriptions: number;
    activePasses: number;
    activeAddons: number;
    activePromotions: number;
    pendingBillableItems: number;
    pendingBillableAmount: number;
    activeSubscriptionMrr: number;
    recordedUsageQuantity: number;
    billableUsageQuantity: number;
    overageCharges: number;
    overageAmount: number;
    rolloverRecords: number;
    rolloverQuantity: number;
  }> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscription-metrics/overview",
    );
    return response.data;
  },

  /**
   * Indicateurs de pilotage (30 derniers jours par défaut). churnRate et occupancyRate
   * sont en pourcentage ; customerLifetimeValue et averageLifetimeMonths valent null
   * quand l'attrition est nulle.
   */
  getSubscriptionKpis: async (params?: {
    from?: string;
    to?: string;
  }): Promise<SubscriptionKpis> => {
    const response = await apiClient.get(
      "/sni/api/v1/subscription-metrics/kpis",
      { params },
    );
    return response.data;
  },
};

export interface SubscriptionKpis {
  from: string;
  to: string;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  mrrByCycle: Record<string, number>;
  activeAtStart: number;
  newInPeriod: number;
  churnedInPeriod: number;
  churnRate: number;
  monthlyChurnRate: number;
  newMrr: number;
  churnedMrr: number;
  netMrrMovement: number;
  arpu: number;
  customerLifetimeValue: number | null;
  averageLifetimeMonths: number | null;
  seatsOccupied: number;
  workspaceCapacity: number;
  occupancyRate: number;
  revenuePerSeat: number;
  inGracePeriod: number;
  pendingTermination: number;
  pendingDocuments: number;
}
