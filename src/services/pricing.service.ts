import { apiClient } from "./api";
import { API, toList } from "./pagination";

// ─── Tarification ────────────────────────────────────────────────────

export type PricingScope =
  | "WHOLE_ORDER"
  | "LINE"
  | "PLAN"
  | "ADDON"
  | "PASS"
  | "ENTITLEMENT"
  | "SERVICE"
  | "RESOURCE"
  | "INVENTORY_ITEM"
  | "CATEGORY";

export type DiscountSourceType =
  | "PROMOTION"
  | "COUPON"
  | "PRICE_LIST"
  | "REFERRAL"
  | "MANUAL";

export type RewardType =
  | "PERCENTAGE_OFF"
  | "FIXED_AMOUNT_OFF"
  | "WAIVE_SETUP_FEE"
  | "FREE_PERIODS"
  | "FREE_TRIAL_DAYS"
  | "FREE_ENTITLEMENT"
  | "EXTRA_ENTITLEMENT_UNITS"
  | "FREE_ADDON"
  | "UPGRADE_TIER"
  | "WALLET_CREDIT";

export interface PricingLine {
  /** Identifiant de ligne choisi par l'appelant, rendu tel quel dans les résultats. */
  reference: string;
  scope: PricingScope;
  code?: string | null;
  categoryCode?: string | null;
  label?: string;
  quantity: number;
  unitPrice: number;
  setupFee?: number;
}

export interface PricingSimulationRequest {
  subscriberType?: string | null;
  subscriberCode?: string | null;
  subscriberSegment?: string | null;
  kycLevel?: number | null;
  tenureMonths?: number | null;
  firstPurchase?: boolean | null;
  lines: PricingLine[];
  billingCycle?: string | null;
  channel?: string | null;
  paymentMethod?: string | null;
  locationCode?: string | null;
  /** Déduite par le serveur si absente (XAF par défaut). */
  currency?: string | null;
  couponCodes?: string[];
  evaluationDate?: string | null;
  promotionsAllowed?: boolean | null;
}

export interface AppliedPricingRule {
  order: number;
  sourceType: DiscountSourceType;
  sourceCode: string;
  sourceName?: string;
  rewardType: RewardType | string;
  lineReference?: string | null;
  originalAmount: number;
  discountAmount: number;
  explanation?: string;
}

export interface PricingRejection {
  sourceType: DiscountSourceType | string;
  sourceCode: string;
  /** À afficher comme explication, jamais comme erreur. */
  reason: string;
}

export interface PricingGrant {
  sourceType: DiscountSourceType | string;
  sourceCode: string;
  rewardType: RewardType | string;
  targetCode?: string | null;
  value?: number | null;
  explanation?: string;
}

export interface PricingPriceOverride {
  lineReference: string;
  priceListCode: string;
  priceListName?: string;
  catalogUnitPrice: number;
  effectiveUnitPrice: number;
  quantity: number;
}

export interface PricingSimulationResponse {
  catalogTotal: number;
  originalTotal: number;
  discountTotal: number;
  finalTotal: number;
  currency: string;
  appliedRules: AppliedPricingRule[];
  rejections: PricingRejection[];
  grants: PricingGrant[];
  priceOverrides: PricingPriceOverride[];
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export type CouponKind = "SINGLE_USE" | "MULTI_USE" | "UNIQUE_PER_SUBSCRIBER";
export type CouponStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export interface CouponResponse {
  code: string;
  promotionCode: string;
  promotionName?: string;
  promotionDescription?: string;
  couponKind: CouponKind | string;
  status: CouponStatus | string;
  remainingUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  batchCode?: string | null;
}

export interface CreateCouponBatchRequest {
  promotionCode: string;
  name: string;
  /** 1 à 50 000 */
  quantity: number;
  couponKind: CouponKind;
  codePrefix?: string;
  /** 6 à 32, défaut 10 */
  codeLength?: number;
  maxRedemptionsPerCoupon?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  channel?: string;
}

/** Réponse de génération : type ouvert. */
export interface CouponBatchResult {
  batchCode?: string;
  quantity?: number;
  [key: string]: unknown;
}

// ─── Parrainage ───────────────────────────────────────────────────────────────

/** Seul linkCode est garanti (utilisé en entrée). */
export interface ReferralLink {
  linkCode: string;
  [key: string]: unknown;
}

export interface ReferralRecord {
  referralNumber: string;
  [key: string]: unknown;
}

// ─── Bénéficiaires nominatifs d'une promotion ─────────────────────────────────

export interface PromotionBeneficiaryInput {
  subscriberType: string;
  subscriberCode: string;
}

/** Rapport d'import : type ouvert. */
export interface BeneficiaryImportReport {
  [key: string]: unknown;
}

export interface PromotionBeneficiaryUsage {
  [key: string]: unknown;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const pricingService = {
  /** Simule une tarification : règles appliquées, refusées et raisons. */
  simulate: async (
    data: PricingSimulationRequest,
  ): Promise<PricingSimulationResponse> =>
    (await apiClient.post(`${API}/pricing/simulate`, data)).data,

  // ── Coupons ────────────────────────────────────────────────────────────────

  getAvailableCoupons: async (params: {
    subscriberType: string;
    subscriberCode: string;
  }): Promise<CouponResponse[]> =>
    toList<CouponResponse>(
      (await apiClient.get(`${API}/coupons/available`, { params })).data,
    ),

  createCouponBatch: async (
    data: CreateCouponBatchRequest,
  ): Promise<CouponBatchResult> =>
    (await apiClient.post(`${API}/coupons/batches`, data)).data,

  /** Retenue manuelle d'un coupon sous une référence de panier. */
  reserveCoupon: async (
    code: string,
    params: {
      cartReference: string;
      subscriberType: string;
      subscriberCode: string;
    },
  ): Promise<CouponResponse> =>
    (
      await apiClient.post(
        `${API}/coupons/${encodeURIComponent(code)}/reserve`,
        null,
        { params },
      )
    ).data,

  /** Libère toutes les retenues d'un panier. */
  releaseCartReservations: async (
    cartReference: string,
    reason?: string,
  ): Promise<void> => {
    await apiClient.delete(`${API}/coupons/reservations`, {
      params: { cartReference, reason },
    });
  },

  revokeCoupon: async (code: string, reason: string): Promise<void> => {
    await apiClient.post(
      `${API}/coupons/${encodeURIComponent(code)}/revoke`,
      null,
      { params: { reason } },
    );
  },

  // ── Parrainage ─────────────────────────────────────────────────────────────

  getReferralLink: async (params: {
    programCode: string;
    referrerType: string;
    referrerCode: string;
  }): Promise<ReferralLink> =>
    (await apiClient.get(`${API}/referrals/links`, { params })).data,

  registerReferral: async (data: {
    linkCode: string;
    refereeType: string;
    refereeCode: string;
  }): Promise<ReferralRecord> =>
    (await apiClient.post(`${API}/referrals`, data)).data,

  rejectReferral: async (
    referralNumber: string,
    reason: string,
  ): Promise<void> => {
    await apiClient.post(
      `${API}/referrals/${encodeURIComponent(referralNumber)}/reject`,
      null,
      { params: { reason } },
    );
  },

  // ── Bénéficiaires nominatifs ───────────────────────────────────────────────

  addPromotionBeneficiary: async (
    promotionCode: string,
    data: PromotionBeneficiaryInput & { reason?: string },
  ): Promise<void> => {
    await apiClient.post(
      `${API}/promotions/${encodeURIComponent(promotionCode)}/beneficiaries`,
      data,
    );
  },

  importPromotionBeneficiaries: async (
    promotionCode: string,
    data: { beneficiaries: PromotionBeneficiaryInput[]; reason?: string },
  ): Promise<BeneficiaryImportReport> =>
    (
      await apiClient.post(
        `${API}/promotions/${encodeURIComponent(promotionCode)}/beneficiaries/import`,
        data,
      )
    ).data,

  removePromotionBeneficiary: async (
    promotionCode: string,
    params: PromotionBeneficiaryInput & { reason?: string },
  ): Promise<void> => {
    await apiClient.delete(
      `${API}/promotions/${encodeURIComponent(promotionCode)}/beneficiaries`,
      { params },
    );
  },

  markPromotionBeneficiaryNotified: async (
    promotionCode: string,
    params: PromotionBeneficiaryInput & { channel: string },
  ): Promise<void> => {
    await apiClient.post(
      `${API}/promotions/${encodeURIComponent(promotionCode)}/beneficiaries/notified`,
      null,
      { params },
    );
  },

  getPromotionBeneficiaryUsage: async (
    promotionCode: string,
  ): Promise<PromotionBeneficiaryUsage[]> =>
    toList<PromotionBeneficiaryUsage>(
      (
        await apiClient.get(
          `${API}/promotions/${encodeURIComponent(promotionCode)}/beneficiaries/usage`,
        )
      ).data,
    ),
};
