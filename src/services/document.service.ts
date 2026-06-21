import { apiClient } from "./api";

// ==================== HELPERS ====================
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  pageable?: any;
  sort?: any;
  numberOfElements?: number;
}

const toPage = <T>(raw: any): PaginatedResponse<T> => {
  if (Array.isArray(raw?.content)) return raw;
  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements:
        raw.pageable?.totalElements ?? raw.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? raw.totalPages ?? 1,
      size: raw.pageable?.size ?? raw.size,
      number: raw.pageable?.page ?? raw.page,
      pageable: raw.pageable,
    };
  }
  if (Array.isArray(raw))
    return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};

const toList = <T>(raw: any): T[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const downloadBlob = async (url: string, params?: any): Promise<Blob> => {
  const response = await apiClient.get(url, { params, responseType: "blob" });
  return response.data;
};

// ==================== ENUMS ====================
export type DocumentStatus =
  | "DRAFT"
  | "UPLOADED"
  | "PENDING_REVIEW"
  | "NEEDS_CORRECTION"
  | "APPROVED"
  | "REJECTED"
  | "SIGNED"
  | "EXPIRED"
  | "ARCHIVED"
  | "SUPERSEDED";

export type DocumentSpace =
  | "KYC_SPACE"
  | "CONTRACT_SPACE"
  | "FINANCIAL_SPACE"
  | "ASSET_SPACE"
  | "ADMINISTRATIVE"
  | "GENERIC";

export type DocumentCategory =
  | "KYC"
  | "LEGAL"
  | "SYSTEM"
  | "FINANCIAL"
  | "ASSET"
  | "OTHER";
export type DocumentOwnerType =
  | "CUSTOMER"
  | "MEMBER"
  | "BUSINESS"
  | "CONTRACT"
  | "INVOICE"
  | "PAYMENT"
  | "PROPOSAL"
  | "ASSET";

export type KycCaseStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  // Compat legacy frontend/backend transitional values
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PENDING_CORRECTION"
  | "RENEWAL_REQUIRED";
export type KycRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "VERY_HIGH";
export type KycDocumentVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";
export type DocumentRetentionReference = "UPLOAD_DATE" | "EXPIRY_DATE";
export type DocumentRetentionAction = "ARCHIVE" | "PURGE_FLAG";

// ==================== DOCUMENT TYPES ====================
export interface DocumentType {
  code: string;
  name: string;
  category: DocumentCategory;
  ownerType: DocumentOwnerType;
  description?: string;
  helpText?: string;
  documentDetails?: string;
  required: boolean;
  requiresExpiryDate: boolean;
  requiresReview: boolean;
  requiresSignature?: boolean;
  multipleAllowed: boolean;
  allowedMimeTypes: string;
  maxFileSizeBytes: number;
  active: boolean;
}

export type DocumentTypeRequest = Omit<DocumentType, "active"> & {
  active?: boolean;
};

export interface DocumentRequirement {
  id: number;
  ownerType: DocumentOwnerType | string;
  documentTypeCode: string;
  documentTypeName: string;
  required: boolean;
  active: boolean;
}

export interface DocumentRequirementRequest {
  ownerType: DocumentOwnerType | string;
  documentTypeCode: string;
  required?: boolean;
  active?: boolean;
}

export interface DocumentVersion {
  versionNumber: number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  checksumSha256?: string;
  uploadedBy: number;
  uploadedAt: string;
  current: boolean;
  storageProvider?: string;
  storagePath?: string;
  originalFileName?: string;
  storedFileName?: string;
  mimeTypeDeclared?: string;
  mimeTypeDetected?: string;
  fileExtension?: string;
  fileSizeBytes?: number;
  uploadStatus?: "PENDING_SCAN" | "READY" | "QUARANTINED" | "REJECTED" | "DELETED" | "PENDING" | "FAILED";
  antivirusStatus?: "PENDING" | "CLEAN" | "INFECTED" | "ERROR";
}

export interface DocumentTag {
  code: string;
  name: string;
  color?: string;
  space?: DocumentSpace | string;
}

export interface DocumentSignature {
  id: number;
  documentCode: string;
  signerName: string;
  signerEmail?: string;
  status: "PENDING" | "SIGNED" | "EXPIRED" | string;
  requestedAt?: string;
  signedAt?: string;
  signatureImageBase64?: string;
}

export interface DocumentResponse {
  id?: number | string;
  code: string;
  ownerId?: number;
  ownerCode?: string;
  ownerType: DocumentOwnerType | string;
  category: DocumentCategory | string;
  space?: DocumentSpace | string;
  spaceReferenceCode?: string;
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  description?: string | null;
  fileName: string;
  fileUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  fileSize?: number;
  mimeType?: string;
  checksumSha256?: string;
  currentVersionNumber: number;
  status: DocumentStatus | string;
  issueDate?: string;
  expiryDate?: string;
  uploadedBy: number;
  uploadedAt: string;
  updatedAt: string;
  versions?: DocumentVersion[];
  tags?: DocumentTag[];
  metadata?: Record<string, string>;
}

export interface DocumentDashboardResponse {
  totalDocuments: number;
  pendingReview: number;
  expiredDocuments: number;
  needsCorrection: number;
  byStatus: Record<string, number>;
  bySpace: Record<string, number>;
}

export interface DocumentFolderResponse {
  ownerType: string;
  ownerCode: string;
  totalDocuments: number;
  completeness: number;
  bySpace: Record<string, DocumentResponse[]>;
  missingRequiredTypes: string[];
}

export interface DocumentAnalyticsResponse {
  generatedAt?: string;
  from?: string;
  to?: string;
  totalUploaded?: number;
  totalReviewed?: number;
  totalApproved?: number;
  totalRejected?: number;
  avgReviewHours?: number;
  byStatus?: Record<string, number>;
  bySpace?: Record<string, number>;
  byCategory?: Record<string, number>;
}

export interface DocumentRetentionPolicy {
  code: string;
  name: string;
  space?: DocumentSpace | string;
  category?: DocumentCategory | string;
  documentTypeCode?: string;
  retentionDays: number;
  retentionReference: DocumentRetentionReference;
  action: DocumentRetentionAction;
  active: boolean;
}

// ==================== KYC ====================
export interface KycCaseResponse {
  code: string;
  ownerType: DocumentOwnerType | string;
  ownerId?: number;
  ownerCode?: string;
  status: KycCaseStatus | string;
  startedAt?: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionComment?: string | null;
  complete?: boolean;
  approved?: boolean;
  missingDocumentTypeCodes?: string[];
  documents: DocumentResponse[];
  riskLevel?: KycRiskLevel | string;
  kycLevel?: number;
  assignedTo?: number;
  assignedAt?: string;
  slaDeadline?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}

export interface KycDashboardResponse {
  summary: Record<string, number> & { totalCases: number };
  byOwnerType?: Array<{
    ownerType: string;
    count: number;
    pendingReview: number;
  }>;
  expiringSoon?: {
    within7Days: number;
    within30Days: number;
    within60Days: number;
  };
  sla?: {
    avgReviewTimeHours: number;
    casesExceeding48h: number;
    casesReviewedWithin24h: number;
  };
  recentActivity?: Array<{ action: string; count: number; period: string }>;
  generatedAt?: string;
}

export interface KycExpiryStatus {
  documentCode: string;
  documentType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  expired: boolean;
  status: KycDocumentVerificationStatus | string;
}

export interface KycNote {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  internal: boolean;
  createdAt: string;
}

export interface KycTimelineEvent {
  id: number;
  eventType: string;
  description: string;
  actorId?: number;
  actorName?: string;
  occurredAt: string;
  metadata?: any;
}

export interface KycOcrResult {
  documentCode: string;
  confidenceScore: number;
  extractedDocumentNumber?: string;
  extractedExpiryDate?: string;
  rawOcrJson: { status: string; rawText?: string; [key: string]: any };
}



// ==================== GED V3 - FOLDERS / WORKFLOWS / SHARING ====================
export interface DocumentFolderTreeResponse {
  code: string;
  name: string;
  space: DocumentSpace | string;
  parentCode?: string | null;
  path?: string;
  description?: string | null;
  active?: boolean;
  children?: DocumentFolderTreeResponse[];
}

export interface DocumentFolderRequest {
  name: string;
  space: DocumentSpace | string;
  parentCode?: string;
  description?: string;
  displayOrder?: number;
  active?: boolean;
}

export interface DocumentBatchUploadRequest {
  ownerType: DocumentOwnerType | string;
  ownerCode: string;
  documentTypeCode?: string;
  folderCode?: string;
  titlePrefix?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface DocumentWorkflowRequest {
  name: string;
  description?: string;
  space?: DocumentSpace | string;
  steps?: Array<{
    name: string;
    order: number;
    assignedTo?: number;
    roleCode?: string;
    required?: boolean;
  }>;
  active?: boolean;
}

export interface DocumentWorkflowResponse extends DocumentWorkflowRequest {
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentWorkflowStatusResponse {
  documentCode: string;
  workflowCode: string;
  status: string;
  currentStep?: string;
  startedAt?: string;
  completedAt?: string;
  steps?: any[];
}

export interface DocumentShareRequest {
  expiresAt?: string;
  allowDownload?: boolean;
  password?: string;
  note?: string;
}

export interface DocumentShareResponse {
  token: string;
  targetType?: "DOCUMENT" | "FOLDER" | string;
  targetCode?: string;
  publicUrl?: string;
  expiresAt?: string | null;
  allowDownload?: boolean;
  revoked?: boolean;
  createdAt?: string;
}

export type DocumentPermission = "READ" | "WRITE" | "DELETE" | "SHARE" | "REVIEW" | string;
export type DocumentPermissionTargetType = "DOCUMENT" | "FOLDER" | string;
export type DocumentPermissionGranteeType = "USER" | "ROLE" | "TEAM" | string;

export interface DocumentPermissionRequest {
  targetType: DocumentPermissionTargetType;
  targetCode: string;
  granteeType: DocumentPermissionGranteeType;
  granteeId: number;
  permission: DocumentPermission;
  grantedBy?: number;
}

export interface DocumentPermissionResponse extends DocumentPermissionRequest {
  id?: number;
  granteeEmail?: string;
  grantedByEmail?: string;
  createdAt?: string;
}

export interface KycRequirementResponse {
  id?: number;
  caseCode?: string;
  documentTypeCode: string;
  documentTypeName?: string;
  required: boolean;
  fulfilled?: boolean;
}

export interface KycCrossValidationRuleRequest {
  name: string;
  sourceField: string;
  targetField: string;
  operator?: string;
  active?: boolean;
}

export interface KycCrossValidationRuleResponse extends KycCrossValidationRuleRequest {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== LABELS ====================
export const kycStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de revue",
  IN_REVIEW: "En revue",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
  // Compatibilité ancienne UI
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  PENDING_CORRECTION: "Correction demandée",
  RENEWAL_REQUIRED: "Renouvellement requis",
};

export const kycRiskLevelLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  CRITICAL: "Critique",
  VERY_HIGH: "Très élevé",
};

export const kycRiskLevelColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
  VERY_HIGH: "bg-red-100 text-red-700",
};

// ==================== SERVICE ====================
export const documentService = {
  // ---------- Document types ----------
  createDocumentType: async (
    data: DocumentTypeRequest,
  ): Promise<DocumentType> =>
    (await apiClient.post("/sni/api/v1/document-types", data)).data,

  updateDocumentType: async (
    code: string,
    data: Partial<DocumentTypeRequest>,
  ): Promise<DocumentType> =>
    (await apiClient.patch(`/sni/api/v1/document-types/${code}`, data)).data,

  getDocumentType: async (code: string): Promise<DocumentType> =>
    (await apiClient.get(`/sni/api/v1/document-types/${code}`)).data,

  getDocumentTypes: async (
    ownerType?: string,
    active?: boolean,
  ): Promise<DocumentType[]> =>
    toList<DocumentType>(
      (
        await apiClient.get("/sni/api/v1/document-types", {
          params: { ownerType, active },
        })
      ).data,
    ),

  activateDocumentType: async (code: string): Promise<DocumentType> =>
    (await apiClient.patch(`/sni/api/v1/document-types/${code}/activate`)).data,

  deactivateDocumentType: async (code: string): Promise<DocumentType> =>
    (await apiClient.patch(`/sni/api/v1/document-types/${code}/deactivate`))
      .data,

  deleteDocumentType: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-types/${code}`);
  },

  // ---------- Requirements ----------
  createDocumentRequirement: async (
    data: DocumentRequirementRequest,
  ): Promise<DocumentRequirement> =>
    (await apiClient.post("/sni/api/v1/document-requirements", data)).data,

  updateDocumentRequirement: async (
    id: number,
    data: Partial<DocumentRequirementRequest>,
  ): Promise<DocumentRequirement> =>
    (await apiClient.patch(`/sni/api/v1/document-requirements/${id}`, data))
      .data,

  getDocumentRequirement: async (id: number): Promise<DocumentRequirement> =>
    (await apiClient.get(`/sni/api/v1/document-requirements/${id}`)).data,

  getDocumentRequirements: async (
    ownerType?: string,
    active?: boolean,
  ): Promise<DocumentRequirement[]> =>
    toList<DocumentRequirement>(
      (
        await apiClient.get("/sni/api/v1/document-requirements", {
          params: { ownerType, active },
        })
      ).data,
    ),

  activateDocumentRequirement: async (
    id: number,
  ): Promise<DocumentRequirement> =>
    (await apiClient.patch(`/sni/api/v1/document-requirements/${id}/activate`))
      .data,

  deactivateDocumentRequirement: async (
    id: number,
  ): Promise<DocumentRequirement> =>
    (
      await apiClient.patch(
        `/sni/api/v1/document-requirements/${id}/deactivate`,
      )
    ).data,

  deleteDocumentRequirement: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-requirements/${id}`);
  },

  // ---------- Documents core ----------
  uploadDocument: async (data: {
    ownerType: string;
    ownerCode: string;
    documentTypeCode: string;
    title: string;
    description?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    uploadedBy?: string | number;
    file: File;
  }): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("ownerType", data.ownerType);
    formData.append("ownerCode", data.ownerCode);
    formData.append("documentTypeCode", data.documentTypeCode);
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.documentNumber)
      formData.append("documentNumber", data.documentNumber);
    if (data.issueDate) formData.append("issueDate", data.issueDate);
    if (data.expiryDate) formData.append("expiryDate", data.expiryDate);
    if (data.uploadedBy !== undefined)
      formData.append("uploadedBy", String(data.uploadedBy));
    return (
      await apiClient.post("/sni/api/v1/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },

  replaceDocument: async (
    code: string,
    uploadedByOrFile: number | File,
    maybeFile?: File,
  ): Promise<DocumentResponse> => {
    const file =
      uploadedByOrFile instanceof File ? uploadedByOrFile : maybeFile!;
    const uploadedBy =
      uploadedByOrFile instanceof File ? undefined : uploadedByOrFile;
    const formData = new FormData();
    formData.append("file", file);
    if (uploadedBy !== undefined)
      formData.append("uploadedBy", String(uploadedBy));
    return (
      await apiClient.post(`/sni/api/v1/documents/${code}/replace`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },

  getDocument: async (code: string): Promise<DocumentResponse> =>
    (await apiClient.get(`/sni/api/v1/documents/${code}`)).data,

  getAllDocuments: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    category?: string;
    documentTypeCode?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/documents", { params })).data,
    ),

  listDocuments: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/documents", { params })).data,
    ),

  getDocumentVersions: async (code: string): Promise<DocumentVersion[]> =>
    toList<DocumentVersion>(
      (await apiClient.get(`/sni/api/v1/documents/${code}/versions`)).data,
    ),

  downloadDocument: async (code: string): Promise<Blob> =>
    downloadBlob(`/sni/api/v1/documents/${code}/download`),
  previewDocument: async (code: string): Promise<Blob> =>
    downloadBlob(`/sni/api/v1/documents/${code}/preview`),

  approveDocument: async (
    code: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(`/sni/api/v1/documents/${code}/approve`, {
        reviewedBy,
        comment,
      })
    ).data,

  rejectDocument: async (
    code: string,
    reviewedBy: number,
    comment: string,
    rejectionReasonCode?: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(`/sni/api/v1/documents/${code}/reject`, {
        reviewedBy,
        comment,
        ...(rejectionReasonCode
          ? { rejectionReasonCode, rejectionReasonDetail: comment }
          : {}),
      })
    ).data,

  requestDocumentCorrection: async (
    code: string,
    reviewedBy: number,
    correctionInstructions: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(`/sni/api/v1/documents/${code}/request-correction`, {
        reviewedBy,
        correctionInstructions,
      })
    ).data,

  archiveDocument: async (
    code: string,
    reason?: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(`/sni/api/v1/documents/${code}/archive`, null, {
        params: { reason },
      })
    ).data,

  restoreDocumentVersion: async (
    code: string,
    versionNumber: number,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(
        `/sni/api/v1/documents/${code}/versions/${versionNumber}/restore`,
      )
    ).data,

  searchDocuments: async (params?: {
    q?: string;
    space?: string;
    category?: string;
    tags?: string[];
    ownerType?: string;
    ownerCode?: string;
    statuses?: string[];
    expiresInDays?: number;
    isExpired?: boolean;
    uploadedAfter?: string;
    uploadedBefore?: string;
    metaKey?: string;
    metaValue?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/documents/search", { params })).data,
    ),

  getDocumentDashboard: async (
    space?: string,
  ): Promise<DocumentDashboardResponse> =>
    (
      await apiClient.get("/sni/api/v1/documents/dashboard", {
        params: { space },
      })
    ).data,

  getDocumentFolder: async (
    ownerType: string,
    ownerCode: string,
  ): Promise<DocumentFolderResponse> =>
    (
      await apiClient.get("/sni/api/v1/documents/folder", {
        params: { ownerType, ownerCode },
      })
    ).data,

  // ---------- Tags ----------
  createDocumentTag: async (data: DocumentTag): Promise<DocumentTag> =>
    (await apiClient.post("/sni/api/v1/document-tags", data)).data,

  updateDocumentTag: async (
    code: string,
    data: Partial<DocumentTag>,
  ): Promise<DocumentTag> =>
    (await apiClient.put(`/sni/api/v1/document-tags/${code}`, data)).data,

  getDocumentTag: async (code: string): Promise<DocumentTag> =>
    (await apiClient.get(`/sni/api/v1/document-tags/${code}`)).data,

  getDocumentTags: async (params?: {
    space?: string;
    active?: boolean;
  }): Promise<DocumentTag[]> =>
    toList<DocumentTag>(
      (await apiClient.get("/sni/api/v1/document-tags", { params })).data,
    ),

  deleteDocumentTag: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-tags/${code}`);
  },

  addTagToDocument: async (
    documentCode: string,
    tagCode: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.post(
        `/sni/api/v1/documents/${documentCode}/tags/${tagCode}`,
      )
    ).data,

  removeTagFromDocument: async (
    documentCode: string,
    tagCode: string,
  ): Promise<DocumentResponse> =>
    (
      await apiClient.delete(
        `/sni/api/v1/documents/${documentCode}/tags/${tagCode}`,
      )
    ).data,

  // ---------- Metadata ----------
  updateDocumentMetadata: async (
    code: string,
    metadata: Record<string, string>,
  ): Promise<Record<string, string>> =>
    (await apiClient.patch(`/sni/api/v1/documents/${code}/metadata`, metadata))
      .data,

  getDocumentMetadata: async (code: string): Promise<Record<string, string>> =>
    (await apiClient.get(`/sni/api/v1/documents/${code}/metadata`)).data,

  deleteDocumentMetadataKey: async (
    code: string,
    key: string,
  ): Promise<Record<string, string>> =>
    (
      await apiClient.delete(
        `/sni/api/v1/documents/${code}/metadata/${encodeURIComponent(key)}`,
      )
    ).data,

  // ---------- Signatures ----------
  createDocumentSignature: async (
    documentCode: string,
    data: { signerName: string; signerEmail?: string; expiresAt?: string },
  ): Promise<DocumentSignature> =>
    (
      await apiClient.post(
        `/sni/api/v1/documents/${documentCode}/signatures`,
        data,
      )
    ).data,

  getDocumentSignatures: async (
    documentCode: string,
  ): Promise<DocumentSignature[]> =>
    toList<DocumentSignature>(
      (await apiClient.get(`/sni/api/v1/documents/${documentCode}/signatures`))
        .data,
    ),

  signDocumentSignature: async (
    documentCode: string,
    signatureId: number,
    data: { signatureImageBase64: string; signerName?: string },
  ): Promise<DocumentSignature> =>
    (
      await apiClient.patch(
        `/sni/api/v1/documents/${documentCode}/signatures/${signatureId}/sign`,
        data,
      )
    ).data,

  // ---------- Review / analytics ----------
  getDocumentReviewQueue: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
    space?: string;
    category?: string;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/documents/review-queue", { params }))
        .data,
    ),

  getDocumentAnalytics: async (params?: {
    from?: string;
    to?: string;
    space?: string;
  }): Promise<DocumentAnalyticsResponse> =>
    (await apiClient.get("/sni/api/v1/documents/analytics", { params })).data,

  exportDocumentsCsv: async (params?: any): Promise<Blob> =>
    downloadBlob("/sni/api/v1/documents/export.csv", params),

  getDocumentAccessLogs: async (
    code: string,
    params?: { page?: number; size?: number },
  ): Promise<PaginatedResponse<any>> =>
    toPage<any>(
      (
        await apiClient.get(`/sni/api/v1/documents/${code}/access-logs`, {
          params,
        })
      ).data,
    ),

  // ---------- Retention policies ----------
  getRetentionPolicies: async (): Promise<DocumentRetentionPolicy[]> =>
    toList<DocumentRetentionPolicy>(
      (await apiClient.get("/sni/api/v1/document-retention-policies")).data,
    ),

  getRetentionPolicy: async (code: string): Promise<DocumentRetentionPolicy> =>
    (await apiClient.get(`/sni/api/v1/document-retention-policies/${code}`))
      .data,

  createRetentionPolicy: async (
    data: Omit<DocumentRetentionPolicy, "active"> & { active?: boolean },
  ): Promise<DocumentRetentionPolicy> =>
    (await apiClient.post("/sni/api/v1/document-retention-policies", data))
      .data,

  updateRetentionPolicy: async (
    code: string,
    data: Partial<DocumentRetentionPolicy>,
  ): Promise<DocumentRetentionPolicy> =>
    (
      await apiClient.put(
        `/sni/api/v1/document-retention-policies/${code}`,
        data,
      )
    ).data,

  deleteRetentionPolicy: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-retention-policies/${code}`);
  },

  // ---------- KYC cases ----------
  createKycCase: async (
    dataOrOwnerType:
      | {
          ownerType: string;
          ownerCode: string;
          riskLevel?: string;
          kycLevel?: number;
        }
      | string,
    maybeOwnerCode?: string,
  ): Promise<KycCaseResponse> => {
    const data =
      typeof dataOrOwnerType === "string"
        ? { ownerType: dataOrOwnerType, ownerCode: maybeOwnerCode! }
        : dataOrOwnerType;
    return (await apiClient.post("/sni/api/v1/kyc/cases", data)).data;
  },

  getKycCase: async (code: string): Promise<KycCaseResponse> =>
    (await apiClient.get(`/sni/api/v1/kyc/cases/${code}`)).data,

  getAllKycCases: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    assignedTo?: number;
    riskLevel?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<KycCaseResponse>> =>
    toPage<KycCaseResponse>(
      (await apiClient.get("/sni/api/v1/kyc/cases", { params })).data,
    ),

  getKycDashboard: async (): Promise<KycDashboardResponse> =>
    (await apiClient.get("/sni/api/v1/kyc/cases/dashboard")).data,

  getExpiringSoon: async (
    days?: number,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<PaginatedResponse<KycCaseResponse>> =>
    toPage<KycCaseResponse>(
      (
        await apiClient.get("/sni/api/v1/kyc/cases/expiring-soon", {
          params: { days, ...params },
        })
      ).data,
    ),

  getMyQueue: async (
    userId?: number,
    params?: { page?: number; size?: number },
  ): Promise<PaginatedResponse<KycCaseResponse>> =>
    toPage<KycCaseResponse>(
      (
        await apiClient.get("/sni/api/v1/kyc/cases/my-queue", {
          params: { userId, ...params },
        })
      ).data,
    ),

  submitKycCase: async (code: string): Promise<KycCaseResponse> =>
    (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/submit`)).data,

  approveKycCase: async (
    code: string,
    reviewedBy: number,
    decisionComment?: string,
  ): Promise<KycCaseResponse> =>
    (
      await apiClient.post(`/sni/api/v1/kyc/cases/${code}/approve`, {
        reviewedBy,
        comment: decisionComment,
      })
    ).data,

  rejectKycCase: async (
    code: string,
    reviewedBy: number,
    decisionComment: string,
  ): Promise<KycCaseResponse> =>
    (
      await apiClient.post(`/sni/api/v1/kyc/cases/${code}/reject`, {
        reviewedBy,
        comment: decisionComment,
      })
    ).data,

  getKycMissingRequirements: async (code: string): Promise<string[]> =>
    toList<string>(
      (
        await apiClient.get(
          `/sni/api/v1/kyc/cases/${code}/missing-requirements`,
        )
      ).data,
    ),

  assignKycCase: async (
    code: string,
    assignedTo: number,
  ): Promise<KycCaseResponse> =>
    (
      await apiClient.patch(`/sni/api/v1/kyc/cases/${code}/assign`, {
        assignedTo,
      })
    ).data,

  addNote: async (
    code: string,
    dataOrContent:
      | {
          content: string;
          authorId: number;
          authorName?: string;
          internal?: boolean;
        }
      | string,
    maybeAuthorId?: number,
    maybeInternal?: boolean,
  ): Promise<KycNote> => {
    const data =
      typeof dataOrContent === "string"
        ? {
            content: dataOrContent,
            authorId: maybeAuthorId!,
            internal: maybeInternal,
          }
        : dataOrContent;
    return (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/notes`, data))
      .data;
  },

  getNotes: async (code: string): Promise<KycNote[]> =>
    toList<KycNote>(
      (await apiClient.get(`/sni/api/v1/kyc/cases/${code}/notes`)).data,
    ),

  getTimeline: async (code: string): Promise<KycTimelineEvent[]> =>
    toList<KycTimelineEvent>(
      (await apiClient.get(`/sni/api/v1/kyc/cases/${code}/timeline`)).data,
    ),

  getExpiryStatus: async (code: string): Promise<KycExpiryStatus[]> =>
    toList<KycExpiryStatus>(
      (await apiClient.get(`/sni/api/v1/kyc/cases/${code}/expiry-status`)).data,
    ),

  updateRiskLevel: async (
    code: string,
    riskLevel: KycRiskLevel | string,
    reviewedBy?: number,
    note?: string,
  ): Promise<KycCaseResponse> =>
    (
      await apiClient.patch(`/sni/api/v1/kyc/cases/${code}/risk-level`, {
        riskLevel,
        reviewedBy,
        note,
      })
    ).data,

  exportPdf: async (code: string): Promise<Blob> =>
    downloadBlob(`/sni/api/v1/kyc/cases/${code}/export/pdf`),

  // ---------- KYC document review ----------
  bulkApproveDocuments: async (
    documentIds: Array<string | number>,
    reviewedBy: number,
    comment?: string,
  ): Promise<any> =>
    (
      await apiClient.post("/sni/api/v1/kyc/documents/bulk-approve", {
        documentIds,
        reviewedBy,
        comment,
      })
    ).data,

  bulkRejectDocuments: async (
    items: {
      documentId?: string | number;
      documentCode?: string;
      reason: string;
    }[],
    reviewedBy: number,
  ): Promise<any> =>
    (
      await apiClient.post("/sni/api/v1/kyc/documents/bulk-reject", {
        reviewedBy,
        items,
      })
    ).data,

  getKycDocumentReviewQueue: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (
        await apiClient.get("/sni/api/v1/kyc/documents/review-queue", {
          params,
        })
      ).data,
    ),

  getReviewedKycDocuments: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/kyc/documents/reviewed", { params }))
        .data,
    ),

  getApprovedKycDocuments: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/kyc/documents/approved", { params }))
        .data,
    ),

  getRejectedKycDocuments: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/kyc/documents/rejected", { params }))
        .data,
    ),

  getOcrResult: async (documentCode: string): Promise<KycOcrResult> =>
    (
      await apiClient.get(
        `/sni/api/v1/kyc/documents/${documentCode}/ocr-result`,
      )
    ).data,


  // ---------- Review queue by space ----------
  getReviewQueueBySpace: async (
    space: DocumentSpace | string,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get(`/sni/api/v1/review/${space}`, { params })).data,
    ),

  bulkApproveBySpace: async (
    space: DocumentSpace | string,
    documentCodes: string[],
    reviewedBy: number,
    comment?: string,
  ): Promise<any> =>
    (
      await apiClient.post(`/sni/api/v1/review/${space}/bulk-approve`, {
        documentCodes,
        reviewedBy,
        comment,
      })
    ).data,

  bulkRejectBySpace: async (
    space: DocumentSpace | string,
    items: Array<{ documentCode: string; reason: string }>,
    reviewedBy: number,
  ): Promise<any> =>
    (
      await apiClient.post(`/sni/api/v1/review/${space}/bulk-reject`, {
        items,
        reviewedBy,
      })
    ).data,

  bulkRequestCorrectionBySpace: async (
    space: DocumentSpace | string,
    items: Array<{ documentCode: string; reason: string }>,
    reviewedBy: number,
  ): Promise<any> =>
    (
      await apiClient.post(`/sni/api/v1/review/${space}/bulk-request-correction`, {
        items,
        reviewedBy,
      })
    ).data,

  // ---------- Document spaces ----------
  uploadSpaceDocument: async (
    spaceSlug: "contracts" | "financial" | "assets" | "administrative" | "general",
    file: File,
    metadata: Record<string, any>,
  ): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    return (
      await apiClient.post(`/sni/api/v1/spaces/${spaceSlug}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },

  getSpaceDocuments: async (
    spaceSlug: "contracts" | "financial" | "assets" | "administrative" | "general",
    params?: { ownerType?: string; ownerCode?: string; statuses?: string; q?: string; from?: string; to?: string; page?: number; size?: number; sort?: string },
  ): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get(`/sni/api/v1/spaces/${spaceSlug}/documents`, { params })).data,
    ),

  getSpaceDashboard: async (
    spaceSlug: "contracts" | "financial" | "assets" | "administrative" | "general",
  ): Promise<DocumentDashboardResponse> =>
    (await apiClient.get(`/sni/api/v1/spaces/${spaceSlug}/dashboard`)).data,

  // ---------- Folders ----------
  createFolder: async (data: DocumentFolderRequest): Promise<DocumentFolderTreeResponse> =>
    (await apiClient.post("/sni/api/v1/document-folders", data)).data,

  getFolder: async (code: string): Promise<DocumentFolderTreeResponse> =>
    (await apiClient.get(`/sni/api/v1/document-folders/${code}`)).data,

  updateFolder: async (
    code: string,
    data: Partial<DocumentFolderRequest>,
  ): Promise<DocumentFolderTreeResponse> =>
    (await apiClient.patch(`/sni/api/v1/document-folders/${code}`, data)).data,

  deleteFolder: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-folders/${code}`);
  },

  moveFolder: async (code: string, parentCode?: string): Promise<DocumentFolderTreeResponse> =>
    (await apiClient.post(`/sni/api/v1/document-folders/${code}/move`, { parentCode })).data,

  getRootFolders: async (params?: { space?: DocumentSpace | string }): Promise<DocumentFolderTreeResponse[]> =>
    toList<DocumentFolderTreeResponse>(
      (await apiClient.get("/sni/api/v1/document-folders/roots", { params })).data,
    ),

  getFolderChildren: async (code: string): Promise<DocumentFolderTreeResponse[]> =>
    toList<DocumentFolderTreeResponse>(
      (await apiClient.get(`/sni/api/v1/document-folders/${code}/children`)).data,
    ),

  getFolderTree: async (code: string): Promise<DocumentFolderTreeResponse> =>
    (await apiClient.get(`/sni/api/v1/document-folders/${code}/tree`)).data,

  getFolderDocuments: async (
    code: string,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get(`/sni/api/v1/document-folders/${code}/documents`, { params })).data,
    ),

  getFolderBreadcrumb: async (code: string): Promise<DocumentFolderTreeResponse[]> =>
    toList<DocumentFolderTreeResponse>(
      (await apiClient.get(`/sni/api/v1/document-folders/${code}/breadcrumb`)).data,
    ),

  moveDocumentToFolder: async (documentCode: string, folderCode?: string): Promise<DocumentResponse> =>
    (await apiClient.post(`/sni/api/v1/document-folders/${documentCode}/move-document`, { folderCode })).data,

  // ---------- Multiple upload / ZIP ----------
  uploadBatch: async (
    files: File[],
    metadata: DocumentBatchUploadRequest,
  ): Promise<DocumentResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    return toList<DocumentResponse>(
      (
        await apiClient.post("/sni/api/v1/documents/upload-batch", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data,
    );
  },

  importZip: async (file: File, metadata?: Record<string, any>): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata) formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    return (
      await apiClient.post("/sni/api/v1/documents/import-zip", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },

  // ---------- Workflows ----------
  createWorkflow: async (data: DocumentWorkflowRequest): Promise<DocumentWorkflowResponse> =>
    (await apiClient.post("/sni/api/v1/document-workflows", data)).data,

  getWorkflows: async (params?: { activeOnly?: boolean }): Promise<DocumentWorkflowResponse[]> =>
    toList<DocumentWorkflowResponse>(
      (await apiClient.get("/sni/api/v1/document-workflows", { params })).data,
    ),

  getWorkflow: async (code: string): Promise<DocumentWorkflowResponse> =>
    (await apiClient.get(`/sni/api/v1/document-workflows/${code}`)).data,

  deleteWorkflow: async (code: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/document-workflows/${code}`);
  },

  startDocumentWorkflow: async (
    documentCode: string,
    workflowCode: string,
  ): Promise<DocumentWorkflowStatusResponse> =>
    (
      await apiClient.post(`/sni/api/v1/documents/${documentCode}/start-workflow`, null, {
        params: { workflowCode },
      })
    ).data,

  approveWorkflowStep: async (documentCode: string, comment?: string): Promise<DocumentWorkflowStatusResponse> =>
    (await apiClient.post(`/sni/api/v1/documents/${documentCode}/workflow/approve`, { comment })).data,

  rejectWorkflowStep: async (documentCode: string, reason: string): Promise<DocumentWorkflowStatusResponse> =>
    (await apiClient.post(`/sni/api/v1/documents/${documentCode}/workflow/reject`, { reason })).data,

  getDocumentWorkflowStatus: async (documentCode: string): Promise<DocumentWorkflowStatusResponse> =>
    (await apiClient.get(`/sni/api/v1/documents/${documentCode}/workflow/status`)).data,

  getMyPendingWorkflowApprovals: async (params?: { page?: number; size?: number }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get("/sni/api/v1/document-workflows/my-pending", { params })).data,
    ),

  // ---------- Sharing ----------
  shareDocument: async (documentCode: string, data: DocumentShareRequest): Promise<DocumentShareResponse> =>
    (await apiClient.post(`/sni/api/v1/documents/${documentCode}/share`, data)).data,

  shareFolder: async (folderCode: string, data: DocumentShareRequest): Promise<DocumentShareResponse> =>
    (await apiClient.post(`/sni/api/v1/document-folders/${folderCode}/share`, data)).data,

  getPublicShare: async (token: string): Promise<any> =>
    (await apiClient.get(`/sni/api/v1/shares/${token}`)).data,

  revokeShare: async (token: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/shares/${token}`);
  },

  getDocumentShares: async (documentCode: string): Promise<DocumentShareResponse[]> =>
    toList<DocumentShareResponse>(
      (await apiClient.get(`/sni/api/v1/documents/${documentCode}/shares`)).data,
    ),

  // ---------- Granular permissions ----------
  grantDocumentPermission: async (data: DocumentPermissionRequest): Promise<DocumentPermissionResponse> =>
    (await apiClient.post("/sni/api/v1/document-permissions", data)).data,

  revokeDocumentPermission: async (params: DocumentPermissionRequest): Promise<void> => {
    await apiClient.delete("/sni/api/v1/document-permissions", { params });
  },

  getDocumentPermissions: async (params: {
    targetType: DocumentPermissionTargetType;
    targetCode: string;
  }): Promise<DocumentPermissionResponse[]> =>
    toList<DocumentPermissionResponse>(
      (await apiClient.get("/sni/api/v1/document-permissions", { params })).data,
    ),

  getEffectiveDocumentPermissions: async (
    userId: number,
    documentCode: string,
  ): Promise<DocumentPermission[]> =>
    toList<DocumentPermission>(
      (await apiClient.get("/sni/api/v1/document-permissions/effective", { params: { userId, documentCode } })).data,
    ),

  // ---------- Lock / unlock ----------
  lockDocument: async (code: string, reason?: string): Promise<DocumentResponse> =>
    (await apiClient.post(`/sni/api/v1/documents/${code}/lock`, { reason })).data,

  unlockDocument: async (code: string): Promise<DocumentResponse> =>
    (await apiClient.post(`/sni/api/v1/documents/${code}/unlock`)).data,

  // ---------- KYC case requirements ----------
  getKycCaseRequirements: async (code: string): Promise<KycRequirementResponse[]> =>
    toList<KycRequirementResponse>(
      (await apiClient.get(`/sni/api/v1/kyc/cases/${code}/requirements`)).data,
    ),

  addKycCaseRequirement: async (
    code: string,
    data: { documentTypeCode: string; required?: boolean },
  ): Promise<KycRequirementResponse> =>
    (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/requirements`, data)).data,

  removeKycCaseRequirement: async (code: string, documentTypeCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/kyc/cases/${code}/requirements/${documentTypeCode}`);
  },

  getKycCaseReviewQueue: async (code: string, params?: { page?: number; size?: number }): Promise<PaginatedResponse<DocumentResponse>> =>
    toPage<DocumentResponse>(
      (await apiClient.get(`/sni/api/v1/kyc/cases/${code}/review-queue`, { params })).data,
    ),

  bulkApproveKycCaseDocuments: async (
    code: string,
    documentCodes: string[],
    reviewedBy: number,
    comment?: string,
  ): Promise<any> =>
    (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/documents/bulk-approve`, { documentCodes, reviewedBy, comment })).data,

  bulkRejectKycCaseDocuments: async (
    code: string,
    items: Array<{ documentCode: string; reason: string }>,
    reviewedBy: number,
  ): Promise<any> =>
    (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/documents/bulk-reject`, { items, reviewedBy })).data,

  requestCorrectionKycCaseDocument: async (
    code: string,
    documentCode: string,
    reason: string,
    reviewedBy?: number,
  ): Promise<any> =>
    (await apiClient.post(`/sni/api/v1/kyc/cases/${code}/documents/request-correction`, { documentCode, reason, reviewedBy })).data,

  bulkDisapproveKycDocuments: async (
    items: Array<{ documentCode: string; reason: string }>,
    reviewedBy: number,
  ): Promise<any> =>
    (await apiClient.post("/sni/api/v1/kyc/documents/bulk-disapprove", { items, reviewedBy })).data,

  getKycCrossValidationRules: async (params?: { activeOnly?: boolean }): Promise<KycCrossValidationRuleResponse[]> =>
    toList<KycCrossValidationRuleResponse>(
      (await apiClient.get("/sni/api/v1/kyc/cross-validation-rules", { params })).data,
    ),

  createKycCrossValidationRule: async (data: KycCrossValidationRuleRequest): Promise<KycCrossValidationRuleResponse> =>
    (await apiClient.post("/sni/api/v1/kyc/cross-validation-rules", data)).data,

  updateKycCrossValidationRule: async (id: number, data: Partial<KycCrossValidationRuleRequest>): Promise<KycCrossValidationRuleResponse> =>
    (await apiClient.patch(`/sni/api/v1/kyc/cross-validation-rules/${id}`, data)).data,

  getKycCrossValidationRule: async (id: number): Promise<KycCrossValidationRuleResponse> =>
    (await apiClient.get(`/sni/api/v1/kyc/cross-validation-rules/${id}`)).data,

  deleteKycCrossValidationRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/kyc/cross-validation-rules/${id}`);
  },
};

export const kycService = documentService;
