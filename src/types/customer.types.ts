export interface AddressResponse {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerResponse {
  customerId: string;
  type: "INDIVIDUAL" | "COMPANY";
  firstname?: string;
  lastname?: string;
  companyName?: string;
  email: string;
  billingEmail?: string;
  phone?: string;
  whatsappPhone?: string;
  address?: AddressResponse;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface CustomerSummaryResponse {
  id: number;
  customerId: string;
  displayName: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
