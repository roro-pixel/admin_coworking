import type { StatusStyle } from "../subscription/labels";

export const INTENT_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  PROCESSING: { label: "En cours", tone: "info" },
  AUTHORIZED: { label: "Autorisé", tone: "info" },
  SUCCEEDED: { label: "Payé", tone: "success" },
  FAILED: { label: "Échoué", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
  REFUNDED: { label: "Remboursé", tone: "pink" },
  PARTIALLY_REFUNDED: { label: "Remboursé en partie", tone: "pink" },
  REVERSED: { label: "Extourné", tone: "danger" },
};

export const TXN_STATUS: Record<string, StatusStyle> = {
  SUCCEEDED: { label: "Réussie", tone: "success" },
  COMPLETED: { label: "Terminée", tone: "success" },
  PENDING: { label: "En attente", tone: "warn" },
  FAILED: { label: "Échouée", tone: "danger" },
  REFUNDED: { label: "Remboursée", tone: "pink" },
  REVERSED: { label: "Extournée", tone: "danger" },
};

export const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  WALLET: "Portefeuille",
  MOBILE_MONEY: "Mobile Money",
};

export const CUSTOMER_TYPES = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

export const CUSTOMER_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CUSTOMER_TYPES.map((t) => [t.value, t.label]),
);

export const PURPOSES = [
  { value: "MANUAL_PAYMENT", label: "Paiement manuel" },
  { value: "BOOKING", label: "Réservation" },
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "PASS", label: "Pass" },
];

export const PURPOSE_LABEL: Record<string, string> = Object.fromEntries(
  PURPOSES.map((t) => [t.value, t.label]),
);

export const SESSION_STATUS: Record<string, StatusStyle> = {
  OPEN: { label: "Ouverte", tone: "success" },
  CLOSING_REVIEW: { label: "À valider", tone: "warn" },
  CLOSED: { label: "Clôturée", tone: "neutral" },
};

/** `inflow` = argent qui entre en caisse, `false` = sortie */
export const MOVEMENT_TYPES: Record<string, { label: string; inflow: boolean }> = {
  PAYMENT: { label: "Encaissement", inflow: true },
  REFUND: { label: "Remboursement", inflow: false },
  CASH_IN: { label: "Entrée de caisse", inflow: true },
  CASH_OUT: { label: "Sortie de caisse", inflow: false },
  SAFE_DEPOSIT: { label: "Dépôt au coffre", inflow: false },
  TRANSFER_IN: { label: "Transfert reçu", inflow: true },
  TRANSFER_OUT: { label: "Transfert émis", inflow: false },
  ADJUSTMENT: { label: "Ajustement", inflow: true },
  OPENING_FLOAT: { label: "Fonds d'ouverture", inflow: true },
  CLOSING_COUNT: { label: "Comptage de clôture", inflow: false },
};

export const MANUAL_MOVEMENT_TYPES = [
  "CASH_IN",
  "CASH_OUT",
  "SAFE_DEPOSIT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
];

export const REASON_REQUIRED_TYPES = [
  "REFUND",
  "CASH_OUT",
  "SAFE_DEPOSIT",
  "TRANSFER_OUT",
  "ADJUSTMENT",
];

export const MOVEMENT_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  CONFIRMED: { label: "Confirmé", tone: "success" },
  REVERSED: { label: "Annulé", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

export const REQUEST_TYPES: Record<string, string> = {
  JUSTIFICATIF: "Justificatif",
  REMISE_DE_FONDS: "Remise de fonds",
  CASH_ADVANCE: "Avance de caisse",
  EXPENSE_REIMBURSEMENT: "Remboursement de frais",
};

export const REQUEST_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  APPROVED: { label: "Approuvée", tone: "success" },
  REJECTED: { label: "Refusée", tone: "danger" },
  EXECUTED: { label: "Exécutée", tone: "info" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const SEVERITY: Record<string, StatusStyle> = {
  LOW: { label: "Faible", tone: "neutral" },
  MEDIUM: { label: "Moyenne", tone: "warn" },
  HIGH: { label: "Élevée", tone: "danger" },
};

export const ANOMALY_REVIEW: Record<string, StatusStyle> = {
  PENDING: { label: "À examiner", tone: "warn" },
  ACKNOWLEDGED: { label: "Pris en compte", tone: "info" },
  FALSE_POSITIVE: { label: "Faux positif", tone: "neutral" },
  ESCALATED: { label: "Escaladée", tone: "danger" },
  RESOLVED: { label: "Résolue", tone: "success" },
};

/** Libellé lisible pour un code technique inconnu (ex. UNUSUAL_HOUR) */
export const humanize = (code?: string | null): string => {
  if (!code) return "";
  const s = code.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
