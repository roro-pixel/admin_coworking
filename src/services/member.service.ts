import { apiClient } from './api';
import type { MemberResponse, MemberSummaryResponse } from '../types/member.types';

export const memberService = {
  // Récupérer tous les members
  getAllMembers: async (): Promise<MemberSummaryResponse[]> => {
    const response = await apiClient.get('/admin/members');
    return response.data;
  },

  // Récupérer un member par son ID
  getMemberById: async (memberId: string): Promise<MemberResponse> => {
    const response = await apiClient.get(`/admin/members/${memberId}`);
    return response.data;
  },

  // Changer le statut d'un member
  updateMemberStatus: async (
    memberId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ): Promise<void> => {
    await apiClient.patch(`/admin/members/${memberId}/status`, { status });
  },

  // Activer/désactiver l'accès au portail
  updatePortalAccess: async (memberId: string, portalAccess: boolean): Promise<void> => {
    await apiClient.patch(`/admin/members/${memberId}/portal-access`, { portalAccess });
  },
};