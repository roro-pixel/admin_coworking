import type { StatusStyle } from "../subscription/labels";
import type { MarketplaceOrderStatus } from "../../services/marketplace.service";

export const MARKETPLACE_KEY = "marketplace";

export const KIND_LABEL: Record<string, string> = { PRODUCT: "Article", SERVICE: "Prestation" };

export const ORDER_STATUS: Record<string, StatusStyle> = {
  CART: { label: "Panier", tone: "neutral" },
  PENDING_PAYMENT: { label: "À régler", tone: "warn" },
  PAID: { label: "Réglée", tone: "info" },
  FULFILLED: { label: "Remise", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
};

export const ORDER_FILTERS: { value: "" | MarketplaceOrderStatus; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "PENDING_PAYMENT", label: "À régler" },
  { value: "PAID", label: "Réglées" },
  { value: "FULFILLED", label: "Remises" },
  { value: "CANCELLED", label: "Annulées" },
  { value: "EXPIRED", label: "Expirées" },
];
