import { apiClient } from './api';

export type BillingDocumentType = 
  | 'QUOTE' | 'PROFORMA_INVOICE' | 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
export type BillingDocumentStatus = 
  | 'DRAFT' | 'ISSUED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  | 'CONVERTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  | 'VOIDED' | 'REFUNDED' | 'WRITTEN_OFF';
export type BillingLineType = 
  | 'SERVICE' | 'PRODUCT' | 'BOOKING' | 'SUBSCRIPTION' | 'PASS'
  | 'ADDON' | 'OVERAGE' | 'DISCOUNT' | 'FEE' | 'OTHER';

export interface BillingLine {
  lineType: BillingLineType;
  itemCode?: string;
  description: string;
  detailedDescription?: string;
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  taxable: boolean;
  vatRate?: number;
  additionalCentRate?: number;
  sourceType?: string;
  sourceCode?: string;
}

export interface BillingDiscount {
  discountCode?: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
}

export interface BillingClause {
  clauseCode?: string;
  title: string;
  body: string;
  displayOrder: number;
}

export interface BillingTax {
  taxType: string;
  taxRate: number;
  baseAmount: number;
  amount: number;
}

export interface BillingDocument {
  documentNumber: string;
  documentType: BillingDocumentType;
  status: BillingDocumentStatus;
  title: string;
  description?: string;
  customerType?: string;
  customerCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddressJson?: string;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  additionalCentAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate?: string;
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  lines: BillingLine[];
  discounts: BillingDiscount[];
  taxes: BillingTax[];
  clauses: BillingClause[];
  sourceType?: string;
  sourceCode?: string;
  // Champs enrichis MD
  resolvedSourceType?: string;
  resolvedSourceCode?: string;
  resolvedSourceLabel?: string;
  resolvedSourceRegistered?: boolean;
  metadataJson?: string;
}

// const extractData = <T,>(response: any): T[] => {
//   if (Array.isArray(response)) return response;
//   if (response?.data && Array.isArray(response.data)) return response.data;
//   if (response?.content && Array.isArray(response.content)) return response.content;
//   return [];
// };

export const billingService = {
  // Get documents list
  getDocuments: async (params?: {
    type?: string;
    status?: string;
    customerType?: string;
    customerCode?: string;
    sourceType?: string;
    sourceCode?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ content: BillingDocument[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/billing/documents', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Get document by number
  getDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.get(`/sni/api/v1/billing/documents/${documentNumber}`);
    return response.data;
  },

  // Create manual invoice
  createManualInvoice: async (data: any): Promise<BillingDocument> => {
    const response = await apiClient.post('/sni/api/v1/billing/invoices/manual', data);
    return response.data;
  },

  // Create manual quote
  createManualQuote: async (data: any): Promise<BillingDocument> => {
    const response = await apiClient.post('/sni/api/v1/billing/quotes/manual', data);
    return response.data;
  },

  // Create invoice from billable items
  createInvoiceFromBillableItems: async (data: {
    title?: string;
    description?: string;
    issueDate: string;
    dueDate?: string;
    billableNumbers: string[];
  }): Promise<BillingDocument> => {
    const response = await apiClient.post('/sni/api/v1/billing/invoices/from-billable-items', data);
    return response.data;
  },

  // Issue document
  issueDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(`/sni/api/v1/billing/documents/${documentNumber}/issue`);
    return response.data;
  },

  // Send document
  sendDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(`/sni/api/v1/billing/documents/${documentNumber}/send`);
    return response.data;
  },

  // Send email
  sendEmail: async (documentNumber: string): Promise<void> => {
    await apiClient.post(`/sni/api/v1/billing/documents/${documentNumber}/send-email`);
  },

  // Get PDF
  getPdf: async (documentNumber: string): Promise<Blob> => {
    const response = await apiClient.get(`/sni/api/v1/billing/documents/${documentNumber}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Accept quote
  acceptQuote: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(`/sni/api/v1/billing/quotes/${quoteNumber}/accept`);
    return response.data;
  },

  // Reject quote
  rejectQuote: async (quoteNumber: string, reason?: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(`/sni/api/v1/billing/quotes/${quoteNumber}/reject`, { reason });
    return response.data;
  },

  // Convert quote to invoice
  convertToInvoice: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.post(`/sni/api/v1/billing/quotes/${quoteNumber}/convert-to-invoice`);
    return response.data;
  },

  // Create credit note
  createCreditNote: async (invoiceNumber: string, data: {
    amount: number;
    reason: string;
    createdBy: string;
  }): Promise<BillingDocument> => {
    const response = await apiClient.post(`/sni/api/v1/billing/invoices/${invoiceNumber}/credit-note`, data);
    return response.data;
  },

  // Apply credit note
  applyCreditNote: async (creditNoteNumber: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/billing/credit-notes/${creditNoteNumber}/apply`);
  },

  // Get customer statement
  getCustomerStatement: async (customerType: string, customerCode: string, params?: { page?: number; size?: number; sort?: string }): Promise<{ content: BillingDocument[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get(`/sni/api/v1/billing/customers/${customerType}/${customerCode}/statement`, { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data?.data)) return { content: response.data.data, totalElements: response.data.totalElements ?? response.data.data.length, totalPages: response.data.totalPages ?? 1 };
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Paiement direct depuis la facture (Option B MD)
  payInvoiceDirect: async (documentNumber: string, data: {
    paymentMethod: 'CASH' | 'WALLET';
    amount?: number;
    cashSessionNumber?: string;
    walletNumber?: string;
    processedBy: string;
    idempotencyKey?: string;
    metadataJson?: string;
  }): Promise<{ invoice: BillingDocument; transaction: any }> => {
    const response = await apiClient.post(`/sni/api/v1/billing/invoices/${documentNumber}/pay`, data);
    return response.data;
  },

  // Échéancier
  createInvoiceSchedule: async (documentNumber: string, data: {
    installments: Array<{ dueDate: string; amount: number }>;
  }): Promise<any> => {
    const response = await apiClient.post(`/sni/api/v1/billing/invoices/${documentNumber}/schedule`, data);
    return response.data;
  },

  getInvoiceSchedule: async (documentNumber: string): Promise<any> => {
    const response = await apiClient.get(`/sni/api/v1/billing/invoices/${documentNumber}/schedule`);
    return response.data;
  },

  payInstallment: async (installmentNumber: string, data: {
    paymentMethod: 'CASH' | 'WALLET';
    cashSessionNumber?: string;
    walletNumber?: string;
    processedBy: string;
    idempotencyKey?: string;
  }): Promise<any> => {
    const response = await apiClient.post(`/sni/api/v1/billing/schedules/installments/${installmentNumber}/pay`, data);
    return response.data;
  },

  deleteInvoiceSchedule: async (scheduleNumber: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/billing/schedules/${scheduleNumber}`);
  },
};