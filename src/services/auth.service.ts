import { apiClient } from "./api";

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
  createdAt?: string;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  createdBy?: string;
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
  createdAt?: string;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  createdBy?: string;
  accountNonExpired?: boolean;
  credentialsNonExpired?: boolean;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  createdAt?: string;
  createdBy?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  displayName: string;
  module: string;
  action: string;
  fullPermissionName: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
}

// Clés pour localStorage
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const authService = {
  // Stockage tokens
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Login
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post(
      "/sni/api/v1/auth/login",
      credentials,
    );
    const data = response.data;
    authService.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  // Refresh token
  refreshToken: async (): Promise<LoginResponse | null> => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await apiClient.post("/sni/api/v1/auth/refresh", {
        refreshToken,
      });
      const data = response.data;
      authService.setTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      authService.clearTokens();
      throw error;
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    const refreshToken = authService.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post(
          "/sni/api/v1/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          },
        );
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    authService.clearTokens();
  },

  // Profil utilisateur connecté
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get("/sni/api/v1/auth/me");
    return response.data;
  },

  // ==================== GESTION UTILISATEURS ====================

  getUsers: async (params?: {
    email?: string;
    enabled?: boolean;
    locked?: boolean;
    deleted?: boolean;
    page?: number;
    size?: number;
  }): Promise<{
    content: AdminUser[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/admin/users", { params });
    // Gérer les deux structures possibles
    if (response.data?.content) return response.data;
    if (response.data?.data) {
      return {
        content: response.data.data,
        totalElements:
          response.data.pageable?.totalElements || response.data.data.length,
        totalPages: response.data.pageable?.totalPages || 1,
      };
    }
    return { content: response.data || [], totalElements: 0, totalPages: 0 };
  },

  searchUsers: async (query: string): Promise<AdminUser[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/admin/users/search/by-name",
      { params: { query } },
    );
    return response.data;
  },

  createUser: async (data: {
    email: string;
    generatePassword: boolean;
    password?: string;
    roleNames: string[];
  }): Promise<AdminUser> => {
    const response = await apiClient.post("/sni/api/v1/admin/users", data);
    return response.data;
  },

  getUserRoles: async (userId: string): Promise<Role[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/admin/users/${userId}/roles`,
    );
    return response.data;
  },

  assignRole: async (userId: string, roleName: string): Promise<void> => {
    await apiClient.post(`/sni/api/v1/admin/users/${userId}/roles`, {
      roleName,
    });
  },

  removeRole: async (userId: string, roleId: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/admin/users/${userId}/roles/${roleId}`);
  },

  // Activer/Désactiver un utilisateur
  enableUser: async (userId: string, enabled: boolean): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/admin/users/${userId}/enable`, {
      enabled,
    });
  },

  // Déverrouiller un utilisateur
  unlockUser: async (userId: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/admin/users/${userId}/unlock`);
  },

  // Réinitialiser le mot de passe
  resetPassword: async (
    userId: string,
    generatePassword: boolean = true,
    password?: string,
  ): Promise<{ generatedPassword?: string }> => {
    const response = await apiClient.post(
      `/sni/api/v1/admin/users/${userId}/reset-password`,
      { generatePassword, password },
    );
    return response.data;
  },

  // Supprimer un utilisateur (soft delete)
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/admin/users/${userId}`);
  },

  // ==================== GESTION ROLES ====================

  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get("/sni/api/v1/admin/roles");
    return response.data;
  },

  searchRoles: async (query: string): Promise<Role[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/admin/roles/search/by-name",
      { params: { query } },
    );
    return response.data;
  },

  createRole: async (data: {
    name: string;
    displayName: string;
    description?: string;
  }): Promise<Role> => {
    const response = await apiClient.post("/sni/api/v1/admin/roles", data);
    return response.data;
  },

  updateRole: async (
    roleId: number,
    data: { displayName?: string; description?: string },
  ): Promise<Role> => {
    const response = await apiClient.patch(
      `/sni/api/v1/admin/roles/${roleId}`,
      data,
    );
    return response.data;
  },

  deleteRole: async (roleId: number): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/admin/roles/${roleId}`);
  },

  updateRolePermissions: async (
    roleId: number,
    permissionNames: string[],
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/admin/roles/${roleId}/permission-names`,
      { permissionNames },
    );
  },

  getRolePermissions: async (roleId: number): Promise<Permission[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/admin/roles/${roleId}/permissions`,
    );
    return response.data;
  },

  // ==================== GESTION PERMISSIONS ====================

  getPermissions: async (params?: {
    activeOnly?: boolean;
    size?: number;
  }): Promise<{ content: Permission[]; totalElements: number }> => {
    const response = await apiClient.get("/sni/api/v1/admin/permissions", {
      params,
    });
    // Gérer les deux structures possibles
    if (response.data?.content) return response.data;
    if (response.data?.data) {
      return {
        content: response.data.data,
        totalElements:
          response.data.pageable?.totalElements || response.data.data.length,
      };
    }
    return { content: response.data || [], totalElements: 0 };
  },

  searchPermissions: async (query: string): Promise<Permission[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/admin/permissions/search/by-name",
      { params: { query } },
    );
    return response.data;
  },
};
