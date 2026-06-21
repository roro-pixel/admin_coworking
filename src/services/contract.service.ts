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

const toPage = <T>(raw: any): PaginatedResponse<T> => {
  if (Array.isArray(raw?.content)) return raw;
  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements: raw.pageable?.totalElements ?? raw.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? raw.totalPages ?? 1,
      page: raw.pageable?.page ?? raw.page,
      size: raw.pageable?.size ?? raw.size,
    };
  }
  if (Array.isArray(raw)) return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};

const toList = <T>(raw: any): T[] =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : Array.isArray(raw?.data) ? raw.data : [];

const idempotencyHeaders = (key?: string) =>
  key ? { headers: { "Idempotency-Key": key } } : undefined;

export type DocumentOwnerType = "CUSTOMER" | "MEMBER" | "COMPANY" | "BUSINESS";
export type ContractStatus =
  | "DRAFT"
  | "GENERATED"
  | "UNDER_REVIEW"
  | "AWAITING_SIGNATURE"
  | "SIGNED"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "TERMINATED"
  | "CANCELLED";
export type ContractRenewalType = "NONE" | "FIXED_TERM" | "AUTO_RENEW";
export type ContractPartyRole = "BENEFICIARY" | "OPERATOR" | "SIGNATORY" | "BILLING_CONTACT";
export type ContractDraftStatus = "DRAFTING" | "READY" | "GENERATED";
export type ContractSectionType = "PREAMBLE" | "ARTICLE" | "CLAUSE" | "SIGNATURE_BLOCK" | "ANNEXE";
export type VariableSource = "AUTO" | "MANUAL";

export interface ContractParty {
  partyType: DocumentOwnerType;
  partyCode: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: ContractPartyRole;
  signOrder?: number;
  mustSign?: boolean;
  signedAt?: string | null;
}

export interface ContractRequest {
  title?: string;
  description?: string;
  templateCode?: string;
  ownerType?: DocumentOwnerType;
  ownerCode?: string;
  businessCode?: string;
  renewalType?: ContractRenewalType;
  effectiveDate?: string;
  startDate?: string;
  endDate?: string;
  createdBy?: number;
  parties?: ContractParty[];
}

export type CreateContractRequest = Required<Pick<ContractRequest, "title" | "templateCode" | "ownerType" | "ownerCode" | "createdBy">> & ContractRequest;
export type UpdateContractRequest = Partial<ContractRequest>;

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
  parties?: ContractParty[];
}

export interface TemplateVariableDefinition {
  name: string;
  label?: string;
  description?: string;
  source: VariableSource | string;
  required?: boolean;
  defaultValue?: string | null;
  sampleValue?: string | null;
}

export interface ContractTemplateRequest {
  code?: string;
  name: string;
  description?: string;
  category?: string;
  contentHtml?: string;
  contentMarkdown?: string;
  active?: boolean;
  variables?: TemplateVariableDefinition[];
}

export interface ContractTemplateResponse extends ContractTemplateRequest {
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TemplateResponse = Pick<ContractTemplateResponse, "code" | "name" | "description">;

export interface ContractPreviewRequest {
  templateCode: string;
  ownerType: DocumentOwnerType;
  ownerCode: string;
  businessCode?: string;
  title?: string;
  description?: string;
  uploadedBy: number;
  effectiveDate?: string;
  startDate?: string;
  endDate?: string;
  signatoryName?: string;
  signatoryRole?: string;
  clauses?: string[];
  variables?: Record<string, string>;
}

export interface ContractPreviewResponse {
  templateCode?: string;
  html: string;
}

export interface ContractGenerateRequest extends ContractPreviewRequest {
  title: string;
}

export interface SignatureRequest {
  signerName: string;
  signerEmail: string;
  message?: string;
  expiresAt?: string;
}

export interface PublicSignatureDetails {
  contractCode: string;
  title: string;
  signerName?: string;
  signerEmail?: string;
  status?: string;
  html?: string;
  expiresAt?: string;
}

export interface PublicSignatureRequest {
  signerName: string;
  signatureImageBase64?: string;
  acceptedTerms?: boolean;
}

export interface ContractDraftSectionRequest {
  title: string;
  content: string;
  type: ContractSectionType;
  displayOrder?: number;
  variables?: Record<string, string>;
}

export interface ContractDraftRequest {
  title: string;
  description?: string;
  ownerType?: DocumentOwnerType;
  ownerCode?: string;
  businessCode?: string;
  templateCode?: string;
  createdBy?: number;
  sections?: ContractDraftSectionRequest[];
  variables?: Record<string, string>;
}

export interface ContractDraftSectionResponse extends ContractDraftSectionRequest {
  id: number;
  draftCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractDraftResponse {
  code: string;
  title: string;
  description?: string | null;
  ownerType?: DocumentOwnerType | string;
  ownerCode?: string;
  businessCode?: string;
  templateCode?: string;
  status: ContractDraftStatus | string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  sections?: ContractDraftSectionResponse[];
  variables?: Record<string, string>;
  generatedDocumentCode?: string | null;
}

export const contractService = {
  getTemplates: async (): Promise<TemplateResponse[]> =>
    toList<TemplateResponse>((await apiClient.get(`${API}/contracts/templates`)).data),

  createContract: async (data: CreateContractRequest, idempotencyKey?: string): Promise<ContractResponse> =>
    (await apiClient.post(`${API}/contracts`, data, idempotencyHeaders(idempotencyKey))).data,

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
    toPage<ContractResponse>((await apiClient.get(`${API}/contracts`, { params })).data),

  updateContract: async (contractCode: string, data: UpdateContractRequest, idempotencyKey?: string): Promise<ContractResponse> =>
    (await apiClient.put(`${API}/contracts/${contractCode}`, data, idempotencyHeaders(idempotencyKey))).data,

  deleteContract: async (contractCode: string): Promise<void> => {
    await apiClient.delete(`${API}/contracts/${contractCode}`);
  },

  updateContractStatus: async (contractCode: string, status: ContractStatus | string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/status`, { status })).data,

  activateContract: async (contractCode: string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/activate`)).data,

  suspendContract: async (contractCode: string, reason?: string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/suspend`, { reason })).data,

  terminateContract: async (contractCode: string, reason?: string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/terminate`, { reason })).data,

  cancelContract: async (contractCode: string, reason?: string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/cancel`, { reason })).data,

  approveReview: async (contractCode: string, reviewedBy: number, comment?: string): Promise<ContractResponse> =>
    (await apiClient.post(`${API}/contracts/${contractCode}/review/approve`, { reviewedBy, comment })).data,

  rejectReview: async (contractCode: string, reviewedBy: number, reason: string): Promise<ContractResponse> =>
    (await apiClient.post(`${API}/contracts/${contractCode}/review/reject`, { reviewedBy, reason })).data,

  previewContract: async (data: ContractPreviewRequest): Promise<ContractPreviewResponse> =>
    (await apiClient.post(`${API}/contracts/preview`, data)).data,

  generateContract: async (data: ContractGenerateRequest): Promise<DocumentResponse> =>
    (await apiClient.post(`${API}/contracts/generate`, data)).data,

  generateDraft: async (contractCode: string, uploadedBy: string | number): Promise<ContractResponse> =>
    (await apiClient.post(`${API}/contracts/${contractCode}/generate-draft`, { uploadedBy })).data,

  attachSignedDocument: async (contractCode: string, documentCode: string): Promise<ContractResponse> =>
    (await apiClient.patch(`${API}/contracts/${contractCode}/signed-document`, { documentCode })).data,

  requestSignature: async (contractCode: string, data: SignatureRequest): Promise<any> =>
    (await apiClient.post(`${API}/contracts/${contractCode}/signature/request`, data)).data,

  getPublicSignatureDetails: async (signatureToken: string): Promise<PublicSignatureDetails> =>
    (await apiClient.get(`${API}/public/contracts/signature/${signatureToken}`)).data,

  signPublicContract: async (signatureToken: string, data: PublicSignatureRequest): Promise<any> =>
    (await apiClient.post(`${API}/public/contracts/signature/${signatureToken}/sign`, data)).data,

  createTemplate: async (data: ContractTemplateRequest): Promise<ContractTemplateResponse> =>
    (await apiClient.post(`${API}/contract-templates`, data)).data,

  getTemplate: async (code: string): Promise<ContractTemplateResponse> =>
    (await apiClient.get(`${API}/contract-templates/${code}`)).data,

  getTemplatesPage: async (params?: { page?: number; size?: number; sort?: string; active?: boolean }): Promise<PaginatedResponse<ContractTemplateResponse>> =>
    toPage<ContractTemplateResponse>((await apiClient.get(`${API}/contract-templates`, { params })).data),

  searchTemplates: async (query: string, params?: { page?: number; size?: number }): Promise<PaginatedResponse<ContractTemplateResponse>> =>
    toPage<ContractTemplateResponse>((await apiClient.get(`${API}/contract-templates/search`, { params: { query, ...params } })).data),

  getTemplatesByCategory: async (category: string): Promise<ContractTemplateResponse[]> =>
    toList<ContractTemplateResponse>((await apiClient.get(`${API}/contract-templates/category/${category}`)).data),

  updateTemplate: async (code: string, data: Partial<ContractTemplateRequest>): Promise<ContractTemplateResponse> =>
    (await apiClient.put(`${API}/contract-templates/${code}`, data)).data,

  deleteTemplate: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/contract-templates/${code}`);
  },

  previewTemplate: async (code: string, variables?: Record<string, string>): Promise<ContractPreviewResponse> =>
    (await apiClient.post(`${API}/contract-templates/${code}/preview`, { variables })).data,

  duplicateTemplate: async (code: string, data: { code?: string; name: string; description?: string }): Promise<ContractTemplateResponse> =>
    (await apiClient.post(`${API}/contract-templates/${code}/duplicate`, data)).data,

  createDraft: async (data: ContractDraftRequest): Promise<ContractDraftResponse> =>
    (await apiClient.post(`${API}/contract-drafts`, data)).data,

  createDraftFromTemplate: async (templateCode: string, data: ContractDraftRequest): Promise<ContractDraftResponse> =>
    (await apiClient.post(`${API}/contract-drafts/from-template/${templateCode}`, data)).data,

  getDraft: async (draftCode: string): Promise<ContractDraftResponse> =>
    (await apiClient.get(`${API}/contract-drafts/${draftCode}`)).data,

  getDrafts: async (params?: { ownerType?: string; ownerCode?: string; status?: string; page?: number; size?: number; sort?: string }): Promise<PaginatedResponse<ContractDraftResponse>> =>
    toPage<ContractDraftResponse>((await apiClient.get(`${API}/contract-drafts`, { params })).data),

  searchDrafts: async (query: string, params?: { page?: number; size?: number }): Promise<PaginatedResponse<ContractDraftResponse>> =>
    toPage<ContractDraftResponse>((await apiClient.get(`${API}/contract-drafts/search`, { params: { query, ...params } })).data),

  updateDraft: async (draftCode: string, data: Partial<ContractDraftRequest>): Promise<ContractDraftResponse> =>
    (await apiClient.put(`${API}/contract-drafts/${draftCode}`, data)).data,

  updateDraftStatus: async (draftCode: string, status: ContractDraftStatus | string): Promise<ContractDraftResponse> =>
    (await apiClient.patch(`${API}/contract-drafts/${draftCode}/status`, null, { params: { status } })).data,

  deleteDraft: async (draftCode: string): Promise<void> => {
    await apiClient.delete(`${API}/contract-drafts/${draftCode}`);
  },

  addDraftSection: async (draftCode: string, data: ContractDraftSectionRequest): Promise<ContractDraftSectionResponse> =>
    (await apiClient.post(`${API}/contract-drafts/${draftCode}/sections`, data)).data,

  updateDraftSection: async (draftCode: string, sectionId: number, data: Partial<ContractDraftSectionRequest>): Promise<ContractDraftSectionResponse> =>
    (await apiClient.put(`${API}/contract-drafts/${draftCode}/sections/${sectionId}`, data)).data,

  deleteDraftSection: async (draftCode: string, sectionId: number): Promise<void> => {
    await apiClient.delete(`${API}/contract-drafts/${draftCode}/sections/${sectionId}`);
  },

  previewDraft: async (draftCode: string): Promise<ContractPreviewResponse> =>
    (await apiClient.post(`${API}/contract-drafts/${draftCode}/preview`)).data,

  generateDraftPdf: async (draftCode: string, uploadedBy?: number): Promise<DocumentResponse> =>
    (await apiClient.post(`${API}/contract-drafts/${draftCode}/generate-pdf`, { uploadedBy })).data,
};
