import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageParams, PageResult } from "./pagination";

// Centre de gestion des entreprises (administration)
// Rôles ADMIN, SUPER_ADMIN, MANAGER. Les routes /client/companies/... du
// portail gérant ne sont pas appelées d'ici.
//
// Une organisation est un client COMPANY (code CUS-COM-...).

const COMPANIES = `${API}/companies`;
const CUSTOMERS = `${API}/customers`;
const MEMBERS = `${API}/members`;
const enc = encodeURIComponent;

// ═══ Fiche organisation ═══════════════════════════════════════════════════════

export type OrganizationType =
  | "SOCIETE"
  | "ETABLISSEMENT"
  | "ENTREPRENEUR_INDIVIDUEL"
  | "PROFESSION_LIBERALE"
  | "ASSOCIATION"
  | "ONG"
  | "INSTITUTION_PUBLIQUE";

export type CompanyIdentifierType =
  | "NIU"
  | "RCCM"
  | "ORDRE_PROFESSIONNEL"
  | "RECEPISSE"
  | "AGREMENT"
  | "ACTE_CREATION"
  | "CODE_ADMINISTRATIF"
  | "AUTRE";

/** SUBJECT par défaut ; EXEMPT exige vatExemptionNote. */
export type VatRegime = "SUBJECT" | "EXEMPT";

export interface CompanyIdentifierInput {
  type: CompanyIdentifierType;
  value: string;
  /** Obligatoire pour le type AUTRE. */
  label?: string;
}

export interface CompanyIdentifier extends CompanyIdentifierInput {
  label?: string;
  /** LEGACY : ancien format RCCM accepté. */
  format?: "STANDARD" | "LEGACY" | string;
}

export interface CompanyAddress {
  streetNumber?: string;
  streetName?: string;
  complement?: string;
  district?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface CreateCompanyRequest {
  organizationType: OrganizationType;
  name: string;
  /** Vérifié pour une société seulement (SARL, SA, SAS...). */
  legalForm?: string;
  activity?: string;
  /** Aucun identifiant n'est obligatoire ; ceux saisis sont imprimés. */
  identifiers?: CompanyIdentifierInput[];
  legalRepresentativeName?: string;
  legalRepresentativeTitle?: string;
  vatRegime?: VatRegime;
  vatExemptionNote?: string;
  email?: string;
  billingEmail?: string;
  phone?: string;
  website?: string;
  address?: CompanyAddress;
  billingAddress?: CompanyAddress | null;
  paymentTermsDays?: number;
  creditLimit?: number | null;
  currencyCode?: string;
}

/** Un champ absent reste inchangé ; identifiers fourni remplace la liste entière. */
export interface UpdateCompanyLegalRequest {
  organizationType?: OrganizationType;
  name?: string;
  legalForm?: string;
  activity?: string;
  identifiers?: CompanyIdentifierInput[];
  legalRepresentativeName?: string;
  legalRepresentativeTitle?: string;
  vatRegime?: VatRegime;
  vatExemptionNote?: string;
}

export interface UpdateCompanyBillingRequest {
  billingEmail?: string;
  billingAddress?: CompanyAddress | null;
  paymentTermsDays?: number;
  creditLimit?: number | null;
  /** Retire le plafond d'encours. */
  removeCreditLimit?: boolean;
  currencyCode?: string;
}

export interface UpdateCompanyContactRequest {
  email?: string;
  phone?: string;
  website?: string;
  address?: CompanyAddress;
}

export type CompanyStatus = "ACTIVE" | "BLOCKED" | "INACTIVE" | string;

export interface CompanyResponse {
  customerId: string;
  name: string;
  organizationType: OrganizationType | string;
  organizationTypeLabel?: string;
  legalForm?: string | null;
  activity?: string | null;
  identifiers: CompanyIdentifier[];
  /** Liste à proposer dans le formulaire pour ce type d'organisation. */
  suggestedIdentifiers: CompanyIdentifierType[] | string[];
  legalRepresentativeName?: string | null;
  legalRepresentativeTitle?: string | null;
  vatRegime: VatRegime | string;
  vatExemptionNote?: string | null;
  email?: string | null;
  billingEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: CompanyAddress | null;
  billingAddress?: CompanyAddress | null;
  paymentTermsDays?: number | null;
  creditLimit?: number | null;
  currencyCode?: string | null;
  /** Encours : ce que l'organisation doit encore. */
  outstanding: number;
  status: CompanyStatus;
  blockedReason?: string | null;
  /** Mode par défaut de rattachement des factures des membres. */
  invoiceLinkMode?: InvoiceLinkMode | null;
  membersCount: number;
  activeSubscriptions: number;
  [key: string]: unknown;
}

export type CompanyListItem = CompanyResponse;

// ═══ Rattachement des membres ═════════════════════════════════════════════════

export type CompanyMemberRole = "OWNER" | "EMPLOYEE";
/** AUTOMATIC : toutes les factures du membre reliées d'office ; ON_CHOICE : à chaque fois. */
export type InvoiceLinkMode = "AUTOMATIC" | "ON_CHOICE";
export type CompanyMemberStatus = "ACTIVE" | "ENDED" | "ALL";

export interface CompanyMemberLink {
  id: number;
  memberId: string;
  memberName?: string;
  customerId?: string;
  companyName?: string;
  role: CompanyMemberRole;
  status?: "ACTIVE" | "ENDED" | string;
  startedAt?: string | null;
  endedAt?: string | null;
  endReason?: string | null;
  invoiceLinkMode?: InvoiceLinkMode | null;
  /** true : le mode de l'organisation s'applique. */
  useCompanyDefaultMode?: boolean;
  /** Mode qui s'applique réellement. */
  effectiveInvoiceLinkMode?: InvoiceLinkMode | null;
  canSign: boolean;
  canCollectMail: boolean;
  [key: string]: unknown;
}

export interface AddCompanyMemberRequest {
  memberId: string;
  role: CompanyMemberRole;
  startedAt?: string;
  invoiceLinkMode?: InvoiceLinkMode;
  canSign?: boolean;
  canCollectMail?: boolean;
}

export interface UpdateCompanyMemberRequest {
  role?: CompanyMemberRole;
  invoiceLinkMode?: InvoiceLinkMode;
  useCompanyDefaultMode?: boolean;
  canSign?: boolean;
  canCollectMail?: boolean;
}

/** Un membre n'a qu'une organisation en mode automatique, mode hérité compris. */
export interface EndCompanyMemberResult extends Partial<CompanyMemberLink> {
  /** Le membre repasse payeur sur sa fiche personnelle. */
  payerChanged?: boolean;
  /** Fiche personnelle non créée (courriel ou téléphone déjà pris) : lien terminé quand même. */
  warning?: string | null;
}

// ═══ États de compte ══════════════════════════════════════════════════════════

export interface StatementParams {
  /** Dates ISO ; douze mois jusqu'à aujourd'hui par défaut, trois ans au plus. */
  from?: string;
  to?: string;
}

export interface StatementAging {
  notDue: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
}

/** Une entrée par devise : deux devises ne s'additionnent pas. */
export interface StatementTotals {
  currency: string;
  invoiced: number;
  paid: number;
  balanceDue: number;
  overdue: number;
  creditAvailable: number;
  netBalanceDue: number;
  openInvoices: number;
  overdueInvoices: number;
  aging: StatementAging;
}

export type StatementAccountType = "COMPANY" | "MEMBER" | "PERSONAL";

export interface StatementAccount {
  accountType: StatementAccountType | string;
  accountCode: string;
  accountName: string;
  balanceDue: number;
  currency?: string;
  invoiced?: number;
  paid?: number;
  overdue?: number;
  [key: string]: unknown;
}

export interface StatementLine {
  documentNumber: string;
  documentType: string;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  accountType: StatementAccountType | string;
  accountCode: string;
  accountName: string;
  companyLinkSource?: "AT_ISSUE" | "ATTACHED" | null;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  /** Effet signé sur le solde : un avoir disponible compte en négatif. */
  impact: number;
  daysOverdue: number;
  /** false : facture d'avant la période encore due (italique dans le PDF). */
  inPeriod: boolean;
}

export interface AccountStatement {
  subject: "COMPANY" | "MEMBER" | string;
  code: string;
  name: string;
  from: string;
  to: string;
  asOf: string;
  creditLimit?: number | null;
  paymentTermsDays?: number | null;
  blocked?: boolean;
  totals: StatementTotals[];
  accounts: StatementAccount[];
  lines: StatementLine[];
}

// ═══ Abonnement partagé ═══════════════════════════════════════════════════════

/** POOL : pot commun ; QUOTA : part fixe par place ; QUOTA_AND_POOL : part puis pot. */
export type SharingMode = "POOL" | "QUOTA" | "QUOTA_AND_POOL";

export interface CompanySubscriptionSummary {
  subscriptionNumber: string;
  planName?: string;
  status?: string;
  /** Nombre de places de l'organisation. */
  maxSeats?: number | null;
  /** Plafond vendu : seule l'administration le fixe. */
  seatCeiling?: number | null;
  activeSeats?: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  [key: string]: unknown;
}

export interface SharingRuleRequest {
  mode: SharingMode;
  /** Part de chaque place (QUOTA et QUOTA_AND_POOL). */
  defaultQuota?: number | null;
  /** Plafond par place sur la période, dans tous les modes. */
  seatCap?: number | null;
}

export interface SharedEntitlement {
  entitlementCode: string;
  unit?: string;
  mode: SharingMode | string;
  defaultQuota?: number | null;
  seatCap?: number | null;
  granted: number;
  remaining: number;
  distributedQuotas?: number;
  poolSize?: number;
  poolUsed?: number;
}

export interface SeatEntitlement {
  entitlementCode: string;
  quota?: number | null;
  quotaUsed?: number;
  quotaRemaining?: number | null;
  cap?: number | null;
  used: number;
}

export interface SubscriptionSeat {
  id: number;
  memberId: string;
  memberName?: string;
  entitlements: SeatEntitlement[];
  [key: string]: unknown;
}

export interface SubscriptionSharing {
  companyCustomerCode: string;
  subscription: {
    subscriptionNumber: string;
    planName?: string;
    maxSeats?: number | null;
    activeSeats: number;
    [key: string]: unknown;
  };
  entitlements: SharedEntitlement[];
  seats: SubscriptionSeat[];
}

export interface SeatAllowance {
  entitlementCode: string;
  quota?: number | null;
  cap?: number | null;
}

export interface AssignSeatRequest {
  memberId: string;
  allowances?: SeatAllowance[];
}

/** Départ d'un collaborateur : ses réservations à venir sont signalées, pas annulées. */
export interface SeatReleaseResult {
  warning?: string | null;
  [key: string]: unknown;
}

// ═══ Passes partagés ══════════════════════════════════════════════════════════

export interface CompanyPassSummary {
  passNumber: string;
  name: string;
  status: string;
  /** Nombre d'accès ouverts. */
  beneficiaries: number;
  validFrom?: string | null;
  validUntil?: string | null;
  [key: string]: unknown;
}

export interface PassBeneficiary {
  id: number;
  memberId: string;
  memberName?: string;
  open: boolean;
  maxUses?: number | null;
  usedCount: number;
  validFrom?: string | null;
  validUntil?: string | null;
  consumption: Array<{ entitlementCode: string; consumed: number }>;
}

export interface PassBeneficiaries {
  companyCustomerCode: string;
  pass: { passNumber: string; name: string; status: string; beneficiaries: number };
  entitlements: Array<{
    entitlementCode: string;
    unit?: string;
    unlimited: boolean;
    granted: number;
    remaining: number;
  }>;
  beneficiaries: PassBeneficiary[];
}

export interface OpenPassAccessRequest {
  memberId: string;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

// ═══ Portefeuille de l'organisation ═══════════════════════════════════════════

export type CompanyTopUpMethod = "CASH" | "BANK_TRANSFER";

export type SpendOperation =
  | "BOOKING"
  | "SUBSCRIPTION"
  | "PASS"
  | "INVOICE_PAYMENT"
  | "MARKETPLACE";

export type SpendingAuthorizationStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type CompanySpendStatus =
  | "HELD"
  | "PENDING_APPROVAL"
  | "AWAITING_OTP"
  | "SETTLED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface CompanyTopUpRequest {
  amount: number;
  /** XAF par défaut. */
  currency?: string;
  method: CompanyTopUpMethod;
  reference?: string;
  /** Au-delà du seuil des actions d'administration, une seconde personne valide. */
  reason: string;
}

export interface CompanySpend {
  id: number;
  memberId: string;
  memberName?: string;
  operation: SpendOperation | string;
  amount: number;
  currency: string;
  documentNumber?: string | null;
  status: CompanySpendStatus | string;
  expiresAt?: string | null;
  createdAt?: string | null;
  decidedAt?: string | null;
  [key: string]: unknown;
}

export interface CompanyWalletMovement {
  entryNumber?: string;
  direction?: "CREDIT" | "DEBIT" | string;
  amount?: number;
  balanceAfter?: number;
  entryType?: string;
  /** Collaborateur qui a dépensé. */
  spentByMember?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CompanyWalletView {
  walletNumber?: string;
  currency?: string;
  status?: string;
  availableBalance?: number;
  ledgerBalance?: number;
  heldBalance?: number;
  movements?: CompanyWalletMovement[];
  /** Validations en attente du gérant. */
  pendingApprovals?: CompanySpend[];
  [key: string]: unknown;
}

export interface SpendingAuthorizationRequest {
  memberId: string;
  operations: SpendOperation[];
  maxPerTransaction?: number | null;
  maxPerDay?: number | null;
  maxPerMonth?: number | null;
  /** Au-delà, la dépense attend la validation du gérant (vide : jamais). */
  approvalAbove?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  currency?: string;
}

/** Remplace opérations, plafonds et période ; status et reason facultatifs. */
export interface UpdateSpendingAuthorizationRequest
  extends Omit<SpendingAuthorizationRequest, "memberId"> {
  status?: SpendingAuthorizationStatus;
  reason?: string;
}

export interface SpendingAuthorization extends Partial<SpendingAuthorizationRequest> {
  id: number;
  memberId: string;
  memberName?: string;
  status: SpendingAuthorizationStatus | string;
  /** Le collaborateur a posé son code de dépense. */
  pinSet?: boolean;
  [key: string]: unknown;
}

// ═══ Contrats et domiciliations ═══════════════════════════════════════════════

export interface CompanyDesignatedSigner {
  memberId?: string | null;
  name?: string | null;
  email?: string | null;
  /** LEGAL_REPRESENTATIVE (fiche) ou MEMBER (lien canSign). */
  source?: string;
  [key: string]: unknown;
}

export interface CompanyContractsView {
  signers: CompanyDesignatedSigner[];
  contracts: Array<{
    contractCode: string;
    title?: string;
    status: string;
    parties?: unknown[];
    amendments?: unknown[];
    [key: string]: unknown;
  }>;
  domiciliations: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export const companyService = {
  // ── Fiche ──────────────────────────────────────────────────────────────────

  createCompany: async (data: CreateCompanyRequest): Promise<CompanyResponse> =>
    (await apiClient.post(COMPANIES, data)).data,

  /** q cherche dans le nom, les courriels, le code client et tous les identifiants. */
  getCompanies: async (
    params?: PageParams & { q?: string; status?: string },
  ): Promise<PageResult<CompanyResponse>> =>
    toPage<CompanyResponse>(
      (await apiClient.get(COMPANIES, { params })).data,
      params?.size,
    ),

  getCompany: async (customerId: string): Promise<CompanyResponse> =>
    (await apiClient.get(`${COMPANIES}/${enc(customerId)}`)).data,

  updateLegal: async (
    customerId: string,
    data: UpdateCompanyLegalRequest,
  ): Promise<CompanyResponse> =>
    (await apiClient.patch(`${COMPANIES}/${enc(customerId)}/legal`, data)).data,

  updateBilling: async (
    customerId: string,
    data: UpdateCompanyBillingRequest,
  ): Promise<CompanyResponse> =>
    (await apiClient.patch(`${COMPANIES}/${enc(customerId)}/billing`, data))
      .data,

  updateContact: async (
    customerId: string,
    data: UpdateCompanyContactRequest,
  ): Promise<CompanyResponse> =>
    (await apiClient.patch(`${COMPANIES}/${enc(customerId)}/contact`, data))
      .data,

  /** Toute facture est refusée ; devis et avoirs restent possibles. */
  blockCompany: async (
    customerId: string,
    reason: string,
  ): Promise<CompanyResponse> =>
    (
      await apiClient.post(`${COMPANIES}/${enc(customerId)}/block`, { reason })
    ).data,

  unblockCompany: async (customerId: string): Promise<CompanyResponse> =>
    (await apiClient.post(`${COMPANIES}/${enc(customerId)}/unblock`)).data,

  /** Relie un profil légal existant. */
  linkLegalProfile: async (
    customerId: string,
    businessCode: string,
  ): Promise<CompanyResponse> =>
    (
      await apiClient.post(`${COMPANIES}/${enc(customerId)}/legal-profile`, {
        businessCode,
      })
    ).data,

  // ── Rattachement des membres ───────────────────────────────────────────────

  /** Actifs par défaut ; ENDED ou ALL pour l'historique. */
  getMembers: async (
    customerId: string,
    status?: CompanyMemberStatus,
  ): Promise<CompanyMemberLink[]> =>
    toList<CompanyMemberLink>(
      (
        await apiClient.get(`${CUSTOMERS}/${enc(customerId)}/members`, {
          params: { status },
        })
      ).data,
    ),

  addMember: async (
    customerId: string,
    data: AddCompanyMemberRequest,
  ): Promise<CompanyMemberLink> =>
    (await apiClient.post(`${CUSTOMERS}/${enc(customerId)}/members`, data))
      .data,

  updateMember: async (
    customerId: string,
    linkId: number,
    data: UpdateCompanyMemberRequest,
  ): Promise<CompanyMemberLink> =>
    (
      await apiClient.patch(
        `${CUSTOMERS}/${enc(customerId)}/members/${linkId}`,
        data,
      )
    ).data,

  /** Le lien passe ENDED et reste en historique. */
  endMember: async (
    customerId: string,
    linkId: number,
    reason: string,
  ): Promise<EndCompanyMemberResult> =>
    (
      await apiClient.post(
        `${CUSTOMERS}/${enc(customerId)}/members/${linkId}/end`,
        { reason },
      )
    ).data,

  /** Les organisations d'un membre, avec rôle et dates. */
  getMemberCompanies: async (memberId: string): Promise<CompanyMemberLink[]> =>
    toList<CompanyMemberLink>(
      (await apiClient.get(`${MEMBERS}/${enc(memberId)}/companies`)).data,
    ),

  /** Mode par défaut de l'organisation, remplaçable par lien. */
  setInvoiceLinkMode: async (
    customerId: string,
    mode: InvoiceLinkMode,
  ): Promise<CompanyResponse> =>
    (
      await apiClient.patch(
        `${COMPANIES}/${enc(customerId)}/invoice-link-mode`,
        { mode },
      )
    ).data,

  // ── États de compte ────────────────────────────────────────────────────────

  getCompanyStatement: async (
    customerId: string,
    params?: StatementParams,
  ): Promise<AccountStatement> =>
    (
      await apiClient.get(`${COMPANIES}/${enc(customerId)}/statement`, {
        params,
      })
    ).data,

  getCompanyStatementPdf: async (
    customerId: string,
    params?: StatementParams,
  ): Promise<Blob> =>
    (
      await apiClient.get(`${COMPANIES}/${enc(customerId)}/statement.pdf`, {
        params,
        responseType: "blob",
      })
    ).data,

  getCompanyStatementCsv: async (
    customerId: string,
    params?: StatementParams,
  ): Promise<Blob> =>
    (
      await apiClient.get(`${COMPANIES}/${enc(customerId)}/statement.csv`, {
        params,
        responseType: "blob",
      })
    ).data,

  getMemberStatement: async (
    memberId: string,
    params?: StatementParams,
  ): Promise<AccountStatement> =>
    (
      await apiClient.get(`${MEMBERS}/${enc(memberId)}/statement`, { params })
    ).data,

  getMemberStatementPdf: async (
    memberId: string,
    params?: StatementParams,
  ): Promise<Blob> =>
    (
      await apiClient.get(`${MEMBERS}/${enc(memberId)}/statement.pdf`, {
        params,
        responseType: "blob",
      })
    ).data,

  getMemberStatementCsv: async (
    memberId: string,
    params?: StatementParams,
  ): Promise<Blob> =>
    (
      await apiClient.get(`${MEMBERS}/${enc(memberId)}/statement.csv`, {
        params,
        responseType: "blob",
      })
    ).data,

  // ── Abonnement partagé ─────────────────────────────────────────────────────

  getSubscriptions: async (
    customerId: string,
  ): Promise<CompanySubscriptionSummary[]> =>
    toList<CompanySubscriptionSummary>(
      (await apiClient.get(`${COMPANIES}/${enc(customerId)}/subscriptions`))
        .data,
    ),

  getSharing: async (
    customerId: string,
    subscriptionNumber: string,
  ): Promise<SubscriptionSharing> =>
    (
      await apiClient.get(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/sharing`,
      )
    ).data,

  setSharingRule: async (
    customerId: string,
    subscriptionNumber: string,
    entitlementCode: string,
    data: SharingRuleRequest,
  ): Promise<SubscriptionSharing> =>
    (
      await apiClient.put(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/sharing/${enc(entitlementCode)}`,
        data,
      )
    ).data,

  /** Plafond de places vendu et nombre de places ; vide = sans limite. */
  setMaxSeats: async (
    customerId: string,
    subscriptionNumber: string,
    maxSeats: number | null,
  ): Promise<CompanySubscriptionSummary> =>
    (
      await apiClient.patch(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/max-seats`,
        { maxSeats },
      )
    ).data,

  assignSeat: async (
    customerId: string,
    subscriptionNumber: string,
    data: AssignSeatRequest,
  ): Promise<SubscriptionSeat> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/seats`,
        data,
      )
    ).data,

  updateSeat: async (
    customerId: string,
    subscriptionNumber: string,
    seatId: number,
    allowances: SeatAllowance[],
  ): Promise<SubscriptionSeat> =>
    (
      await apiClient.patch(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/seats/${seatId}`,
        { allowances },
      )
    ).data,

  /** Ce qui reste de sa part est perdu ; ce qu'il n'a pas pris dans le pot y reste. */
  releaseSeat: async (
    customerId: string,
    subscriptionNumber: string,
    seatId: number,
    reason?: string,
  ): Promise<SeatReleaseResult> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/subscriptions/${enc(subscriptionNumber)}/seats/${seatId}/release`,
        { reason },
      )
    ).data,

  // ── Passes partagés ────────────────────────────────────────────────────────

  getPasses: async (customerId: string): Promise<CompanyPassSummary[]> =>
    toList<CompanyPassSummary>(
      (await apiClient.get(`${COMPANIES}/${enc(customerId)}/passes`)).data,
    ),

  getPassBeneficiaries: async (
    customerId: string,
    passNumber: string,
  ): Promise<PassBeneficiaries> =>
    (
      await apiClient.get(
        `${COMPANIES}/${enc(customerId)}/passes/${enc(passNumber)}/beneficiaries`,
      )
    ).data,

  /** Un accès retiré puis rouvert reprend la même ligne, compteur remis à zéro. */
  openPassAccess: async (
    customerId: string,
    passNumber: string,
    data: OpenPassAccessRequest,
  ): Promise<PassBeneficiary> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/passes/${enc(passNumber)}/beneficiaries`,
        data,
      )
    ).data,

  revokePassAccess: async (
    customerId: string,
    passNumber: string,
    beneficiaryId: number,
    reason?: string,
  ): Promise<PassBeneficiary> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/passes/${enc(passNumber)}/beneficiaries/${beneficiaryId}/revoke`,
        { reason },
      )
    ).data,

  // ── Portefeuille ───────────────────────────────────────────────────────────

  getWallet: async (
    customerId: string,
    currency?: string,
  ): Promise<CompanyWalletView> =>
    (
      await apiClient.get(`${COMPANIES}/${enc(customerId)}/wallet`, {
        params: { currency },
      })
    ).data,

  getWalletSpends: async (
    customerId: string,
    status?: CompanySpendStatus | string,
  ): Promise<CompanySpend[]> =>
    toList<CompanySpend>(
      (
        await apiClient.get(`${COMPANIES}/${enc(customerId)}/wallet/spends`, {
          params: { status },
        })
      ).data,
    ),

  /** Espèces reçues à l'accueil ou virement constaté ; produit un reçu, pas une facture. */
  topUpWallet: async (
    customerId: string,
    data: CompanyTopUpRequest,
  ): Promise<CompanyWalletView> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/wallet/top-ups`,
        data,
      )
    ).data,

  getSpendingAuthorizations: async (
    customerId: string,
  ): Promise<SpendingAuthorization[]> =>
    toList<SpendingAuthorization>(
      (
        await apiClient.get(
          `${COMPANIES}/${enc(customerId)}/spending-authorizations`,
        )
      ).data,
    ),

  createSpendingAuthorization: async (
    customerId: string,
    data: SpendingAuthorizationRequest,
  ): Promise<SpendingAuthorization> =>
    (
      await apiClient.post(
        `${COMPANIES}/${enc(customerId)}/spending-authorizations`,
        data,
      )
    ).data,

  /** Suspendue ou révoquée : annule les demandes en attente du collaborateur. */
  updateSpendingAuthorization: async (
    customerId: string,
    id: number,
    data: UpdateSpendingAuthorizationRequest,
  ): Promise<SpendingAuthorization> =>
    (
      await apiClient.patch(
        `${COMPANIES}/${enc(customerId)}/spending-authorizations/${id}`,
        data,
      )
    ).data,

  /** Efface le code de dépense : le collaborateur en pose un nouveau sans l'ancien. */
  resetSpendingPin: async (customerId: string, id: number): Promise<void> => {
    await apiClient.post(
      `${COMPANIES}/${enc(customerId)}/spending-authorizations/${id}/pin/reset`,
    );
  },

  // ── Contrats et domiciliations ─────────────────────────────────────────────

  getContracts: async (customerId: string): Promise<CompanyContractsView> =>
    (await apiClient.get(`${COMPANIES}/${enc(customerId)}/contracts`)).data,

  /** Le contrat signé, ou à défaut généré. */
  getContractPdf: async (
    customerId: string,
    contractCode: string,
  ): Promise<Blob> =>
    (
      await apiClient.get(
        `${COMPANIES}/${enc(customerId)}/contracts/${enc(contractCode)}/pdf`,
        { responseType: "blob" },
      )
    ).data,
};
