import { apiClient } from "./api";
import type { DocumentResponse } from "./document.service";

const API = "/sni/api/v1";

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
}

/** Normalise les différentes formes de pagination renvoyées par le serveur. */
const toPage = <T>(raw: any): PaginatedResponse<T> => {
  if (Array.isArray(raw?.content)) return raw;
  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements:
        raw.pageable?.totalElements ?? raw.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? raw.totalPages ?? 1,
      page: raw.pageable?.page ?? raw.page,
      size: raw.pageable?.size ?? raw.size,
    };
  }
  if (Array.isArray(raw))
    return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};

/** Normalise une liste simple ou enveloppée. */
const toList = <T>(raw: any): T[] =>
  Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.content)
      ? raw.content
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

/** Construit la config axios : paramètres de requête et clé d'idempotence facultatifs. */
const cfg = (params?: Record<string, unknown>, idempotencyKey?: string) => {
  const clean = params
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      )
    : undefined;
  return {
    ...(clean && Object.keys(clean).length ? { params: clean } : {}),
    ...(idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : {}),
  };
};

/* ------------------------------------------------------------------ */
/* Types communs                                                      */
/* ------------------------------------------------------------------ */

/** Valeurs acceptées en écriture : le serveur refuse les autres en 400. */
export type ContractOwnerType = "MEMBER" | "CUSTOMER" | "BUSINESS";
/** Énumération complète renvoyée en lecture. */
export type DocumentOwnerType =
  | ContractOwnerType
  | "CONTRACT"
  | "INVOICE"
  | "PAYMENT"
  | "PROPOSAL"
  | "ASSET"
  | "INTERNAL";

export type ContractStatus =
  | "DRAFT"
  | "GENERATED"
  | "UNDER_REVIEW"
  | "AWAITING_SIGNATURE"
  | "SIGNED"
  | "ACTIVE"
  | "SUSPENDED"
  | "AMENDED"
  | "EXPIRED"
  | "TERMINATED"
  | "CANCELLED";
export type ContractRenewalType = "NONE" | "FIXED_TERM" | "AUTO_RENEW";
export type ContractPartyRole =
  | "BENEFICIARY"
  | "OPERATOR"
  | "SIGNATORY"
  | "BILLING_CONTACT";
export type ContractDraftStatus = "DRAFTING" | "READY" | "GENERATED";
export type ContractSectionType =
  | "PREAMBLE"
  | "ARTICLE"
  | "CLAUSE"
  | "SIGNATURE_BLOCK"
  | "ANNEXE";
export type AmendmentStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "PENDING_SIGNATURE"
  | "ACTIVE"
  | "REJECTED"
  | "CANCELLED";
export type AmendmentSectionAction = "ADD" | "MODIFY" | "REMOVE";
export type ContractVersionKind = "ORIGINAL" | "AMENDMENT" | "EXTENSION";

/* ------------------------------------------------------------------ */
/* Contrats                                                           */
/* ------------------------------------------------------------------ */

export interface ContractParty {
  partyType: ContractOwnerType;
  partyCode: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: ContractPartyRole;
  signOrder?: number;
  mustSign?: boolean;
}

/** Partie telle que renvoyée par le serveur (le type peut être élargi). */
export interface ContractPartyResponse
  extends Omit<ContractParty, "partyType"> {
  partyType: DocumentOwnerType | string;
}

export interface ContractRequest {
  title?: string;
  description?: string;
  templateCode?: string;
  ownerType?: ContractOwnerType;
  ownerCode?: string;
  businessCode?: string;
  renewalType?: ContractRenewalType;
  effectiveDate?: string;
  startDate?: string;
  endDate?: string;
  createdBy?: number;
  parties?: ContractParty[];
}

export type CreateContractRequest = Required<
  Pick<
    ContractRequest,
    "title" | "templateCode" | "ownerType" | "ownerCode" | "createdBy"
  >
> &
  ContractRequest;

/** Le serveur n'accepte ni propriétaire ni auteur à la modification. */
export type UpdateContractRequest = Partial<
  Omit<ContractRequest, "ownerType" | "ownerCode" | "createdBy">
>;

export interface ContractResponse {
  contractCode: string;
  title: string;
  description?: string | null;
  templateCode: string;
  ownerType: DocumentOwnerType | string;
  ownerCode: string;
  businessCode?: string | null;
  status: ContractStatus | string;
  renewalType?: ContractRenewalType | string;
  effectiveDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedAt?: string | null;
  activatedAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  draftDocumentCode?: string | null;
  signedDocumentCode?: string | null;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  parties?: ContractPartyResponse[];
}

/* ------------------------------------------------------------------ */
/* Modèles de contrat                                                 */
/* ------------------------------------------------------------------ */

export interface TemplateVariableDefinition {
  key: string;
  label?: string;
  /** Types listés par `getTemplatesDrafting().variableTypes`. */
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
  /** Sources listées par `getTemplatesDrafting().variableSources`. */
  source?: string;
  description?: string;
}

export interface ContractTemplateSectionRequest {
  title?: string;
  content: string;
  sectionType: ContractSectionType;
  sectionOrder?: number;
  active?: boolean;
}

export interface ContractTemplateSectionResponse {
  id: number;
  templateCode?: string;
  title?: string | null;
  content: string;
  sectionType: ContractSectionType;
  sectionOrder?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Corps de création d'un modèle (`name` obligatoire, le code est généré). */
export interface ContractTemplateRequest {
  name: string;
  description?: string;
  language?: string;
  category?: string;
  htmlContent?: string;
  cssContent?: string;
  headerHtml?: string;
  footerHtml?: string;
  variableDefinitions?: TemplateVariableDefinition[];
  /** Uniquement pris en compte à la modification (désactivation). */
  active?: boolean;
}

export interface ContractTemplateResponse {
  code: string;
  name: string;
  description?: string | null;
  language?: string;
  version?: number;
  category?: string | null;
  htmlContent?: string | null;
  cssContent?: string | null;
  headerHtml?: string | null;
  footerHtml?: string | null;
  variableDefinitions?: TemplateVariableDefinition[];
  sections?: ContractTemplateSectionResponse[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TemplateResponse = Pick<
  ContractTemplateResponse,
  "code" | "name" | "description"
>;

/** Listes de référence renvoyées en un appel pour construire les formulaires. */
export interface TemplateDraftingReference {
  templates?: ContractTemplateResponse[];
  sectionTypes?: string[];
  renewalTypes?: string[];
  partyRoles?: string[];
  statuses?: string[];
  languages?: string[];
  variableTypes?: string[];
  variableSources?: string[];
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Génération et aperçu                                               */
/* ------------------------------------------------------------------ */

export interface ContractPreviewRequest {
  templateCode: string;
  ownerType: ContractOwnerType;
  ownerCode: string;
  businessCode?: string;
  title: string;
  description?: string;
  uploadedBy?: number;
  effectiveDate?: string;
  startDate?: string;
  endDate?: string;
  signatoryName?: string;
  signatoryRole?: string;
  clauses?: string[];
  variables?: Record<string, string>;
}

export type ContractGenerateRequest = ContractPreviewRequest;

export interface ContractPreviewResponse {
  templateCode?: string;
  html: string;
}

/* ------------------------------------------------------------------ */
/* Signature électronique par lien                                    */
/* ------------------------------------------------------------------ */

/** Facultatif pour une organisation (le serveur choisit le signataire désigné). */
export interface SignatureRequest {
  signerName?: string;
  signerEmail?: string;
}

export interface ContractSigningResponse {
  token: string;
  contractCode: string;
  contractTitle: string;
  signerEmail?: string;
  signerName?: string;
  expiresAt?: string;
  signedAt?: string | null;
  revoked?: boolean;
}

export type PublicSignatureDetails = ContractSigningResponse;

export interface PublicSignatureRequest {
  accepted: boolean;
  /** Texte affiché à côté de la case, conservé comme preuve de consentement. */
  consentText: string;
}

/* ------------------------------------------------------------------ */
/* Brouillons libres                                                  */
/* ------------------------------------------------------------------ */

export type ContractDraftSectionRequest = ContractTemplateSectionRequest;

export interface ContractDraftSectionResponse {
  id: number;
  title?: string | null;
  content: string;
  sectionType: ContractSectionType;
  sectionOrder?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractDraftRequest {
  title: string;
  description?: string;
  templateCode?: string;
  ownerType?: ContractOwnerType;
  ownerCode?: string;
  businessCode?: string;
  cssContent?: string;
  headerHtml?: string;
  footerHtml?: string;
  /** Obligatoire à la création, ignoré à la modification. */
  createdBy?: number;
  sections?: ContractDraftSectionRequest[];
}

export interface ContractDraftResponse {
  code: string;
  title: string;
  description?: string | null;
  templateCode?: string | null;
  ownerType?: DocumentOwnerType | string;
  ownerCode?: string | null;
  businessCode?: string | null;
  cssContent?: string | null;
  headerHtml?: string | null;
  footerHtml?: string | null;
  status: ContractDraftStatus | string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  sections?: ContractDraftSectionResponse[];
}

/* ------------------------------------------------------------------ */
/* Avenants, versions, journal                                        */
/* ------------------------------------------------------------------ */

export interface AmendmentSectionRequest {
  action: AmendmentSectionAction;
  /** Titre ou référence de l'article visé, obligatoire pour MODIFY et REMOVE. */
  targetSectionRef?: string;
  sectionType?: ContractSectionType;
  title?: string;
  /** HTML, obligatoire pour ADD et MODIFY. */
  content?: string;
  sectionOrder?: number;
}

export interface AmendmentSectionResponse {
  id: number;
  action: AmendmentSectionAction;
  targetSectionRef?: string | null;
  sectionType?: ContractSectionType | null;
  title?: string | null;
  content?: string | null;
  sectionOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AmendmentVariableRequest {
  variableKey: string;
  previousValue?: string;
  newValue: string;
}

export interface AmendmentVariableResponse {
  id: number;
  variableKey: string;
  previousValue?: string | null;
  newValue: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposeAmendmentRequest {
  description: string;
  effectiveDate?: string;
}

export interface SignAmendmentRequest {
  signedDocumentCode?: string;
  justification?: string;
}

export interface AmendmentResponse {
  code: string;
  originalContractCode: string;
  status: AmendmentStatus | string;
  description: string;
  proposedBy?: number;
  proposedAt?: string;
  effectiveDate?: string | null;
  draftDocumentCode?: string | null;
  signedDocumentCode?: string | null;
  signedAt?: string | null;
  activatedAt?: string | null;
  reviewedBy?: number | null;
  reviewComment?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sections?: AmendmentSectionResponse[];
  variableChanges?: AmendmentVariableResponse[];
}

export interface ContractVersion {
  version: number;
  kind: ContractVersionKind | string;
  amendmentCode?: string | null;
  description?: string | null;
  effectiveDate?: string | null;
  previousEndDate?: string | null;
  endDate?: string | null;
  at?: string;
  documentCode?: string | null;
}

export interface ContractAuditEvent {
  id: number;
  contractCode: string;
  amendmentCode?: string | null;
  eventType: string;
  actorId?: number | null;
  actorType?: string | null;
  actorName?: string | null;
  occurredAt: string;
  previousHash?: string | null;
  eventHash?: string | null;
  /** Texte JSON à décoder côté écran. */
  payload?: string | null;
  justification?: string | null;
}

/* ------------------------------------------------------------------ */
/* Service                                                            */
/* ------------------------------------------------------------------ */

export const contractService = {
  /* ---------- Contrats : lecture ---------- */

  /** Gabarits utilisables pour un contrat (modèles actifs en base, sinon gabarits figés). */
  getTemplates: async (): Promise<TemplateResponse[]> =>
    toList<TemplateResponse>(
      (await apiClient.get(`${API}/contracts/templates`)).data,
    ),

  /** Listes de référence (types de section, rôles, statuts, langues, variables). */
  getTemplatesDrafting: async (): Promise<TemplateDraftingReference> =>
    (await apiClient.get(`${API}/contracts/templates-drafting`)).data,

  getContract: async (contractCode: string): Promise<ContractResponse> =>
    (await apiClient.get(`${API}/contracts/${contractCode}`)).data,

  getAllContracts: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    businessCode?: string;
    templateCode?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<ContractResponse>> =>
    toPage<ContractResponse>(
      (await apiClient.get(`${API}/contracts`, { params })).data,
    ),

  /* ---------- Contrats : écriture ---------- */

  createContract: async (
    data: CreateContractRequest,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (await apiClient.post(`${API}/contracts`, data, cfg(undefined, idempotencyKey)))
      .data,

  updateContract: async (
    contractCode: string,
    data: UpdateContractRequest,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.put(
        `${API}/contracts/${contractCode}`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  deleteContract: async (contractCode: string): Promise<void> => {
    await apiClient.delete(`${API}/contracts/${contractCode}`);
  },

  /** Changement générique de statut ; préférer les routes dédiées ci-dessous. */
  updateContractStatus: async (
    contractCode: string,
    status: ContractStatus | string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/status`,
        { status, reason },
        cfg(undefined, idempotencyKey),
      )
    ).data,

  activateContract: async (
    contractCode: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/activate`,
        undefined,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  /** Le motif voyage en paramètre de requête, pas dans le corps. */
  suspendContract: async (
    contractCode: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/suspend`,
        undefined,
        cfg({ reason }, idempotencyKey),
      )
    ).data,

  terminateContract: async (
    contractCode: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/terminate`,
        undefined,
        cfg({ reason }, idempotencyKey),
      )
    ).data,

  cancelContract: async (
    contractCode: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/cancel`,
        undefined,
        cfg({ reason }, idempotencyKey),
      )
    ).data,

  /* ---------- Relecture interne (paramètres de requête, pas de corps) ---------- */

  approveReview: async (
    contractCode: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/${contractCode}/approve`,
        undefined,
        cfg({ reviewedBy, comment }),
      )
    ).data,

  rejectReview: async (
    contractCode: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/${contractCode}/reject-review`,
        undefined,
        cfg({ reviewedBy, comment }),
      )
    ).data,

  /* ---------- Génération du PDF ---------- */

  /** Aperçu HTML sans courriel ni document : à afficher dans une iframe isolée. */
  previewContract: async (
    data: ContractPreviewRequest,
  ): Promise<ContractPreviewResponse> =>
    (await apiClient.post(`${API}/contracts/preview`, data)).data,

  /** Génération directe : produit un document, ne crée aucun contrat, et envoie un courriel au propriétaire. */
  generateContract: async (
    data: ContractGenerateRequest,
    idempotencyKey?: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/generate`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  /** Génère le PDF de la fiche ; envoie aussi un courriel « Votre contrat est prêt » au propriétaire. */
  generateDraft: async (
    contractCode: string,
    uploadedBy: string | number,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/${contractCode}/generate-draft`,
        { uploadedBy },
        cfg(undefined, idempotencyKey),
      )
    ).data,

  attachSignedDocument: async (
    contractCode: string,
    documentCode: string,
    idempotencyKey?: string,
  ): Promise<ContractResponse> =>
    (
      await apiClient.patch(
        `${API}/contracts/${contractCode}/signed-document`,
        { documentCode },
        cfg(undefined, idempotencyKey),
      )
    ).data,

  /* ---------- Signature par lien ---------- */

  requestSignature: async (
    contractCode: string,
    data: SignatureRequest,
  ): Promise<ContractSigningResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/${contractCode}/request-signing`,
        data,
      )
    ).data,

  /** Route publique : appelée sans jeton de connexion depuis la page de signature. */
  getPublicSignatureDetails: async (
    signatureToken: string,
  ): Promise<PublicSignatureDetails> =>
    (await apiClient.get(`${API}/public/contracts/sign/${signatureToken}`)).data,

  signPublicContract: async (
    signatureToken: string,
    data: PublicSignatureRequest,
  ): Promise<ContractSigningResponse> =>
    (
      await apiClient.post(
        `${API}/public/contracts/sign/${signatureToken}`,
        data,
      )
    ).data,

  /* ---------- Historique d'un contrat ---------- */

  getContractVersions: async (contractCode: string): Promise<ContractVersion[]> =>
    toList<ContractVersion>(
      (await apiClient.get(`${API}/contracts/${contractCode}/versions`)).data,
    ),

  getContractAuditEvents: async (
    contractCode: string,
  ): Promise<ContractAuditEvent[]> =>
    toList<ContractAuditEvent>(
      (await apiClient.get(`${API}/contracts/${contractCode}/audit-events`))
        .data,
    ),

  /* ---------- Avenants ---------- */

  getContractAmendments: async (
    contractCode: string,
  ): Promise<AmendmentResponse[]> =>
    toList<AmendmentResponse>(
      (await apiClient.get(`${API}/contracts/${contractCode}/amendments`)).data,
    ),

  proposeAmendment: async (
    contractCode: string,
    proposedBy: number,
    data: ProposeAmendmentRequest,
  ): Promise<AmendmentResponse> =>
    (
      await apiClient.post(
        `${API}/contracts/${contractCode}/amendments`,
        data,
        cfg({ proposedBy }),
      )
    ).data,

  getAmendment: async (amendmentCode: string): Promise<AmendmentResponse> =>
    (await apiClient.get(`${API}/amendments/${amendmentCode}`)).data,

  /** Renvoie du HTML brut (text/html), pas du JSON. */
  previewAmendment: async (amendmentCode: string): Promise<string> =>
    (
      await apiClient.get(`${API}/amendments/${amendmentCode}/preview`, {
        responseType: "text",
        headers: { Accept: "text/html" },
        transformResponse: (r: unknown) => r,
      })
    ).data as string,

  generateAmendmentPdf: async (
    amendmentCode: string,
    uploadedBy: number,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(
        `${API}/amendments/${amendmentCode}/generate-pdf`,
        undefined,
        cfg({ uploadedBy }),
      )
    ).data,

  submitAmendment: async (amendmentCode: string): Promise<AmendmentResponse> =>
    (await apiClient.post(`${API}/amendments/${amendmentCode}/submit`)).data,

  approveAmendment: async (
    amendmentCode: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<AmendmentResponse> =>
    (
      await apiClient.post(
        `${API}/amendments/${amendmentCode}/approve`,
        comment ? { comment } : undefined,
        cfg({ reviewedBy }),
      )
    ).data,

  rejectAmendment: async (
    amendmentCode: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<AmendmentResponse> =>
    (
      await apiClient.post(
        `${API}/amendments/${amendmentCode}/reject`,
        comment ? { comment } : undefined,
        cfg({ reviewedBy }),
      )
    ).data,

  signAmendment: async (
    amendmentCode: string,
    actorId: number,
    data?: SignAmendmentRequest,
  ): Promise<AmendmentResponse> =>
    (
      await apiClient.post(
        `${API}/amendments/${amendmentCode}/sign`,
        data,
        cfg({ actorId }),
      )
    ).data,

  cancelAmendment: async (
    amendmentCode: string,
    actorId: number,
    reason?: string,
  ): Promise<AmendmentResponse> =>
    (
      await apiClient.post(
        `${API}/amendments/${amendmentCode}/cancel`,
        reason ? { reason } : undefined,
        cfg({ actorId }),
      )
    ).data,

  getAmendmentSections: async (
    amendmentCode: string,
  ): Promise<AmendmentSectionResponse[]> =>
    toList<AmendmentSectionResponse>(
      (await apiClient.get(`${API}/amendments/${amendmentCode}/sections`)).data,
    ),

  addAmendmentSection: async (
    amendmentCode: string,
    data: AmendmentSectionRequest,
  ): Promise<AmendmentSectionResponse> =>
    (await apiClient.post(`${API}/amendments/${amendmentCode}/sections`, data))
      .data,

  updateAmendmentSection: async (
    amendmentCode: string,
    sectionId: number | string,
    data: Partial<AmendmentSectionRequest>,
  ): Promise<AmendmentSectionResponse> =>
    (
      await apiClient.put(
        `${API}/amendments/${amendmentCode}/sections/${sectionId}`,
        data,
      )
    ).data,

  deleteAmendmentSection: async (
    amendmentCode: string,
    sectionId: number | string,
  ): Promise<void> => {
    await apiClient.delete(
      `${API}/amendments/${amendmentCode}/sections/${sectionId}`,
    );
  },

  getAmendmentVariables: async (
    amendmentCode: string,
  ): Promise<AmendmentVariableResponse[]> =>
    toList<AmendmentVariableResponse>(
      (await apiClient.get(`${API}/amendments/${amendmentCode}/variables`)).data,
    ),

  /** Remplace toutes les variables de l'avenant : le corps est un tableau JSON brut. */
  setAmendmentVariables: async (
    amendmentCode: string,
    variables: AmendmentVariableRequest[],
  ): Promise<AmendmentVariableResponse[]> =>
    toList<AmendmentVariableResponse>(
      (
        await apiClient.put(
          `${API}/amendments/${amendmentCode}/variables`,
          variables,
        )
      ).data,
    ),

  /* ---------- Modèles de contrat ---------- */

  createTemplate: async (
    data: ContractTemplateRequest,
    idempotencyKey?: string,
  ): Promise<ContractTemplateResponse> =>
    (
      await apiClient.post(
        `${API}/contract-templates`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  getTemplate: async (code: string): Promise<ContractTemplateResponse> =>
    (await apiClient.get(`${API}/contract-templates/${code}`)).data,

  getTemplatesPage: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<ContractTemplateResponse>> =>
    toPage<ContractTemplateResponse>(
      (await apiClient.get(`${API}/contract-templates`, { params })).data,
    ),

  searchTemplates: async (
    query: string,
    params?: { page?: number; size?: number },
  ): Promise<PaginatedResponse<ContractTemplateResponse>> =>
    toPage<ContractTemplateResponse>(
      (
        await apiClient.get(`${API}/contract-templates/search`, {
          params: { query, ...params },
        })
      ).data,
    ),

  getTemplatesByCategory: async (
    category: string,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<PaginatedResponse<ContractTemplateResponse>> =>
    toPage<ContractTemplateResponse>(
      (
        await apiClient.get(
          `${API}/contract-templates/category/${encodeURIComponent(category)}`,
          { params },
        )
      ).data,
    ),

  updateTemplate: async (
    code: string,
    data: Partial<ContractTemplateRequest>,
    idempotencyKey?: string,
  ): Promise<ContractTemplateResponse> =>
    (
      await apiClient.put(
        `${API}/contract-templates/${code}`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  /** Suppression définitive ; pour masquer un modèle, utiliser `updateTemplate(code, { active: false })`. */
  deleteTemplate: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/contract-templates/${code}`);
  },

  /** Le corps est l'objet clé/valeur d'exemple lui-même, sans enveloppe. */
  previewTemplate: async (
    code: string,
    variables?: Record<string, string>,
  ): Promise<ContractPreviewResponse> =>
    (
      await apiClient.post(
        `${API}/contract-templates/${code}/preview`,
        variables ?? {},
      )
    ).data,

  /** Le serveur nomme la copie « <nom> (copie) » : aucun corps. */
  duplicateTemplate: async (code: string): Promise<ContractTemplateResponse> =>
    (await apiClient.post(`${API}/contract-templates/${code}/duplicate`)).data,

  getTemplateSections: async (
    code: string,
  ): Promise<ContractTemplateSectionResponse[]> =>
    toList<ContractTemplateSectionResponse>(
      (await apiClient.get(`${API}/contract-templates/${code}/sections`)).data,
    ),

  addTemplateSection: async (
    code: string,
    data: ContractTemplateSectionRequest,
  ): Promise<ContractTemplateSectionResponse> =>
    (await apiClient.post(`${API}/contract-templates/${code}/sections`, data))
      .data,

  /** `content` et `sectionType` restent obligatoires même pour ne changer que l'ordre. */
  updateTemplateSection: async (
    code: string,
    sectionId: number | string,
    data: ContractTemplateSectionRequest,
  ): Promise<ContractTemplateSectionResponse> =>
    (
      await apiClient.put(
        `${API}/contract-templates/${code}/sections/${sectionId}`,
        data,
      )
    ).data,

  deleteTemplateSection: async (
    code: string,
    sectionId: number | string,
  ): Promise<void> => {
    await apiClient.delete(
      `${API}/contract-templates/${code}/sections/${sectionId}`,
    );
  },

  /* ---------- Brouillons libres ---------- */

  createDraft: async (
    data: ContractDraftRequest,
    idempotencyKey?: string,
  ): Promise<ContractDraftResponse> =>
    (
      await apiClient.post(
        `${API}/contract-drafts`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  createDraftFromTemplate: async (
    templateCode: string,
    data: ContractDraftRequest,
    idempotencyKey?: string,
  ): Promise<ContractDraftResponse> =>
    (
      await apiClient.post(
        `${API}/contract-drafts/from-template/${templateCode}`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  getDraft: async (draftCode: string): Promise<ContractDraftResponse> =>
    (await apiClient.get(`${API}/contract-drafts/${draftCode}`)).data,

  /** Filtres exclusifs côté serveur : `status` l'emporte, sinon `ownerType` avec `ownerCode`. */
  getDrafts: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<ContractDraftResponse>> =>
    toPage<ContractDraftResponse>(
      (await apiClient.get(`${API}/contract-drafts`, { params })).data,
    ),

  searchDrafts: async (
    query: string,
    params?: { page?: number; size?: number },
  ): Promise<PaginatedResponse<ContractDraftResponse>> =>
    toPage<ContractDraftResponse>(
      (
        await apiClient.get(`${API}/contract-drafts/search`, {
          params: { query, ...params },
        })
      ).data,
    ),

  /** Envoyer `sections` remplace toutes les sections du brouillon. */
  updateDraft: async (
    draftCode: string,
    data: Partial<Omit<ContractDraftRequest, "templateCode" | "createdBy">>,
    idempotencyKey?: string,
  ): Promise<ContractDraftResponse> =>
    (
      await apiClient.put(
        `${API}/contract-drafts/${draftCode}`,
        data,
        cfg(undefined, idempotencyKey),
      )
    ).data,

  updateDraftStatus: async (
    draftCode: string,
    status: ContractDraftStatus | string,
  ): Promise<ContractDraftResponse> =>
    (
      await apiClient.patch(
        `${API}/contract-drafts/${draftCode}/status`,
        undefined,
        cfg({ status }),
      )
    ).data,

  deleteDraft: async (draftCode: string): Promise<void> => {
    await apiClient.delete(`${API}/contract-drafts/${draftCode}`);
  },

  addDraftSection: async (
    draftCode: string,
    data: ContractDraftSectionRequest,
  ): Promise<ContractDraftSectionResponse> =>
    (await apiClient.post(`${API}/contract-drafts/${draftCode}/sections`, data))
      .data,

  /** `content` et `sectionType` restent obligatoires même pour ne changer que l'ordre. */
  updateDraftSection: async (
    draftCode: string,
    sectionId: number | string,
    data: ContractDraftSectionRequest,
  ): Promise<ContractDraftSectionResponse> =>
    (
      await apiClient.put(
        `${API}/contract-drafts/${draftCode}/sections/${sectionId}`,
        data,
      )
    ).data,

  deleteDraftSection: async (
    draftCode: string,
    sectionId: number | string,
  ): Promise<void> => {
    await apiClient.delete(
      `${API}/contract-drafts/${draftCode}/sections/${sectionId}`,
    );
  },

  previewDraft: async (
    draftCode: string,
    variables?: Record<string, string>,
  ): Promise<ContractPreviewResponse> =>
    (
      await apiClient.post(
        `${API}/contract-drafts/${draftCode}/preview`,
        variables ? { variables } : undefined,
      )
    ).data,

  /** Produit le PDF du brouillon (passe en GENERATED) ; ne crée ni ne met à jour aucun contrat. */
  generateDraftPdf: async (
    draftCode: string,
    uploadedBy?: number,
    variables?: Record<string, string>,
    idempotencyKey?: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(
        `${API}/contract-drafts/${draftCode}/generate`,
        variables ? { variables } : undefined,
        cfg({ uploadedBy }, idempotencyKey),
      )
    ).data,
};
