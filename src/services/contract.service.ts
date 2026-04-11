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
  ownerType: 'MEMBER' | 'CUSTOMER' | 'BUSINESS';
  ownerCode: string;
  businessCode?: string;
  status: 'DRAFT' | 'GENERATED' | 'UNDER_REVIEW' | 'AWAITING_SIGNATURE' | 'SIGNED' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED' | 'CANCELLED';
  renewalType: 'FIXED_TERM' | 'AUTO_RENEW' | 'INDEFINITE';
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
  // Récupérer les templates disponibles
  getTemplates: async (): Promise<TemplateResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/contracts/templates');
    return response.data;
  },

  // Créer un contrat
  createContract: async (data: CreateContractRequest): Promise<ContractResponse> => {
    const response = await apiClient.post('/sni/api/v1/contracts', data);
    return response.data;
  },

  // Récupérer un contrat
  getContract: async (contractCode: string): Promise<ContractResponse> => {
    const response = await apiClient.get(`/sni/api/v1/contracts/${contractCode}`);
    return response.data;
  },

  // Récupérer tous les contrats (paginé)
  getAllContracts: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<{ data: ContractResponse[]; pageable: any }> => {
    const response = await apiClient.get('/sni/api/v1/contracts', { params });
    return response.data;
  },

  // Mettre à jour un contrat
  updateContract: async (contractCode: string, data: Partial<CreateContractRequest>): Promise<ContractResponse> => {
    const response = await apiClient.put(`/sni/api/v1/contracts/${contractCode}`, data);
    return response.data;
  },

  // Supprimer un contrat (soft delete)
  deleteContract: async (contractCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/contracts/${contractCode}`);
  },

  // Changer le statut
  updateContractStatus: async (contractCode: string, status: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/status`, { status });
  },

  // Activer un contrat
  activateContract: async (contractCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/activate`);
  },

  // Suspendre un contrat
  suspendContract: async (contractCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/suspend`);
  },

  // Résilier un contrat
  terminateContract: async (contractCode: string, reason?: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/terminate`, { reason });
  },

  // Annuler un contrat
  cancelContract: async (contractCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/contracts/${contractCode}/cancel`);
  },

  // Générer le brouillon PDF
  generateDraft: async (contractCode: string, uploadedBy: number): Promise<Blob> => {
    const response = await apiClient.post(
      `/sni/api/v1/contracts/${contractCode}/generate-draft`,
      { uploadedBy },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Prévisualiser le contrat en HTML
  previewContract: async (data: {
    templateCode: string;
    ownerType: string;
    ownerCode: string;
    title: string;
    effectiveDate: string;
    startDate: string;
    endDate?: string;
    variables?: Record<string, string>;
  }): Promise<string> => {
    const response = await apiClient.post('/sni/api/v1/contracts/preview', data);
    return response.data.html;
  },
};