import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageParams, PageResult } from "./pagination";

// Domiciliation et courrier
// Routes préfixées par /services/domiciliation.

const BASE = `${API}/services/domiciliation`;

export type DomiciliationBillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type MailForwardingMode =
  | "HOLD"
  | "FORWARD"
  | "SCAN_AND_FORWARD"
  | "SCAN_ONLY";

export type DomiciliationContractStatus =
  | "DRAFT"
  | "PENDING_DOCUMENTS"
  | "PENDING_SIGNATURE"
  | "PENDING_REGISTRATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED"
  | "EXPIRED";

export type CertificateScope = "COMMERCIAL" | "FISCAL";

export type RegistrationStatus =
  | "PENDING"
  | "SUBMITTED"
  | "REGISTERED"
  | "REJECTED";

export type RegistrationPaidBy = "COMPANY" | "CLIENT";

export type MailItemType =
  | "LETTER"
  | "REGISTERED_LETTER"
  | "PARCEL"
  | "ADMINISTRATIVE"
  | "LEGAL_NOTICE"
  | "OTHER";

/** RECEIVED → NOTIFIED → SCANNED / COLLECTED / FORWARDED / RETURNED / DESTROYED */
export type MailItemStatus =
  | "RECEIVED"
  | "NOTIFIED"
  | "SCANNED"
  | "COLLECTED"
  | "FORWARDED"
  | "RETURNED"
  | "DESTROYED";

// ─── Adresses ─────────────────────────────────────────────────────────────────

export interface AddressRequest {
  streetNumber?: string;
  streetName: string;
  district?: string;
  city: string;
  countryCode: string;
}

export interface DomiciliationAddressView {
  code: string;
  label: string;
  streetNumber?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
  countryCode?: string | null;
  fiscalCapable: boolean;
  maxOccupants?: number | null;
  occupants?: number | null;
  active: boolean;
  notes?: string | null;
}

export interface CreateDomiciliationAddressRequest {
  label: string;
  address: AddressRequest;
  fiscalCapable: boolean;
  maxOccupants?: number | null;
  notes?: string;
}

export interface UpdateDomiciliationAddressRequest {
  label?: string;
  fiscalCapable?: boolean;
  maxOccupants?: number | null;
  active?: boolean;
  notes?: string;
}

// ─── Contrat ──────────────────────────────────────────────────────────────────

export interface OpenDomiciliationContractRequest {
  subscriptionNumber: string;
  /**
   * Pour une organisation, sa fiche fait foi : ces cinq champs sont facultatifs
   * et ne servent qu'à compléter une fiche vide (ils y sont reportés).
   */
  legalName?: string;
  legalForm?: string;
  registrationNumber?: string;
  taxNumber?: string;
  legalRepresentativeName?: string;
  addressCode: string;
  suiteNumber?: string;
  /** Seuls trois rythmes sont admis. */
  billingCycle: DomiciliationBillingCycle;
  commitmentMonths: number;
  noticePeriodDays?: number;
  startDate: string;
  mailForwardingMode: MailForwardingMode;
}

export interface DomiciliationContractView {
  contractNumber: string;
  subscriptionNumber?: string;
  status: DomiciliationContractStatus | string;
  legalName?: string;
  legalForm?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  legalRepresentativeName?: string | null;
  addressCode?: string;
  suiteNumber?: string | null;
  billingCycle?: DomiciliationBillingCycle | string;
  commitmentMonths?: number | null;
  noticePeriodDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  mailForwardingMode?: MailForwardingMode | string;
  /** Se déduit : l'adresse n'est fiscale que sur douze mois d'engagement. */
  fiscalAddressEligible?: boolean;
  /** Passer sous douze mois révoque l'attestation fiscale en cours. */
  fiscalAddressRevokedAt?: string | null;
  contractDocumentCode?: string | null;
  signedDocumentCode?: string | null;
  certificateDocumentCode?: string | null;
  certificateScope?: CertificateScope | string | null;
  certificateValidUntil?: string | null;
  certificateInForce?: boolean;
  /** Conservation dix ans après la fin. */
  retainDocumentsUntil?: string | null;
  [key: string]: unknown;
}

export interface DomiciliationRegistrationView {
  registrationNumber?: string;
  contractNumber?: string;
  status: RegistrationStatus | string;
  administrationOffice?: string | null;
  administrationReference?: string | null;
  stampDutyAmount?: number | null;
  registrationFeeAmount?: number | null;
  paidBy?: RegistrationPaidBy | string | null;
  rebilled?: boolean;
  registrationDate?: string | null;
  expiresAt?: string | null;
  [key: string]: unknown;
}

export interface SubmitRegistrationRequest {
  administrationOffice: string;
  stampDutyAmount?: number;
  registrationFeeAmount?: number;
  paidBy: RegistrationPaidBy;
  rebilled?: boolean;
}

export interface ConfirmRegistrationRequest {
  administrationReference: string;
  registrationDate: string;
  expiresAt?: string | null;
  receiptDocumentCode?: string;
  registeredDocumentCode?: string;
}

// ─── Courrier ─────────────────────────────────────────────────────────────────

export interface ReceiveMailRequest {
  mailType: MailItemType;
  senderName?: string;
  senderReference?: string;
  weightGrams?: number;
  dimensions?: string;
  notes?: string;
}

export interface MailItemView {
  itemNumber: string;
  contractNumber?: string;
  mailType?: MailItemType | string;
  status: MailItemStatus | string;
  senderName?: string | null;
  senderReference?: string | null;
  weightGrams?: number | null;
  dimensions?: string | null;
  notes?: string | null;
  /** Quand la garde devient payante. */
  storageDeadline?: string | null;
  billable?: boolean;
  billedAmount?: number | null;
  /** Membre qui a retiré le pli, pour une organisation. */
  collectedByMember?: string | null;
  [key: string]: unknown;
}

export interface MailTrailEvent {
  eventType: string;
  actor?: string | null;
  details?: string | null;
  occurredAt: string;
}

const enc = encodeURIComponent;

export const domiciliationService = {
  // ── Adresses ───────────────────────────────────────────────────────────────

  getAddresses: async (): Promise<DomiciliationAddressView[]> =>
    toList<DomiciliationAddressView>(
      (await apiClient.get(`${BASE}/addresses`)).data,
    ),

  createAddress: async (
    data: CreateDomiciliationAddressRequest,
  ): Promise<DomiciliationAddressView> =>
    (await apiClient.post(`${BASE}/addresses`, data)).data,

  updateAddress: async (
    code: string,
    data: UpdateDomiciliationAddressRequest,
  ): Promise<DomiciliationAddressView> =>
    (await apiClient.patch(`${BASE}/addresses/${enc(code)}`, data)).data,

  // ── Contrats : cycle à trois verrous ───────────────────────────────────────

  openContract: async (
    data: OpenDomiciliationContractRequest,
  ): Promise<DomiciliationContractView> =>
    (await apiClient.post(`${BASE}/contracts`, data)).data,

  getContracts: async (
    params?: PageParams & { status?: DomiciliationContractStatus | string },
  ): Promise<PageResult<DomiciliationContractView>> =>
    toPage<DomiciliationContractView>(
      (await apiClient.get(`${BASE}/contracts`, { params })).data,
      params?.size,
    ),

  getContract: async (
    contractNumber: string,
  ): Promise<DomiciliationContractView> =>
    (await apiClient.get(`${BASE}/contracts/${enc(contractNumber)}`)).data,

  /**
   * Verrou 1 : pièces KYC du représentant. Génère le contrat PDF
   * (PENDING_SIGNATURE) ou laisse en PENDING_DOCUMENTS. Refus explicite en
   * 409 : « pièces d'identité du représentant légal à vérifier ».
   */
  prepareContract: async (
    contractNumber: string,
  ): Promise<DomiciliationContractView> =>
    (await apiClient.post(`${BASE}/contracts/${enc(contractNumber)}/prepare`))
      .data,

  /** Contrat signé déposé → PENDING_REGISTRATION, démarche ouverte. */
  markContractSigned: async (
    contractNumber: string,
    signedDocumentCode: string,
  ): Promise<DomiciliationContractView> =>
    (
      await apiClient.post(`${BASE}/contracts/${enc(contractNumber)}/signed`, {
        signedDocumentCode,
      })
    ).data,

  getContractRegistrations: async (
    contractNumber: string,
  ): Promise<DomiciliationRegistrationView[]> =>
    toList<DomiciliationRegistrationView>(
      (
        await apiClient.get(
          `${BASE}/contracts/${enc(contractNumber)}/registrations`,
        )
      ).data,
    ),

  submitRegistration: async (
    contractNumber: string,
    data: SubmitRegistrationRequest,
  ): Promise<DomiciliationRegistrationView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/registration/submit`,
        data,
      )
    ).data,

  /** Verrou 2 : enregistrement confirmé → contrat ACTIVE. */
  confirmRegistration: async (
    contractNumber: string,
    data: ConfirmRegistrationRequest,
  ): Promise<DomiciliationContractView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/registration/confirm`,
        data,
      )
    ).data,

  /** Une nouvelle démarche s'ouvre après rejet. */
  rejectRegistration: async (
    contractNumber: string,
    reason: string,
  ): Promise<DomiciliationRegistrationView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/registration/reject`,
        { reason },
      )
    ).data,

  /** Tableau des dossiers d'enregistrement en cours. */
  getRegistrationsInProgress: async (
    params?: PageParams,
  ): Promise<PageResult<DomiciliationRegistrationView>> =>
    toPage<DomiciliationRegistrationView>(
      (await apiClient.get(`${BASE}/registrations/in-progress`, { params }))
        .data,
      params?.size,
    ),

  /**
   * Verrou 3 : attestation. Sans enregistrement confirmé, refus ; FISCAL
   * exige l'éligibilité (douze mois d'engagement) : « seule une attestation
   * commerciale peut être délivrée » sinon.
   */
  issueCertificate: async (
    contractNumber: string,
    scope: CertificateScope,
  ): Promise<DomiciliationContractView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/certificate`,
        { scope },
      )
    ).data,

  /** Recalcule la qualité fiscale ; sous douze mois, l'attestation fiscale est révoquée. */
  updateCommitment: async (
    contractNumber: string,
    data: {
      billingCycle: DomiciliationBillingCycle;
      commitmentMonths: number;
    },
  ): Promise<DomiciliationContractView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/commitment`,
        data,
      )
    ).data,

  terminateContract: async (
    contractNumber: string,
    data: { reason: string; effectiveDate: string },
  ): Promise<DomiciliationContractView> =>
    (
      await apiClient.post(
        `${BASE}/contracts/${enc(contractNumber)}/terminate`,
        data,
      )
    ).data,

  /** Registre des domiciliés (CSV). */
  exportRegistry: async (): Promise<Blob> =>
    (await apiClient.get(`${BASE}/registry`, { responseType: "blob" })).data,

  // ── Courrier ───────────────────────────────────────────────────────────────

  receiveMail: async (
    contractNumber: string,
    data: ReceiveMailRequest,
  ): Promise<MailItemView> =>
    (
      await apiClient.post(`${BASE}/contracts/${enc(contractNumber)}/mail`, data)
    ).data,

  getContractMail: async (
    contractNumber: string,
    params?: PageParams,
  ): Promise<PageResult<MailItemView>> =>
    toPage<MailItemView>(
      (
        await apiClient.get(`${BASE}/contracts/${enc(contractNumber)}/mail`, {
          params,
        })
      ).data,
      params?.size,
    ),

  getPendingMail: async (
    params?: PageParams,
  ): Promise<PageResult<MailItemView>> =>
    toPage<MailItemView>(
      (await apiClient.get(`${BASE}/mail/pending`, { params })).data,
      params?.size,
    ),

  getMailItem: async (itemNumber: string): Promise<MailItemView> =>
    (await apiClient.get(`${BASE}/mail/${enc(itemNumber)}`)).data,

  getMailTrail: async (itemNumber: string): Promise<MailTrailEvent[]> =>
    toList<MailTrailEvent>(
      (await apiClient.get(`${BASE}/mail/${enc(itemNumber)}/trail`)).data,
    ),

  /** Acte facturé à l'acte. */
  scanMail: async (
    itemNumber: string,
    scanDocumentCode: string,
  ): Promise<MailItemView> =>
    (
      await apiClient.post(`${BASE}/mail/${enc(itemNumber)}/scan`, {
        scanDocumentCode,
      })
    ).data,

  collectMail: async (
    itemNumber: string,
    data: {
      /** Facultatif avec collectorMemberId : le nom du membre tient lieu de collectedBy. */
      collectedBy?: string;
      /** Organisation : le gérant ou un membre autorisé à retirer le courrier. */
      collectorMemberId?: string;
      collectorIdDocument?: string;
      collectorSignatureUrl?: string;
    },
  ): Promise<MailItemView> =>
    (await apiClient.post(`${BASE}/mail/${enc(itemNumber)}/collect`, data))
      .data,

  /** Acte facturé à l'acte. */
  forwardMail: async (
    itemNumber: string,
    data: { trackingNumber?: string; transportCost?: number },
  ): Promise<MailItemView> =>
    (await apiClient.post(`${BASE}/mail/${enc(itemNumber)}/forward`, data))
      .data,

  returnMail: async (
    itemNumber: string,
    reason: string,
  ): Promise<MailItemView> =>
    (
      await apiClient.post(`${BASE}/mail/${enc(itemNumber)}/return`, { reason })
    ).data,

  destroyMail: async (
    itemNumber: string,
    reason: string,
  ): Promise<MailItemView> =>
    (
      await apiClient.post(`${BASE}/mail/${enc(itemNumber)}/destroy`, {
        reason,
      })
    ).data,
};
