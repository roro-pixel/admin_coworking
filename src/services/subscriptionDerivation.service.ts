import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageParams, PageResult } from "./pagination";

// Abonnements dérivés : prix, droits et avantages propres à un abonnement, sans plan de catalogue dédié.
// Base /subscriptions/derivations · ADMIN, SUPER_ADMIN, STAFF (écriture de /policy : ADMIN, SUPER_ADMIN).

const BASE = `${API}/subscriptions/derivations`;
const enc = encodeURIComponent;

export type DerivationReason =
  | "NEGOTIATION"
  | "GOODWILL"
  | "PARTNERSHIP"
  | "PILOT"
  | "GRANDFATHERING"
  | "LOYALTY"
  | "CORRECTION";

export type DerivationRenewalBehaviour =
  | "KEEP"
  | "REVERT_TO_CATALOGUE"
  | "REVERT_AFTER_PERIODS";

export type DerivationStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SUPERSEDED"
  | "EXPIRED"
  | "REJECTED";

export type DerivationDeltaType =
  | "PRICE"
  | "ENTITLEMENT"
  | "BILLING_CYCLE"
  | "COMMITMENT"
  | "NOTICE_PERIOD"
  | "TRIAL"
  | "SETUP_FEE"
  | "PAYMENT_TERMS"
  | "ADDON_INCLUDED";

export interface DerivationSpecRequest {
  price?: number | null;
  setupFee?: number | null;
  trialDays?: number | null;
  commitmentMonths?: number | null;
  entitlementQuantities?: Record<string, number>;
  unlimitedEntitlements?: string[];
  includedBenefits?: string[];
  /** Obligatoire. */
  reason: DerivationReason;
  reasonDetails?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  renewalBehaviour?: DerivationRenewalBehaviour;
  /** Requis avec REVERT_AFTER_PERIODS. */
  revertAfterPeriods?: number | null;
  /** false = interdit le cumul avec les promotions. */
  promotionsAllowed?: boolean;
}

export interface DerivationDelta {
  type: DerivationDeltaType | string;
  target?: string | null;
  catalogueValue?: string | number | null;
  derivedValue?: string | number | null;
  impact?: number | null;
}

/**
 * À simuler avant toute création. blockingReason non nul = refus (plancher,
 * rabais au-delà du maximum, rien ne diffère) ; requiresApproval = second visa requis.
 */
export interface DerivationPreview {
  subscriptionNumber: string;
  catalogueVersion?: number | string | null;
  cataloguePrice: number;
  derivedPrice: number;
  discountPercent: number;
  totalImpact: number;
  currency: string;
  deltas: DerivationDelta[];
  requiresApproval: boolean;
  blockingReason?: string | null;
}

export interface DerivationView {
  derivationCode: string;
  subscriptionNumber?: string;
  status: DerivationStatus | string;
  reason?: DerivationReason | string;
  reasonDetails?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  supersedesDerivationId?: string | number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  [key: string]: unknown;
}

export interface BulkDerivationRequest {
  subscriptionNumbers: string[];
  spec: DerivationSpecRequest;
  /** true = simulation seulement. */
  simulateOnly: boolean;
}

export interface ProtectDerivationRequest {
  previousVersionId: string | number;
  protectedUntil: string;
  simulateOnly: boolean;
}

export interface DerivationOutcomeLine {
  subscriptionNumber: string;
  ok: boolean;
  derivationCode?: string | null;
  impact?: number | null;
  requiresApproval?: boolean;
  /** Motif, affiché pour les lignes en échec. */
  message?: string | null;
}

export interface DerivationOutcome {
  /** null en simulation. */
  batchCode?: string | null;
  total: number;
  succeeded: number;
  failed: number;
  pendingApproval: number;
  totalImpact: number;
  lines: DerivationOutcomeLine[];
}

export interface DerivationConcessionRow {
  requestedBy: string;
  reason: DerivationReason | string;
  count: number;
  totalImpact: number;
}

export interface DerivationApprovalRule {
  maxDiscountPercentWithoutApproval: number;
  maxImpactWithoutApproval: number;
  maxDiscountPercentAllowed: number;
}

export const subscriptionDerivationService = {
  // ── Simuler, créer, revenir ────────────────────────────────────────────────

  simulate: async (
    subscriptionNumber: string,
    spec: DerivationSpecRequest,
  ): Promise<DerivationPreview> =>
    (
      await apiClient.post(
        `${BASE}/subscriptions/${enc(subscriptionNumber)}/simulate`,
        spec,
      )
    ).data,

  /** ACTIVE tout de suite, ou PENDING_APPROVAL. */
  create: async (
    subscriptionNumber: string,
    spec: DerivationSpecRequest,
  ): Promise<DerivationView> =>
    (
      await apiClient.post(
        `${BASE}/subscriptions/${enc(subscriptionNumber)}`,
        spec,
      )
    ).data,

  getHistory: async (subscriptionNumber: string): Promise<DerivationView[]> =>
    toList<DerivationView>(
      (await apiClient.get(`${BASE}/subscriptions/${enc(subscriptionNumber)}`))
        .data,
    ),

  /** Retour au catalogue courant ; la dérivation passe EXPIRED. */
  revert: async (
    subscriptionNumber: string,
    reason: string,
  ): Promise<DerivationView> =>
    (
      await apiClient.post(
        `${BASE}/subscriptions/${enc(subscriptionNumber)}/revert`,
        { reason },
      )
    ).data,

  // ── Liste et visa ──────────────────────────────────────────────────────────

  /** status : liste séparée par des virgules, ex. "PENDING_APPROVAL,ACTIVE". */
  getDerivations: async (
    params?: PageParams & { status?: string },
  ): Promise<PageResult<DerivationView>> =>
    toPage<DerivationView>(
      (await apiClient.get(BASE, { params })).data,
      params?.size,
    ),

  getDerivation: async (code: string): Promise<DerivationView> =>
    (await apiClient.get(`${BASE}/${enc(code)}`)).data,

  getDerivationDeltas: async (code: string): Promise<DerivationDelta[]> =>
    toList<DerivationDelta>(
      (await apiClient.get(`${BASE}/${enc(code)}/deltas`)).data,
    ),

  /** Par une autre personne que le demandeur, sinon 409. */
  approve: async (code: string): Promise<DerivationView> =>
    (await apiClient.post(`${BASE}/${enc(code)}/approve`)).data,

  reject: async (code: string, reason: string): Promise<DerivationView> =>
    (await apiClient.post(`${BASE}/${enc(code)}/reject`, { reason })).data,

  // ── Lot, protection tarifaire, concessions ─────────────────────────────────

  bulk: async (data: BulkDerivationRequest): Promise<DerivationOutcome> =>
    (await apiClient.post(`${BASE}/bulk`, data)).data,

  /** GRANDFATHERING des abonnés d'une ancienne version de plan. */
  protect: async (data: ProtectDerivationRequest): Promise<DerivationOutcome> =>
    (await apiClient.post(`${BASE}/protect`, data)).data,

  getBatch: async (batchCode: string): Promise<DerivationOutcome> =>
    (await apiClient.get(`${BASE}/batches/${enc(batchCode)}`)).data,

  getConcessions: async (params?: {
    from?: string;
    to?: string;
  }): Promise<DerivationConcessionRow[]> =>
    toList<DerivationConcessionRow>(
      (await apiClient.get(`${BASE}/concessions`, { params })).data,
    ),

  // ── Politique ──────────────────────────────────────────────────────────────

  getApprovalRule: async (): Promise<DerivationApprovalRule> =>
    (await apiClient.get(`${BASE}/policy/approval-rule`)).data,

  /** ADMIN, SUPER_ADMIN. */
  updateApprovalRule: async (
    data: DerivationApprovalRule,
  ): Promise<DerivationApprovalRule> =>
    (await apiClient.put(`${BASE}/policy/approval-rule`, data)).data,

  /** ADMIN, SUPER_ADMIN. floorPrice absent = retire le plancher (corps vide). */
  setPlanVersionFloorPrice: async (
    versionId: string | number,
    floorPrice?: number | null,
  ): Promise<void> => {
    await apiClient.put(
      `${BASE}/policy/plan-versions/${enc(String(versionId))}/floor-price`,
      floorPrice == null ? undefined : { floorPrice },
    );
  },
};
