import { apiClient } from './api';
import type { CustomerResponse, CustomerSummaryResponse } from '../types/customer.types';

export const customerService = {
  // Récupérer tous les customers
  getAllCustomers: async (): Promise<CustomerSummaryResponse[]> => {
    const response = await apiClient.get('/admin/customers');
    return response.data;
  },

  // Récupérer un customer par son ID
  getCustomerById: async (customerId: string): Promise<CustomerResponse> => {
    const response = await apiClient.get(`/admin/customers/${customerId}`);
    return response.data;
  },

  // Changer le statut d'un customer
  updateCustomerStatus: async (
    customerId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ): Promise<void> => {
    await apiClient.patch(`/admin/customers/${customerId}/status`, { status });
  },
};