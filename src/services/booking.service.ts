import { apiClient } from "./api";

const B = "/sni/api/v1/bookings";

/**
 * WALLET : prépayé. Pour une organisation (billingCompanyCode), puise dans son
 * portefeuille si le membre y a une autorisation couvrant BOOKING.
 */
export type BookingPaymentMode = "DIRECT" | "SUBSCRIPTION" | "PASS" | "WALLET";
export type BookingStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PENDING_PAYMENT"
  | "REJECTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED";
export type BookingPaymentStatus = "COVERED" | "PENDING" | "PAID" | "CANCELLED";
export type BookingChannel = "PORTAL" | "TEAM" | "PHONE" | "DESK" | "EMAIL" | "WHATSAPP";
export type BookingUnit = "HOUR" | "HALF_DAY" | "DAY" | "WEEK" | "MONTH";
export type OwnerType = "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";
export type BookingHoldStatus = "ACTIVE" | "CONFIRMED" | "RELEASED" | "EXPIRED";
export type BookingParticipantRole = "HOST" | "GUEST" | "ORGANIZER" | "MEMBER";
export type BookingParticipantStatus = "INVITED" | "CONFIRMED" | "DECLINED" | "REMOVED";
export type WaitlistStatus = "WAITING" | "OFFERED" | "BOOKED" | "CANCELLED" | "EXPIRED";

/** Série récurrente : saisie de l'écran de création, envoyée à POST /bookings/recurring */
export interface BookingRecurrence {
  recurrenceType: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  intervalValue: number;
  endDate: string;
  excludedDates?: string[];
  recurrenceGroupNumber?: string;
  occurrences?: number;
}

export interface BookingParticipant {
  id?: number | string;
  memberCode?: string;
  name: string;
  email?: string;
  phone?: string;
  role: BookingParticipantRole;
  status?: BookingParticipantStatus;
  invitedAt?: string;
  respondedAt?: string;
  checkedInAt?: string;
}

export interface BookingLine {
  id: number | string;
  lineType:
    | "RESOURCE"
    | "ENTITLEMENT"
    | "BILLABLE"
    | "SERVICE"
    | "AMENITY"
    | "PARTICIPANT"
    | "DEPOSIT"
    | "OVERRUN"
    | "NO_SHOW"
    | "DISCOUNT"
    | "FEE";
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
  ownerName?: string;
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
  paymentStatus?: BookingPaymentStatus;
  paymentStatusLabel?: string;
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
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
  lines: BookingLine[];
  participants: BookingParticipant[];
  recurrence?: BookingRecurrence;
  recurrenceGroupNumber?: string;
  checkInToken?: string;
  checkInQrValue?: string;
  virtualMeetingUrl?: string;
  /** Membre de l'équipe qui a dérogé au préavis de la ressource. */
  policyOverrideBy?: string | null;
  /** Organisation qui paie, quand la réservation est faite pour son compte. */
  billingCompanyCode?: string | null;
  resourceCapacity?: number;
  wholeResourceBooking?: boolean;
  seatsLabel?: string;
  batchNumber?: string | null;
  modificationCount?: number;
  lastModifiedAt?: string;
  lastModification?: string;
  createdBy?: string;
  channel?: BookingChannel;
  holdNumber?: string;
  paymentDueAt?: string;
  paidAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectionReasonCode?: string;
  cancellationReason?: string;
  cancellationReasonCode?: string;
  invoiceNumber?: string | null;
  extrasAmount?: number;
  grandTotal?: number;
  payOnSite?: boolean;
  originalAmount?: number;
  priceAdjustmentAmount?: number;
  priceAdjustmentRate?: number;
  priceAdjustmentReason?: string;
  priceAdjustmentReasonCode?: string;
  priceAdjustmentBy?: string;
  priceAdjustmentStatus?: string;
  priceAdjustmentApprovalNumber?: string;
  leadNumber?: string;
  callNote?: string;
  attendanceAnswer?: string;
  attendanceAnsweredAt?: string;
  releasedEarlyAt?: string;
  depositAmount?: number;
  depositPaidAt?: string;
  roomLayout?: string;
  specialRequests?: string;
  internalNotes?: string;
  tags?: string[];
  companyCoveredMinutes?: number;
  monthlyStatement?: boolean;
  csatScore?: number;
  csatComment?: string;
  csatAt?: string;
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

/** Titulaire : au plus un de memberId, customerId, businessCode ; sinon email, téléphone ou invité de passage. */
export interface OwnerFields {
  memberId?: string;
  customerId?: string;
  businessCode?: string;
  email?: string;
  phone?: string;
  walkIn?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CheckAvailabilityRequest extends OwnerFields {
  resourceCode: string;
  paymentMode?: BookingPaymentMode;
  /** Organisation qui paie : code client, "NONE" pour le membre seul. */
  billingCompanyCode?: string;
  bookingUnit?: BookingUnit;
  startedAt: string;
  endedAt: string;
  quantity?: number;
}

export interface OccupiedRange {
  startedAt: string;
  endedAt: string;
  /** BOOKED : réservations ; UNAVAILABLE : fermeture, option, créneau fermé */
  reason: string;
  bookingNumbers?: string[] | null;
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
  /** Raison en français, à afficher telle quelle. */
  message?: string;
  occupiedRanges?: OccupiedRange[];
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

export interface BookingOption {
  kind: "SERVICE" | "AMENITY";
  code: string;
  quantity?: number;
}

export interface BookingCaller {
  fullName?: string;
  phone?: string;
  email?: string;
  company?: string;
  callNote?: string;
  leadNumber?: string;
  createLead?: boolean;
}

export interface PriceAdjustmentRequest {
  discountRate?: number;
  newAmount?: number;
  reasonCode?: string;
  reasonText?: string;
}

export interface CreateBookingRequest extends OwnerFields {
  resourceCode: string;
  idempotencyKey?: string;
  holdNumber?: string;
  startedAt: string;
  endedAt: string;
  quantity?: number;
  paymentMode: BookingPaymentMode;
  bookingUnit?: BookingUnit;
  /** Organisation qui paie : code client, "NONE" pour le membre seul. */
  billingCompanyCode?: string;
  confirmImmediately?: boolean;
  sendEmail?: boolean;
  notes?: string;
  metadataJson?: string;
  participants?: Omit<BookingParticipant, "id" | "status">[];
  channel?: BookingChannel;
  options?: BookingOption[];
  payOnSite?: boolean;
  priceAdjustment?: PriceAdjustmentRequest;
  caller?: BookingCaller;
  depositRate?: number;
  /** Ancienne saisie de série : n'est plus envoyée à POST /bookings (voir createRecurring). */
  recurrence?: Omit<BookingRecurrence, "recurrenceGroupNumber">;
}

export interface CreateRecurringRequest {
  booking: CreateBookingRequest;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  intervalValue?: number;
  occurrences?: number;
  endDate?: string;
  excludedDates?: string[];
}

/** Motif en code + texte ; `reason` libre reste accepté. */
export interface BookingStatusChangeRequest {
  changedBy?: string;
  actor?: string;
  reason?: string;
  reasonCode?: string;
  reasonText?: string;
  sendEmail?: boolean;
}

export interface BookingCheckInRequest {
  actor?: string;
  note?: string;
  sendEmail?: boolean;
}

export interface PublicSelfCheckInRequest {
  token: string;
  lat?: number;
  lng?: number;
}

export interface PublicCheckInResponse {
  success: boolean;
  bookingNumber?: string;
  resourceName?: string;
  status?: BookingStatus | string;
  error?: string;
  message?: string;
}

export interface ScannerVerifyRequest {
  token: string;
  adminCode: string;
  lat?: number;
  lng?: number;
}

export interface TransferBookingRequest {
  newOwnerType: OwnerType | string;
  newOwnerCode: string;
  newContactName?: string;
  newContactEmail?: string;
  newContactPhone?: string;
  actor?: string;
  note?: string;
  sendEmail?: boolean;
}

export interface RescheduleBookingRequest {
  newStartedAt: string;
  newEndedAt: string;
  actor?: string;
  note?: string;
  sendEmail?: boolean;
  acceptPriceChange?: boolean;
}

export interface ChangeResourceRequest {
  newResourceCode: string;
  actor?: string;
  note?: string;
  sendEmail?: boolean;
  acceptPriceChange?: boolean;
}

export interface BookingChangePreview {
  bookingNumber: string;
  currentAmount: number;
  newAmount: number;
  difference: number;
  change: "INCREASE" | "DECREASE" | "SAME" | string;
  currency: string;
  invoiced: boolean;
  modificationCount?: number;
  lastModifiedAt?: string;
  lastModification?: string;
}

export interface BookingAudiencePolicy {
  policyNumber?: string;
  /** Ancien identifiant, conservé pour les écrans qui lisent encore `id`. */
  id?: number | string;
  audienceType: OwnerType | string;
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

export interface UpdateQuotaOverrideRequest {
  resourceCode?: string;
  extraActiveBookings?: number;
  extraBookingsPerDay?: number;
  extraBookingsPerWeek?: number;
  extraBookingsPerMonth?: number;
  reason?: string;
  validFrom?: string;
  validUntil?: string;
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

export interface BookingHold {
  holdNumber: string;
  resourceCode?: string;
  ownerType?: string;
  ownerCode?: string;
  startedAt?: string;
  endedAt?: string;
  quantity?: number;
  status: BookingHoldStatus | string;
  expiresAt: string;
}

export interface BookingCancellationPolicyRule {
  id: number | string;
  hoursBeforeStart: number;
  refundPercentage: number;
  ruleOrder: number;
  active: boolean;
}

// ───────────── Lots multi-ressources ─────────────

export interface BatchLine {
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  quantity?: number;
  bookingUnit?: BookingUnit;
  memberIds?: string[];
  notes?: string;
  participants?: Omit<BookingParticipant, "id" | "status">[];
}

export interface CreateBatchRequest {
  memberIds: string[];
  lines: BatchLine[];
  paymentMode: BookingPaymentMode;
  billingCompanyCode?: string | null;
  confirmImmediately?: boolean;
  sendEmail?: boolean;
  notes?: string;
  idempotencyKey?: string;
}

export interface BatchInvoice {
  documentNumber: string;
  status: string;
  customerType?: string;
  customerCode?: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  bookingNumbers: string[];
}

export interface BatchSummary {
  batchNumber: string;
  paymentMode?: BookingPaymentMode;
  billingCompanyCode?: string | null;
  bookingCount: number;
  memberCount: number;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface BatchResponse extends BatchSummary {
  invoices: BatchInvoice[];
  uninvoicedBookingNumbers: string[];
  bookings: BookingResponse[];
}

// ───────────── Suppléments, usage, exploitation ─────────────

export interface ExtraLine {
  type: string;
  code?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  currency?: string;
  billableNumber?: string;
}

export interface UsageRulesView {
  rules?: string;
  version?: string;
  acceptedAt?: string | null;
  upToDate?: boolean;
  endChecklist?: string[];
}

export interface ChecklistAnswer {
  label: string;
  done: boolean;
}

export interface EndReport {
  id?: number | string;
  bookingNumber?: string;
  condition?: string;
  checklist?: ChecklistAnswer[];
  photoDocumentCodes?: string[];
  notes?: string;
  reportedByType?: string;
  reportedBy?: string;
  incidentCode?: string | null;
  createdAt?: string;
}

export interface EndReportRequest {
  condition: "GOOD" | "DAMAGED";
  checklist?: ChecklistAnswer[];
  photoDocumentCodes?: string[];
  notes?: string;
}

export interface BookingDetailsRequest {
  roomLayout?: string;
  specialRequests?: string;
  internalNotes?: string;
  tags?: string[];
}

// ───────────── Liste d'attente ─────────────

export interface WaitlistEntry {
  id: number | string;
  resourceCode: string;
  resourceName?: string;
  ownerType?: string;
  ownerCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  startedAt: string;
  endedAt: string;
  quantity?: number;
  paymentMode?: BookingPaymentMode;
  status: WaitlistStatus;
  offeredAt?: string;
  expiresAt?: string;
  createdAt?: string;
  alternatives?: BookingSuggestion[];
  bookingNumber?: string;
  notifiedAt?: string;
}

export interface JoinWaitlistRequest {
  resourceCode: string;
  identityLookup?: OwnerFields;
  startedAt: string;
  endedAt: string;
  quantity?: number;
  paymentMode: BookingPaymentMode;
}

// ───────────── Règlement sur place, fiabilité ─────────────

export interface PayOnSiteGrant {
  ownerType: string;
  ownerCode: string;
  enabled: boolean;
  reason?: string;
  revokedAutomatically?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface PayOnSiteAccess {
  allowed: boolean;
  source?: "CLIENT_OPTION" | "GLOBAL_SETTING" | string;
  reason?: string;
}

export interface ReliabilityScore {
  ownerType: string;
  ownerCode: string;
  score: number;
  bookings: number;
  noShows: number;
  lateCancellations: number;
  windowDays: number;
  threshold: number;
  guaranteeRequired: boolean;
  guarantee?: string | null;
  depositRate?: number;
}

// ───────────── Entreprises ─────────────

export interface CompanyTerms {
  businessCode?: string;
  monthlyStatement?: boolean;
  monthlyBudget?: number | null;
  monthlyHours?: number | null;
  updatedBy?: string;
}

export interface MemberBudget {
  businessCode?: string;
  memberId: string;
  monthlyBudget?: number | null;
}

export interface MemberUsage {
  memberId: string;
  spent?: number;
  monthlyBudget?: number | null;
}

export interface CompanyUsage {
  businessCode?: string;
  month?: unknown;
  spent?: number;
  monthlyBudget?: number | null;
  coveredMinutes?: number | string;
  monthlyHours?: number | null;
  remainingMinutes?: number | string;
  members?: MemberUsage[];
}

export interface CompanyStatement {
  businessCode?: string;
  month?: unknown;
  items?: number;
  documentNumber?: string;
}

// ───────────── Planning, séries ─────────────

export interface PlanningItem {
  bookingNumber: string;
  contactName?: string;
  contactPhone?: string;
  startedAt: string;
  endedAt: string;
  status: BookingStatus;
  statusLabel?: string;
  checkedInAt?: string;
  late?: boolean;
  lateMinutes?: number | string;
  paymentStatus?: BookingPaymentStatus;
  payOnSite?: boolean;
  attendanceAnswer?: string;
  quantity?: number;
}

export interface PlanningResource {
  resourceCode: string;
  resourceName?: string;
  bookings: PlanningItem[];
}

export interface DeskPlanning {
  date: string;
  bookings: number;
  arrived: number;
  late: number;
  toCollect: number;
  resources: PlanningResource[];
}

export interface SeriesOutcome {
  recurrenceGroupNumber?: string;
  changed: number;
  skipped: number;
  changedBookings?: string[];
  refused?: Record<string, string>;
}

export interface SeriesRescheduleRequest {
  newStartTime?: { hour: number; minute: number } | string;
  newEndTime?: { hour: number; minute: number } | string;
  shiftDays?: number;
  acceptPriceChange?: boolean;
}

// ───────────── Suivi et pilotage ─────────────

export interface InsightsDashboard {
  from?: string;
  to?: string;
  bookings: number | string;
  confirmed: number | string;
  completed: number | string;
  cancelled: number | string;
  lateCancellations: number | string;
  noShows: number | string;
  expired: number | string;
  noShowRate: number;
  averageLeadHours: number;
  revenue: number;
  channels: { channel: string; bookings: number | string; revenue: number }[];
  topResources: { resourceCode: string; resourceName?: string; bookings: number | string; revenue: number }[];
}

export interface ReviewLine {
  resourceCode: string;
  resourceName?: string;
  reviews: number | string;
  averageScore: number;
  lowScores: number | string;
}

export interface MarginRow {
  resourceCode: string;
  resourceName?: string;
  bookings: number;
  bookedMinutes: number | string;
  revenue: number;
  costs: number;
  margin: number;
  marginRate: number;
  costsByKind?: Record<string, number>;
}

export interface MarginReport {
  from?: string;
  to?: string;
  rows: MarginRow[];
  revenue: number;
  costs: number;
  margin: number;
}

export interface BookingMargin {
  bookingNumber: string;
  resourceCode: string;
  revenue: number;
  costs: number;
  margin: number;
  costsByKind?: Record<string, number>;
}

export interface OccupancyRow {
  key: string;
  label?: string;
  openMinutes: number | string;
  bookedMinutes: number | string;
  occupancyRate: number;
  peakOpenMinutes: number | string;
  peakBookedMinutes: number | string;
  peakOccupancyRate: number;
  offPeakOpenMinutes: number | string;
  offPeakBookedMinutes: number | string;
  offPeakOccupancyRate: number;
  bookings: number;
  revenue: number;
}

export interface OccupancyReport {
  from?: string;
  to?: string;
  groupBy?: string;
  peakHours?: string;
  rows: OccupancyRow[];
}

export interface ResourceCost {
  id: number | string;
  resourceCode: string;
  kind?: string;
  basis?: string;
  amount: number;
  label?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface ResourceCostRequest {
  kind?: string;
  basis?: string;
  amount?: number;
  label?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface AppliedPrice {
  bookingNumber: string;
  startedAt: string;
  endedAt: string;
  status?: string;
  unit?: string;
  unitPrice: number;
  subtotal: number;
  total: number;
  currency?: string;
  rules?: string[];
}

// ───────────── Référentiels ─────────────

export interface LookupItem {
  type: OwnerType | string;
  code: string;
  label: string;
  hint?: string;
  active?: boolean;
}

export interface ReferenceValue {
  listCode: string;
  code: string;
  label: string;
  sortOrder?: number;
  active?: boolean;
  requiresText?: boolean;
  systemValue?: boolean;
  autoAdded?: boolean;
  usageCount?: number | string;
}

export interface ReferenceEnumValue {
  code: string;
  label: string;
  description?: string;
  order?: number;
  selectable?: boolean;
}

export interface BookingReference {
  enums: { module?: string; group: string; label?: string; values: ReferenceEnumValue[] }[];
  lists: Record<string, ReferenceValue[]>;
  cancellationPolicy: BookingCancellationPolicyRule[];
}

// ───────────── Utilitaires ─────────────

export interface Paged<T> {
  data: T[];
  pageable: { totalPages?: number; totalElements?: number; [k: string]: unknown };
}

function normalizePage<T>(responseData: any): Paged<T> {
  if (responseData?.data !== undefined && !Array.isArray(responseData)) {
    return { data: responseData.data, pageable: responseData.pageable || {} };
  }
  if (Array.isArray(responseData?.content)) {
    return {
      data: responseData.content,
      pageable: { totalPages: responseData.totalPages, totalElements: responseData.totalElements },
    };
  }
  if (Array.isArray(responseData)) {
    return { data: responseData, pageable: { totalPages: 1, totalElements: responseData.length } };
  }
  return { data: [], pageable: {} };
}

const asList = <T,>(d: any): T[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.content) ? d.content : []);

/** Écarte les clés vides pour ne pas envoyer de chaînes vides aux routes à paramètres facultatifs. */
const clean = <T extends Record<string, unknown>>(p?: T): T | undefined => {
  if (!p) return p;
  const out: Record<string, unknown> = {};
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  });
  return out as T;
};

const enc = encodeURIComponent;

export const bookingService = {
  // ── Disponibilité, devis, blocages ──
  checkAvailability: async (data: CheckAvailabilityRequest): Promise<CheckAvailabilityResponse> =>
    (await apiClient.post(`${B}/check-availability`, data)).data,

  getSuggestions: async (data: CheckAvailabilityRequest): Promise<BookingSuggestion[]> =>
    asList<BookingSuggestion>((await apiClient.post(`${B}/suggestions`, data)).data),

  createHold: async (
    data: OwnerFields & {
      resourceCode: string;
      startedAt: string;
      endedAt: string;
      quantity?: number;
      ttlMinutes?: number;
      idempotencyKey?: string;
    },
  ): Promise<BookingHold> => (await apiClient.post(`${B}/holds`, data)).data,

  releaseHold: async (holdNumber: string): Promise<BookingHold> =>
    (await apiClient.patch(`${B}/holds/${enc(holdNumber)}/release`)).data,

  expireDueHolds: async (limit = 100): Promise<number> =>
    (await apiClient.post(`${B}/holds/expire-due`, null, { params: { limit } })).data,

  // ── Réservations ──
  createBooking: async (data: CreateBookingRequest): Promise<BookingResponse> => {
    // La série passe par /recurring : on ne l'envoie jamais à POST /bookings.
    const { recurrence: _ignored, ...body } = data;
    void _ignored;
    return (await apiClient.post(B, body)).data;
  },

  createRecurring: async (data: CreateRecurringRequest): Promise<BookingResponse[]> => {
    const { recurrence: _ignored, ...booking } = data.booking;
    void _ignored;
    return asList<BookingResponse>((await apiClient.post(`${B}/recurring`, { ...data, booking })).data);
  },

  getBooking: async (bookingNumber: string): Promise<BookingResponse> =>
    (await apiClient.get(`${B}/${enc(bookingNumber)}`)).data,

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
  }): Promise<Paged<BookingResponse>> => normalizePage<BookingResponse>((await apiClient.get(B, { params: clean(params) })).data),

  searchBookings: async (query: string): Promise<BookingResponse[]> =>
    asList<BookingResponse>((await apiClient.get(`${B}/search`, { params: { query } })).data),

  // ── Statuts ──
  confirmBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/confirm`, data || {})).data,
  approveBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/approve`, data || {})).data,
  rejectBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/reject`, data || {})).data,
  startBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/start`, data || {})).data,
  completeBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/complete`, data || {})).data,
  cancelBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/cancel`, data || {})).data,
  noShowBooking: async (n: string, data?: BookingStatusChangeRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/no-show`, data || {})).data,

  // ── Accueil ──
  checkIn: async (n: string, data?: BookingCheckInRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/check-in`, data || {})).data,
  earlyCheckIn: async (n: string, data?: BookingCheckInRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/early-check-in`, data || {})).data,
  checkInByQrToken: async (token: string, data?: BookingCheckInRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/check-in/qr/${enc(token)}`, data || {})).data,
  checkOut: async (n: string, data?: BookingCheckInRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/check-out`, data || {})).data,
  checkInParticipant: async (n: string, participantId: number | string): Promise<BookingParticipant> =>
    (await apiClient.patch(`${B}/${enc(n)}/participants/${enc(String(participantId))}/check-in`)).data,

  selfCheckIn: async (data: PublicSelfCheckInRequest): Promise<PublicCheckInResponse> => {
    const params = new URLSearchParams();
    params.append("token", data.token);
    if (data.lat !== undefined) params.append("lat", String(data.lat));
    if (data.lng !== undefined) params.append("lng", String(data.lng));
    return (
      await apiClient.post("/sni/api/v1/public/bookings/check-in/self", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    ).data;
  },

  scannerVerify: async (data: ScannerVerifyRequest): Promise<PublicCheckInResponse> =>
    (await apiClient.post("/sni/api/v1/public/bookings/check-in/scanner-verify", data)).data,

  // ── Modifications ──
  transferBooking: async (n: string, data: TransferBookingRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/transfer`, data)).data,
  rescheduleBooking: async (n: string, data: RescheduleBookingRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/reschedule`, data)).data,
  changeBookingResource: async (n: string, data: ChangeResourceRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/change-resource`, data)).data,
  previewReschedule: async (n: string, newStartedAt: string, newEndedAt: string): Promise<BookingChangePreview> =>
    (await apiClient.get(`${B}/${enc(n)}/reschedule/preview`, { params: { newStartedAt, newEndedAt } })).data,
  previewChangeResource: async (n: string, newResourceCode: string): Promise<BookingChangePreview> =>
    (await apiClient.get(`${B}/${enc(n)}/change-resource/preview`, { params: { newResourceCode } })).data,
  extendBooking: async (n: string, minutes: number, acceptPriceChange?: boolean): Promise<BookingResponse> =>
    (await apiClient.post(`${B}/${enc(n)}/extend`, { minutes, acceptPriceChange })).data,
  adjustPrice: async (n: string, data: PriceAdjustmentRequest): Promise<BookingResponse> =>
    (await apiClient.post(`${B}/${enc(n)}/price-adjustment`, data)).data,
  updateDetails: async (n: string, data: BookingDetailsRequest): Promise<BookingResponse> =>
    (await apiClient.patch(`${B}/${enc(n)}/details`, data)).data,
  queueReminder: async (n: string, minutesBefore = 30): Promise<number> =>
    (await apiClient.post(`${B}/${enc(n)}/notifications/reminder`, null, { params: { minutesBefore } })).data,

  // ── Historique ──
  getBookingHistory: async (n: string): Promise<BookingHistory[]> =>
    asList<BookingHistory>((await apiClient.get(`${B}/${enc(n)}/history`)).data),
  getBookingEvents: async (n: string): Promise<BookingEvent[]> =>
    asList<BookingEvent>((await apiClient.get(`${B}/${enc(n)}/events`)).data),

  // ── Participants et invités ──
  addParticipant: async (n: string, data: Omit<BookingParticipant, "id" | "status">): Promise<BookingParticipant> =>
    (await apiClient.post(`${B}/${enc(n)}/participants`, data)).data,
  removeParticipant: async (n: string, participantId: number | string): Promise<BookingParticipant> =>
    (await apiClient.delete(`${B}/${enc(n)}/participants/${enc(String(participantId))}`)).data,
  inviteParticipant: async (n: string, participantId: number | string): Promise<Record<string, number>> =>
    (await apiClient.post(`${B}/${enc(n)}/participants/${enc(String(participantId))}/invite`)).data,
  inviteAllParticipants: async (n: string): Promise<Record<string, number>> =>
    (await apiClient.post(`${B}/${enc(n)}/participants/invite`)).data,

  // ── Suppléments (lot R5c) ──
  getLines: async (n: string): Promise<ExtraLine[]> => asList<ExtraLine>((await apiClient.get(`${B}/${enc(n)}/lines`)).data),
  addService: async (n: string, code: string, quantity = 1): Promise<ExtraLine> =>
    (await apiClient.post(`${B}/${enc(n)}/services`, { code, quantity })).data,
  addAmenity: async (n: string, code: string, quantity = 1): Promise<ExtraLine> =>
    (await apiClient.post(`${B}/${enc(n)}/amenities`, { code, quantity })).data,
  addExtraParticipants: async (n: string, count: number, waive?: boolean): Promise<ExtraLine> =>
    (await apiClient.post(`${B}/${enc(n)}/extra-participants`, { count, waive })).data,
  applyPromoCode: async (n: string, code: string): Promise<ExtraLine> =>
    (await apiClient.post(`${B}/${enc(n)}/promo-code`, { code })).data,
  bookBundle: async (bundleCode: string, data: Omit<CreateBatchRequest, "lines" | "memberIds"> & { memberIds?: string[]; startedAt: string; endedAt: string }): Promise<BatchResponse> =>
    (await apiClient.post(`/sni/api/v1/resource-bundles/${enc(bundleCode)}/book`, data)).data,

  // ── Exploitation (lot R5d) ──
  getUsageRules: async (n: string): Promise<UsageRulesView> => (await apiClient.get(`${B}/${enc(n)}/usage-rules`)).data,
  acceptUsageRules: async (n: string): Promise<UsageRulesView> => (await apiClient.post(`${B}/${enc(n)}/usage-rules/accept`)).data,
  getEndReports: async (n: string): Promise<EndReport[]> => asList<EndReport>((await apiClient.get(`${B}/${enc(n)}/end-report`)).data),
  createEndReport: async (n: string, data: EndReportRequest): Promise<EndReport> =>
    (await apiClient.post(`${B}/${enc(n)}/end-report`, data)).data,

  // ── Lots multi-ressources ──
  createBatch: async (data: CreateBatchRequest): Promise<BatchResponse> => (await apiClient.post(`${B}/batches`, data)).data,
  getBatches: async (params?: { page?: number; size?: number }): Promise<Paged<BatchSummary>> =>
    normalizePage<BatchSummary>((await apiClient.get(`${B}/batches`, { params })).data),
  getBatch: async (batchNumber: string): Promise<BatchResponse> => (await apiClient.get(`${B}/batches/${enc(batchNumber)}`)).data,

  // ── Séries ──
  getSeries: async (groupNumber: string): Promise<BookingResponse[]> =>
    asList<BookingResponse>((await apiClient.get(`${B}/series/${enc(groupNumber)}`)).data),
  cancelSeries: async (groupNumber: string, from?: string, reason?: string): Promise<SeriesOutcome> =>
    (await apiClient.patch(`${B}/series/${enc(groupNumber)}/cancel`, reason ? { reason } : {}, { params: clean({ from }) })).data,
  rescheduleSeries: async (groupNumber: string, data: SeriesRescheduleRequest, from?: string): Promise<SeriesOutcome> =>
    (await apiClient.patch(`${B}/series/${enc(groupNumber)}/reschedule`, data, { params: clean({ from }) })).data,

  // ── Accueil du jour ──
  getPlanning: async (params?: { date?: string; resourceCode?: string }): Promise<DeskPlanning> =>
    (await apiClient.get(`${B}/planning`, { params: clean(params) })).data,

  // ── Liste d'attente ──
  getWaitlist: async (params?: { status?: string; resourceCode?: string; ownerType?: string; ownerCode?: string; page?: number; size?: number }): Promise<Paged<WaitlistEntry>> =>
    normalizePage<WaitlistEntry>((await apiClient.get(`${B}/waitlist`, { params: clean(params) })).data),
  joinWaitlist: async (data: JoinWaitlistRequest): Promise<WaitlistEntry> => (await apiClient.post(`${B}/waitlist`, data)).data,
  acceptWaitlist: async (id: number | string): Promise<WaitlistEntry> => (await apiClient.post(`${B}/waitlist/${enc(String(id))}/accept`)).data,
  declineWaitlist: async (id: number | string): Promise<WaitlistEntry> => (await apiClient.post(`${B}/waitlist/${enc(String(id))}/decline`)).data,
  cancelWaitlist: async (id: number | string): Promise<WaitlistEntry> => (await apiClient.patch(`${B}/waitlist/${enc(String(id))}/cancel`)).data,
  promoteWaitlist: async (limit = 100): Promise<number> => (await apiClient.post(`${B}/waitlist/promote-available`, null, { params: { limit } })).data,
  expireWaitlistOffers: async (limit = 100): Promise<number> => (await apiClient.post(`${B}/waitlist/expire-offers`, null, { params: { limit } })).data,

  // ── Règlement sur place, fiabilité ──
  getPayOnSiteGrants: async (): Promise<PayOnSiteGrant[]> => asList<PayOnSiteGrant>((await apiClient.get(`${B}/pay-on-site/clients`)).data),
  getPayOnSiteAccess: async (ownerType: string, ownerCode: string): Promise<PayOnSiteAccess> =>
    (await apiClient.get(`${B}/pay-on-site/clients/${enc(ownerType)}/${enc(ownerCode)}`)).data,
  setPayOnSite: async (ownerType: string, ownerCode: string, data: { enabled: boolean; reason?: string }): Promise<PayOnSiteGrant> =>
    (await apiClient.put(`${B}/pay-on-site/clients/${enc(ownerType)}/${enc(ownerCode)}`, data)).data,
  getPayOnSiteDue: async (date?: string): Promise<BookingResponse[]> =>
    asList<BookingResponse>((await apiClient.get(`${B}/pay-on-site/due`, { params: clean({ date }) })).data),
  getReliability: async (ownerType: string, ownerCode: string): Promise<ReliabilityScore> =>
    (await apiClient.get(`${B}/pay-on-site/reliability/${enc(ownerType)}/${enc(ownerCode)}`)).data,

  // ── Entreprises ──
  getCompanyTerms: async (businessCode: string): Promise<CompanyTerms> => (await apiClient.get(`${B}/companies/${enc(businessCode)}/terms`)).data,
  saveCompanyTerms: async (businessCode: string, data: { monthlyStatement?: boolean; monthlyBudget?: number | null; monthlyHours?: number | null }): Promise<CompanyTerms> =>
    (await apiClient.put(`${B}/companies/${enc(businessCode)}/terms`, data)).data,
  getCompanyBudgets: async (businessCode: string): Promise<MemberBudget[]> =>
    asList<MemberBudget>((await apiClient.get(`${B}/companies/${enc(businessCode)}/budgets`)).data),
  setMemberBudget: async (businessCode: string, memberId: string, monthlyBudget: number | null): Promise<MemberBudget[]> =>
    asList<MemberBudget>((await apiClient.put(`${B}/companies/${enc(businessCode)}/budgets/${enc(memberId)}`, { monthlyBudget })).data),
  getCompanyUsage: async (businessCode: string, month?: string): Promise<CompanyUsage> =>
    (await apiClient.get(`${B}/companies/${enc(businessCode)}/usage`, { params: clean({ month }) })).data,
  runStatements: async (month?: string): Promise<CompanyStatement[]> =>
    asList<CompanyStatement>((await apiClient.post(`${B}/companies/statements/run`, null, { params: clean({ month }) })).data),

  // ── Politiques d'audience et dérogations ──
  getPolicies: async (params?: { active?: boolean }): Promise<BookingAudiencePolicy[]> =>
    asList<BookingAudiencePolicy>((await apiClient.get(`${B}/policies`, { params: clean(params as Record<string, unknown>) })).data),
  createPolicy: async (data: BookingAudiencePolicy): Promise<BookingAudiencePolicy> => (await apiClient.post(`${B}/policies`, data)).data,
  updatePolicy: async (policyNumber: string, data: Partial<BookingAudiencePolicy>): Promise<BookingAudiencePolicy> =>
    (await apiClient.put(`${B}/policies/${enc(policyNumber)}`, data)).data,
  setPolicyActive: async (policyNumber: string, active: boolean): Promise<BookingAudiencePolicy> =>
    (await apiClient.patch(`${B}/policies/${enc(policyNumber)}/${active ? "activate" : "deactivate"}`)).data,

  getQuotaOverrides: async (params?: { active?: boolean }): Promise<BookingQuotaOverride[]> =>
    asList<BookingQuotaOverride>((await apiClient.get(`${B}/quota-overrides`, { params: clean(params as Record<string, unknown>) })).data),
  createQuotaOverride: async (data: OwnerFields & UpdateQuotaOverrideRequest & { approvedBy?: string }): Promise<BookingQuotaOverride> =>
    (await apiClient.post(`${B}/quota-overrides`, data)).data,
  updateQuotaOverride: async (overrideNumber: string, data: UpdateQuotaOverrideRequest): Promise<BookingQuotaOverride> =>
    (await apiClient.put(`${B}/quota-overrides/${enc(overrideNumber)}`, data)).data,
  setQuotaOverrideActive: async (overrideNumber: string, active: boolean): Promise<BookingQuotaOverride> =>
    (await apiClient.patch(`${B}/quota-overrides/${enc(overrideNumber)}/${active ? "activate" : "deactivate"}`)).data,

  // ── Indicateurs, avis, rapport ──
  getMetrics: async (): Promise<BookingMetrics> => (await apiClient.get(`${B}/metrics/overview`)).data,
  getDashboard: async (params?: { from?: string; to?: string }): Promise<InsightsDashboard> =>
    (await apiClient.get(`${B}/dashboard`, { params: clean(params) })).data,
  getReviews: async (params?: { from?: string; to?: string; resourceCode?: string }): Promise<ReviewLine[]> =>
    asList<ReviewLine>((await apiClient.get(`${B}/reviews`, { params: clean(params) })).data),
  getClientReportPdf: async (params: { ownerType: string; ownerCode: string; from?: string; to?: string }): Promise<Blob> =>
    (await apiClient.get(`${B}/client-report.pdf`, { params: clean(params), responseType: "blob" })).data,

  // ── Référentiels ──
  getReference: async (): Promise<BookingReference> => {
    const d = (await apiClient.get(`${B}/reference`)).data;
    return { enums: d?.enums ?? [], lists: d?.lists ?? {}, cancellationPolicy: d?.cancellationPolicy ?? [] };
  },
  lookupOwners: async (params: { q?: string; types?: string; page?: number; size?: number }): Promise<Paged<LookupItem>> =>
    normalizePage<LookupItem>((await apiClient.get(`${B}/lookup/owners`, { params: clean(params) })).data),
  getCancellationPolicy: async (): Promise<BookingCancellationPolicyRule[]> => asList<BookingCancellationPolicyRule>((await apiClient.get(`${B}/cancellation-policy`)).data),

  // ── Déclenchements manuels ──
  dispatchDueNotifications: async (limit = 100): Promise<number> =>
    (await apiClient.post(`${B}/notifications/dispatch-due`, null, { params: { limit } })).data,
  repair: async (limit = 100): Promise<{ inspected: number; repaired: number; failed: number }> =>
    (await apiClient.post(`${B}/repair`, null, { params: { limit } })).data,

  // ── Pilotage des ressources (module booking) ──
  getMargins: async (params?: { from?: string; to?: string; resourceCode?: string }): Promise<MarginReport> =>
    (await apiClient.get("/sni/api/v1/resource-analytics/margins", { params: clean(params) })).data,
  getBookingMargin: async (n: string): Promise<BookingMargin> => (await apiClient.get(`/sni/api/v1/resource-analytics/bookings/${enc(n)}/margin`)).data,
  getOccupancy: async (params?: { from?: string; to?: string; groupBy?: string; siteCode?: string }): Promise<OccupancyReport> =>
    (await apiClient.get("/sni/api/v1/resource-analytics/occupancy", { params: clean(params) })).data,
  getResourceCosts: async (code: string): Promise<ResourceCost[]> => asList<ResourceCost>((await apiClient.get(`/sni/api/v1/resources/${enc(code)}/costs`)).data),
  addResourceCost: async (code: string, data: ResourceCostRequest): Promise<ResourceCost> => (await apiClient.post(`/sni/api/v1/resources/${enc(code)}/costs`, data)).data,
  deleteResourceCost: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/resource-costs/${enc(String(id))}`);
  },
  getPriceHistory: async (code: string, params?: { from?: string; to?: string }): Promise<AppliedPrice[]> =>
    asList<AppliedPrice>((await apiClient.get(`/sni/api/v1/resources/${enc(code)}/price-history`, { params: clean(params) })).data),
};
