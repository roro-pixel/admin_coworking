import { apiClient } from './api';

// ==================== TYPES ====================
export interface Plan {
  code: string;
  name: string;
  description?: string;
  planType: 'MEMBERSHIP' | 'COWORKING_ACCESS' | 'DEDICATED_DESK' | 'PRIVATE_OFFICE' | 'MEETING_ROOM_PACK' | 'VIRTUAL_OFFICE' | 'COMPANY_PLAN' | 'CUSTOM';
  targetAudience: 'INDIVIDUAL' | 'COMPANY' | 'BOTH';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  visible: boolean;
  sortOrder: number;
  activeVersion?: PlanVersion;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  id: number;
  versionNumber: number;
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  termsJson?: string;
  metadataJson?: string;
  prices: Price[];
  benefits: Benefit[];
  entitlements: PlanEntitlement[];
}

export interface Price {
  billingCycle: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
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
  entitlementType: 'ACCESS' | 'CREDIT' | 'TIME' | 'DISCOUNT' | 'QUOTA' | 'FEATURE_FLAG' | 'SERVICE_ALLOWANCE';
  unit: 'DAY' | 'HOUR' | 'CREDIT' | 'BOOKING' | 'VISIT' | 'MEMBER' | 'PERCENT' | 'AMOUNT' | 'BOOLEAN';
  consumptionMode: 'CHECK_ONLY' | 'RESERVABLE' | 'CONSUMABLE' | 'RESERVE_THEN_CONSUME';
  resetPolicy: 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PER_BILLING_CYCLE';
  stackable: boolean;
  transferable: boolean;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
  active: boolean;
}

export interface Subscription {
  subscriptionNumber: string;
  planCode: string;
  planName: string;
  planVersion?: number;
  planVersionId?: number;
  billingCycle: string;
  subscriberType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS_ENTITY';
  subscriberCode: string;
  subscriberName?: string;
  status: 'DRAFT' | 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
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
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ENTITLEMENT' | 'WAIVE_SETUP_FEE';
  discountValue: number;
  startsAt: string;
  endsAt?: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
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

// ==================== SERVICES ====================
export const subscriptionService = {
  // Plans
getPlans: async (params?: { 
  code?: string;
  name?: string;
  planType?: string; 
  targetAudience?: string;
  status?: string; 
  visible?: boolean;
  page?: number; 
  size?: number 
}): Promise<{ content: Plan[]; totalElements: number; totalPages: number }> => {
  const response = await apiClient.get('/sni/api/v1/subscriptions/plans', { params });
  if (response.data && Array.isArray(response.data.data)) {
    return { content: response.data.data, totalElements: response.data.data.length, totalPages: 1 };
  }
  if (response.data && Array.isArray(response.data.content)) {
    return response.data;
  }
  return { content: [], totalElements: 0, totalPages: 0 };
},

  getPlan: async (planCode: string): Promise<Plan> => {
    const response = await apiClient.get(`/sni/api/v1/subscriptions/plans/${planCode}`);
    return response.data;
  },

  createPlan: async (data: { name: string; description?: string; planType: string; targetAudience: string; visible: boolean; sortOrder: number }): Promise<Plan> => {
    const response = await apiClient.post('/sni/api/v1/subscriptions/plans', data);
    return response.data;
  },

  updatePlan: async (planCode: string, data: Partial<Plan>): Promise<Plan> => {
    const response = await apiClient.put(`/sni/api/v1/subscriptions/plans/${planCode}`, data);
    return response.data;
  },

  deletePlan: async (planCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/subscriptions/plans/${planCode}`);
  },

  // Plan Versions
getPlanVersions: async (planCode: string): Promise<PlanVersion[]> => {
  const response = await apiClient.get(`/sni/api/v1/subscriptions/plans/${planCode}/versions`);
  // Vérifier si la réponse a une propriété 'data'
  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  // Si c'est directement un tableau
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return [];
},


  createPlanVersion: async (planCode: string, data: any): Promise<PlanVersion> => {
    const response = await apiClient.post(`/sni/api/v1/subscriptions/plans/${planCode}/versions`, data);
    return response.data;
  },

  publishPlanVersion: async (planCode: string, versionId: number): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/subscriptions/plans/${planCode}/versions/${versionId}/publish`);
  },

  // Entitlement Definitions
  getEntitlementDefinitions: async (params?: { active?: boolean; page?: number; size?: number }): Promise<{ content: EntitlementDefinition[]; totalElements: number }> => {
    const response = await apiClient.get('/sni/api/v1/subscriptions/entitlement-definitions', { params });
    // Traitement défensif identique à getPlans : l'API peut wrapper dans data.data, data.content, ou renvoyer un tableau direct
    if (response.data?.data && Array.isArray(response.data.data)) {
      return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length };
    }
    if (response.data?.content && Array.isArray(response.data.content)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { content: response.data, totalElements: response.data.length };
    }
    return { content: [], totalElements: 0 };
  },

  createEntitlementDefinition: async (data: any): Promise<EntitlementDefinition> => {
    const response = await apiClient.post('/sni/api/v1/subscriptions/entitlement-definitions', data);
    return response.data;
  },

  updateEntitlementDefinition: async (code: string, data: Partial<EntitlementDefinition>): Promise<EntitlementDefinition> => {
    const response = await apiClient.put(`/sni/api/v1/subscriptions/entitlement-definitions/${code}`, data);
    return response.data;
  },

  // Subscriptions
  getSubscriptions: async (params?: {
  subscriberType?: string;
  subscriberCode?: string;
  planCode?: string;
  status?: string;
  nextBillingBefore?: string;
  page?: number;
  size?: number;
}): Promise<{ content: Subscription[]; totalElements: number; totalPages: number }> => {
  const response = await apiClient.get('/sni/api/v1/subscriptions', { params });
  // L'API retourne { data: [...], pageable: {...} } — format non-standard
  if (Array.isArray(response.data?.data)) {
    return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
  }
  if (Array.isArray(response.data?.content)) return response.data;
  if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
},

  getSubscription: async (subscriptionNumber: string): Promise<Subscription> => {
    const response = await apiClient.get(`/sni/api/v1/subscriptions/${subscriptionNumber}`);
    return response.data;
  },

  activateSubscription: async (subscriptionNumber: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/subscriptions/${subscriptionNumber}/activate`, { reason });
  },

  suspendSubscription: async (subscriptionNumber: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/subscriptions/${subscriptionNumber}/suspend`, { reason });
  },

  cancelSubscription: async (subscriptionNumber: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/subscriptions/${subscriptionNumber}/cancel`, { reason });
  },

  getCurrentSubscription: async (subscriberType: string, subscriberCode: string): Promise<Subscription> => {
  const response = await apiClient.get('/sni/api/v1/subscriptions/current', {
    params: { subscriberType, subscriberCode }
  });
  return response.data;
  },

  // Promotions
  getPromotions: async (params?: {
  code?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<{ content: Promotion[]; totalElements: number; totalPages: number }> => {
  const response = await apiClient.get('/sni/api/v1/promotions', { params });
  if (Array.isArray(response.data?.data)) {
    return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
  }
  if (Array.isArray(response.data?.content)) return response.data;
  if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
},


  createPromotion: async (data: any): Promise<Promotion> => {
    const response = await apiClient.post('/sni/api/v1/promotions', data);
    return response.data;
  },

  activatePromotion: async (code: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/promotions/${code}/activate`);
  },

  updatePromotion: async (code: string, data: Partial<Promotion>): Promise<Promotion> => {
  const response = await apiClient.put(`/sni/api/v1/promotions/${code}`, data);
  return response.data;
},

redeemPromotion: async (code: string, data: { 
  subscriberType: string; 
  subscriberCode: string; 
  subscriptionNumber?: string 
}): Promise<any> => {
  const response = await apiClient.post(`/sni/api/v1/promotions/${code}/redeem`, data);
  return response.data;
},

  // Metrics
  getSubscriptionMetrics: async (): Promise<any> => {
    const response = await apiClient.get('/sni/api/v1/subscription-metrics/overview');
    return response.data;
  },

getSubscriptionEntitlements: async (subscriptionNumber: string): Promise<SubscriptionEntitlement[]> => {
  const response = await apiClient.get(`/sni/api/v1/subscriptions/${subscriptionNumber}/entitlements`);
  return response.data;
},

getSubscriptionHistory: async (subscriptionNumber: string): Promise<any[]> => {
  const response = await apiClient.get(`/sni/api/v1/subscriptions/${subscriptionNumber}/history`);
  return response.data;
},

getSubscriptionBillingSchedule: async (subscriptionNumber: string): Promise<any> => {
  const response = await apiClient.get(`/sni/api/v1/subscriptions/${subscriptionNumber}/billing-schedule`);
  return response.data;
},

createSubscription: async (data: {
  planCode: string;
  planVersionId?: number;
  billingCycle?: string;
  subscriberType: string;
  subscriberCode: string;
  startDate: string;
  autoRenew: boolean;
  createdBy?: string;
  metadataJson?: string;
}): Promise<Subscription> => {
  const response = await apiClient.post('/sni/api/v1/subscriptions', data);
  return response.data;
},

renewSubscription: async (subscriptionNumber: string, reason?: string): Promise<void> => {
  await apiClient.patch(`/sni/api/v1/subscriptions/${subscriptionNumber}/renew`, { reason });
},

};