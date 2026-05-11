import { apiClient } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: number;
  userId: string;
  email: string;
  accountEnabled: boolean;
  accountLocked: boolean;
  failedLoginAttempts: number;
  roleNames: string[];
  authorities: string[];
}

export interface AdminUser {
  id: number;
  userId: string;
  email: string;
  accountEnabled: boolean;
  accountLocked: boolean;
  failedLoginAttempts: number;
  roleNames: string[];
  generatedPassword?: string;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

export interface Permission {
  id: number;
  name: string;
  displayName: string;
  module: string;
  action: string;
  fullPermissionName: string;
  isActive: boolean;
}

export const authService = {
  // Login
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/sni/api/v1/auth/login', credentials);
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/sni/api/v1/auth/refresh', { refreshToken });
    return response.data;
  },

  // Profil utilisateur connecté
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/sni/api/v1/auth/me');
    return response.data;
  },

  // ==================== GESTION UTILISATEURS ====================

  getUsers: async (params?: { email?: string; enabled?: boolean; locked?: boolean; deleted?: boolean; page?: number; size?: number }): Promise<{ content: AdminUser[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/admin/users', { params });
    return response.data;
  },

  searchUsers: async (query: string): Promise<AdminUser[]> => {
    const response = await apiClient.get('/sni/api/v1/admin/users/search/by-name', { params: { query } });
    return response.data;
  },

  createUser: async (data: { email: string; generatePassword: boolean; password?: string; roleNames: string[] }): Promise<AdminUser> => {
    const response = await apiClient.post('/sni/api/v1/admin/users', data);
    return response.data;
  },

  getUserRoles: async (userId: string): Promise<Role[]> => {
    const response = await apiClient.get(`/sni/api/v1/admin/users/${userId}/roles`);
    return response.data;
  },

  assignRole: async (userId: string, roleName: string): Promise<void> => {
    await apiClient.post(`/sni/api/v1/admin/users/${userId}/roles`, { roleName });
  },

  removeRole: async (userId: string, roleId: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/admin/users/${userId}/roles/${roleId}`);
  },

  // ==================== GESTION ROLES ====================

  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get('/sni/api/v1/admin/roles');
    return response.data;
  },

  searchRoles: async (query: string): Promise<Role[]> => {
    const response = await apiClient.get('/sni/api/v1/admin/roles/search/by-name', { params: { query } });
    return response.data;
  },

  updateRolePermissions: async (roleId: number, permissionNames: string[]): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/admin/roles/${roleId}/permission-names`, { permissionNames });
  },

  // ==================== GESTION PERMISSIONS ====================

  getPermissions: async (params?: { activeOnly?: boolean; size?: number }): Promise<{ content: Permission[]; totalElements: number }> => {
    const response = await apiClient.get('/sni/api/v1/admin/permissions', { params });
    return response.data;
  },

  searchPermissions: async (query: string): Promise<Permission[]> => {
    const response = await apiClient.get('/sni/api/v1/admin/permissions/search/by-name', { params: { query } });
    return response.data;
  },
};