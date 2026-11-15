import { apiClient } from "./api";
import { API, toList } from "./pagination";

// Marketplace (administration)
// Offres : ADMIN, MANAGER pour écrire ; ADMIN, MANAGER, OPERATIONS_AGENT pour lire.
// Le panier et la vitrine (/client/marketplace/...) sont côté portail.
// Le retrait au comptoir est le seul mode de remise.

const BASE = `${API}/marketplace`;
const enc = encodeURIComponent;

// ═══ Offres ═══════════════════════════════════════════════════════════════════

/** PRODUCT : article de stock depuis un emplacement ; SERVICE : prestation, sans stock. */
export type OfferKind = "PRODUCT" | "SERVICE";

export interface OfferView {
  id: number;
  kind: OfferKind | string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  inventoryItemCode?: string | null;
  locationCode?: string | null;
  serviceItemCode?: string | null;
  /** Prix demandé. */
  price: number;
  /** Prix propre à l'offre ; vide si elle suit l'article. */
  ownPrice?: number | null;
  currency?: string;
  maxPerOrder?: number | null;
  displayOrder?: number | null;
  published: boolean;
  /** Stock disponible à l'emplacement ; vide pour une prestation. */
  available?: number | null;
  [key: string]: unknown;
}

/**
 * Ce que l'offre vend, et d'où, ne change plus après la création. Titre,
 * description, image et catégorie se reprennent de la prestation si absents.
 */
export interface CreateOfferRequest {
  kind: OfferKind;
  /** PRODUCT. */
  inventoryItemCode?: string;
  locationCode?: string;
  /** SERVICE. */
  serviceItemCode?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  price?: number | null;
  maxPerOrder?: number | null;
  displayOrder?: number;
}

export interface UpdateOfferRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  price?: number | null;
  /** Rend à l'offre le prix de l'article. */
  resetPrice?: boolean;
  maxPerOrder?: number | null;
  /** Retire le plafond par commande. */
  clearMaxPerOrder?: boolean;
  displayOrder?: number;
}

// ═══ Commandes ════════════════════════════════════════════════════════════════

export type MarketplaceOrderStatus =
  | "CART"
  | "PENDING_PAYMENT"
  | "PAID"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface MarketplaceOrderLine {
  id?: number;
  offerId?: number;
  title?: string;
  kind?: OfferKind | string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  /** Motif d'un échec de sortie ou de retour de stock. */
  stockError?: string | null;
  [key: string]: unknown;
}

export interface MarketplaceOrder {
  orderNumber: string;
  status: MarketplaceOrderStatus | string;
  memberId?: string;
  memberName?: string;
  billingCompanyCode?: string | null;
  invoiceNumber?: string | null;
  invoiceBalanceDue?: number | null;
  totalAmount?: number;
  currency?: string;
  /**
   * Échéance de règlement. Peut être dépassée sur une commande encore
   * PENDING_PAYMENT : un paiement en cours ou une dépense en attente la suspend.
   */
  expiresAt?: string | null;
  /** PAID : un article n'est pas encore sorti du stock ; la remise est refusée. */
  stockPending?: boolean;
  fulfilledBy?: string | null;
  collectedBy?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  /** Renseigné si la commande a été remboursée. */
  creditNoteNumber?: string | null;
  lines: MarketplaceOrderLine[];
  createdAt?: string;
  [key: string]: unknown;
}

export interface OrdersParams {
  status?: MarketplaceOrderStatus | string;
  limit?: number;
  /** true : commandes réglées dont la sortie de stock est à corriger. */
  stockPending?: boolean;
}

export const marketplaceService = {
  // ── Offres ─────────────────────────────────────────────────────────────────

  getOffers: async (params?: {
    published?: boolean;
    category?: string;
  }): Promise<OfferView[]> =>
    toList<OfferView>((await apiClient.get(`${BASE}/offers`, { params })).data),

  getOffer: async (id: number): Promise<OfferView> =>
    (await apiClient.get(`${BASE}/offers/${id}`)).data,

  /** L'offre naît non publiée. */
  createOffer: async (data: CreateOfferRequest): Promise<OfferView> =>
    (await apiClient.post(`${BASE}/offers`, data)).data,

  updateOffer: async (
    id: number,
    data: UpdateOfferRequest,
  ): Promise<OfferView> =>
    (await apiClient.patch(`${BASE}/offers/${id}`, data)).data,

  /** Exige un prix supérieur à zéro et un article ou une prestation encore actif. */
  publishOffer: async (id: number): Promise<OfferView> =>
    (await apiClient.post(`${BASE}/offers/${id}/publish`)).data,

  unpublishOffer: async (id: number): Promise<OfferView> =>
    (await apiClient.post(`${BASE}/offers/${id}/unpublish`)).data,

  // ── Commandes ──────────────────────────────────────────────────────────────

  getOrders: async (params?: OrdersParams): Promise<MarketplaceOrder[]> =>
    toList<MarketplaceOrder>(
      (await apiClient.get(`${BASE}/orders`, { params })).data,
    ),

  getOrder: async (orderNumber: string): Promise<MarketplaceOrder> =>
    (await apiClient.get(`${BASE}/orders/${enc(orderNumber)}`)).data,

  /**
   * Remise au comptoir : commande réglée dont les articles sont sortis du
   * stock. collectedBy facultatif ; à défaut, le nom de l'acheteur.
   */
  fulfilOrder: async (
    orderNumber: string,
    collectedBy?: string,
  ): Promise<MarketplaceOrder> =>
    (
      await apiClient.post(`${BASE}/orders/${enc(orderNumber)}/fulfil`, {
        collectedBy,
      })
    ).data,

  /**
   * Réglée : avoir du montant payé reversé au portefeuille du payeur.
   * Déjà remise : retour en stock seulement si returnToStock est vrai. Un
   * retour impossible n'empêche pas le remboursement (voir lines[].stockError).
   */
  cancelOrder: async (
    orderNumber: string,
    data: { reason: string; returnToStock?: boolean },
  ): Promise<MarketplaceOrder> =>
    (await apiClient.post(`${BASE}/orders/${enc(orderNumber)}/cancel`, data))
      .data,
};
