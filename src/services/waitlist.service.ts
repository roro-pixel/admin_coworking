import { apiClient } from "./api";

export type WaitlistStatus =
  | "WAITING"
  | "OFFERED"
  | "PROMOTED"
  | "EXPIRED"
  | "CANCELLED";

export interface IdentityLookup {
  memberId?: number;
  customerId?: string;
  businessCode?: string;
  email?: string;
  phone?: string;
  walkIn?: boolean;
}

export interface WaitlistAlternative {
  resourceCode: string;
  resourceName: string;
  startedAt: string;
  endedAt: string;
  remainingCapacity: number;
  estimatedAmount: number;
  score: number;
  reason: string;
}

export interface WaitlistEntry {
  id: number;
  resourceCode: string;
  resourceName: string;
  ownerType: "MEMBER" | "CUSTOMER" | "BUSINESS" | "WALK_IN";
  ownerCode?: string;
  ownerName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  startedAt: string;
  endedAt: string;
  quantity: number;
  paymentMode: "DIRECT" | "SUBSCRIPTION" | "PASS";
  status: WaitlistStatus;
  priority: number;
  requestedAt: string;
  offeredAt?: string;
  expiresAt?: string;
  promotedAt?: string;
  cancelledAt?: string;
  alternatives: WaitlistAlternative[];
}

export interface CreateWaitlistRequest {
  resourceCode: string;
  identityLookup: IdentityLookup;
  startedAt: string;
  endedAt: string;
  quantity: number;
  paymentMode: "DIRECT" | "SUBSCRIPTION" | "PASS";
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface PromoteAvailableRequest {
  limit?: number;
  dryRun?: boolean;
}

export interface PromoteAvailableResponse {
  promotedCount: number;
  entries: Array<{
    waitlistId: number;
    resourceCode: string;
    startedAt: string;
    endedAt: string;
    ownerName?: string;
    status: string;
  }>;
}

export interface ExpireOffersRequest {
  limit?: number;
  dryRun?: boolean;
}

export interface ExpireOffersResponse {
  expiredCount: number;
  entryIds: number[];
}

export const waitlistService = {
  // Entrer en liste d'attente
  addToWaitlist: async (
    data: CreateWaitlistRequest,
  ): Promise<WaitlistEntry> => {
    const response = await apiClient.post(
      "/sni/api/v1/bookings/waitlist",
      data,
    );
    return response.data;
  },

  // Lister les entrées de liste d'attente
  getWaitlistEntries: async (params?: {
    status?: WaitlistStatus;
    resourceCode?: string;
    ownerType?: string;
    ownerCode?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: WaitlistEntry[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/bookings/waitlist", {
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

  // Obtenir une entrée par ID
  getWaitlistEntry: async (id: number): Promise<WaitlistEntry> => {
    const response = await apiClient.get(`/sni/api/v1/bookings/waitlist/${id}`);
    return response.data;
  },

  // Annuler une entrée
  cancelWaitlistEntry: async (id: number): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/bookings/waitlist/${id}/cancel`);
  },

  // Admin: promouvoir les créneaux disponibles
  promoteAvailable: async (
    data?: PromoteAvailableRequest,
  ): Promise<PromoteAvailableResponse> => {
    const response = await apiClient.post(
      "/sni/api/v1/bookings/waitlist/promote-available",
      data || { limit: 100 },
    );
    return response.data;
  },

  // Admin: expirer les offres échues
  expireOffers: async (
    data?: ExpireOffersRequest,
  ): Promise<ExpireOffersResponse> => {
    const response = await apiClient.post(
      "/sni/api/v1/bookings/waitlist/expire-offers",
      data || { limit: 100 },
    );
    return response.data;
  },

  // Obtenir les alternatives immédiates pour un créneau
  getAlternatives: async (
    data: CreateWaitlistRequest,
  ): Promise<WaitlistAlternative[]> => {
    const response = await apiClient.post(
      "/sni/api/v1/bookings/waitlist/alternatives",
      data,
    );
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.alternatives))
      return response.data.alternatives;
    return [];
  },

  // Réserver une alternative et annuler l'entrée waitlist
  bookAlternativeAndCancelWaitlist: async (
    waitlistId: number,
    bookingData: {
      resourceCode: string;
      startedAt: string;
      endedAt: string;
    },
  ): Promise<{ bookingNumber: string; waitlistCancelled: boolean }> => {
    const response = await apiClient.post(
      `/sni/api/v1/bookings/waitlist/${waitlistId}/book-alternative`,
      bookingData,
    );
    return response.data;
  },
};
