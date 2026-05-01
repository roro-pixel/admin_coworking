import { apiClient } from './api';

export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'CLOSED' | 'UNDER_REVIEW';
export type LedgerDirection = 'CREDIT' | 'DEBIT';
export type LedgerEntryType = 
  | 'ADMIN_TOPUP' | 'ADMIN_DEBIT' | 'PAYMENT' | 'REFUND' | 'REVERSAL'
  | 'HOLD' | 'HOLD_RELEASE' | 'ADJUSTMENT' | 'CASHBACK' 
  | 'PROMOTIONAL_CREDIT' | 'OVERPAYMENT_CREDIT';

export interface Wallet {
  walletNumber: string;
  ownerType: string;
  ownerCode: string;
  currency: string;
  status: WalletStatus;
  availableBalance: number;
  ledgerBalance: number;
  heldBalance: number;
  openedAt: string;
  closedAt: string | null;
}

export interface LedgerEntry {
  entryNumber: string;
  walletNumber: string;
  direction: LedgerDirection;
  amount: number;
  currency: string;
  balanceAfter: number;
  entryType: LedgerEntryType;
  sourceType: string;
  sourceCode: string;
  reference?: string;
  createdBy: string;
  createdAt: string;
}

export interface WalletHold {
  holdNumber: string;
  walletNumber: string;
  amount: number;
  sourceType: string;
  sourceCode: string;
  expiresAt: string;
  status: 'ACTIVE' | 'CAPTURED' | 'RELEASED' | 'EXPIRED';
  createdAt: string;
}

export const walletService = {
  // Get or create wallet
  getOrCreateWallet: async (ownerType: string, ownerCode: string, currency: string = 'XAF'): Promise<Wallet> => {
    const response = await apiClient.post('/sni/api/v1/wallets/admin/get-or-create', {
      ownerType,
      ownerCode,
      currency,
    });
    return response.data;
  },

  // Get wallet by number
  getWallet: async (walletNumber: string): Promise<Wallet> => {
    const response = await apiClient.get(`/sni/api/v1/wallets/${walletNumber}`);
    return response.data;
  },

  // Get wallets list
  getWallets: async (params?: { ownerType?: string; ownerCode?: string; status?: string; currency?: string; searchText?: string; page?: number; size?: number; sort?: string }): Promise<{ content: Wallet[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/wallets', { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Get wallet by owner
  getWalletByOwner: async (ownerType: string, ownerCode: string): Promise<Wallet | null> => {
    const response = await walletService.getWallets({ ownerType, ownerCode, size: 1 });
    return response.content?.[0] || null;
  },

  // Admin top-up
  adminTopUp: async (data: {
    ownerType: string;
    ownerCode: string;
    currency: string;
    amount: number;
    createdBy: string;
    reference?: string;
    metadataJson?: string;
  }): Promise<Wallet> => {
    const response = await apiClient.post('/sni/api/v1/wallets/admin/top-up', data);
    return response.data;
  },

  // Get ledger entries
  getLedgerEntries: async (walletNumber: string, params?: { page?: number; size?: number; sort?: string }): Promise<{ content: LedgerEntry[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get(`/sni/api/v1/wallets/${walletNumber}/ledger`, { params });
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  // Get holds
  getWalletHolds: async (walletNumber: string, params?: { status?: string; page?: number; size?: number }): Promise<{ content: WalletHold[]; totalElements: number }> => {
    const response = await apiClient.get(`/sni/api/v1/wallet-holds`, { params: { walletNumber, ...params } });
    return response.data;
  },

  // Create hold
  createHold: async (data: {
    walletNumber: string;
    amount: number;
    sourceType: string;
    sourceCode: string;
    expiresAt: string;
    createdBy: string;
  }): Promise<WalletHold> => {
    const response = await apiClient.post('/sni/api/v1/wallet-holds', data);
    return response.data;
  },

  // Capture hold
  captureHold: async (holdNumber: string, createdBy: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/wallet-holds/${holdNumber}/capture`, null, { params: { createdBy } });
  },

  // Release hold
  releaseHold: async (holdNumber: string, createdBy: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/wallet-holds/${holdNumber}/release`, null, { params: { createdBy } });
  },
};