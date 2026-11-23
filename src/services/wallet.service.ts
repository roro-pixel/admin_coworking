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
  | "TOPUP"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "TRANSFER_FEE"
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

export interface WalletHoldLine {
  holdNumber: string;
  amount: number;
  sourceType?: string;
  sourceCode?: string;
  sourceLabel?: string;
  expiresAt?: string;
  createdAt?: string;
}

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
  ownerName?: string;
  /** Réservations actives, renvoyées avec le portefeuille. */
  activeHolds?: WalletHoldLine[];
}

export interface LedgerEntry {
  entryNumber: string;
  transactionNumber?: string;
  transactionUuid?: string;
  sourceLabel?: string;
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
  currency?: string;
  sourceType?: string;
  sourceCode?: string;
  sourceLabel?: string;
  expiresAt?: string;
  status: "ACTIVE" | "CAPTURED" | "RELEASED" | "EXPIRED";
  createdBy?: string;
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
  /** int64 : peut arriver en texte au-delà de 2^53. */
  dailyOperationsUsed: number | string;
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
  brokenLinks: string[];
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

const newIdemKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

  /**
   * Liste des portefeuilles. Le serveur ne filtre que par ownerType et ownerCode (+ pagination) :
   * `status`, `currency` et `searchText` sont donc appliqués ici, sur la page reçue.
   * Pour retrouver un portefeuille précis par propriétaire et devise, demander une page assez large (size 50).
   */
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
    const { status, currency, searchText, ...serverParams } = params ?? {};
    const response = await apiClient.get("/sni/api/v1/wallets", { params: serverParams });
    const data = response.data;
    const needle = searchText?.trim().toLowerCase();
    const keep = (w: Wallet) =>
      (!status || w.status === status) &&
      (!currency || w.currency === currency) &&
      (!needle ||
        [w.walletNumber, w.ownerCode, w.ownerName].some((v) => v?.toLowerCase().includes(needle)));
    const filtered = !!(status || currency || needle);
    const narrow = (page: PageResponse<Wallet>): PageResponse<Wallet> =>
      filtered ? { ...page, content: page.content.filter(keep) } : page;

    // Structure: { data: [], pageable: { totalElements, totalPages, page, size } }
    if (data?.data !== undefined && Array.isArray(data.data)) {
      const pageable = data.pageable || {};
      return narrow({
        content: data.data,
        totalElements: pageable.totalElements ?? data.data.length,
        totalPages: pageable.totalPages ?? 1,
        size: pageable.size ?? params?.size ?? 20,
        number: pageable.page ?? params?.page ?? 0,
      });
    }

    // Structure: { content: [], totalElements, totalPages }
    if (data?.content !== undefined && Array.isArray(data.content)) {
      return narrow({
        content: data.content,
        totalElements: data.totalElements ?? data.content.length,
        totalPages: data.totalPages ?? 1,
        size: data.size ?? params?.size ?? 20,
        number: data.number ?? params?.page ?? 0,
      });
    }

    // Structure: tableau direct
    if (Array.isArray(data)) {
      return narrow({
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      });
    }

    return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
  },

  // Get wallet by owner
  getWalletByOwner: async (
    ownerType: string,
    ownerCode: string,
    currency?: string,
  ): Promise<Wallet | null> => {
    const response = await walletService.getWallets({
      ownerType,
      ownerCode,
      currency,
      size: 50,
    });
    return response.content?.[0] || null;
  },

  /**
   * Top-up administrateur (PAYMENT:PROCESS). Le créateur vient du jeton.
   * Réponse non typée côté serveur : on la lit comme un portefeuille, à confirmer avec le backend.
   */
  adminTopUp: async (
    data: {
      ownerType: string;
      ownerCode: string;
      currency: string;
      amount: number;
      reference?: string;
      metadataJson?: string;
    },
    idempotencyKey?: string,
  ): Promise<Wallet> => {
    const response = await apiClient.post(
      "/sni/api/v1/wallets/admin/top-up",
      data,
      { headers: { "Idempotency-Key": idempotencyKey ?? newIdemKey() } },
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

  /** Réservations : la route est `/wallet-holds` filtrée par `walletNumber` (pas de sous-route du portefeuille). */
  getWalletHolds: async (
    walletNumber: string,
    params?: {
      status?: string;
      sourceType?: string;
      sourceCode?: string;
      page?: number;
      size?: number;
      sort?: string;
    },
  ): Promise<PageResponse<WalletHold>> => {
    const response = await apiClient.get("/sni/api/v1/wallet-holds", {
      params: { ...params, walletNumber },
    });
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

  /** Seul `walletNumber` et `amount` sont obligatoires ; le créateur vient du jeton. */
  createHold: async (data: {
    walletNumber: string;
    amount: number;
    sourceType?: string;
    sourceCode?: string;
    expiresAt?: string;
  }): Promise<WalletHold> => {
    const response = await apiClient.post("/sni/api/v1/wallet-holds", data);
    return response.data;
  },

  captureHold: async (holdNumber: string): Promise<WalletHold> => {
    const response = await apiClient.patch(
      `/sni/api/v1/wallet-holds/${holdNumber}/capture`,
    );
    return response.data;
  },

  releaseHold: async (holdNumber: string): Promise<WalletHold> => {
    const response = await apiClient.patch(
      `/sni/api/v1/wallet-holds/${holdNumber}/release`,
    );
    return response.data;
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
