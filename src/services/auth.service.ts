import { apiClient } from './api';
import type { AdminLoginRequest, AdminLoginResponse } from '../types/auth.types';

export const authService = {
  login: async (credentials: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post('/admin/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/admin/auth/logout');
  },
};