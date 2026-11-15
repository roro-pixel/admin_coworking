import { apiClient } from "./api";

export type WalletStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED"
  | "CLOSED"
  | "UNDER_REVIEW";
export type LedgerDirection = "CREDIT" | "DEBIT";
export type LedgerEntryType =
  | "ADMIN_TOPUP"
  | "ADMIN_DEBIT"
  | "PAYMENT"
  | "REFUND"
  | "REVERSAL"
  | "HOLD"
  | "HOLD_RELEASE"
  | "ADJUSTMENT"
  | "CASHBACK"
  | "PROMOTIONAL_CREDIT"
  | "OVERPAYMENT_CREDIT";

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
  status: "ACTIVE" | "CAPTURED" | "RELEASED" | "EXPIRED";
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Sécurité et intégrité (ADMIN / SUPER_ADMIN) ─────────────────────────────

/** Plafonds du portefeuille selon son niveau KYC. */
export interface LimitSnapshot {
  policyCode: string;
  policyName: string;
  kycLevel: number;
  currency: string;
  maxSingleTransfer: number;
  dailyTransferUsed: number;
  maxDailyTransfer: number;
  remainingDailyTransfer: number;
  monthlyTransferUsed: number;
  maxMonthlyTransfer: number;
  remainingMonthlyTransfer: number;
  dailyTopUpUsed: number;
  maxDailyTopUp: number;
  remainingDailyTopUp: number;
  maxBalance: number;
  maxDailyOperations: number;
  dailyOperationsUsed: number;
  /** Phrase à afficher quand un plafond bloque. */
  upgradePath?: string | null;
}

/**
 * Un portefeuille est intact si brokenLinks est vide et balanceDrift vaut 0 :
 * badge vert/rouge.
 */
export interface WalletIntegrityReport {
  walletNumber: string;
  entriesChecked: number;
  brokenLinks: unknown[];
  unchained: number;
  expectedBalance: number;
  actualBalance: number;
  balanceDrift: number;
}

// Fonctions utilitaires de formatage
export const formatAmount = (
  value: number | undefined | null,
  currency: string = "XAF",
): string => {
  const num = value ?? 0;
  return `${num.toLocaleString("fr-FR")} ${currency}`;
};

export const formatAmountOnly = (value: number | undefined | null): string => {
  const num = value ?? 0;
  return num.toLocaleString("fr-FR");
};

export const safeNumber = (
  value: number | undefined | null,
  defaultValue: number = 0,
): number => {
  return value ?? defaultValue;
};

export const walletService = {
  // Get or create wallet
  getOrCreateWallet: async (
    ownerType: string,
    ownerCode: string,
    currency: string = "XAF",
  ): Promise<Wallet> => {
    const response = await apiClient.post(
      "/sni/api/v1/wallets/admin/get-or-create",
      {
        ownerType,
        ownerCode,
        currency,
      },
    );
    return response.data;
  },

  // Get wallet by number
  getWallet: async (walletNumber: string): Promise<Wallet> => {
    const response = await apiClient.get(`/sni/api/v1/wallets/${walletNumber}`);
    return response.data;
  },

  // Liste des portefeuilles
  getWallets: async (params?: {
    ownerType?: string;
    ownerCode?: string;
    status?: string;
    currency?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<Wallet>> => {
    const response = await apiClient.get("/sni/api/v1/wallets", { params });
    const data = response.data;

    // Structure: { data: [], pageable: { totalElements, totalPages, page, size } }
    if (data?.data !== undefined && Array.isArray(data.data)) {
      const pageable = data.pageable || {};
      return {
        content: data.data,
        totalElements: pageable.totalElements ?? data.data.length,
        totalPages: pageable.totalPages ?? 1,
        size: pageable.size ?? params?.size ?? 20,
        number: pageable.page ?? params?.page ?? 0,
      };
    }

    // Structure: { content: [], totalElements, totalPages }
    if (data?.content !== undefined && Array.isArray(data.content)) {
      return {
        content: data.content,
        totalElements: data.totalElements ?? data.content.length,
        totalPages: data.totalPages ?? 1,
        size: data.size ?? params?.size ?? 20,
        number: data.number ?? params?.page ?? 0,
      };
    }

    // Structure: tableau direct
    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }

    return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
  },

  // Get wallet by owner
  getWalletByOwner: async (
    ownerType: string,
    ownerCode: string,
  ): Promise<Wallet | null> => {
    const response = await walletService.getWallets({
      ownerType,
      ownerCode,
      size: 1,
    });
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
    const response = await apiClient.post(
      "/sni/api/v1/wallets/admin/top-up",
      data,
    );
    return response.data;
  },

  // Get ledger entries
  getLedgerEntries: async (
    walletNumber: string,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<PageResponse<LedgerEntry>> => {
    const response = await apiClient.get(
      `/sni/api/v1/wallets/${walletNumber}/ledger`,
      { params },
    );
    const data = response.data;

    // Structure: { data: [], pageable }
    if (data?.data !== undefined && Array.isArray(data.data)) {
      const pageable = data.pageable || {};
      return {
        content: data.data,
        totalElements: pageable.totalElements ?? data.data.length,
        totalPages: pageable.totalPages ?? 1,
        size: pageable.size ?? params?.size ?? 20,
        number: pageable.page ?? params?.page ?? 0,
      };
    }

    if (data?.content !== undefined && Array.isArray(data.content)) {
      return {
        content: data.content,
        totalElements: data.totalElements ?? data.content.length,
        totalPages: data.totalPages ?? 1,
        size: data.size ?? params?.size ?? 20,
        number: data.number ?? params?.page ?? 0,
      };
    }

    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }

    return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
  },

  // Get holds
  getWalletHolds: async (
    walletNumber: string,
    params?: {
      status?: string;
      sourceType?: string;
      sourceCode?: string;
      page?: number;
      size?: number;
    },
  ): Promise<PageResponse<WalletHold>> => {
    const response = await apiClient.get(
      `/sni/api/v1/wallets/${walletNumber}/holds`,
      { params },
    );
    const data = response.data;

    if (data?.data !== undefined && Array.isArray(data.data)) {
      const pageable = data.pageable || {};
      return {
        content: data.data,
        totalElements: pageable.totalElements ?? data.data.length,
        totalPages: pageable.totalPages ?? 1,
        size: pageable.size ?? params?.size ?? 20,
        number: pageable.page ?? params?.page ?? 0,
      };
    }

    if (data?.content !== undefined && Array.isArray(data.content)) {
      return data;
    }

    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }

    return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
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
    const response = await apiClient.post("/sni/api/v1/wallet-holds", data);
    return response.data;
  },

  // Capture hold
  captureHold: async (holdNumber: string, createdBy: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/wallet-holds/${holdNumber}/capture`,
      null,
      { params: { createdBy } },
    );
  },

  // Release hold
  releaseHold: async (holdNumber: string, createdBy: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/wallet-holds/${holdNumber}/release`,
      null,
      { params: { createdBy } },
    );
  },

  // ── Sécurité et intégrité (ADMIN / SUPER_ADMIN) ─────────────────────────────

  /**
   * Réinitialise le code secret : 204, le titulaire devra le redéfinir.
   * Pour passer par le circuit à deux visas, utiliser plutôt
   * walletControlService.createAction({ type: "RESET_PIN" }).
   */
  resetPin: async (walletNumber: string): Promise<void> => {
    await apiClient.post(
      `/sni/api/v1/wallets/${walletNumber}/security/pin/reset`,
    );
  },

  getLimits: async (walletNumber: string): Promise<LimitSnapshot> => {
    const response = await apiClient.get(
      `/sni/api/v1/wallets/${walletNumber}/limits`,
    );
    return response.data;
  },

  getIntegrity: async (walletNumber: string): Promise<WalletIntegrityReport> => {
    const response = await apiClient.get(
      `/sni/api/v1/wallets/${walletNumber}/integrity`,
    );
    return response.data;
  },
};
