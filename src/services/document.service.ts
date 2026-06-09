import { apiClient } from "./api";

// ==================== TYPES EXISTANTS ====================

export interface DocumentType {
  code: string;
  name: string;
  category: "KYC" | "LEGAL";
  ownerType: "MEMBER" | "CUSTOMER" | "BUSINESS";
  description: string;
  documentDetails?: string;
  helpText?: string;
  required: boolean;
  requiresExpiryDate: boolean;
  requiresReview: boolean;
  multipleAllowed: boolean;
  allowedMimeTypes: string;
  maxFileSizeBytes: number;
  active: boolean;
}

export interface DocumentVersion {
  versionNumber: number;
  storageProvider: string;
  storagePath: string;
  originalFileName: string;
  storedFileName: string;
  mimeTypeDeclared: string;
  mimeTypeDetected: string;
  fileExtension: string;
  checksumSha256: string;
  fileSizeBytes: number;
  uploadStatus: "PENDING" | "READY" | "FAILED";
  antivirusStatus: "PENDING" | "CLEAN" | "INFECTED" | "ERROR";
  uploadedBy: number;
  uploadedAt: string;
  current: boolean;
}

export interface DocumentResponse {
  code: string;
  ownerId: number;
  ownerCode?: string;
  ownerType: string;
  category: "KYC" | "LEGAL";
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  currentVersionNumber: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  issueDate?: string;
  expiryDate?: string;
  uploadedBy: number;
  uploadedAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
}

export interface DocumentRequirement {
  id: number;
  ownerType: string;
  documentTypeCode: string;
  documentTypeName: string;
  required: boolean;
  active: boolean;
}

// ==================== NOUVEAUX TYPES KYC ====================

export type KycCaseStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PENDING_CORRECTION"
  | "RENEWAL_REQUIRED"
  | "EXPIRED";

export type KycRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type KycDocumentVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export interface KycCaseResponse {
  code: string;
  ownerType: string;
  ownerId: number;
  ownerCode?: string;
  status: KycCaseStatus;
  startedAt: string;
  submittedAt: string | null;
  completedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionComment?: string | null;
  complete?: boolean;
  approved?: boolean;
  missingDocumentTypeCodes?: string[];
  documents: DocumentResponse[];
  // Nouveaux champs
  riskLevel?: KycRiskLevel;
  kycLevel?: number;
  assignedTo?: number;
  assignedAt?: string;
  slaDeadline?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}

export interface KycDashboardResponse {
  summary: {
    totalCases: number;
    NOT_STARTED: number;
    IN_PROGRESS: number;
    SUBMITTED: number;
    UNDER_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
    PENDING_CORRECTION: number;
    RENEWAL_REQUIRED: number;
    EXPIRED: number;
  };
  byOwnerType: Array<{
    ownerType: string;
    count: number;
    pendingReview: number;
  }>;
  expiringSoon: {
    within7Days: number;
    within30Days: number;
    within60Days: number;
  };
  sla: {
    avgReviewTimeHours: number;
    casesExceeding48h: number;
    casesReviewedWithin24h: number;
  };
  recentActivity: Array<{
    action: string;
    count: number;
    period: string;
  }>;
  generatedAt: string;
}

export interface KycExpiryStatus {
  documentCode: string;
  documentType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  expired: boolean;
  status: KycDocumentVerificationStatus;
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
  rawOcrJson: {
    status: string;
    rawText?: string;
  };
}

// ==================== LABELS ====================

export const kycStatusLabels: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  PENDING_CORRECTION: "Correction demandée",
  RENEWAL_REQUIRED: "Renouvellement requis",
  EXPIRED: "Expiré",
};

export const kycRiskLevelLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  VERY_HIGH: "Très élevé",
};

export const kycRiskLevelColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  VERY_HIGH: "bg-red-100 text-red-700",
};

// ==================== SERVICES ====================

export const documentService = {
  getDocumentTypes: async (ownerType: string): Promise<DocumentType[]> => {
    const response = await apiClient.get("/sni/api/v1/document-types", {
      params: { ownerType },
    });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  getDocumentRequirements: async (
    ownerType: string,
  ): Promise<DocumentRequirement[]> => {
    const response = await apiClient.get("/sni/api/v1/document-requirements", {
      params: { ownerType },
    });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  approveDocument: async (
    code: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<void> => {
    await apiClient.post(`/sni/api/v1/documents/${code}/approve`, {
      reviewedBy,
      comment,
    });
  },

  rejectDocument: async (
    code: string,
    reviewedBy: number,
    comment: string,
    rejectionReasonCode: string = "OTHER",
  ): Promise<void> => {
    await apiClient.post(`/sni/api/v1/documents/${code}/reject`, {
      reviewedBy,
      comment,
      rejectionReasonCode,
      rejectionReasonDetail: comment,
    });
  },

  getAllDocuments: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    category?: string;
    documentTypeCode?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{
    content: DocumentResponse[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/documents", { params });
    if (Array.isArray(response.data?.data)) {
      return {
        content: response.data.data,
        totalElements:
          response.data.pageable?.totalElements ?? response.data.data.length,
        totalPages: response.data.pageable?.totalPages ?? 1,
      };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data))
      return {
        content: response.data,
        totalElements: response.data.length,
        totalPages: 1,
      };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getDocument: async (code: string): Promise<DocumentResponse> => {
    const response = await apiClient.get(`/sni/api/v1/documents/${code}`);
    return response.data;
  },

  uploadDocument: async (data: {
    ownerType: string;
    ownerCode: string;
    documentTypeCode: string;
    title: string;
    description?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    uploadedBy: string | number;
    file: File;
  }): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append("ownerType", data.ownerType);
    formData.append("ownerCode", data.ownerCode);
    formData.append("documentTypeCode", data.documentTypeCode);
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.documentNumber)
      formData.append("documentNumber", data.documentNumber);
    if (data.issueDate) formData.append("issueDate", data.issueDate);
    if (data.expiryDate) formData.append("expiryDate", data.expiryDate);
    formData.append("uploadedBy", String(data.uploadedBy));
    formData.append("file", data.file);
    const response = await apiClient.post(
      "/sni/api/v1/documents/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  replaceDocument: async (
    code: string,
    uploadedBy: number,
    file: File,
  ): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append("uploadedBy", String(uploadedBy));
    formData.append("file", file);
    const response = await apiClient.post(
      `/sni/api/v1/documents/${code}/replace`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  // Bulk review
  bulkApproveDocuments: async (
    documentCodes: string[],
    reviewedBy: number,
  ): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/kyc/documents/bulk-approve",
      { documentCodes, reviewedBy },
    );
    return response.data;
  },

  bulkRejectDocuments: async (
    items: { documentCode: string; reason: string }[],
    reviewedBy: number,
  ): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/kyc/documents/bulk-reject",
      { reviewedBy, items },
    );
    return response.data;
  },
};

export const kycService = {
  // Liste des dossiers KYC
  getAllKycCases: async (params?: {
    status?: string;
    ownerType?: string;
    submittedAfter?: string;
    submittedBefore?: string;
    reviewedBy?: number;
    pendingReviewOnly?: boolean;
    expiringWithinDays?: number;
    riskLevel?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: KycCaseResponse[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/kyc/cases", { params });
    if (Array.isArray(response.data?.data)) {
      return {
        content: response.data.data,
        totalElements:
          response.data.pageable?.totalElements ?? response.data.data.length,
        totalPages: response.data.pageable?.totalPages ?? 1,
      };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data))
      return {
        content: response.data,
        totalElements: response.data.length,
        totalPages: 1,
      };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Dashboard compliance
  getKycDashboard: async (): Promise<KycDashboardResponse> => {
    const response = await apiClient.get("/sni/api/v1/kyc/cases/dashboard");
    return response.data;
  },

  // Dossiers expirant bientôt
  getExpiringSoon: async (days: number = 30): Promise<KycCaseResponse[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/kyc/cases/expiring-soon",
      { params: { days } },
    );
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Détail dossier
  getKycCase: async (code: string): Promise<KycCaseResponse> => {
    const response = await apiClient.get(`/sni/api/v1/kyc/cases/${code}`);
    return response.data;
  },

  // Création dossier
  createKycCase: async (
    ownerType: string,
    ownerCode: string,
  ): Promise<KycCaseResponse> => {
    const response = await apiClient.post("/sni/api/v1/kyc/cases", {
      ownerType,
      ownerCode,
    });
    return response.data;
  },

  // Soumettre dossier
  submitKycCase: async (code: string): Promise<void> => {
    await apiClient.post(`/sni/api/v1/kyc/cases/${code}/submit`);
  },

  // Approuver dossier
  approveKycCase: async (
    code: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<void> => {
    await apiClient.post(`/sni/api/v1/kyc/cases/${code}/approve`, {
      reviewedBy,
      comment,
    });
  },

  // Rejeter dossier
  rejectKycCase: async (
    code: string,
    reviewedBy: number,
    comment?: string,
  ): Promise<void> => {
    await apiClient.post(`/sni/api/v1/kyc/cases/${code}/reject`, {
      reviewedBy,
      comment,
    });
  },

  // Assigner dossier
  assignKycCase: async (
    code: string,
    assignedTo: number,
  ): Promise<KycCaseResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/kyc/cases/${code}/assign`,
      { assignedTo },
    );
    return response.data;
  },

  // File reviewer
  getMyQueue: async (userId?: number): Promise<KycCaseResponse[]> => {
    const params = userId ? { userId } : {};
    const response = await apiClient.get("/sni/api/v1/kyc/cases/my-queue", {
      params,
    });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Notes
  addNote: async (
    code: string,
    content: string,
    authorId: number,
    internal: boolean = true,
  ): Promise<any> => {
    const response = await apiClient.post(
      `/sni/api/v1/kyc/cases/${code}/notes`,
      { content, authorId, internal },
    );
    return response.data;
  },

  getNotes: async (code: string): Promise<KycNote[]> => {
    const response = await apiClient.get(`/sni/api/v1/kyc/cases/${code}/notes`);
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  // Timeline
  getTimeline: async (code: string): Promise<KycTimelineEvent[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/kyc/cases/${code}/timeline`,
    );
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  // Statut expiration
  getExpiryStatus: async (code: string): Promise<KycExpiryStatus[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/kyc/cases/${code}/expiry-status`,
    );
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  // Niveau de risque
  updateRiskLevel: async (
    code: string,
    riskLevel: KycRiskLevel,
    reviewedBy: number,
    comment?: string,
  ): Promise<KycCaseResponse> => {
    const response = await apiClient.patch(
      `/sni/api/v1/kyc/cases/${code}/risk-level`,
      { riskLevel, reviewedBy, comment },
    );
    return response.data;
  },

  // OCR
  getOcrResult: async (documentCode: string): Promise<KycOcrResult> => {
    const response = await apiClient.get(
      `/sni/api/v1/kyc/documents/${documentCode}/ocr-result`,
    );
    return response.data;
  },

  // Export PDF
  exportPdf: async (
    code: string,
    includeInternalNotes: boolean = false,
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/kyc/cases/${code}/export/pdf`,
      {
        params: { includeInternalNotes },
        responseType: "blob",
      },
    );
    return response.data;
  },
};
