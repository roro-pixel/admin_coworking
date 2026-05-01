import { apiClient } from './api';

// ==================== TYPES ====================
export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'ARCHIVED';
export type ResourceBookingUnit = 'HOUR' | 'HALF_DAY' | 'DAY' | 'WEEK' | 'MONTH';

export interface ResourceResponse {
  code: string;
  typeCode: string;
  groupCode: string | null;
  policyCode: string | null;
  name: string;
  description: string | null;
  capacity: number;
  zone: string | null;
  locationLabel: string | null;
  status: ResourceStatus;
  bookingEnabled: boolean;
  portalVisible: boolean;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceSummaryResponse {
  code: string;
  typeCode: string;
  name: string;
  status: ResourceStatus;
  bookingEnabled: boolean;
  portalVisible: boolean;
  active: boolean;
}

export interface ResourceTypeResponse {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface ResourceGroupResponse {
  code: string;
  name: string;
  description: string | null;
  portalVisible: boolean;
  active: boolean;
}

export interface ResourcePolicyResponse {
  code: string;
  name: string;
  description: string | null;
  minBookingDurationMinutes: number;
  maxBookingDurationMinutes: number;
  minBookingNoticeMinutes: number;
  cancellationNoticeMinutes: number | null;
  allowCancellation: boolean;
  active: boolean;
}

export interface AmenityResponse {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  quantity?: number;
  optional?: boolean;
  extraPrice?: number;
}

export interface ResourceAvailabilityResponse {
  id: number;
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  slotDurationMinutes: number;
  totalCapacity: number;
  remainingCapacity: number;
  available: boolean;
  active: boolean;
}

export interface ResourceAvailabilityWindowResponse {
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  remainingCapacity: number;
  slotCount: number;
}

export interface ResourceClosureResponse {
  id: number;
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  active: boolean;
}

export interface ResourcePricingRuleResponse {
  id: number;
  resourceCode: string;
  bookingUnit: ResourceBookingUnit;
  price: number;
  label?: string;
  dayOfWeek?: number;
  startsAt?: string;
  endsAt?: string;
  adjustmentType?: 'FIXED_PRICE' | 'AMOUNT_DELTA' | 'PERCENT_DELTA';
  adjustmentValue?: number;
  lastMinuteMinutes?: number | null;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
}

export interface PricingRuleQuote {
  resourceCode: string;
  bookingUnit: string;
  startedAt: string;
  endedAt: string;
  basePrice: number;
  finalPrice: number;
  appliedRuleId?: number;
  appliedRuleLabel?: string;
  adjustmentType?: string;
  adjustmentValue?: number;
}

export interface ResourcePhoto {
  id: number;
  resourceCode: string;
  documentCode: string;
  caption?: string;
  cover: boolean;
  displayOrder: number;
  active: boolean;
}

export interface PublicCalendarDay {
  date: string;
  totalSlots: number;
  availableSlots: number;
  totalCapacity: number;
  remainingCapacity: number;
  status: 'AVAILABLE' | 'PARTIAL' | 'FULL';
}

export interface PublicResourceCalendar {
  resourceCode: string;
  resourceName: string;
  fromDate: string;
  toDate: string;
  days: PublicCalendarDay[];
}

export interface UpdatePricingRuleRequest {
  bookingUnit?: 'HOUR' | 'HALF_DAY' | 'DAY' | 'WEEK' | 'MONTH';
  price?: number;
  active?: boolean;
}


// ==================== SERVICES ====================
export const resourceService = {
  // === Ressources ===
  getResources: async (params?: {
  typeCode?: string;
  groupCode?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<{ content: ResourceResponse[]; totalElements: number; totalPages: number }> => {
  const response = await apiClient.get('/sni/api/v1/resources', { params });
  if (response.data?.content !== undefined) {
    return response.data;
  }
  if (Array.isArray(response.data)) {
    return { content: response.data, totalElements: response.data.length, totalPages: 1 };
  }
  if (response.data?.data !== undefined) {
    return { content: response.data.data, totalElements: response.data.totalElements || response.data.data.length, totalPages: response.data.totalPages || 1 };
  }
  return { content: [], totalElements: 0, totalPages: 0 };
},

  getResource: async (code: string): Promise<ResourceResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resources/${code}`);
    return response.data;
  },

  searchResources: async (query: string): Promise<ResourceSummaryResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resources/search/basic', { params: { query } });
    return response.data;
  },

  advancedSearchResources: async (data: any): Promise<{ content: ResourceResponse[]; totalElements: number }> => {
    const response = await apiClient.post('/sni/api/v1/resources/search', data);
    return response.data;
  },

  createResource: async (data: any): Promise<ResourceResponse> => {
    const response = await apiClient.post('/sni/api/v1/resources', data);
    return response.data;
  },

  updateResource: async (code: string, data: any): Promise<ResourceResponse> => {
    const response = await apiClient.put(`/sni/api/v1/resources/${code}`, data);
    return response.data;
  },

  updateResourceClassification: async (code: string, data: { typeId: string; groupId?: string; policyId?: string }): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/classification`, data);
  },

  updateResourceStatus: async (code: string, status: ResourceStatus): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/status`, { status });
  },

  updateResourceBookingEnabled: async (code: string, bookingEnabled: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/booking-enabled`, { bookingEnabled });
  },

  updateResourcePortalVisible: async (code: string, portalVisible: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/portal-visible`, { portalVisible });
  },

  updateResourceActive: async (code: string, active: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/active`, { active });
  },

  updateResourceDisplayOrder: async (code: string, displayOrder: number): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/display-order`, { displayOrder });
  },

  deleteResource: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resources/${code}`);
  },

  // === Types de ressources ===
  getResourceTypes: async (params?: { page?: number; size?: number }): Promise<{ content: ResourceTypeResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-types', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getResourceType: async (code: string): Promise<ResourceTypeResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-types/${code}`);
    return response.data;
  },

  searchResourceTypes: async (query: string): Promise<ResourceTypeResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resource-types/search/basic', { params: { query } });
    return response.data;
  },

  createResourceType: async (data: { name: string; description?: string; active?: boolean }): Promise<ResourceTypeResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-types', data);
    return response.data;
  },

  updateResourceType: async (code: string, data: { name: string; description?: string; active?: boolean }): Promise<ResourceTypeResponse> => {
    const response = await apiClient.put(`/sni/api/v1/resource-types/${code}`, data);
    return response.data;
  },

  deleteResourceType: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-types/${code}`);
  },

  // === Groupes de ressources ===
  getResourceGroups: async (params?: { page?: number; size?: number }): Promise<{ content: ResourceGroupResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-groups', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getResourceGroup: async (code: string): Promise<ResourceGroupResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-groups/${code}`);
    return response.data;
  },

  searchResourceGroups: async (query: string): Promise<ResourceGroupResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resource-groups/search/basic', { params: { query } });
    return response.data;
  },

  createResourceGroup: async (data: { name: string; description?: string; portalVisible?: boolean; active?: boolean }): Promise<ResourceGroupResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-groups', data);
    return response.data;
  },

  updateResourceGroup: async (code: string, data: { name: string; description?: string; portalVisible?: boolean; active?: boolean }): Promise<ResourceGroupResponse> => {
    const response = await apiClient.put(`/sni/api/v1/resource-groups/${code}`, data);
    return response.data;
  },

  deleteResourceGroup: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-groups/${code}`);
  },

  // === Politiques ===
  getResourcePolicies: async (params?: { page?: number; size?: number }): Promise<{ content: ResourcePolicyResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-policies', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getResourcePolicy: async (code: string): Promise<ResourcePolicyResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-policies/${code}`);
    return response.data;
  },

  searchResourcePolicies: async (query: string): Promise<ResourcePolicyResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resource-policies/search/basic', { params: { query } });
    return response.data;
  },

  createResourcePolicy: async (data: any): Promise<ResourcePolicyResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-policies', data);
    return response.data;
  },

  updateResourcePolicy: async (code: string, data: any): Promise<ResourcePolicyResponse> => {
    const response = await apiClient.put(`/sni/api/v1/resource-policies/${code}`, data);
    return response.data;
  },

  updateResourcePolicyStatus: async (code: string, active: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resource-policies/${code}/status`, { active });
  },

  updateResourcePolicyAllowCancellation: async (code: string, allowCancellation: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resource-policies/${code}/allow-cancellation`, { allowCancellation });
  },

  deleteResourcePolicy: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-policies/${code}`);
  },

  // === Équipements ===
  getAmenities: async (params?: { page?: number; size?: number }): Promise<{ content: AmenityResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-amenities', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getAmenity: async (code: string): Promise<AmenityResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-amenities/${code}`);
    return response.data;
  },

  searchAmenities: async (query: string): Promise<AmenityResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resource-amenities/search/basic', { params: { query } });
    return response.data;
  },

  createAmenity: async (data: { name: string; description?: string; active?: boolean; quantity?: number; optional?: boolean; extraPrice?: number }): Promise<AmenityResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-amenities', data);
    return response.data;
  },

  updateAmenity: async (code: string, data: { name: string; description?: string; active?: boolean; quantity?: number; optional?: boolean; extraPrice?: number }): Promise<AmenityResponse> => {
    const response = await apiClient.put(`/sni/api/v1/resource-amenities/${code}`, data);
    return response.data;
  },

  deleteAmenity: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-amenities/${code}`);
  },

  // === Liens ressource-équipement ===
  linkAmenity: async (resourceCode: string, amenityCode: string): Promise<void> => {
    await apiClient.post('/sni/api/v1/resources/amenities/link', { resourceCode, amenityCode });
  },

  getResourceAmenities: async (resourceCode: string): Promise<AmenityResponse[]> => {
    const response = await apiClient.get(`/sni/api/v1/resources/${resourceCode}/amenities`);
    return response.data;
  },

  unlinkAmenity: async (resourceCode: string, amenityCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resources/${resourceCode}/amenities/${amenityCode}`);
  },

  // === Disponibilités ===
  getResourceAvailabilities: async (resourceCode: string, params?: { page?: number; size?: number }): Promise<{ content: ResourceAvailabilityResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-availabilities', { params: { resourceCode, ...params } });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  createResourceAvailability: async (data: { resourceCode: string; startedAt: string; endedAt: string; capacity?: number; active?: boolean }): Promise<ResourceAvailabilityResponse[]> => {
    const response = await apiClient.post('/sni/api/v1/resource-availabilities', data);
    return response.data;
  },

  getRemainingAvailabilities: async (resourceCode: string): Promise<ResourceAvailabilityWindowResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/resource-availabilities/remaining', { params: { resourceCode } });
    return response.data;
  },

  reserveAvailability: async (data: { resourceCode: string; startedAt: string; endedAt: string; quantity: number }): Promise<void> => {
    await apiClient.post('/sni/api/v1/resource-availabilities/reserve', data);
  },

  releaseAvailability: async (data: { resourceCode: string; startedAt: string; endedAt: string; quantity: number }): Promise<void> => {
    await apiClient.patch('/sni/api/v1/resource-availabilities/release', data);
  },

  // === Fermetures ===
  getResourceClosures: async (resourceCode?: string, params?: { page?: number; size?: number }): Promise<{ content: ResourceClosureResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-closures', { params: { resourceCode, ...params } });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getResourceClosure: async (id: number): Promise<ResourceClosureResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-closures/${id}`);
    return response.data;
  },

  createResourceClosure: async (data: { resourceCode: string; startedAt: string; endedAt: string; reason?: string; active?: boolean }): Promise<ResourceClosureResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-closures', data);
    return response.data;
  },

  updateResourceClosureActive: async (id: number, active: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resource-closures/${id}/active`, { active });
  },

  deleteResourceClosure: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-closures/${id}`);
  },

  // === Règles de tarification ===
  getPricingRules: async (resourceCode?: string, params?: { page?: number; size?: number }): Promise<{ content: ResourcePricingRuleResponse[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/resource-pricing-rules', { params: { resourceCode, ...params } });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getPricingRule: async (id: number): Promise<ResourcePricingRuleResponse> => {
    const response = await apiClient.get(`/sni/api/v1/resource-pricing-rules/${id}`);
    return response.data;
  },

  createPricingRule: async (data: {
    resourceCode: string;
    bookingUnit: ResourceBookingUnit;
    price: number;
    label?: string;
    dayOfWeek?: number;
    startsAt?: string;
    endsAt?: string;
    adjustmentType?: 'FIXED_PRICE' | 'AMOUNT_DELTA' | 'PERCENT_DELTA';
    adjustmentValue?: number;
    lastMinuteMinutes?: number | null;
    priority?: number;
    validFrom?: string;
    validUntil?: string;
    active?: boolean;
  }): Promise<ResourcePricingRuleResponse> => {
    const response = await apiClient.post('/sni/api/v1/resource-pricing-rules', data);
    return response.data;
  },

  updatePricingRuleActive: async (id: number, active: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resource-pricing-rules/${id}/active`, { active });
  },

  updatePricingRule: async (id: number, data: { bookingUnit?: ResourceBookingUnit; price?: number; label?: string; dayOfWeek?: number; startsAt?: string; endsAt?: string; adjustmentType?: 'FIXED_PRICE' | 'AMOUNT_DELTA' | 'PERCENT_DELTA'; adjustmentValue?: number; lastMinuteMinutes?: number | null; priority?: number; validFrom?: string; validUntil?: string; active?: boolean }): Promise<ResourcePricingRuleResponse> => {
  const response = await apiClient.put(`/sni/api/v1/resource-pricing-rules/${id}`, data);
  return response.data;
},

  deletePricingRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-pricing-rules/${id}`);
  },



  // Quote pricing dynamique (MD)
  getPricingRuleQuote: async (params: {
    resourceCode: string;
    bookingUnit: string;
    startedAt: string;
    endedAt: string;
  }): Promise<PricingRuleQuote> => {
    const response = await apiClient.get('/sni/api/v1/resource-pricing-rules/quote', { params });
    return response.data;
  },

  // Calendrier public de disponibilité (MD)
  getPublicCalendar: async (resourceCode: string, fromDate: string, toDate: string): Promise<PublicResourceCalendar> => {
    const response = await apiClient.get(`/sni/api/v1/public/resources/${resourceCode}/calendar`, {
      params: { fromDate, toDate },
    });
    return response.data;
  },

  getResourcePhotos: async (resourceCode: string): Promise<ResourcePhoto[]> => {
    const response = await apiClient.get(`/sni/api/v1/resources/${resourceCode}/photos`);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  addResourcePhoto: async (resourceCode: string, data: {
    documentCode: string;
    caption?: string;
    cover?: boolean;
    displayOrder?: number;
    active?: boolean;
  }): Promise<ResourcePhoto> => {
    const response = await apiClient.post(`/sni/api/v1/resources/${resourceCode}/photos`, data);
    return response.data;
  },

  // Galerie photos (MD)
  updateResourcePhoto: async (resourceCode: string, photoId: number, data: {
    caption?: string;
    cover?: boolean;
    displayOrder?: number;
    active?: boolean;
  }): Promise<ResourcePhoto> => {
    const response = await apiClient.patch(`/sni/api/v1/resources/${resourceCode}/photos/${photoId}`, data);
    return response.data;
  },

  deleteResourcePhoto: async (resourceCode: string, photoId: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resources/${resourceCode}/photos/${photoId}`);
  },

  // Amenity enrichi — lier une amenity à une ressource avec quantity/optional/extraPrice
  linkAmenityToResource: async (resourceCode: string, data: {
    amenityCode: string;
    quantity?: number;
    optional?: boolean;
    extraPrice?: number;
  }): Promise<AmenityResponse> => {
    const response = await apiClient.post(`/sni/api/v1/resources/${resourceCode}/amenities`, data);
    return response.data;
  },
};