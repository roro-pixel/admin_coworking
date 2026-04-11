import { apiClient } from './api';

export interface DocumentResponse {
  code: string;
  ownerId: number;
  ownerType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS';
  category: 'KYC' | 'LEGAL';
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  issueDate?: string;
  expiryDate?: string;
  uploadedBy: number;
  uploadedAt: string;
}

export interface KycCaseResponse {
  code: string;
  ownerType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS';
  ownerId: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'PENDING_CORRECTION' | 'APPROVED' | 'REJECTED';
  startedAt: string;
  submittedAt: string | null;
  documents: DocumentResponse[];
}

export const documentService = {
  // Admin : Récupérer tous les documents en attente
  getPendingDocuments: async (params?: {
    page?: number;
    size?: number;
  }): Promise<{ data: DocumentResponse[]; pageable: any }> => {
    const response = await apiClient.get('/documents', { 
      params: { status: 'PENDING_REVIEW', ...params } 
    });
    return response.data;
  },

  // Admin : Approuver un document
  approveDocument: async (code: string, reviewedBy: number, comment?: string): Promise<void> => {
    await apiClient.post(`/documents/${code}/approve`, { reviewedBy, comment });
  },

  // Admin : Rejeter un document
  rejectDocument: async (code: string, reviewedBy: number, comment: string): Promise<void> => {
    await apiClient.post(`/documents/${code}/reject`, { reviewedBy, comment });
  },
};

export const kycService = {
  // Admin : Récupérer tous les dossiers KYC
  getAllKycCases: async (params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<{ data: KycCaseResponse[]; pageable: any }> => {
    const response = await apiClient.get('/kyc/cases', { params });
    return response.data;
  },
};