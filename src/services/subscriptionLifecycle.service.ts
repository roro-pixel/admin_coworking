import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageParams, PageResult } from "./pagination";

// Cycle de vie des abonnements (guichet) : ADMIN, SUPER_ADMIN, STAFF.
// Écritures réservées ADMIN : PUT /policy, DELETE commitment, waive-fee.
// Le gel passe par POST /subscriptions/{n}/pause (subscription.service.ts) ;
// ici, seulement ses conditions et son historique.

const LIFECYCLE = `${API}/subscriptions/lifecycle`;
const TERMINATIONS = `${API}/subscriptions/terminations`;
const QUOTES = `${API}/subscriptions/quotes`;
const enc = encodeURIComponent;

// ═══ Politique ════════════════════════════════════════════════════════════════

export type ProrationPolicy = "DAILY" | "MONTH_STARTED" | "NONE";
export type EarlyTerminationFormula =
  | "NONE"
  | "FIXED_FEE"
  | "PERCENT_OF_REMAINING"
  | "REMAINING_PERIODS";

/** Un seul prorata pour l'entrée, la sortie et le changement de plan. */
export interface LifecyclePolicy {
  prorationPolicy: ProrationPolicy;
  defaultNoticeDays: number;
  earlyTerminationFormula: EarlyTerminationFormula;
  earlyTerminationPercent?: number | null;
  earlyTerminationFixedFee?: number | null;
  freezeMaxPerYear: number;
  freezeMaxDays: number;
  freezeNoticeDays: number;
  freezeFeePercent: number;
  gracePeriodDays: number;
  suspensionAfterGraceDays: number;
  quoteValidityDays: number;
}

// ═══ Engagement ═══════════════════════════════════════════════════════════════

export type CommitmentSource = "PLAN" | "QUOTE" | "MANUAL";

export interface CommitmentView {
  subscriptionNumber: string;
  commitmentMonths: number;
  commitmentStart: string;
  commitmentEnd: string;
  earlyTerminationFormula: EarlyTerminationFormula | string;
  earlyTerminationPercent?: number | null;
  earlyTerminationFixedFee?: number | null;
  autoRenewCommitment: boolean;
  source: CommitmentSource | string;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface CommitmentRequest {
  commitmentMonths: number;
  commitmentStart: string;
  formula: EarlyTerminationFormula;
  percent?: number | null;
  fixedFee?: number | null;
  autoRenewCommitment: boolean;
}

/** À demander avant tout préavis. */
export interface EarlyTerminationQuote {
  early: boolean;
  remainingMonths: number;
  fee: number;
  formula: EarlyTerminationFormula | string;
  commitmentEnd?: string | null;
}

// ═══ Résiliation ══════════════════════════════════════════════════════════════

export type TerminationReasonCategory =
  | "RELOCATION"
  | "COST"
  | "SERVICE_QUALITY"
  | "BUSINESS_CLOSURE"
  | "NO_LONGER_NEEDED"
  | "COMPETITOR"
  | "NON_PAYMENT"
  | "OTHER";

export type TerminationChannel = "STAFF" | "PORTAL" | "LETTER" | "EMAIL";

export type TerminationStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "RETRACTED"
  | "COMPLETED";

export type ExitItemStatus = "PENDING" | "DONE" | "WAIVED";

/**
 * Codes connus : BADGE_RETURN, KEYS_RETURN, BALANCE_DUE (se coche seul),
 * DEPOSIT_SETTLEMENT, TERMINATION_FEE ; pour un domicilié MAIL_PENDING
 * (se coche seul) et DOMICILIATION_END.
 */
export interface ExitItem {
  itemCode: string;
  label: string;
  mandatory: boolean;
  status: ExitItemStatus | string;
  detail?: string | null;
  doneBy?: string | null;
  doneAt?: string | null;
}

export interface TerminationRequest {
  reasonCategory: TerminationReasonCategory;
  reason?: string;
  channel: TerminationChannel;
  requestedEffectiveDate?: string | null;
  noticePeriodDays?: number | null;
}

export interface TerminationPreview {
  subscriptionNumber: string;
  noticePeriodDays: number;
  /** La date d'effet ne peut pas la précéder. */
  earliestEffectiveDate: string;
  effectiveDate: string;
  earlyTermination: boolean;
  commitmentEnd?: string | null;
  remainingCommitmentMonths?: number | null;
  feeAmount: number;
  /** Coût des jours entre la fin de la période payée et la date d'effet. */
  bridgingAmount: number;
  currency: string;
  exitChecklist: string[];
}

export interface TerminationView {
  terminationCode: string;
  subscriptionNumber: string;
  status: TerminationStatus | string;
  reasonCategory?: TerminationReasonCategory | string;
  reason?: string | null;
  channel?: TerminationChannel | string;
  effectiveDate?: string | null;
  feeAmount?: number | null;
  bridgingAmount?: number | null;
  exitItems: ExitItem[];
  /** Une ligne obligatoire PENDING bloque l'achèvement. */
  exitChecklistClear: boolean;
  [key: string]: unknown;
}

// ═══ Devis d'abonnement ═══════════════════════════════════════════════════════
// Distincts des devis de facturation (billing.service.ts).

export type SubscriptionQuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface SubscriptionQuoteRequest {
  subscriberType: string;
  subscriberCode: string;
  planCode: string;
  planVersionId?: string | number | null;
  billingCycle: string;
  /** Prix du catalogue si absent. */
  quotedPrice?: number | null;
  setupFee?: number | null;
  commitmentMonths?: number | null;
  trialDays?: number | null;
  startDate?: string | null;
  /** Politique si absent. */
  validUntil?: string | null;
  notes?: string;
  /** Référence de proposition CRM. */
  proposalNumber?: string;
}

export interface SubscriptionQuoteView {
  quoteNumber: string;
  status: SubscriptionQuoteStatus | string;
  subscriberType?: string;
  subscriberCode?: string;
  planCode?: string;
  billingCycle?: string;
  quotedPrice?: number | null;
  validUntil?: string | null;
  negotiated: boolean;
  convertedSubscriptionNumber?: string | null;
  derivationCode?: string | null;
  [key: string]: unknown;
}

export interface SubscriptionQuoteOutlook {
  quoteNumber: string;
  cataloguePrice: number;
  quotedPrice: number;
  discountPercent: number;
  negotiated: boolean;
  requiresApproval: boolean;
  blockingReason?: string | null;
  commitmentMonths?: number | null;
  validUntil?: string | null;
}

// ═══ Prélèvement automatique ══════════════════════════════════════════════════

export type DebitMandateStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";
export type DebitMandateChannel = "PORTAL" | "SIGNED_FORM" | "EMAIL" | "STAFF";
export type DebitAttemptStatus =
  | "SUCCEEDED"
  | "INSUFFICIENT_FUNDS"
  | "OVER_LIMIT"
  | "FAILED";

export interface DebitMandateRequest {
  walletNumber: string;
  channel: DebitMandateChannel;
  reference?: string;
  maxAmountPerDebit?: number | null;
}

export interface DebitMandateView {
  mandateCode: string;
  subscriptionNumber: string;
  walletNumber: string;
  status: DebitMandateStatus | string;
  consentGivenAt?: string | null;
  consentGivenBy?: string | null;
  consentChannel?: DebitMandateChannel | string | null;
  consentReference?: string | null;
  maxAmountPerDebit?: number | null;
  /** Trois échecs de suite suspendent le mandat. */
  consecutiveFailures: number;
  lastDebitAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
}

export interface DebitAttemptView {
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: DebitAttemptStatus | string;
  message?: string | null;
  transactionNumber?: string | null;
  executedAt: string;
}

// ═══ Gel, prorata, alignement ═════════════════════════════════════════════════

export interface FreezeRecord {
  startedOn: string;
  plannedUntil?: string | null;
  resumedOn?: string | null;
  daysPlanned?: number | null;
  daysEffective?: number | null;
  feeAmount?: number | null;
  feeBillableNumber?: string | null;
  reason?: string | null;
  requestedBy?: string | null;
}

/** Le gel (POST /pause) respecte l'allowance : 409 si canFreeze est faux. */
export interface FreezeAllowance {
  freezesUsedThisYear: number;
  freezesAllowedPerYear: number;
  maxDays: number;
  feePercent: number;
  canFreeze: boolean;
}

export interface PlanChangePreview {
  policy: ProrationPolicy | string;
  effectiveDate: string;
  currentPeriodTotal: number;
  targetPeriodTotal: number;
  unusedAtCurrentPrice: number;
  remainingAtTargetPrice: number;
  /** Facturé si credit=false, crédité au portefeuille si credit=true. */
  amount: number;
  credit: boolean;
  targetAmounts?: Record<string, unknown> | null;
  currency: string;
}

export interface AlignRequest {
  subscriberType: string;
  subscriberCode: string;
  targetPeriodEnd?: string | null;
  /** Montrer d'abord l'effet. */
  simulateOnly: boolean;
}

export interface AlignLine {
  subscriptionNumber: string;
  currentPeriodEnd: string;
  newPeriodEnd?: string | null;
  bridgingDays: number;
  bridgingAmount: number;
  /** false : message explique pourquoi (ex. « demanderait de rendre de l'argent »). */
  aligned: boolean;
  message?: string | null;
}

export interface AlignResult {
  subscriberType: string;
  subscriberCode: string;
  targetPeriodEnd?: string | null;
  total: number;
  aligned: number;
  skipped: number;
  totalBridging: number;
  lines: AlignLine[];
}

export const subscriptionLifecycleService = {
  // ── Politique ──────────────────────────────────────────────────────────────

  getPolicy: async (): Promise<LifecyclePolicy> =>
    (await apiClient.get(`${LIFECYCLE}/policy`)).data,

  /** ADMIN, SUPER_ADMIN. */
  updatePolicy: async (data: LifecyclePolicy): Promise<LifecyclePolicy> =>
    (await apiClient.put(`${LIFECYCLE}/policy`, data)).data,

  // ── Tolérance ──────────────────────────────────────────────────────────────

  /** Régularisation constatée hors système : sort l'abonnement de GRACE_PERIOD. */
  exitGracePeriod: async (subscriptionNumber: string): Promise<void> => {
    await apiClient.post(`${LIFECYCLE}/${enc(subscriptionNumber)}/grace/exit`);
  },

  // ── Engagement ─────────────────────────────────────────────────────────────

  getCommitment: async (
    subscriptionNumber: string,
  ): Promise<CommitmentView | null> => {
    const response = await apiClient.get(
      `${LIFECYCLE}/${enc(subscriptionNumber)}/commitment`,
      { validateStatus: (s: number) => (s >= 200 && s < 300) || s === 404 },
    );
    return response.status === 404 ? null : response.data;
  },

  saveCommitment: async (
    subscriptionNumber: string,
    data: CommitmentRequest,
  ): Promise<CommitmentView> =>
    (
      await apiClient.put(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/commitment`,
        data,
      )
    ).data,

  /** ADMIN, SUPER_ADMIN. */
  deleteCommitment: async (subscriptionNumber: string): Promise<void> => {
    await apiClient.delete(
      `${LIFECYCLE}/${enc(subscriptionNumber)}/commitment`,
    );
  },

  getEarlyTermination: async (
    subscriptionNumber: string,
    on?: string,
  ): Promise<EarlyTerminationQuote> =>
    (
      await apiClient.get(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/commitment/early-termination`,
        { params: { on } },
      )
    ).data,

  // ── Résiliation ────────────────────────────────────────────────────────────

  previewTermination: async (
    subscriptionNumber: string,
    data: TerminationRequest,
  ): Promise<TerminationPreview> =>
    (
      await apiClient.post(
        `${TERMINATIONS}/subscriptions/${enc(subscriptionNumber)}/preview`,
        data,
      )
    ).data,

  /** L'abonnement passe PENDING_TERMINATION. */
  requestTermination: async (
    subscriptionNumber: string,
    data: TerminationRequest,
  ): Promise<TerminationView> =>
    (
      await apiClient.post(
        `${TERMINATIONS}/subscriptions/${enc(subscriptionNumber)}`,
        data,
      )
    ).data,

  getSubscriptionTerminations: async (
    subscriptionNumber: string,
  ): Promise<TerminationView[]> =>
    toList<TerminationView>(
      (
        await apiClient.get(
          `${TERMINATIONS}/subscriptions/${enc(subscriptionNumber)}`,
        )
      ).data,
    ),

  getTerminations: async (
    params?: PageParams & { status?: TerminationStatus | string },
  ): Promise<PageResult<TerminationView>> =>
    toPage<TerminationView>(
      (await apiClient.get(TERMINATIONS, { params })).data,
      params?.size,
    ),

  /** Date d'effet passée et liste de sortie ouverte. */
  getBlockedTerminations: async (
    params?: PageParams,
  ): Promise<PageResult<TerminationView>> =>
    toPage<TerminationView>(
      (await apiClient.get(`${TERMINATIONS}/blocked`, { params })).data,
      params?.size,
    ),

  getTermination: async (code: string): Promise<TerminationView> =>
    (await apiClient.get(`${TERMINATIONS}/${enc(code)}`)).data,

  /** Facture les frais de rupture et les jours de raccordement. */
  acceptTermination: async (code: string): Promise<TerminationView> =>
    (await apiClient.post(`${TERMINATIONS}/${enc(code)}/accept`)).data,

  /** 409 si des frais ont été facturés : avoir d'abord. */
  retractTermination: async (
    code: string,
    reason: string,
  ): Promise<TerminationView> =>
    (await apiClient.post(`${TERMINATIONS}/${enc(code)}/retract`, { reason }))
      .data,

  /** ADMIN, SUPER_ADMIN, avant l'acceptation seulement. */
  waiveTerminationFee: async (
    code: string,
    reason: string,
  ): Promise<TerminationView> =>
    (await apiClient.post(`${TERMINATIONS}/${enc(code)}/waive-fee`, { reason }))
      .data,

  markExitItemDone: async (
    code: string,
    itemCode: string,
    detail?: string,
  ): Promise<TerminationView> =>
    (
      await apiClient.post(
        `${TERMINATIONS}/${enc(code)}/exit-items/${enc(itemCode)}/done`,
        { detail },
      )
    ).data,

  waiveExitItem: async (
    code: string,
    itemCode: string,
    reason: string,
  ): Promise<TerminationView> =>
    (
      await apiClient.post(
        `${TERMINATIONS}/${enc(code)}/exit-items/${enc(itemCode)}/waive`,
        { reason },
      )
    ).data,

  /** Avant la date d'effet, si la liste est vide. */
  completeTermination: async (code: string): Promise<TerminationView> =>
    (await apiClient.post(`${TERMINATIONS}/${enc(code)}/complete`)).data,

  // ── Devis d'abonnement ─────────────────────────────────────────────────────

  /** Prix négocié vérifié dès la création (409 avec la raison). */
  createQuote: async (
    data: SubscriptionQuoteRequest,
  ): Promise<SubscriptionQuoteView> =>
    (await apiClient.post(QUOTES, data)).data,

  getQuotes: async (
    params?: PageParams & { status?: SubscriptionQuoteStatus | string },
  ): Promise<PageResult<SubscriptionQuoteView>> =>
    toPage<SubscriptionQuoteView>(
      (await apiClient.get(QUOTES, { params })).data,
      params?.size,
    ),

  getSubscriberQuotes: async (
    subscriberType: string,
    subscriberCode: string,
  ): Promise<SubscriptionQuoteView[]> =>
    toList<SubscriptionQuoteView>(
      (
        await apiClient.get(
          `${QUOTES}/subscribers/${enc(subscriberType)}/${enc(subscriberCode)}`,
        )
      ).data,
    ),

  getQuote: async (quoteNumber: string): Promise<SubscriptionQuoteView> =>
    (await apiClient.get(`${QUOTES}/${enc(quoteNumber)}`)).data,

  getQuoteOutlook: async (
    quoteNumber: string,
  ): Promise<SubscriptionQuoteOutlook> =>
    (await apiClient.get(`${QUOTES}/${enc(quoteNumber)}/outlook`)).data,

  /** Passe en SENT et envoie un e-mail au souscripteur. */
  sendQuote: async (quoteNumber: string): Promise<SubscriptionQuoteView> =>
    (await apiClient.post(`${QUOTES}/${enc(quoteNumber)}/send`)).data,

  /**
   * CONVERTED : abonnement créé, dérivation posée si prix négocié, engagement
   * posé. L'abonnement n'est pas auto-activé : le paiement l'active.
   */
  acceptQuote: async (quoteNumber: string): Promise<SubscriptionQuoteView> =>
    (await apiClient.post(`${QUOTES}/${enc(quoteNumber)}/accept`)).data,

  rejectQuote: async (
    quoteNumber: string,
    reason: string,
  ): Promise<SubscriptionQuoteView> =>
    (await apiClient.post(`${QUOTES}/${enc(quoteNumber)}/reject`, { reason }))
      .data,

  // ── Prélèvement automatique ────────────────────────────────────────────────

  createDebitMandate: async (
    subscriptionNumber: string,
    data: DebitMandateRequest,
  ): Promise<DebitMandateView> =>
    (
      await apiClient.post(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/debit-mandate`,
        data,
      )
    ).data,

  getDebitMandates: async (
    subscriptionNumber: string,
  ): Promise<DebitMandateView[]> =>
    toList<DebitMandateView>(
      (
        await apiClient.get(
          `${LIFECYCLE}/${enc(subscriptionNumber)}/debit-mandate`,
        )
      ).data,
    ),

  getDebitAttempts: async (
    subscriptionNumber: string,
  ): Promise<DebitAttemptView[]> =>
    toList<DebitAttemptView>(
      (
        await apiClient.get(
          `${LIFECYCLE}/${enc(subscriptionNumber)}/debit-attempts`,
        )
      ).data,
    ),

  revokeDebitMandate: async (
    mandateCode: string,
    reason: string,
  ): Promise<DebitMandateView> =>
    (
      await apiClient.post(
        `${LIFECYCLE}/debit-mandates/${enc(mandateCode)}/revoke`,
        { reason },
      )
    ).data,

  /** Après suspension pour trois échecs. */
  reactivateDebitMandate: async (
    mandateCode: string,
  ): Promise<DebitMandateView> =>
    (
      await apiClient.post(
        `${LIFECYCLE}/debit-mandates/${enc(mandateCode)}/reactivate`,
      )
    ).data,

  /** Retente à la main le prélèvement d'une facture. */
  collectInvoice: async (
    subscriptionNumber: string,
    invoiceNumber: string,
  ): Promise<DebitAttemptView> =>
    (
      await apiClient.post(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/debit-mandate/collect/${enc(invoiceNumber)}`,
      )
    ).data,

  // ── Gel, prorata, alignement ───────────────────────────────────────────────

  getFreezes: async (subscriptionNumber: string): Promise<FreezeRecord[]> =>
    toList<FreezeRecord>(
      (await apiClient.get(`${LIFECYCLE}/${enc(subscriptionNumber)}/freezes`))
        .data,
    ),

  getFreezeAllowance: async (
    subscriptionNumber: string,
  ): Promise<FreezeAllowance> =>
    (
      await apiClient.get(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/freezes/allowance`,
      )
    ).data,

  previewPlanChange: async (
    subscriptionNumber: string,
    params: { targetPlanVersionId: string | number; effectiveDate?: string },
  ): Promise<PlanChangePreview> =>
    (
      await apiClient.get(
        `${LIFECYCLE}/${enc(subscriptionNumber)}/plan-change/preview`,
        { params },
      )
    ).data,

  /** L'alignement ne va que vers l'avant. */
  alignPeriods: async (data: AlignRequest): Promise<AlignResult> =>
    (await apiClient.post(`${LIFECYCLE}/align`, data)).data,
};
