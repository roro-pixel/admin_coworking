import { apiClient } from "./api";

export interface Address {
  streetNumber?: string;
  streetName?: string;
  district?: string;
  city?: string;
  countryCode?: string;
}

// Interface pour la création de member
export interface CreateMemberRequest {
  existingCustomerId?: string;
  customerType?: "PERSON" | "COMPANY";
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  whatsappPhone?: string;
  password?: string;
  companyName?: string;
  billingEmail?: string;
  address?: Address;
  generatePassword?: boolean;
}

// Interface pour la réponse de création
export interface CreateMemberResponse {
  memberId: string;
  customerId: string;
  userId?: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  phone?: string;
  whatsappPhone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  portalAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberResponse {
  memberId: string;
  customerId: string;
  userId?: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  phone?: string;
  whatsappPhone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  portalAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSummaryResponse {
  memberId: string;
  customerId: string;
  fullName: string;
  email: string;
  phone?: string;
  whatsapp_phone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  portalAccess: boolean;
}

export interface MemberSearchPayload {
  customerId?: string;
  memberId?: string;
  code?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  status?: string;
  portalAccess?: boolean;
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

export const memberService = {
  // Création admin d'un member
  createMemberAdmin: async (
    data: CreateMemberRequest,
  ): Promise<CreateMemberResponse> => {
    const response = await apiClient.post(
      "/sni/api/v1/members/admin/create",
      data,
    );
    return response.data;
  },

  // Récupérer un member par ID
  getMemberById: async (id: string): Promise<MemberResponse> => {
    const response = await apiClient.get(`/sni/api/v1/members/${id}`);
    return response.data;
  },

  // Liste paginée des members
  getMembers: async (params?: {
    customerId?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<MemberResponse>> => {
    const response = await apiClient.get("/sni/api/v1/members", { params });
    return response.data;
  },

  // Récupérer tous les members (non paginé pour dashboard)
  getAllMembers: async (customerId?: string): Promise<MemberResponse[]> => {
    const params: { page?: number; size?: number; customerId?: string } = {
      page: 0,
      size: 1000,
    };
    if (customerId) params.customerId = customerId;
    const response = await apiClient.get("/sni/api/v1/members", { params });
    return response.data?.data || [];
  },

  // Recherche basique pour autocomplete
  // searchMembers: async (query: string): Promise<MemberSummaryResponse[]> => {
  //   const response = await apiClient.get('/sni/api/v1/members/search/basic', { params: { query } });
  //   return response.data;
  // },

  // Recherche avancée multicritères
  searchMembersAdvanced: async (
    payload: MemberSearchPayload,
    page?: number,
    size?: number,
  ): Promise<PaginatedResponse<MemberSummaryResponse>> => {
    const params: { page?: number; size?: number; sort?: string } = {};
    if (page !== undefined) params.page = page;
    if (size !== undefined) params.size = size;
    params.sort = "createdAt,desc";

    const response = await apiClient.post(
      "/sni/api/v1/members/search",
      payload,
      { params },
    );
    return response.data;
  },

  // Mettre à jour un member
  updateMember: async (
    id: string,
    data: Partial<CreateMemberRequest>,
  ): Promise<MemberResponse> => {
    const response = await apiClient.patch(`/sni/api/v1/members/${id}`, data);
    return response.data;
  },

  // Changer le statut
  updateMemberStatus: async (
    id: string,
    status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED",
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/members/${id}/status`, { status });
  },

  // Activer l'accès portail
  enablePortalAccess: async (id: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/members/${id}/portal-access/enable`);
  },

  // Désactiver l'accès portail
  disablePortalAccess: async (id: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/members/${id}/portal-access/disable`);
  },

  // Transférer vers un autre customer
  transferCustomer: async (id: string, customerId: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/members/${id}/transfer-customer`, {
      customerId,
    });
  },

  searchMembers: async (query: string): Promise<MemberSummaryResponse[]> => {
    const response = await apiClient.get("/sni/api/v1/members/search/basic", {
      params: { query },
    });
    return response.data;
  },
};
