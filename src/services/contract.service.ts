import { apiClient } from './api';

export interface ContractParty {
  partyType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS';
  partyCode: string;
  displayName: string;
  email: string;
  phone?: string;
  role: 'SIGNATORY' | 'BENEFICIARY' | 'WITNESS';
  signOrder: number;
  mustSign: boolean;
  signedAt?: string;
}

export interface CreateContractRequest {
  title: string;
  description?: string;
  templateCode: string;
  ownerType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS';
  ownerCode: string;
  businessCode?: string;
  renewalType: 'FIXED_TERM' | 'AUTO_RENEW' | 'INDEFINITE';
  effectiveDate: string;
  startDate: string;
  endDate?: string;
  createdBy: number;
  parties: Omit<ContractParty, 'signedAt'>[];
}

export interface ContractResponse {
  contractCode: string;
  title: string;
  description?: string;
  templateCode: string;
  ownerType: string;
  ownerCode: string;
  businessCode?: string;
  status: string;
  renewalType: string;
  effectiveDate: string;
  startDate: string;
  endDate?: string;
  draftDocumentCode?: string;
  signedDocumentCode?: string;
  signedAt?: string;
  activatedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  parties: ContractParty[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateResponse {
  code: string;
  name: string;
  description: string;
}

export const contractService = {
  // Templates
  getTemplates: async (): Promise<TemplateResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/contracts/templates');
    return response.data;
  },

  // Preview HTML
  previewContract: async (data: any): Promise<string> => {
    const response = await apiClient.post('/sni/api/v1/contracts/preview', data);
    return response.data.html;
  },

  // Generate PDF (sans sauvegarde)
  generateContract: async (data: any): Promise<Blob> => {
    const response = await apiClient.post('/sni/api/v1/contracts/generate', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  // CRUD
  createContract: async (data: CreateContractRequest): Promise<ContractResponse> => {
    const response = await apiClient.post('/sni/api/v1/contracts', data);
    return response.data;
  },

  getContract: async (contractCode: string): Promise<ContractResponse> => {
    const response = await apiClient.get(`/sni/api/v1/contracts/${contractCode}`);
    return response.data;
  },

  getAllContracts: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    businessCode?: string;
    templateCode?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ data: ContractResponse[]; pageable: { page: number; size: number; totalPages: number; totalElements: number } }> => {
    const response = await apiClient.get('/sni/api/v1/contracts', { params });
    if (response.data?.data !== undefined) return response.data;
    if (Array.isArray(response.data?.content)) {
      return { data: response.data.content, pageable: { page: params?.page || 0, size: params?.size || 20, totalPages: response.data.totalPages || 1, totalElements: response.data.totalElements || response.data.content.length } };
    }
    if (Array.isArray(response.data)) {
      return { data: response.data, pageable: { page: 0, size: response.data.length, totalPages: 1, totalElements: response.data.length } };
    }
    return { data: [], pageable: { page: 0, size: 20, totalPages: 0, totalElements: 0 } };
  },

  updateContract: async (contractCode: string, data: Partial<CreateContractRequest>): Promise<ContractResponse> => {
    const response = await apiClient.put(`/sni/api/v1/contracts/${contractCode}`, data);
    return response.data;
  },

  deleteContract: async (contractCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/contracts/${contractCode}`);
  },

  // Workflow
  updateContractStatus: async (contractCode: string, status: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/status`, { status });
  },

  activateContract: async (contractCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/activate`);
  },

  suspendContract: async (contractCode: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/suspend`, { reason });
  },

  terminateContract: async (contractCode: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/terminate`, { reason });
  },

  cancelContract: async (contractCode: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/cancel`, { reason });
  },

  // Documents
  generateDraft: async (contractCode: string, uploadedBy: string | number): Promise<ContractResponse> => {
    const response = await apiClient.post(
      `/sni/api/v1/contracts/${contractCode}/generate-draft`,
      { uploadedBy }
    );
    return response.data;
  },

  attachSignedDocument: async (contractCode: string, documentCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/signed-document`, { documentCode });
  },
};