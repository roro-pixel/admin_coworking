import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageResult } from "./pagination";
import type { CashSessionStatus, PaymentMethod } from "./payment.service";

/**
 * Caisses : administration d'une caisse, cycle de vie d'une session (comptage par coupures, remises, écarts),
 * transferts, personnel, scellés, statistiques, position et documents.
 * Les acteurs (caissier, approbateur, témoin…) viennent du jeton : jamais envoyés, sauf les adresses de personnes
 * désignées (remplaçant, témoin, second compteur).
 * Les routes d'écriture ne déclarent pas d'Idempotency-Key : désactiver le bouton pendant l'envoi.
 */

const CR = `${API}/cash-registers`;
const enc = encodeURIComponent;

// ═══ Enums ═══════════════════════════════════════════════════════════════════

export type CashRegisterType = "COUNTER" | "MAIN" | "PETTY_CASH" | "SAFE" | "AUTOMATIC";
export type CashRegisterStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type CashCapBehavior = "ALERT" | "BLOCK";
export type CashAssignmentRole = "CASHIER" | "HEAD_CASHIER" | "SUPERVISOR" | "VIEWER";
export type CashAssignmentQuality = "HOLDER" | "BACKUP" | "INTERIM";
export type CashDeviceStatus = "PROPOSED" | "ALLOWED" | "REFUSED";
export type CashResponsibilityStatus = "PENDING_SIGNATURES" | "SIGNED" | "CANCELLED";
export type CashDenominationKind = "BILL" | "COIN";
export type CashCountMoment =
  | "OPENING" | "CLOSING" | "RECOUNT" | "HANDOVER" | "SPOT_CHECK" | "TRANSFER_RECEIPT"
  | "PERIODIC" | "RESPONSIBILITY_TRANSFER" | "FORCED_CLOSE" | "SEAL" | "UNSEAL";
export type CashVarianceDecision = "EXPENSE" | "INCOME" | "CASHIER" | "INVESTIGATION" | "TOLERATED";
export type CashVarianceKind =
  | "OPENING" | "CLOSING" | "SPOT_CHECK" | "HANDOVER" | "FORCED_CLOSE" | "UNSEAL" | "TRANSFER" | "RESPONSIBILITY_TRANSFER";
export type CashVarianceStatus = "PENDING" | "DECIDED" | "TOLERATED";
export type CashHandoverStatus = "PENDING" | "ACCEPTED" | "DISPUTED" | "CANCELLED";
export type CashTransferKind = "FEED" | "REMITTANCE" | "SAFE_DEPOSIT" | "SAFE_WITHDRAWAL" | "PETTY_REFILL" | "OTHER";
export type CashTransferStatus = "IN_TRANSIT" | "RECEIVED" | "DISPUTED" | "CANCELLED";
export type CashNatureFamily =
  | "ENCAISSEMENTS" | "ACHATS" | "DEPLACEMENTS" | "AVANCES" | "REMISES" | "TRANSFERTS" | "REMBOURSEMENTS" | "DIVERS";
export type CashFlowDirection = "IN" | "OUT" | "ADJUSTMENT";
export type CashAbsenceStatus = "PLANNED" | "APPROVED" | "ACTIVE" | "ENDED" | "CANCELLED";
export type CashNoReplacementPolicy = "REMIT_TO_PARENT" | "SEAL" | "SIMPLE_SUSPENSION";

// ═══ Registre : administration ═══════════════════════════════════════════════

/** Heure de la semaine : dayOfWeek 1 (lundi) à 7 (dimanche). Format LocalTime à confirmer : envoyé « HH:mm:ss », lu en texte ou en objet. */
export type CashLocalTime = string | { hour: number; minute: number; second?: number; nano?: number };

export interface CashSchedule {
  dayOfWeek: number;
  opensAt: CashLocalTime;
  closesAt: CashLocalTime;
}

export interface CashAssignment {
  id: string;
  registerCode: string;
  userEmail: string;
  role: CashAssignmentRole;
  quality: CashAssignmentQuality;
  backupRank?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  emergency?: boolean;
  source?: string | null;
  sourceReference?: string | null;
  grantedBy?: string | null;
  note?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  effectiveNow?: boolean;
}

export interface CashDevice {
  deviceCode: string;
  label?: string | null;
  status: CashDeviceStatus;
  firstSeenAt?: string | null;
  firstSeenBy?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
}

export interface CashRegisterDetail {
  registerCode: string;
  name: string;
  registerType: CashRegisterType;
  status: CashRegisterStatus;
  statusReason?: string | null;
  locationCode?: string | null;
  businessEntityCode?: string | null;
  deviceCode?: string | null;
  parentRegisterCode?: string | null;
  systemManaged: boolean;
  restrictedToMethod?: PaymentMethod | null;
  acceptedMethods?: string[];
  acceptedCurrencies?: string[];
  cashControlEnabled: boolean;
  maxCashAmount?: number | null;
  capBehavior?: CashCapBehavior | null;
  maxOutPerOperation?: number | null;
  maxOutPerDay?: number | null;
  standardFloat?: number | null;
  alertRecipients?: string[];
  treasuryAccountNumber?: string | null;
  defaultJournalCode?: string | null;
  lastCountAt?: string | null;
  lastCountAmount?: number | null;
  currentHolder?: string | null;
  assignments?: CashAssignment[];
  schedules?: CashSchedule[];
  devices?: CashDevice[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
  closedAt?: string | null;
}

export interface CashRegisterListItem {
  registerCode: string;
  name: string;
  registerType?: CashRegisterType;
  status?: CashRegisterStatus;
  locationCode?: string;
  businessEntityCode?: string;
  deviceCode?: string;
  active: boolean;
  cashControlEnabled: boolean;
  systemManaged: boolean;
  restrictedToMethod?: PaymentMethod | null;
  maxCashAmount?: number | null;
  managerEmail?: string | null;
  parentRegisterCode?: string | null;
  lastCountAt?: string | null;
  lastCountAmount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCashRegisterRequest {
  name: string;
  locationCode?: string;
  businessEntityCode?: string;
  deviceCode?: string;
  cashControlEnabled?: boolean;
  maxCashAmount?: number;
  managerEmail?: string;
  registerType?: CashRegisterType;
  parentRegisterCode?: string;
  acceptedMethods?: PaymentMethod[];
  acceptedCurrencies?: string[];
  capBehavior?: CashCapBehavior;
  maxOutPerOperation?: number;
  maxOutPerDay?: number;
  standardFloat?: number;
  alertRecipients?: string[];
  holderEmail?: string;
  backupEmails?: string[];
  schedules?: CashSchedule[];
}

export interface UpdateCashRegisterRequest {
  name?: string;
  locationCode?: string;
  businessEntityCode?: string;
  parentRegisterCode?: string;
  cashControlEnabled?: boolean;
  maxCashAmount?: number;
  acceptedMethods?: PaymentMethod[];
  acceptedCurrencies?: string[];
  capBehavior?: CashCapBehavior;
  maxOutPerOperation?: number;
  maxOutPerDay?: number;
  standardFloat?: number;
  alertRecipients?: string[];
  treasuryAccountNumber?: string;
  defaultJournalCode?: string;
  schedules?: CashSchedule[];
  /** Date d'effet du changement. */
  effectiveAt?: string;
  reason?: string;
}

export interface CashRegisterStatusRequest {
  reasonCode?: string;
  reasonText?: string;
}

export interface CashAssignmentRequest {
  userEmail: string;
  role: CashAssignmentRole;
  quality: CashAssignmentQuality;
  backupRank?: number;
  validFrom?: string;
  validTo?: string;
  note?: string;
}

export interface CashRegisterHistoryEntry {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  changedAt: string;
  effectiveAt?: string | null;
  reason?: string | null;
}

export interface CashPendingItem {
  kind: string;
  reference?: string;
  label?: string;
  amount?: number | null;
  blocking: boolean;
  fate?: string | null;
}

export interface CashResponsibilityTransfer {
  transferNumber: string;
  registerCode: string;
  fromUser?: string;
  toUser?: string;
  reasonCode?: string;
  reasonLabel?: string;
  reasonText?: string | null;
  permanent: boolean;
  effectiveAt?: string | null;
  endsAt?: string | null;
  expectedAmount?: number | null;
  countedAmount?: number | null;
  difference?: number | null;
  witness?: string | null;
  pendingItems?: CashPendingItem[];
  status: CashResponsibilityStatus;
  outgoingSignedBy?: string | null;
  outgoingSignedAt?: string | null;
  incomingSignedBy?: string | null;
  incomingSignedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

export interface CreateResponsibilityTransferRequest {
  toUserEmail: string;
  reasonCode: string;
  reasonText?: string;
  permanent: boolean;
  effectiveAt?: string;
  endsAt?: string;
  countedAmount?: number;
  witnessEmail?: string;
  outgoingAbsent?: boolean;
  keepFormerAsBackup?: boolean;
}

export interface CashReferenceValue {
  listCode: string;
  code: string;
  label: string;
  sortOrder?: number;
  active: boolean;
  requiresText?: boolean;
  systemValue?: boolean;
  usageCount?: number | string;
}

export interface CashReferenceValueRequest {
  code: string;
  label: string;
  sortOrder?: number;
  active?: boolean;
  requiresText?: boolean;
}

export interface CashFormDefaults {
  context: string;
  values: Record<string, unknown>;
  origins: Record<string, string>;
  choices: Record<string, { code: string; label: string }[]>;
  warnings: string[];
}

// ═══ Session : comptage et cycle de vie ══════════════════════════════════════

export interface CashDenomination {
  currency: string;
  value: number;
  kind: CashDenominationKind;
  label: string;
  sortOrder?: number;
  activeFrom?: string | null;
  activeTo?: string | null;
  active: boolean;
}

export interface CashDenominationRequest {
  value: number;
  kind: CashDenominationKind;
  label: string;
  sortOrder?: number;
  activeFrom?: string;
  activeTo?: string;
}

export interface CashCountLine {
  value: number;
  kind: CashDenominationKind;
  quantity: number;
  damagedQuantity?: number;
}

export interface CashCountRequest {
  currency?: string;
  lines?: CashCountLine[];
  /** Montant global quand l'ouverture ou le comptage se fait sans détail par coupure. */
  totalAmount?: number;
  secondCounterEmail?: string;
  witnessEmail?: string;
  keptFloat?: number;
  varianceReasonCode?: string;
  varianceReasonText?: string;
  note?: string;
}

export interface CashCount {
  countNumber: string;
  registerCode: string;
  sessionNumber?: string | null;
  moment: CashCountMoment;
  currency: string;
  total: number;
  damagedTotal?: number | null;
  withLines: boolean;
  expectedAmount?: number | null;
  variance?: number | null;
  countedBy?: string | null;
  secondCounter?: string | null;
  witness?: string | null;
  status?: string;
  supersededBy?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  createdAt?: string;
  lines?: (CashCountLine & { amount: number })[];
}

export interface CashVarianceReview {
  reviewNumber: string;
  registerCode: string;
  sessionNumber?: string | null;
  kind: CashVarianceKind;
  amount: number;
  countNumber?: string | null;
  cashier?: string | null;
  reason?: string | null;
  status: CashVarianceStatus;
  decision?: CashVarianceDecision | null;
  proposedDecision?: CashVarianceDecision | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  contestDeadline?: string | null;
  contestedAt?: string | null;
  contestReason?: string | null;
  reviewDueAt?: string | null;
  decidableNow: boolean;
  createdAt?: string;
}

export interface CashSessionFull {
  sessionNumber: string;
  registerCode: string;
  status: CashSessionStatus;
  openedBy?: string;
  closedBy?: string | null;
  reviewedBy?: string | null;
  openingAmount?: number | null;
  closingAmount?: number | null;
  expectedClosingAmount?: number | null;
  countedClosingAmount?: number | null;
  varianceAmount?: number | null;
  varianceReason?: string | null;
  openedAt?: string;
  closingRequestedAt?: string | null;
  closedAt?: string | null;
  expectedOpeningAmount?: number | null;
  openingVariance?: number | null;
  openingVarianceReason?: string | null;
  pausedAt?: string | null;
  pauseSeconds?: number | string | null;
  suspendedBy?: string | null;
  suspensionReason?: string | null;
  keptFloat?: number | null;
  amountToRemit?: number | null;
  closingCountNumber?: string | null;
  varianceDecision?: CashVarianceDecision | null;
  varianceDecidedBy?: string | null;
  forcedClose?: boolean;
  handoverNumber?: string | null;
  outOfHoursReason?: string | null;
  /** Clôture à l'aveugle : le solde attendu est masqué à qui n'a pas CASH_VARIANCE:DECIDE. */
  expectedHidden?: boolean;
}

/** Réponse de chaque étape du cycle : la session, plus le comptage ou la revue d'écart créés, et des messages à afficher. */
/** Synthèse d'une session : champs de la session et totaux (certains absents selon la clôture). */
export interface CashSessionSummary extends Partial<CashSessionFull> {
  sessionNumber: string;
  registerCode: string;
  status: CashSessionStatus;
  totalPayments?: number | null;
  totalRefunds?: number | null;
  totalCashIn?: number | null;
  totalCashOut?: number | null;
  totalAdjustments?: number | null;
}

export interface CashSessionStep {
  session: CashSessionFull;
  count?: CashCount | null;
  review?: CashVarianceReview | null;
  messages?: string[];
}

export interface OpenCashSessionRequest {
  registerCode: string;
  openingAmount?: number;
  deviceCode?: string;
  outOfHoursReasonCode?: string;
  outOfHoursReasonText?: string;
  openingCount?: CashCountRequest;
}

export interface CashReasonRequest {
  reasonCode?: string;
  reasonText?: string;
  note?: string;
}

export interface CashVarianceDecisionRequest {
  decision: CashVarianceDecision;
  note?: string;
  reviewDueAt?: string;
}

export interface CashHandover {
  handoverNumber: string;
  registerCode: string;
  fromSession?: string;
  toSession?: string | null;
  outgoing?: string;
  incoming?: string;
  outgoingCount?: string;
  incomingCount?: string | null;
  outgoingAmount?: number | null;
  incomingAmount?: number | null;
  status: CashHandoverStatus;
  disputeReason?: string | null;
  outgoingSignedAt?: string | null;
  incomingSignedAt?: string | null;
  createdAt?: string;
}

export interface CashExpectedOpening {
  registerCode: string;
  expectedAmount?: number | null;
  lastCountAt?: string | null;
  neverCounted: boolean;
  standardFloat?: number | null;
  countLinesRequired: boolean;
  denominations: CashDenomination[];
}

// Suivi d'une session
export interface CashSessionIndicators {
  sessionNumber: string;
  status: string;
  expectedBalance?: number | null;
  expectedHidden?: boolean;
  paymentCount: number;
  customersServed: number;
  paymentTotal: number;
  averageTicket?: number | null;
  refundCount: number;
  refundTotal: number;
  movementCount: number;
  lastMovementAt?: string | null;
  activeMinutes: number;
  pauseMinutes: number;
  detentionCap?: number | null;
  detentionRemaining?: number | null;
  openAnomalies: number;
}

export interface CashSessionPaymentLine {
  transactionNumber: string;
  paymentMethod: string;
  status: string;
  amount: number;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  receivedBy?: string | null;
  at?: string;
  customerType?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  sourceType?: string | null;
  sourceCode?: string | null;
  sourceLabel?: string | null;
  receiptNumber?: string | null;
  refund: boolean;
}

export interface CashSessionPayments {
  sessionNumber: string;
  lines: CashSessionPaymentLine[];
  byMethod: { paymentMethod: string; count: number; amount: number }[];
  byHour: { hour: number; count: number; amount: number }[];
  paymentCount: number;
  paymentTotal: number;
  refundCount: number;
  refundTotal: number;
}

export interface CashTimelineEvent {
  at: string;
  kind: string;
  label: string;
  actor?: string | null;
  amount?: number | null;
  reference?: string | null;
}

export interface CashReassignedPayment {
  transactionNumber: string;
  fromSession: string;
  toSession: string;
  amount: number;
  exitMovementNumber?: string;
  entryMovementNumber?: string;
}

// ═══ Opérations : natures, transferts, échanges ══════════════════════════════

export interface CashNature {
  code: string;
  label: string;
  family: CashNatureFamily;
  direction: CashFlowDirection;
  movementType?: string;
  accountNumber?: string | null;
  vatCode?: string | null;
  documentRequired?: boolean;
  justificationDays?: number | null;
  defaultSection?: string | null;
  maxPerOperation?: number | null;
  priorRequestRequired?: boolean;
  doubleVisaThreshold?: number | null;
  keywords?: string | null;
  sortOrder?: number;
  usageCount?: number | string;
  active: boolean;
  systemValue?: boolean;
}

export interface CashNatureRequest {
  code: string;
  label: string;
  family: CashNatureFamily;
  direction: CashFlowDirection;
  movementType?: string;
  accountNumber?: string;
  vatCode?: string;
  documentRequired?: boolean;
  justificationDays?: number;
  defaultSection?: string;
  maxPerOperation?: number;
  priorRequestRequired?: boolean;
  doubleVisaThreshold?: number;
  keywords?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface CashTransfer {
  transferNumber: string;
  kind: CashTransferKind;
  fromRegister: string;
  toRegister?: string | null;
  currency?: string;
  sentAmount?: number | null;
  receivedAmount?: number | null;
  difference?: number | null;
  status: CashTransferStatus;
  carrier?: string | null;
  sentBy?: string | null;
  sentAt?: string;
  fromSession?: string | null;
  outMovement?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | null;
  toSession?: string | null;
  inMovement?: string | null;
  reviewNumber?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  minutesInTransit?: number | string | null;
  note?: string | null;
}

export interface CashTransferRequest {
  fromRegisterCode: string;
  toRegisterCode?: string;
  amount?: number;
  count?: CashCountRequest;
  carrierEmail?: string;
  note?: string;
}

export interface CashPettyRefill {
  registerCode: string;
  parentRegisterCode?: string | null;
  amount: number;
  since?: string | null;
  expenseCount: number;
  standardFloat?: number | null;
}

export interface CashExchangeRequest {
  given: CashCountLine[];
  received: CashCountLine[];
  note?: string;
}

// ═══ Personnel : absences, délégations, scellés ══════════════════════════════

export interface CashAbsence {
  absenceNumber: string;
  userEmail: string;
  kindCode: string;
  kindLabel?: string;
  reason?: string | null;
  startsOn: string;
  endsOn?: string | null;
  replacementUser?: string | null;
  registerCodes?: string[];
  noReplacementPolicy?: CashNoReplacementPolicy | null;
  status: CashAbsenceStatus;
  unplanned?: boolean;
  declaredBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  forced?: boolean;
  forcedNote?: string | null;
  warnings?: string[];
}

export interface CashAbsenceRequest {
  /** Facultatif : sans lui, l'absence est celle de l'utilisateur connecté. */
  userEmail?: string;
  kindCode: string;
  reasonText?: string;
  startsOn: string;
  endsOn?: string;
  replacementEmail?: string;
  noReplacementPolicy?: CashNoReplacementPolicy;
  unplanned?: boolean;
  force?: boolean;
  forceNote?: string;
}

export interface CashReplacementSuggestion {
  userEmail: string;
  origin: string;
  rank: number;
  registerCode: string;
}

export interface CashDelegation {
  id: string;
  delegator: string;
  delegate: string;
  permissions: string[];
  startsOn: string;
  endsOn: string;
  note?: string | null;
  activeNow: boolean;
  cancelledAt?: string | null;
}

export interface CashDelegationRequest {
  delegateEmail: string;
  permissions: string[];
  startsOn: string;
  endsOn: string;
  note?: string;
}

export interface CashSeal {
  sealNumber: string;
  registerCode: string;
  envelopeNumber?: string | null;
  amount?: number | null;
  countNumber?: string | null;
  sealedBy?: string | null;
  witness?: string | null;
  depositedIn?: string | null;
  sealedAt?: string;
  unsealedAt?: string | null;
  unsealedBy?: string | null;
  unsealWitness?: string | null;
  unsealCount?: string | null;
  unsealAmount?: number | null;
  difference?: number | null;
  absenceNumber?: string | null;
}

export interface CashSealRequest {
  envelopeNumber?: string;
  depositedIn?: string;
  witnessEmail: string;
  count: CashCountRequest;
  absenceNumber?: string;
}

// ═══ Position, rapports, comptabilité ════════════════════════════════════════

export interface CashRegisterPosition {
  registerCode: string;
  name: string;
  registerType?: string;
  status?: string;
  locationCode?: string;
  sessionNumber?: string | null;
  sessionStatus?: string | null;
  cashier?: string | null;
  expectedBalance?: number | null;
  expectedHidden?: boolean;
  lastCountAmount?: number | null;
  lastCountAt?: string | null;
  daysSinceCount?: number | string | null;
  maxCashAmount?: number | null;
  occupancyPercent?: number | null;
  transfersInCount?: number;
  transfersInAmount?: number | null;
  transfersOutCount?: number;
  transfersOutAmount?: number | null;
  pendingReviews?: number;
  pendingVisas?: number;
  lastSpotCheckAt?: string | null;
  spotCheckOverdue?: boolean;
  alerts?: string[];
}

export interface CashSiteTotal {
  locationCode?: string;
  registers?: number;
  openSessions?: number;
  expectedBalance?: number | null;
  lastCountTotal?: number | null;
  inTransit?: number | null;
  pendingReviews?: number;
  alerts?: number;
}

export interface CashPosition {
  generatedAt: string;
  registers: CashRegisterPosition[];
  sites: CashSiteTotal[];
  total: CashSiteTotal;
}

// ═══ Service ═════════════════════════════════════════════════════════════════

export const cashRegisterService = {
  // ── Caisses : lecture et administration ────────────────────────────────────
  /** Caisses auxquelles l'utilisateur connecté est affecté. */
  getMyRegisters: async (): Promise<CashRegisterDetail[]> =>
    toList<CashRegisterDetail>((await apiClient.get(`${CR}/mine`)).data),

  getRegisterDetail: async (registerCode: string): Promise<CashRegisterDetail> =>
    (await apiClient.get(`${CR}/${enc(registerCode)}`)).data,

  listRegisters: async (params?: {
    active?: boolean;
    locationCode?: string;
    businessEntityCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
  }): Promise<PageResult<CashRegisterListItem>> =>
    toPage<CashRegisterListItem>((await apiClient.get(CR, { params })).data, params?.size),

  createRegister: async (data: CreateCashRegisterRequest): Promise<CashRegisterListItem> =>
    (await apiClient.post(CR, data)).data,

  updateRegister: async (registerCode: string, data: UpdateCashRegisterRequest): Promise<CashRegisterDetail> =>
    (await apiClient.patch(`${CR}/${enc(registerCode)}`, data)).data,

  /** Suspendre, clore ou réactiver une caisse (CASH_REGISTER:MANAGE). La clôture est refusée si une session est en cours. */
  suspendRegister: async (registerCode: string, data?: CashRegisterStatusRequest): Promise<CashRegisterDetail> =>
    (await apiClient.patch(`${CR}/${enc(registerCode)}/suspend`, data)).data,
  closeRegister: async (registerCode: string, data?: CashRegisterStatusRequest): Promise<CashRegisterDetail> =>
    (await apiClient.patch(`${CR}/${enc(registerCode)}/close`, data)).data,
  reactivateRegister: async (registerCode: string): Promise<CashRegisterDetail> =>
    (await apiClient.patch(`${CR}/${enc(registerCode)}/reactivate`)).data,

  getRegisterHistory: async (registerCode: string): Promise<CashRegisterHistoryEntry[]> =>
    toList<CashRegisterHistoryEntry>((await apiClient.get(`${CR}/${enc(registerCode)}/history`)).data),

  decideDevice: async (registerCode: string, deviceCode: string, data: { status: CashDeviceStatus; label?: string }): Promise<CashRegisterDetail> =>
    (await apiClient.patch(`${CR}/${enc(registerCode)}/devices/${enc(deviceCode)}`, data)).data,

  // Affectations (CASH_STAFF:MANAGE)
  getAssignments: async (registerCode: string, includeEnded = false): Promise<CashAssignment[]> =>
    toList<CashAssignment>((await apiClient.get(`${CR}/${enc(registerCode)}/assignments`, { params: { includeEnded } })).data),

  /** Remplace l'ensemble des affectations de la caisse. */
  replaceAssignments: async (registerCode: string, data: CashAssignmentRequest[]): Promise<CashAssignment[]> =>
    toList<CashAssignment>((await apiClient.put(`${CR}/${enc(registerCode)}/assignments`, data)).data),

  createEmergencyAssignment: async (registerCode: string, data: { userEmail: string; hours?: number; reason: string }): Promise<CashAssignment> =>
    (await apiClient.post(`${CR}/${enc(registerCode)}/emergency-assignments`, data)).data,

  // Passation de responsabilité
  getResponsibilityTransfers: async (registerCode: string): Promise<CashResponsibilityTransfer[]> =>
    toList<CashResponsibilityTransfer>((await apiClient.get(`${CR}/${enc(registerCode)}/responsibility-transfers`)).data),
  getPendingItems: async (registerCode: string): Promise<CashPendingItem[]> =>
    toList<CashPendingItem>((await apiClient.get(`${CR}/${enc(registerCode)}/responsibility-transfers/pending-items`)).data),
  createResponsibilityTransfer: async (registerCode: string, data: CreateResponsibilityTransferRequest): Promise<CashResponsibilityTransfer> =>
    (await apiClient.post(`${CR}/${enc(registerCode)}/responsibility-transfers`, data)).data,
  /** Signature du sortant ou de l'entrant : le serveur reconnaît l'utilisateur connecté (CASH_SESSION:OPEN). */
  signResponsibilityTransfer: async (transferNumber: string): Promise<CashResponsibilityTransfer> =>
    (await apiClient.patch(`${CR}/responsibility-transfers/${enc(transferNumber)}/sign`)).data,

  // Listes de référence (motifs, etc.)
  getReferenceLists: async (includeInactive = false): Promise<Record<string, CashReferenceValue[]>> =>
    (await apiClient.get(`${CR}/reference-lists`, { params: { includeInactive } })).data ?? {},
  getReferenceList: async (listCode: string, includeInactive = false): Promise<CashReferenceValue[]> =>
    toList<CashReferenceValue>((await apiClient.get(`${CR}/reference-lists/${enc(listCode)}`, { params: { includeInactive } })).data),
  /** Remplace toute la liste (CASH_REGISTER:MANAGE). */
  replaceReferenceList: async (listCode: string, data: CashReferenceValueRequest[]): Promise<CashReferenceValue[]> =>
    toList<CashReferenceValue>((await apiClient.put(`${CR}/reference-lists/${enc(listCode)}`, data)).data),

  /** Valeurs proposées par défaut dans un formulaire. Contexte et paramètres : à confirmer avec le backend. */
  getFormDefaults: async (context: string, parameters: Record<string, string> = {}): Promise<CashFormDefaults> =>
    (await apiClient.get(`${CR}/form-defaults`, { params: { context, parameters } })).data,

  // ── Session : ouverture, comptage, clôture ─────────────────────────────────
  getExpectedOpening: async (registerCode: string): Promise<CashExpectedOpening> =>
    (await apiClient.get(`${CR}/${enc(registerCode)}/expected-opening`)).data,

  getDenominations: async (currency = "XAF", includeRetired = false): Promise<CashDenomination[]> =>
    toList<CashDenomination>((await apiClient.get(`${CR}/denominations`, { params: { currency, includeRetired } })).data),
  replaceDenominations: async (currency: string, data: CashDenominationRequest[]): Promise<CashDenomination[]> =>
    toList<CashDenomination>((await apiClient.put(`${CR}/denominations/${enc(currency)}`, data)).data),

  openSession: async (data: OpenCashSessionRequest): Promise<CashSessionFull> =>
    (await apiClient.post(`${CR}/sessions`, data)).data,

  pauseSession: async (n: string): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/pause`)).data,
  /** Reprise : le mot de passe est redemandé. */
  resumeSession: async (n: string, password?: string): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/resume`, { password })).data,
  suspendSession: async (n: string, data: CashReasonRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/suspend`, data)).data,
  unsuspendSession: async (n: string): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/unsuspend`)).data,
  /** Annulation d'une session ouverte par erreur, sans opération. */
  cancelSession: async (n: string, data: CashReasonRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/cancel`, data)).data,
  /** Le responsable confirme l'ouverture (session OPENING). */
  confirmOpening: async (n: string, data?: CashReasonRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/confirm-opening`, data)).data,
  contestOpening: async (n: string, data: CashReasonRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/contest`, data)).data,
  startClosing: async (n: string): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/start-closing`)).data,
  submitCount: async (n: string, data: CashCountRequest): Promise<CashSessionStep> =>
    (await apiClient.post(`${CR}/sessions/${enc(n)}/counts`, data)).data,
  getCounts: async (n: string): Promise<CashCount[]> =>
    toList<CashCount>((await apiClient.get(`${CR}/sessions/${enc(n)}/counts`)).data),
  spotCheck: async (n: string, data: CashCountRequest): Promise<CashSessionStep> =>
    (await apiClient.post(`${CR}/sessions/${enc(n)}/spot-checks`, data)).data,
  /** Demande de recomptage (CASH_VARIANCE:DECIDE). */
  requestRecount: async (n: string, data: CashReasonRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/recount`, data)).data,
  /** CASH_SESSION:FORCE_CLOSE. */
  forceClose: async (n: string, data: { count: CashCountRequest; reason: CashReasonRequest }): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/force-close`, data)).data,
  decideVariance: async (n: string, data: CashVarianceDecisionRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/variance-decision`, data)).data,

  getVarianceReviews: async (params?: { status?: CashVarianceStatus; registerCode?: string; sessionNumber?: string }): Promise<CashVarianceReview[]> =>
    toList<CashVarianceReview>((await apiClient.get(`${CR}/variance-reviews`, { params })).data),
  decideVarianceReview: async (reviewNumber: string, data: CashVarianceDecisionRequest): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/variance-reviews/${enc(reviewNumber)}/decision`, data)).data,

  // Remise de caisse entre deux caissiers
  createHandover: async (n: string, data: { incomingEmail: string; count: CashCountRequest }): Promise<CashHandover> =>
    (await apiClient.post(`${CR}/sessions/${enc(n)}/handover`, data)).data,
  acceptHandover: async (handoverNumber: string, data: { count?: CashCountRequest; reason?: string; deviceCode?: string }): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/handovers/${enc(handoverNumber)}/accept`, data)).data,
  disputeHandover: async (handoverNumber: string, data: { count?: CashCountRequest; reason?: string; deviceCode?: string }): Promise<CashSessionStep> =>
    (await apiClient.patch(`${CR}/handovers/${enc(handoverNumber)}/dispute`, data)).data,
  cancelHandover: async (handoverNumber: string): Promise<CashHandover> =>
    (await apiClient.patch(`${CR}/handovers/${enc(handoverNumber)}/cancel`)).data,

  /** Lecture d'une session : la route de synthèse (pas de lecture complète documentée). */
  getSessionSummary: async (n: string): Promise<CashSessionSummary> =>
    (await apiClient.get(`${CR}/sessions/${enc(n)}/summary`)).data,

  // Suivi d'une session
  getSessionIndicators: async (n: string): Promise<CashSessionIndicators> =>
    (await apiClient.get(`${CR}/sessions/${enc(n)}/indicators`)).data,
  getSessionPayments: async (n: string, params?: { paymentMethod?: string; receivedBy?: string }): Promise<CashSessionPayments> =>
    (await apiClient.get(`${CR}/sessions/${enc(n)}/payments`, { params })).data,
  getSessionTimeline: async (n: string): Promise<CashTimelineEvent[]> =>
    toList<CashTimelineEvent>((await apiClient.get(`${CR}/sessions/${enc(n)}/timeline`)).data),
  /** Déplace un paiement en espèces saisi dans la mauvaise session (CASH_VARIANCE:DECIDE, motif de 5 caractères minimum). */
  reassignPayment: async (n: string, transactionNumber: string, data: { targetSessionNumber: string; reason: string }): Promise<CashReassignedPayment> =>
    (await apiClient.patch(`${CR}/sessions/${enc(n)}/payments/${enc(transactionNumber)}/reassign`, data)).data,
  sendSessionReport: async (n: string, extraRecipients?: string): Promise<{ sessionNumber: string; recipients: string[] }> =>
    (await apiClient.post(`${CR}/sessions/${enc(n)}/report/send`, extraRecipients ? { extraRecipients } : undefined)).data,

  // ── Opérations : mouvements, natures, transferts ───────────────────────────
  approveMovement: async (movementNumber: string): Promise<unknown> =>
    (await apiClient.patch(`${CR}/movements/${enc(movementNumber)}/approve`)).data,
  cancelMovement: async (movementNumber: string, data: CashReasonRequest): Promise<unknown> =>
    (await apiClient.patch(`${CR}/movements/${enc(movementNumber)}/cancel`, data)).data,
  reverseMovement: async (movementNumber: string, data: CashReasonRequest): Promise<unknown> =>
    (await apiClient.post(`${CR}/movements/${enc(movementNumber)}/reverse`, data)).data,

  getNatures: async (params?: { direction?: CashFlowDirection; family?: CashNatureFamily; search?: string; includeInactive?: boolean }): Promise<CashNature[]> =>
    toList<CashNature>((await apiClient.get(`${CR}/natures`, { params })).data),
  replaceNatures: async (data: CashNatureRequest[]): Promise<CashNature[]> =>
    toList<CashNature>((await apiClient.put(`${CR}/natures`, data)).data),

  createExchange: async (sessionNumber: string, data: CashExchangeRequest): Promise<unknown> =>
    (await apiClient.post(`${CR}/sessions/${enc(sessionNumber)}/exchanges`, data)).data,

  getTransfers: async (params?: { registerCode?: string; status?: CashTransferStatus }): Promise<CashTransfer[]> =>
    toList<CashTransfer>((await apiClient.get(`${CR}/transfers`, { params })).data),
  createTransfer: async (data: CashTransferRequest): Promise<CashTransfer> =>
    (await apiClient.post(`${CR}/transfers`, data)).data,
  cancelTransfer: async (transferNumber: string, data: CashReasonRequest): Promise<CashTransfer> =>
    (await apiClient.patch(`${CR}/transfers/${enc(transferNumber)}/cancel`, data)).data,
  receiveTransfer: async (transferNumber: string, data: { count: CashCountRequest; reason?: string }): Promise<CashTransfer> =>
    (await apiClient.patch(`${CR}/transfers/${enc(transferNumber)}/receive`, data)).data,
  getPettyRefill: async (registerCode: string): Promise<CashPettyRefill> =>
    (await apiClient.get(`${CR}/${enc(registerCode)}/petty-cash/refill`)).data,
  createPettyRefill: async (registerCode: string, carrierEmail?: string): Promise<CashTransfer> =>
    (await apiClient.post(`${CR}/${enc(registerCode)}/petty-cash/refill`, undefined, { params: { carrierEmail } })).data,

  // ── Personnel ──────────────────────────────────────────────────────────────
  getAbsences: async (params?: { userEmail?: string; status?: CashAbsenceStatus }): Promise<CashAbsence[]> =>
    toList<CashAbsence>((await apiClient.get(`${CR}/absences`, { params })).data),
  declareAbsence: async (data: CashAbsenceRequest): Promise<CashAbsence> =>
    (await apiClient.post(`${CR}/absences`, data)).data,
  getReplacementSuggestions: async (params: { registerCode: string; from?: string; to?: string }): Promise<CashReplacementSuggestion[]> =>
    toList<CashReplacementSuggestion>((await apiClient.get(`${CR}/absences/replacement-suggestions`, { params })).data),
  approveAbsence: async (n: string): Promise<CashAbsence> => (await apiClient.patch(`${CR}/absences/${enc(n)}/approve`)).data,
  cancelAbsence: async (n: string): Promise<CashAbsence> => (await apiClient.patch(`${CR}/absences/${enc(n)}/cancel`)).data,
  endAbsence: async (n: string): Promise<CashAbsence> => (await apiClient.patch(`${CR}/absences/${enc(n)}/end`)).data,

  getDelegations: async (): Promise<CashDelegation[]> =>
    toList<CashDelegation>((await apiClient.get(`${CR}/delegations`)).data),
  createDelegation: async (data: CashDelegationRequest): Promise<CashDelegation> =>
    (await apiClient.post(`${CR}/delegations`, data)).data,
  cancelDelegation: async (id: string): Promise<CashDelegation> =>
    (await apiClient.patch(`${CR}/delegations/${enc(id)}/cancel`)).data,

  getSeals: async (registerCode: string): Promise<CashSeal[]> =>
    toList<CashSeal>((await apiClient.get(`${CR}/${enc(registerCode)}/seals`)).data),
  sealRegister: async (registerCode: string, data: CashSealRequest): Promise<CashSeal> =>
    (await apiClient.post(`${CR}/${enc(registerCode)}/seal`, data)).data,
  unsealRegister: async (registerCode: string, data: CashSealRequest): Promise<CashSeal> =>
    (await apiClient.post(`${CR}/${enc(registerCode)}/unseal`, data)).data,

  // ── Position et rapports ───────────────────────────────────────────────────
  getPosition: async (locationCode?: string): Promise<CashPosition> =>
    (await apiClient.get(`${CR}/position`, { params: { locationCode } })).data,
  /** Rapport typé par `kind`. Valeurs de `kind` et de `format` : à confirmer avec le backend. */
  getReport: async (kind: string, params?: { registerCode?: string; from?: string; to?: string; format?: string }): Promise<Blob> =>
    (await apiClient.get(`${CR}/reports/${enc(kind)}`, { params, responseType: "blob" })).data,

  // ── Comptabilité de la caisse (/accounting/cash) ───────────────────────────
  getCashJournals: async (registerCode: string): Promise<CashJournal[]> =>
    toList<CashJournal>((await apiClient.get(`${ACC}/registers/${enc(registerCode)}/journals`)).data),
  createCashJournal: async (registerCode: string, data: CashJournalRequest): Promise<CashJournal> =>
    (await apiClient.post(`${ACC}/registers/${enc(registerCode)}/journals`, data)).data,
  /** Le corps de la mise à jour n'est pas documenté : on renvoie le journal complet. */
  updateCashJournal: async (registerCode: string, journalCode: string, data: Partial<CashJournal>): Promise<CashJournal[]> =>
    toList<CashJournal>((await apiClient.put(`${ACC}/registers/${enc(registerCode)}/journals/${enc(journalCode)}`, data)).data),
  deleteCashJournal: async (registerCode: string, journalCode: string): Promise<CashJournal[]> =>
    toList<CashJournal>((await apiClient.delete(`${ACC}/registers/${enc(registerCode)}/journals/${enc(journalCode)}`)).data),
  getCashReconciliation: async (): Promise<CashRegisterReconciliation[]> =>
    toList<CashRegisterReconciliation>((await apiClient.get(`${ACC}/reconciliation`)).data),
  /** Rejoue la comptabilisation des mouvements non comptabilisés (ACCOUNTING_POSTING:REPLAY). */
  feedCashAccounting: async (): Promise<{ processed?: number; succeeded?: number; failed?: number; errors?: string[] }> =>
    (await apiClient.post(`${ACC}/feed`)).data,
};

// ═══ Comptabilité de la caisse ═══════════════════════════════════════════════

const ACC = `${API}/accounting/cash`;

export type CashJournalType = "SALES" | "PURCHASES" | "CASH" | "BANK" | "MOBILE_MONEY" | "WALLET" | "MISC" | "STOCK" | "OPENING" | "REVERSAL" | "OFF_BALANCE" | "ANALYTIC" | "PAYROLL";

export interface CashJournal {
  code: string;
  label: string;
  type: CashJournalType | string;
  treasuryAccountNumber?: string | null;
  numberingReset?: "YEAR" | "PERIOD" | string;
  autoValidate?: boolean;
  allowedAccounts?: string[];
  cashRegisterCode?: string | null;
  active?: boolean;
}

export interface CashJournalRequest {
  label: string;
  type: CashJournalType | string;
}

export interface CashRegisterReconciliation {
  registerCode: string;
  registerName?: string;
  treasuryAccount?: string;
  journalCode?: string;
  accountingBalance?: number;
  operationalBalance?: number;
  difference?: number;
  operationalSource?: string;
  movementsNotPosted?: number | string;
}

