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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  portalAccess: boolean;
}
