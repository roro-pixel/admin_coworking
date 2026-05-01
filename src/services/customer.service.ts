import { apiClient } from './api';

export interface Address {
  streetNumber?: string;
  streetName?: string;
  district?: string;
  city?: string;
  country?: string;
  fullAddress?: string;
}

export interface CreateCustomerRequest {
  type: 'PERSON' | 'COMPANY';
  firstname?: string;
  lastname?: string;
  companyName?: string;
  email: string;
  billingEmail?: string;
  phone: string;
  whatsappPhone?: string;
  address?: Address;
}

export interface CustomerResponse {
  customerId: string;
  type: 'PERSON' | 'COMPANY';
  firstname?: string;
  lastname?: string;
  companyName?: string;
  email: string;
  billingEmail?: string;
  phone?: string;
  whatsappPhone?: string;
  address?: Address;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface CustomerSummaryResponse {
  id: number;
  customerId: string;
  displayName: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface PaginatedResponse<T> {
  data: T[];
  pageable: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      direction: string | null;
      properties: string[];
    };
  };
}

// Interface pour la création de customer
export interface CreateCustomerResponse {
  customerId: string;
  type: 'PERSON' | 'COMPANY';
}

export const customerService = {
  // Créer un customer
  createCustomer: async (data: CreateCustomerRequest): Promise<CreateCustomerResponse> => {
    const response = await apiClient.post('/sni/api/v1/customers', data);
    return response.data;
  },

  // Récupérer un customer par ID
  getCustomerById: async (customerId: string): Promise<CustomerResponse> => {
    const response = await apiClient.get(`/sni/api/v1/customers/${customerId}`);
    return response.data;
  },

  // Récupérer un customer par email
  getCustomerByEmail: async (email: string): Promise<CustomerResponse> => {
    const response = await apiClient.get(`/sni/api/v1/customers/by-email?email=${email}`);
    return response.data;
  },

  // Liste paginée des customers
  getCustomers: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
    summary?: boolean;
  }): Promise<PaginatedResponse<CustomerResponse | CustomerSummaryResponse>> => {
    const response = await apiClient.get('/sni/api/v1/customers', { params });
    return response.data;
  },

  // Récupérer tous les customers (non paginé pour dashboard)
  getAllCustomers: async (summary?: boolean): Promise<CustomerResponse[]> => {
    const response = await apiClient.get('/sni/api/v1/customers', { 
      params: { page: 0, size: 1000, summary: summary || false } 
    });
    return response.data?.data || [];
  },


  // Mettre à jour un customer
  updateCustomer: async (customerId: string, data: Partial<CreateCustomerRequest>): Promise<CustomerResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/customers/${customerId}`, data);
    return response.data;
  },

  // Supprimer un customer
  deleteCustomer: async (customerId: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/customers/${customerId}`);
  },

//   searchCustomers: async (query: string): Promise<CustomerSummaryResponse[]> => {
//   const response = await apiClient.get(`/sni/api/v1/customers/search/basic?query=${query}`);
//   return response.data;
// },

  searchCustomers: async (query: string, type?: 'PERSON' | 'COMPANY'): Promise<CustomerSummaryResponse[]> => {
    const params = new URLSearchParams({ query });
    if (type) params.set('type', type);
    const response = await apiClient.get(`/sni/api/v1/customers/search/basic?${params.toString()}`);
    return response.data;
  },

  // Liste paginée avec summary=true 
  getCustomersPaginated: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<CustomerSummaryResponse>> => {
    const response = await apiClient.get('/sni/api/v1/customers', { 
      params: { ...params, summary: true } 
    });
    return response.data;
  },
};

