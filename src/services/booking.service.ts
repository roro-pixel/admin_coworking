import { apiClient } from './api';

export type BookingPaymentMode = "DIRECT" | "SUBSCRIPTION" | "PASS";
export type BookingStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED";
export type BookingHoldStatus = "ACTIVE" | "CONFIRMED" | "RELEASED" | "EXPIRED";
export type BookingParticipantRole = "HOST" | "GUEST" | "ORGANIZER";
export type BookingParticipantStatus = "INVITED" | "CONFIRMED" | "DECLINED" | "REMOVED";

export interface BookingParticipant {
  id?: number;
  memberCode?: string;
  name: string;
  email?: string;
  phone?: string;
  role: BookingParticipantRole;
  status?: BookingParticipantStatus;
}

export interface BookingLine {
  id: number;
  lineType: "RESOURCE" | "ENTITLEMENT" | "DISCOUNT" | "FEE";
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  currency: string;
  entitlementCode?: string;
  billableNumber?: string;
}

export interface BookingResponse {
  bookingNumber: string;
  resourceCode: string;
  resourceName: string;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
  ownerType: string;
  ownerCode: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: BookingStatus;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  quantity: number;
  bookingUnit: string;
  paymentMode: BookingPaymentMode;
  subscriptionNumber?: string;
  passNumber?: string;
  entitlementCode?: string;
  unitPrice: number;
  subtotalAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  metadataJson?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  lines: BookingLine[];
  participants: BookingParticipant[];
}

export interface BookingHistory {
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  changedAt: string;
}

export interface BookingEvent {
  eventNumber: string;
  bookingNumber: string;
  eventType: string;
  title: string;
  description?: string;
  payloadJson?: string;
  createdAt: string;
}

export interface CheckAvailabilityRequest {
  resourceCode: string;
  memberId?: string;
  customerId?: string;
  businessCode?: string;
  walkIn?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentMode: BookingPaymentMode;
  startedAt: string;
  endedAt: string;
  quantity: number;
}

export interface CheckAvailabilityResponse {
  resourceCode: string;
  resourceName: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  quantity: number;
  available: boolean;
  remainingCapacity: number;
  bookingUnit: string;
  unitPrice: number;
  estimatedAmount: number;
  currency: string;
  message?: string;
}

export interface BookingSuggestion {
  resourceCode: string;
  resourceName: string;
  startedAt: string;
  endedAt: string;
  remainingCapacity: number;
  estimatedAmount: number;
  reason: string;
}

export interface CreateBookingRequest {
  resourceCode: string;
  memberId?: string;
  customerId?: string;
  businessCode?: string;
  walkIn?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  idempotencyKey?: string;
  holdNumber?: string;
  startedAt: string;
  endedAt: string;
  quantity: number;
  paymentMode: BookingPaymentMode;
  confirmImmediately?: boolean;
  sendEmail?: boolean;
  notes?: string;
  metadataJson?: string;
  participants?: Omit<BookingParticipant, 'id' | 'status'>[];
}

export interface BookingStatusChangeRequest {
  changedBy?: string;
  reason?: string;
  sendEmail?: boolean;
}

export interface BookingAudiencePolicy {
  id?: number;
  audienceType: string;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
  approvalRequired: boolean;
  maxActiveBookings: number;
  maxBookingsPerDay: number;
  maxBookingsPerWeek: number;
  maxBookingsPerMonth: number;
  maxNoShowsPerMonth: number;
  minBookingNoticeMinutes: number;
  maxBookingDurationMinutes: number;
  active: boolean;
}

export interface BookingQuotaOverride {
  overrideNumber: string;
  ownerType: string;
  ownerCode: string;
  resourceCode?: string;
  extraActiveBookings: number;
  extraBookingsPerDay: number;
  extraBookingsPerWeek: number;
  extraBookingsPerMonth: number;
  reason: string;
  approvedBy: string;
  validFrom: string;
  validUntil?: string;
  active: boolean;
}

export interface BookingMetrics {
  draftBookings: number;
  pendingApprovalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  activeHolds: number;
  confirmedAmount: number;
  completedAmount: number;
}

export const bookingService = {
  // Vérifier disponibilité
  checkAvailability: async (data: CheckAvailabilityRequest): Promise<CheckAvailabilityResponse> => {
    const response = await apiClient.post('/sni/api/v1/bookings/check-availability', data);
    return response.data;
  },

  // Suggestions alternatives
  getSuggestions: async (data: CheckAvailabilityRequest): Promise<BookingSuggestion[]> => {
    const response = await apiClient.post('/sni/api/v1/bookings/suggestions', data);
    return response.data;
  },

  // Créer un hold
  createHold: async (data: {
    resourceCode: string;
    memberId?: string;
    customerId?: string;
    businessCode?: string;
    startedAt: string;
    endedAt: string;
    quantity: number;
    ttlMinutes: number;
    idempotencyKey?: string;
  }): Promise<{ holdNumber: string; status: string; expiresAt: string }> => {
    const response = await apiClient.post('/sni/api/v1/bookings/holds', data);
    return response.data;
  },

  // Libérer un hold
  releaseHold: async (holdNumber: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/bookings/holds/${holdNumber}/release`);
  },

  // Créer un booking
  createBooking: async (data: CreateBookingRequest): Promise<BookingResponse> => {
    const response = await apiClient.post('/sni/api/v1/bookings', data);
    return response.data;
  },

  // Récupérer un booking
  getBooking: async (bookingNumber: string): Promise<BookingResponse> => {
    const response = await apiClient.get(`/sni/api/v1/bookings/${bookingNumber}`);
    return response.data;
  },

  // Lister les bookings
  // L'API retourne { data: [...], pageable: { totalPages, totalElements, ... } }
  // format non standard (pas content/totalPages au premier niveau)
  getBookings: async (params?: {
    query?: string;
    ownerType?: string;
    ownerCode?: string;
    resourceCode?: string;
    status?: string;
    startedFrom?: string;
    startedTo?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ data: BookingResponse[]; pageable: { page: number; size: number; totalPages: number; totalElements: number; first: boolean; last: boolean; hasNext: boolean; hasPrevious: boolean } }> => {
    const response = await apiClient.get('/sni/api/v1/bookings', { params });
    // Wrapper defensif
    if (response.data?.data !== undefined) return response.data;
    if (Array.isArray(response.data?.content)) {
      return { data: response.data.content, pageable: { page: params?.page || 0, size: params?.size || 20, totalPages: response.data.totalPages || 1, totalElements: response.data.totalElements || response.data.content.length, first: (params?.page || 0) === 0, last: true, hasNext: false, hasPrevious: (params?.page || 0) > 0 } };
    }
    if (Array.isArray(response.data)) {
      return { data: response.data, pageable: { page: 0, size: response.data.length, totalPages: 1, totalElements: response.data.length, first: true, last: true, hasNext: false, hasPrevious: false } };
    }
    return { data: [], pageable: { page: 0, size: 20, totalPages: 0, totalElements: 0, first: true, last: true, hasNext: false, hasPrevious: false } };
  },

  // Recherche rapide
  searchBookings: async (query: string): Promise<BookingResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/bookings/search', { params: { query } });
    return response.data;
  },

  // Confirmer
  confirmBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/confirm`, data || {});
    return response.data;
  },

  // Approuver
  approveBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/approve`, data || {});
    return response.data;
  },

  // Rejeter
  rejectBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/reject`, data || {});
    return response.data;
  },

  // Démarrer
  startBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/start`, data || {});
    return response.data;
  },

  // Check-in
  checkIn: async (bookingNumber: string, data?: { actor?: string; note?: string; sendEmail?: boolean }): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/check-in`, data || {});
    return response.data;
  },

  // Check-out
  checkOut: async (bookingNumber: string, data?: { actor?: string; note?: string; sendEmail?: boolean }): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/check-out`, data || {});
    return response.data;
  },

  // Compléter
  completeBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/complete`, data || {});
    return response.data;
  },

  // Annuler
  cancelBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/cancel`, data || {});
    return response.data;
  },

  // No-show
  noShowBooking: async (bookingNumber: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/bookings/${bookingNumber}/no-show`, data || {});
    return response.data;
  },

  // Historique
  getBookingHistory: async (bookingNumber: string): Promise<BookingHistory[]> => {
    const response = await apiClient.get(`/sni/api/v1/bookings/${bookingNumber}/history`);
    return response.data;
  },

  // Événements
  getBookingEvents: async (bookingNumber: string): Promise<BookingEvent[]> => {
    const response = await apiClient.get(`/sni/api/v1/bookings/${bookingNumber}/events`);
    return response.data;
  },

  // Participants
  addParticipant: async (bookingNumber: string, data: Omit<BookingParticipant, 'id' | 'status'>): Promise<BookingParticipant> => {
    const response = await apiClient.post(`/sni/api/v1/bookings/${bookingNumber}/participants`, data);
    return response.data;
  },

  removeParticipant: async (bookingNumber: string, participantId: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/bookings/${bookingNumber}/participants/${participantId}`);
  },

  // Politiques
  getPolicies: async (params?: { audienceType?: string; active?: boolean }): Promise<BookingAudiencePolicy[]> => {
    const response = await apiClient.get('/sni/api/v1/bookings/policies', { params });
    return response.data;
  },

  createPolicy: async (data: BookingAudiencePolicy): Promise<BookingAudiencePolicy> => {
    const response = await apiClient.post('/sni/api/v1/bookings/policies', data);
    return response.data;
  },

  updatePolicy: async (policyId: number, data: Partial<BookingAudiencePolicy>): Promise<BookingAudiencePolicy> => {
    const response = await apiClient.put(`/sni/api/v1/bookings/policies/${policyId}`, data);
    return response.data;
  },

  // Quota overrides
  getQuotaOverrides: async (params?: { ownerType?: string; ownerCode?: string; active?: boolean }): Promise<BookingQuotaOverride[]> => {
    const response = await apiClient.get('/sni/api/v1/bookings/quota-overrides', { params });
    return response.data;
  },

  createQuotaOverride: async (data: any): Promise<BookingQuotaOverride> => {
    const response = await apiClient.post('/sni/api/v1/bookings/quota-overrides', data);
    return response.data;
  },

  // Métriques
  getMetrics: async (): Promise<BookingMetrics> => {
    const response = await apiClient.get('/sni/api/v1/bookings/metrics/overview');
    return response.data;
  },
};