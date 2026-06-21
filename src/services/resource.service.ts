import { apiClient } from "./api";

const API = "/sni/api/v1";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
}

const page = <T>(raw: any): PageResponse<T> => {
  if (Array.isArray(raw?.content)) return raw;
  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements: raw.totalElements ?? raw.pageable?.totalElements ?? raw.data.length,
      totalPages: raw.totalPages ?? raw.pageable?.totalPages ?? 1,
      page: raw.pageable?.page ?? raw.page,
      size: raw.pageable?.size ?? raw.size,
    };
  }
  if (Array.isArray(raw)) return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};

const arr = <T>(raw: any): T[] =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.content) ? raw.content : [];

export type ResourceStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE" | "ARCHIVED";
export type ResourceBookingUnit = "HOUR" | "HALF_DAY" | "DAY" | "WEEK" | "MONTH";
export type AdjustmentType = "FIXED_PRICE" | "AMOUNT_DELTA" | "PERCENT_DELTA";
export type OccupancyLevel = "FREE" | "PARTIALLY_OCCUPIED" | "HIGHLY_OCCUPIED" | "FULL";

export interface ResourceTypeRequest { name: string; description?: string; active?: boolean; }
export interface ResourceTypeResponse { code: string; name: string; description: string | null; active: boolean; }

export interface ResourceGroupRequest { name: string; description?: string; portalVisible?: boolean; active?: boolean; }
export interface ResourceGroupResponse { code: string; name: string; description: string | null; portalVisible: boolean; active: boolean; }

export interface ResourcePolicyRequest {
  name: string;
  description?: string;
  minBookingDurationMinutes: number;
  maxBookingDurationMinutes: number;
  minBookingNoticeMinutes: number;
  cancellationNoticeMinutes?: number;
  allowCancellation?: boolean;
  active?: boolean;
}
export interface ResourcePolicyResponse extends Required<Omit<ResourcePolicyRequest, "description">> {
  code: string;
  description: string | null;
}

export interface ResourceRequest {
  typeId: string;
  groupId?: string;
  policyId?: string;
  name: string;
  description?: string;
  capacity?: number;
  zone?: string;
  locationLabel?: string;
  status?: ResourceStatus;
  bookingEnabled?: boolean;
  portalVisible?: boolean;
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string;
  capacity?: number;
  zone?: string;
  locationLabel?: string;
  bookingEnabled?: boolean;
  portalVisible?: boolean;
}

export interface ResourceResponse {
  code: string;
  typeCode: string | null;
  typeName?: string | null;
  groupCode: string | null;
  groupName?: string | null;
  policyCode: string | null;
  policyName?: string | null;
  name: string;
  description: string | null;
  capacity: number | null;
  zone: string | null;
  locationLabel: string | null;
  status: ResourceStatus | string;
  bookingEnabled: boolean;
  portalVisible: boolean;
  displayOrder: number | null;
  active: boolean;
}

export interface ResourceSummaryResponse {
  code: string;
  typeCode: string | null;
  name: string;
  status: ResourceStatus | string;
  bookingEnabled: boolean;
  portalVisible: boolean;
  active: boolean;
}

export interface ResourceSearchCriteria {
  code?: string;
  typeCode?: string;
  groupCode?: string;
  policyCode?: string;
  name?: string;
  zone?: string;
  locationLabel?: string;
  status?: ResourceStatus;
  portalVisible?: boolean;
  bookingEnabled?: boolean;
  active?: boolean;
  minCapacity?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AmenityRequest { name: string; description?: string; active?: boolean; }
export interface AmenityResponse {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  quantity?: number | null;
  optional?: boolean | null;
  extraPrice?: number | null;
}
export interface ResourceAmenityLinkRequest { resourceCode: string; amenityCode: string; quantity?: number; optional?: boolean; extraPrice?: number; }

export interface ResourceAvailabilityRequest {
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  slotDurationMinutes: number;
  totalCapacity?: number;
  active?: boolean;
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
export interface ResourceAvailabilityGroupResponse { resourceCode: string; resourceName: string; availabilities: ResourceAvailabilityResponse[]; }
export interface ResourceAvailabilityWindowResponse { resourceCode: string; startedAt: string; endedAt: string; durationMinutes: number; remainingCapacity: number; slotCount: number; }

export interface ResourceClosureRequest { resourceCode: string; startedAt: string; endedAt: string; reason?: string; active?: boolean; }
export interface ResourceClosureResponse { id: number; resourceCode: string; startedAt: string; endedAt: string; reason?: string | null; active: boolean; }

export interface PublicCalendarDay { date: string; totalSlots: number; availableSlots: number; totalCapacity: number; remainingCapacity: number; status: "AVAILABLE" | "PARTIAL" | "FULL" | string; }
export interface PublicResourceCalendar { resourceCode: string; resourceName: string; fromDate: string; toDate: string; days: PublicCalendarDay[]; }

export interface AdminCalendarSlot {
  startedAt: string;
  endedAt: string;
  totalCapacity: number;
  remainingCapacity: number;
  bookedCapacity?: number;
  occupancyRate?: number;
  occupancyLevel?: OccupancyLevel | string;
  available: boolean;
}
export interface AdminResourceCalendar { resourceCode: string; resourceName: string; fromDate: string; toDate: string; slots?: AdminCalendarSlot[]; days?: any[]; }
export interface OccupiedSlotResponse { resourceCode: string; bookingCode?: string; startedAt: string; endedAt: string; quantity?: number; customerName?: string; memberName?: string; status?: string; }

export interface ResourcePricingRuleRequest {
  resourceCode: string;
  bookingUnit: ResourceBookingUnit;
  price: number;
  label?: string;
  dayOfWeek?: string | number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  adjustmentType?: AdjustmentType | null;
  adjustmentValue?: number | null;
  lastMinuteMinutes?: number | null;
  priority?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  active?: boolean;
}
export interface ResourcePricingRuleResponse extends ResourcePricingRuleRequest { id: number; active: boolean; }
export interface PricingRuleQuote { resourceCode: string; bookingUnit: string; startedAt: string; endedAt: string; basePrice: number; finalPrice: number; appliedRuleId?: number | null; appliedRuleLabel?: string | null; adjustmentType?: string | null; adjustmentValue?: number | null; }

export interface ResourcePhotoRequest { documentCode: string; caption?: string; cover?: boolean; displayOrder?: number; }
export interface ResourcePhoto { id: number; resourceCode: string; documentCode: string; caption?: string | null; cover: boolean; displayOrder: number; active: boolean; }

export const resourceService = {
  createResourceType: async (data: ResourceTypeRequest): Promise<ResourceTypeResponse> =>
    (await apiClient.post(`${API}/resource-types`, data)).data,
  getResourceType: async (code: string): Promise<ResourceTypeResponse> =>
    (await apiClient.get(`${API}/resource-types/${code}`)).data,
  getResourceTypes: async (params?: { page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourceTypeResponse>> =>
    page<ResourceTypeResponse>((await apiClient.get(`${API}/resource-types`, { params })).data),
  searchResourceTypes: async (query: string, params?: { page?: number; size?: number }): Promise<PageResponse<ResourceTypeResponse>> =>
    page<ResourceTypeResponse>((await apiClient.get(`${API}/resource-types/search`, { params: { query, ...params } })).data),
  searchResourceTypesBasic: async (query: string): Promise<PageResponse<ResourceTypeResponse>> =>
    page<ResourceTypeResponse>((await apiClient.get(`${API}/resource-types/search/basic`, { params: { query } })).data),
  updateResourceType: async (code: string, data: Partial<ResourceTypeRequest>): Promise<void> => {
    await apiClient.put(`${API}/resource-types/${code}`, data);
  },
  deleteResourceType: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-types/${code}`);
  },

  createResourceGroup: async (data: ResourceGroupRequest): Promise<ResourceGroupResponse> =>
    (await apiClient.post(`${API}/resource-groups`, data)).data,
  getResourceGroup: async (code: string): Promise<ResourceGroupResponse> =>
    (await apiClient.get(`${API}/resource-groups/${code}`)).data,
  getResourceGroups: async (params?: { page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourceGroupResponse>> =>
    page<ResourceGroupResponse>((await apiClient.get(`${API}/resource-groups`, { params })).data),
  searchResourceGroups: async (query: string, params?: { page?: number; size?: number }): Promise<PageResponse<ResourceGroupResponse>> =>
    page<ResourceGroupResponse>((await apiClient.get(`${API}/resource-groups/search`, { params: { query, ...params } })).data),
  searchResourceGroupsBasic: async (query: string): Promise<PageResponse<ResourceGroupResponse>> =>
    page<ResourceGroupResponse>((await apiClient.get(`${API}/resource-groups/search/basic`, { params: { query } })).data),
  updateResourceGroup: async (code: string, data: Partial<ResourceGroupRequest>): Promise<void> => {
    await apiClient.put(`${API}/resource-groups/${code}`, data);
  },
  deleteResourceGroup: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-groups/${code}`);
  },

  createResourcePolicy: async (data: ResourcePolicyRequest): Promise<ResourcePolicyResponse> =>
    (await apiClient.post(`${API}/resource-policies`, data)).data,
  getResourcePolicy: async (code: string): Promise<ResourcePolicyResponse> =>
    (await apiClient.get(`${API}/resource-policies/${code}`)).data,
  getResourcePolicies: async (params?: { page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourcePolicyResponse>> =>
    page<ResourcePolicyResponse>((await apiClient.get(`${API}/resource-policies`, { params })).data),
  searchResourcePolicies: async (query: string, params?: { page?: number; size?: number }): Promise<PageResponse<ResourcePolicyResponse>> =>
    page<ResourcePolicyResponse>((await apiClient.get(`${API}/resource-policies/search`, { params: { query, ...params } })).data),
  searchResourcePoliciesBasic: async (query: string): Promise<PageResponse<ResourcePolicyResponse>> =>
    page<ResourcePolicyResponse>((await apiClient.get(`${API}/resource-policies/search/basic`, { params: { query } })).data),
  updateResourcePolicy: async (code: string, data: Partial<ResourcePolicyRequest>): Promise<void> => {
    await apiClient.put(`${API}/resource-policies/${code}`, data);
  },
  updateResourcePolicyStatus: async (code: string, active: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resource-policies/${code}/status`, null, { params: { active } });
  },
  updateResourcePolicyAllowCancellation: async (code: string, allowed: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resource-policies/${code}/allow-cancellation`, null, { params: { allowed } });
  },
  deleteResourcePolicy: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-policies/${code}`);
  },

  createResource: async (data: ResourceRequest): Promise<ResourceResponse> =>
    (await apiClient.post(`${API}/resources`, data)).data,
  getResource: async (code: string): Promise<ResourceResponse> =>
    (await apiClient.get(`${API}/resources/${code}`)).data,
  getResources: async (params?: { summary?: boolean; typeCode?: string; groupCode?: string; policyCode?: string; status?: ResourceStatus; portalVisible?: boolean; bookingEnabled?: boolean; active?: boolean; page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourceResponse | ResourceSummaryResponse>> =>
    page<ResourceResponse | ResourceSummaryResponse>((await apiClient.get(`${API}/resources`, { params })).data),
  updateResource: async (code: string, data: UpdateResourceRequest): Promise<void> => {
    await apiClient.put(`${API}/resources/${code}`, data);
  },
  deleteResource: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resources/${code}`);
  },
  searchResources: async (query: string): Promise<ResourceSummaryResponse[]> =>
    arr<ResourceSummaryResponse>((await apiClient.get(`${API}/resources/search/basic`, { params: { query } })).data),
  advancedSearchResources: async (criteria?: ResourceSearchCriteria): Promise<PageResponse<ResourceSummaryResponse>> =>
    page<ResourceSummaryResponse>((await apiClient.post(`${API}/resources/search`, criteria ?? {})).data),
  updateResourceClassification: async (code: string, data: { typeId: string; groupId?: string; policyId?: string }): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/classification`, data);
  },
  updateResourceStatus: async (code: string, status: ResourceStatus): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/status`, null, { params: { status } });
  },
  updateResourceBookingEnabled: async (code: string, bookingEnabled: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/booking-enabled`, null, { params: { bookingEnabled } });
  },
  updateResourcePortalVisible: async (code: string, portalVisible: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/portal-visible`, null, { params: { portalVisible } });
  },
  updateResourceActive: async (code: string, active: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/active`, null, { params: { active } });
  },
  updateResourceDisplayOrder: async (code: string, displayOrder: number): Promise<void> => {
    await apiClient.patch(`${API}/resources/${code}/display-order`, null, { params: { displayOrder } });
  },

  createAmenity: async (data: AmenityRequest): Promise<AmenityResponse> =>
    (await apiClient.post(`${API}/resource-amenities`, data)).data,
  getAmenity: async (code: string): Promise<AmenityResponse> =>
    (await apiClient.get(`${API}/resource-amenities/${code}`)).data,
  getAmenities: async (params?: { page?: number; size?: number; sort?: string }): Promise<PageResponse<AmenityResponse>> =>
    page<AmenityResponse>((await apiClient.get(`${API}/resource-amenities`, { params })).data),
  searchAmenities: async (query: string, params?: { page?: number; size?: number }): Promise<PageResponse<AmenityResponse>> =>
    page<AmenityResponse>((await apiClient.get(`${API}/resource-amenities/search`, { params: { query, ...params } })).data),
  searchAmenitiesBasic: async (query: string): Promise<PageResponse<AmenityResponse>> =>
    page<AmenityResponse>((await apiClient.get(`${API}/resource-amenities/search/basic`, { params: { query } })).data),
  updateAmenity: async (code: string, data: Partial<AmenityRequest>): Promise<void> => {
    await apiClient.put(`${API}/resource-amenities/${code}`, data);
  },
  deleteAmenity: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-amenities/${code}`);
  },
  linkAmenityToResource: async (resourceCode: string, data: Omit<ResourceAmenityLinkRequest, "resourceCode">): Promise<void> => {
    await apiClient.post(`${API}/resources/amenities/link`, { resourceCode, ...data });
  },
  linkAmenity: async (resourceCode: string, amenityCode: string, data?: { quantity?: number; optional?: boolean; extraPrice?: number }): Promise<void> => {
    await apiClient.post(`${API}/resources/amenities/link`, { resourceCode, amenityCode, ...data });
  },
  unlinkAmenity: async (resourceCode: string, amenityCode: string): Promise<void> => {
    await apiClient.delete(`${API}/resources/${resourceCode}/amenities/${amenityCode}`);
  },
  getResourceAmenities: async (resourceCode: string): Promise<AmenityResponse[]> =>
    arr<AmenityResponse>((await apiClient.get(`${API}/resources/${resourceCode}/amenities`)).data),

  createAvailability: async (data: ResourceAvailabilityRequest): Promise<ResourceAvailabilityResponse> =>
    (await apiClient.post(`${API}/resource-availabilities`, data)).data,
  getAvailabilities: async (params?: { resourceCode?: string; from?: string; to?: string; available?: boolean; active?: boolean; page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourceAvailabilityResponse>> =>
    page<ResourceAvailabilityResponse>((await apiClient.get(`${API}/resource-availabilities`, { params })).data),
  getAvailabilitiesGrouped: async (params?: { from?: string; to?: string; active?: boolean }): Promise<ResourceAvailabilityGroupResponse[]> =>
    arr<ResourceAvailabilityGroupResponse>((await apiClient.get(`${API}/resource-availabilities/grouped`, { params })).data),
  searchRemainingSlots: async (params: { resourceCode: string; from: string; to: string; durationMinutes?: number }): Promise<ResourceAvailabilityWindowResponse[]> =>
    arr<ResourceAvailabilityWindowResponse>((await apiClient.get(`${API}/resource-availabilities/remaining-slots`, { params })).data),
  reserveAvailabilitySlot: async (id: number, quantity?: number): Promise<ResourceAvailabilityResponse> =>
    (await apiClient.patch(`${API}/resource-availabilities/${id}/reserve`, null, { params: { quantity } })).data,
  releaseAvailabilitySlot: async (id: number, quantity?: number): Promise<ResourceAvailabilityResponse> =>
    (await apiClient.patch(`${API}/resource-availabilities/${id}/release`, null, { params: { quantity } })).data,

  createClosure: async (data: ResourceClosureRequest): Promise<ResourceClosureResponse> =>
    (await apiClient.post(`${API}/resource-closures`, data)).data,
  getClosure: async (id: number): Promise<ResourceClosureResponse> =>
    (await apiClient.get(`${API}/resource-closures/${id}`)).data,
  getClosures: async (params?: { resourceCode?: string; from?: string; to?: string; active?: boolean; page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourceClosureResponse>> =>
    page<ResourceClosureResponse>((await apiClient.get(`${API}/resource-closures`, { params })).data),
  updateClosureActive: async (id: number, active: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resource-closures/${id}/active`, null, { params: { active } });
  },
  deleteClosure: async (id: number): Promise<void> => {
    await apiClient.delete(`${API}/resource-closures/${id}`);
  },

  getPublicCalendar: async (resourceCode: string, params: { fromDate: string; toDate: string }): Promise<PublicResourceCalendar> =>
    (await apiClient.get(`${API}/public/resources/${resourceCode}/calendar`, { params })).data,
  getAdminCalendar: async (resourceCode: string, params: { fromDate: string; toDate: string }): Promise<AdminResourceCalendar> =>
    (await apiClient.get(`${API}/resources/${resourceCode}/calendar/admin`, { params })).data,
  getOccupiedSlots: async (params?: { resourceCode?: string; from?: string; to?: string; page?: number; size?: number; sort?: string }): Promise<PageResponse<OccupiedSlotResponse>> =>
    page<OccupiedSlotResponse>((await apiClient.get(`${API}/resources/occupied-slots`, { params })).data),

  createPricingRule: async (data: ResourcePricingRuleRequest): Promise<ResourcePricingRuleResponse> =>
    (await apiClient.post(`${API}/resource-pricing-rules`, data)).data,
  getPricingRule: async (id: number): Promise<ResourcePricingRuleResponse> =>
    (await apiClient.get(`${API}/resource-pricing-rules/${id}`)).data,
  getPricingRules: async (params?: { resourceCode?: string; bookingUnit?: ResourceBookingUnit; active?: boolean; page?: number; size?: number; sort?: string }): Promise<PageResponse<ResourcePricingRuleResponse>> =>
    page<ResourcePricingRuleResponse>((await apiClient.get(`${API}/resource-pricing-rules`, { params })).data),
  updatePricingRule: async (id: number, data: Partial<ResourcePricingRuleRequest>): Promise<void> => {
    await apiClient.put(`${API}/resource-pricing-rules/${id}`, data);
  },
  updatePricingRuleActive: async (id: number, active: boolean): Promise<void> => {
    await apiClient.patch(`${API}/resource-pricing-rules/${id}/active`, null, { params: { active } });
  },
  deletePricingRule: async (id: number): Promise<void> => {
    await apiClient.delete(`${API}/resource-pricing-rules/${id}`);
  },
  quotePrice: async (params: { resourceCode: string; bookingUnit: ResourceBookingUnit; startedAt: string; endedAt: string }): Promise<PricingRuleQuote> =>
    (await apiClient.get(`${API}/resource-pricing-rules/quote`, { params })).data,

  addResourcePhoto: async (resourceCode: string, data: ResourcePhotoRequest): Promise<ResourcePhoto> =>
    (await apiClient.post(`${API}/resources/${resourceCode}/photos`, data)).data,
  getResourcePhotos: async (resourceCode: string): Promise<ResourcePhoto[]> =>
    arr<ResourcePhoto>((await apiClient.get(`${API}/resources/${resourceCode}/photos`)).data),
  updateResourcePhoto: async (resourceCode: string, photoId: number, data: Partial<ResourcePhotoRequest>): Promise<ResourcePhoto> =>
    (await apiClient.put(`${API}/resources/${resourceCode}/photos/${photoId}`, data)).data,
  deleteResourcePhoto: async (resourceCode: string, photoId: number): Promise<void> => {
    await apiClient.delete(`${API}/resources/${resourceCode}/photos/${photoId}`);
  },
};
