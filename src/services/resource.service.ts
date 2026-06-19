import { apiClient } from "./api";

export type ResourceStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "MAINTENANCE"
  | "OUT_OF_SERVICE"
  | "ARCHIVED";

export type ResourceBookingUnit =
  | "HOUR"
  | "HALF_DAY"
  | "DAY"
  | "WEEK"
  | "MONTH";

export type AdjustmentType = "FIXED_PRICE" | "AMOUNT_DELTA" | "PERCENT_DELTA";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

const page = <T>(raw: any): PageResponse<T> => {
  if (Array.isArray(raw?.content)) {
    return {
      content: raw.content,
      totalElements: raw.totalElements ?? raw.content.length,
      totalPages: raw.totalPages ?? 1,
    };
  }

  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements:
        raw.totalElements ?? raw.pageable?.totalElements ?? raw.data.length,
      totalPages: raw.totalPages ?? raw.pageable?.totalPages ?? 1,
    };
  }

  if (Array.isArray(raw)) {
    return {
      content: raw,
      totalElements: raw.length,
      totalPages: 1,
    };
  }

  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
  };
};

const arr = <T>(raw: any): T[] =>
  Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.content)
        ? raw.content
        : [];

export interface ResourceResponse {
  code: string;
  typeCode: string | null;
  groupCode: string | null;
  policyCode: string | null;
  name: string;
  description: string | null;
  capacity: number | null;
  zone: string | null;
  locationLabel: string | null;
  status: ResourceStatus;
  bookingEnabled: boolean;
  portalVisible: boolean;
  displayOrder: number | null;
  active: boolean;
}

export interface ResourceSummaryResponse {
  code: string;
  typeCode: string | null;
  name: string;
  status: ResourceStatus;
  bookingEnabled: boolean;
  portalVisible: boolean;
  active: boolean;
}

export interface ResourceRequest {
  typeId: number;
  groupId?: number;
  policyId?: number;
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
  floorLabel?: string;
  locationLabel?: string;
  bookingEnabled?: boolean;
  portalVisible?: boolean;
}

export interface ResourceSearchCriteria {
  code?: string;
  typeId?: number;
  groupId?: number;
  policyId?: number;
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

export interface ResourceTypeResponse {
  id?: number;
  typeId?: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface ResourceGroupResponse {
  id?: number;
  groupId?: number;
  code: string;
  name: string;
  description: string | null;
  portalVisible: boolean;
  active: boolean;
}

export interface ResourcePolicyResponse {
  id?: number;
  policyId?: number;
  code: string;
  name: string;
  description: string | null;
  minBookingDurationMinutes: number;
  maxBookingDurationMinutes: number;
  minBookingNoticeMinutes: number;
  cancellationNoticeMinutes: number;
  allowCancellation: boolean;
  active: boolean;
}

export interface AmenityResponse {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  quantity: number | null;
  optional: boolean | null;
  extraPrice: number | null;
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
  reason?: string;
  active: boolean;
}

export interface ResourcePricingRuleResponse {
  id: number;
  resourceCode: string;
  bookingUnit: ResourceBookingUnit;
  price: number;
  label?: string | null;
  dayOfWeek?: string | number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  adjustmentType?: AdjustmentType | null;
  adjustmentValue?: number | null;
  lastMinuteMinutes?: number | null;
  priority?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  active: boolean;
}

export interface PricingRuleQuote {
  resourceCode: string;
  bookingUnit: string;
  startedAt: string;
  endedAt: string;
  basePrice: number;
  finalPrice: number;
  appliedRuleId?: number | null;
  appliedRuleLabel?: string | null;
  adjustmentType?: string | null;
  adjustmentValue?: number | null;
}

export interface ResourcePhoto {
  id: number;
  resourceCode: string;
  documentCode: string;
  caption?: string | null;
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
  status: "AVAILABLE" | "PARTIAL" | "FULL";
}

export interface PublicResourceCalendar {
  resourceCode: string;
  resourceName: string;
  fromDate: string;
  toDate: string;
  days: PublicCalendarDay[];
}

export interface ResourceAvailabilityGroupResponse {
  resourceCode: string;
  resourceName: string;
  availabilities: ResourceAvailabilityResponse[];
}

export const resourceService = {
  getResources: async (params?: {
    summary?: boolean;
    typeCode?: string;
    groupCode?: string;
    policyCode?: string;
    status?: ResourceStatus;
    portalVisible?: boolean;
    bookingEnabled?: boolean;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourceResponse | ResourceSummaryResponse>> =>
    page<ResourceResponse | ResourceSummaryResponse>(
      (await apiClient.get("/sni/api/v1/resources", { params })).data,
    ),

  getResource: async (code: string): Promise<ResourceResponse> =>
    (await apiClient.get(`/sni/api/v1/resources/${code}`)).data,

  searchResources: async (query: string): Promise<ResourceSummaryResponse[]> =>
    arr<ResourceSummaryResponse>(
      (
        await apiClient.get("/sni/api/v1/resources/search/basic", {
          params: { query },
        })
      ).data,
    ),

  advancedSearchResources: async (
    criteria?: ResourceSearchCriteria,
  ): Promise<PageResponse<ResourceSummaryResponse>> =>
    page<ResourceSummaryResponse>(
      (await apiClient.post("/sni/api/v1/resources/search", criteria ?? null))
        .data,
    ),

  createResource: async (data: ResourceRequest): Promise<void> => {
    await apiClient.post("/sni/api/v1/resources", data);
  },

  updateResource: async (
    code: string,
    data: UpdateResourceRequest,
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/resources/${code}`, data);
  },

  updateResourceClassification: async (
    code: string,
    data: { typeId: number; groupId?: number; policyId?: number },
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/classification`, data);
  },

  updateResourceStatus: async (
    code: string,
    status: ResourceStatus,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/status`, null, {
      params: { status },
    });
  },

  updateResourceBookingEnabled: async (
    code: string,
    bookingEnabled: boolean,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/booking-enabled`, {
      bookingEnabled,
    });
  },

  updateResourcePortalVisible: async (
    code: string,
    portalVisible: boolean,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/portal-visible`, {
      visible: portalVisible,
    });
  },

  updateResourceActive: async (
    code: string,
    active: boolean,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/active`, { active });
  },

  updateResourceDisplayOrder: async (
    code: string,
    displayOrder: number,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resources/${code}/display-order`, {
      displayOrder,
    });
  },

  deleteResource: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resources/${code}`);
  },

  linkAmenity: async (
    resourceCode: string,
    amenityCode: string,
    data?: { quantity?: number; optional?: boolean; extraPrice?: number },
  ): Promise<void> => {
    await apiClient.post("/sni/api/v1/resources/amenities/link", {
      resourceCode,
      amenityCode,
      ...data,
    });
  },

  linkAmenityToResource: async (
    resourceCode: string,
    data: {
      amenityCode: string;
      quantity?: number;
      optional?: boolean;
      extraPrice?: number;
    },
  ): Promise<void> => {
    await apiClient.post("/sni/api/v1/resources/amenities/link", {
      resourceCode,
      ...data,
    });
  },

  getResourceAmenities: async (
    resourceCode: string,
  ): Promise<AmenityResponse[]> =>
    arr<AmenityResponse>(
      (await apiClient.get(`/sni/api/v1/resources/${resourceCode}/amenities`))
        .data,
    ),

  unlinkAmenity: async (
    resourceCode: string,
    amenityCode: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/resources/${resourceCode}/amenities/${amenityCode}`,
    );
  },

  getResourceTypes: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourceTypeResponse>> =>
    page<ResourceTypeResponse>(
      (await apiClient.get("/sni/api/v1/resource-types", { params })).data,
    ),

  getResourceType: async (code: string): Promise<ResourceTypeResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-types/${code}`)).data,

  searchResourceTypes: async (
    query: string,
  ): Promise<PageResponse<ResourceTypeResponse>> =>
    page<ResourceTypeResponse>(
      (
        await apiClient.get("/sni/api/v1/resource-types/search/basic", {
          params: { query },
        })
      ).data,
    ),

  createResourceType: async (data: {
    name: string;
    description?: string;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-types", data);
  },

  updateResourceType: async (
    code: string,
    data: { name?: string; description?: string; active?: boolean },
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/resource-types/${code}`, data);
  },

  deleteResourceType: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-types/${code}`);
  },

  getResourceGroups: async (_params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourceGroupResponse>> =>
    page<ResourceGroupResponse>(
      (await apiClient.get("/sni/api/v1/resource-groups")).data,
    ),

  getResourceGroup: async (code: string): Promise<ResourceGroupResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-groups/${code}`)).data,

  searchResourceGroups: async (
    query: string,
  ): Promise<PageResponse<ResourceGroupResponse>> =>
    page<ResourceGroupResponse>(
      (
        await apiClient.get("/sni/api/v1/resource-groups/search/basic", {
          params: { query },
        })
      ).data,
    ),

  createResourceGroup: async (data: {
    name: string;
    description?: string;
    portalVisible?: boolean;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-groups", data);
  },

  updateResourceGroup: async (
    code: string,
    data: {
      name?: string;
      description?: string;
      portalVisible?: boolean;
      active?: boolean;
    },
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/resource-groups/${code}`, data);
  },

  deleteResourceGroup: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-groups/${code}`);
  },

  getResourcePolicies: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourcePolicyResponse>> =>
    page<ResourcePolicyResponse>(
      (await apiClient.get("/sni/api/v1/resource-policies", { params })).data,
    ),

  getResourcePolicy: async (code: string): Promise<ResourcePolicyResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-policies/${code}`)).data,

  searchResourcePolicies: async (
    query: string,
  ): Promise<PageResponse<ResourcePolicyResponse>> =>
    page<ResourcePolicyResponse>(
      (
        await apiClient.get("/sni/api/v1/resource-policies/search/basic", {
          params: { query },
        })
      ).data,
    ),

  createResourcePolicy: async (data: {
    name: string;
    description?: string;
    minBookingDurationMinutes: number;
    maxBookingDurationMinutes: number;
    minBookingNoticeMinutes: number;
    cancellationNoticeMinutes?: number;
    allowCancellation?: boolean;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-policies", data);
  },

  updateResourcePolicy: async (
    code: string,
    data: Partial<ResourcePolicyResponse>,
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/resource-policies/${code}`, data);
  },

  updateResourcePolicyStatus: async (
    code: string,
    active: boolean,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/resource-policies/${code}/status`,
      null,
      { params: { active } },
    );
  },

  updateResourcePolicyAllowCancellation: async (
    code: string,
    allowed: boolean,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/resource-policies/${code}/allow-cancellation`,
      null,
      { params: { allowed } },
    );
  },

  deleteResourcePolicy: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-policies/${code}`);
  },

  getAmenities: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<AmenityResponse>> =>
    page<AmenityResponse>(
      (await apiClient.get("/sni/api/v1/resource-amenities", { params })).data,
    ),

  getAmenity: async (code: string): Promise<AmenityResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-amenities/${code}`)).data,

  searchAmenities: async (
    query: string,
  ): Promise<PageResponse<AmenityResponse>> =>
    page<AmenityResponse>(
      (
        await apiClient.get("/sni/api/v1/resource-amenities/search/basic", {
          params: { query },
        })
      ).data,
    ),

  createAmenity: async (data: {
    name: string;
    description?: string;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-amenities", data);
  },

  updateAmenity: async (
    code: string,
    data: { name?: string; description?: string; active?: boolean },
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/resource-amenities/${code}`, data);
  },

  deleteAmenity: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-amenities/${code}`);
  },

  getResourceAvailabilities: async (params?: {
    resourceCode?: string;
    startedAt?: string;
    endedAt?: string;
    fromDate?: string;
    toDate?: string;
    available?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourceAvailabilityResponse>> =>
    page<ResourceAvailabilityResponse>(
      (await apiClient.get("/sni/api/v1/resource-availabilities", { params }))
        .data,
    ),

  getGroupedResourceAvailabilities: async (): Promise<
    ResourceAvailabilityGroupResponse[]
  > =>
    arr<ResourceAvailabilityGroupResponse>(
      (await apiClient.get("/sni/api/v1/resource-availabilities/grouped")).data,
    ),

  createResourceAvailability: async (data: {
    resourceCode: string;
    startedAt: string;
    endedAt: string;
    capacity?: number;
    totalCapacity?: number;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-availabilities", {
      resourceCode: data.resourceCode,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      capacity: data.capacity ?? data.totalCapacity,
      active: data.active,
    });
  },

  getRemainingAvailabilities: async (
    resourceCode: string,
    params?: {
      startedAt?: string;
      endedAt?: string;
      durationMinutes?: number;
      quantity?: number;
    },
  ): Promise<ResourceAvailabilityWindowResponse[]> =>
    arr<ResourceAvailabilityWindowResponse>(
      (
        await apiClient.get("/sni/api/v1/resource-availabilities/remaining", {
          params: { resourceCode, ...params },
        })
      ).data,
    ),

  reserveAvailability: async (data: {
    resourceCode: string;
    startedAt: string;
    endedAt: string;
    quantity: number;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-availabilities/reserve", data);
  },

  releaseAvailability: async (data: {
    resourceCode: string;
    startedAt: string;
    endedAt: string;
    quantity: number;
  }): Promise<void> => {
    await apiClient.patch("/sni/api/v1/resource-availabilities/release", data);
  },

  getResourceClosures: async (params?: {
    resourceCode?: string;
    startedAt?: string;
    endedAt?: string;
    fromDate?: string;
    toDate?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourceClosureResponse>> =>
    page<ResourceClosureResponse>(
      (await apiClient.get("/sni/api/v1/resource-closures", { params })).data,
    ),

  getResourceClosure: async (id: number): Promise<ResourceClosureResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-closures/${id}`)).data,

  createResourceClosure: async (data: {
    resourceCode: string;
    startedAt: string;
    endedAt: string;
    reason?: string;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-closures", data);
  },

  updateResourceClosureActive: async (
    id: number,
    active: boolean,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/resource-closures/${id}/active`, {
      active,
    });
  },

  deleteResourceClosure: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-closures/${id}`);
  },

  getPricingRules: async (params?: {
    resourceCode?: string;
    bookingUnit?: ResourceBookingUnit;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ResourcePricingRuleResponse>> =>
    page<ResourcePricingRuleResponse>(
      (await apiClient.get("/sni/api/v1/resource-pricing-rules", { params }))
        .data,
    ),

  getPricingRule: async (id: number): Promise<ResourcePricingRuleResponse> =>
    (await apiClient.get(`/sni/api/v1/resource-pricing-rules/${id}`)).data,

  createPricingRule: async (data: {
    resourceCode: string;
    bookingUnit: ResourceBookingUnit;
    price: number;
    label?: string;
    dayOfWeek?: string | number;
    startsAt?: string;
    endsAt?: string;
    adjustmentType?: AdjustmentType;
    adjustmentValue?: number;
    lastMinuteMinutes?: number | null;
    priority?: number;
    validFrom?: string;
    validUntil?: string;
    active?: boolean;
  }): Promise<void> => {
    await apiClient.post("/sni/api/v1/resource-pricing-rules", data);
  },

  updatePricingRule: async (
    id: number,
    data: Partial<ResourcePricingRuleResponse>,
  ): Promise<ResourcePricingRuleResponse> =>
    (await apiClient.put(`/sni/api/v1/resource-pricing-rules/${id}`, data))
      .data,

  patchPricingRule: async (
    id: number,
    data: Partial<ResourcePricingRuleResponse>,
  ): Promise<ResourcePricingRuleResponse> =>
    (await apiClient.patch(`/sni/api/v1/resource-pricing-rules/${id}`, data))
      .data,

  updatePricingRuleActive: async (
    id: number,
    active: boolean,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/resource-pricing-rules/${id}/active`,
      null,
      { params: { active } },
    );
  },

  deletePricingRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-pricing-rules/${id}`);
  },

  getPricingRuleQuote: async (params: {
    resourceCode: string;
    bookingUnit: ResourceBookingUnit;
    startedAt: string;
    endedAt: string;
  }): Promise<PricingRuleQuote> =>
    (
      await apiClient.get("/sni/api/v1/resource-pricing-rules/quote", {
        params,
      })
    ).data,

  getResourcePhotos: async (resourceCode: string): Promise<ResourcePhoto[]> =>
    arr<ResourcePhoto>(
      (await apiClient.get(`/sni/api/v1/resources/${resourceCode}/photos`))
        .data,
    ),

  addResourcePhoto: async (
    resourceCode: string,
    data: {
      documentCode: string;
      caption?: string;
      cover?: boolean;
      displayOrder?: number;
      active?: boolean;
    },
  ): Promise<ResourcePhoto> =>
    (await apiClient.post(`/sni/api/v1/resources/${resourceCode}/photos`, data))
      .data,

  updateResourcePhoto: async (
    resourceCode: string,
    photoId: number,
    data: {
      documentCode?: string;
      caption?: string;
      cover?: boolean;
      displayOrder?: number;
      active?: boolean;
    },
  ): Promise<ResourcePhoto> =>
    (
      await apiClient.patch(
        `/sni/api/v1/resources/${resourceCode}/photos/${photoId}`,
        data,
      )
    ).data,

  deleteResourcePhoto: async (
    resourceCode: string,
    photoId: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/resources/${resourceCode}/photos/${photoId}`,
    );
  },

  getPublicCalendar: async (
    resourceCode: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PublicResourceCalendar> =>
    (
      await apiClient.get(
        `/sni/api/v1/public/resources/${resourceCode}/calendar`,
        { params: { fromDate, toDate } },
      )
    ).data,
};