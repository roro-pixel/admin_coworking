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
  // FIXME: traiter comme une chaîne opaque — les IDs backend peuvent dépasser Number.MAX_SAFE_INTEGER
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
  status:
    | "DRAFT"
    | "PENDING_ACTIVATION"
    | "ACTIVE"
    | "PAST_DUE"
    | "SUSPENDED"
    | "CANCELLED"
    | "EXPIRED";
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
    return {
      content: responseData.data,
      totalElements:
        responseData.pageable?.totalElements ?? responseData.data.length,
      totalPages: responseData.pageable?.totalPages ?? 1,
    };
  }
  if (Array.isArray(responseData?.content)) {
    return responseData as PaginatedResponse<T>;
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

/**
 * Normalise les réponses liste non-paginées.
 * L'API peut retourner : { data: [...] } | T[]
 */
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

  // versionId est une chaîne opaque — ne pas caster en number JS (peut dépasser MAX_SAFE_INTEGER)
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
  }): Promise<Subscription> => {
    const response = await apiClient.post("/sni/api/v1/subscriptions", data);
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

  renewSubscription: async (
    subscriptionNumber: string,
    reason?: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/subscriptions/${subscriptionNumber}/renew`,
      { reason },
    );
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
  // PASSES
  // ────────────────────────────────────────────────────────────

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
};
