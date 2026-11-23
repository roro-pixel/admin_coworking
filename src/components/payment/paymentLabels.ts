import type { StatusStyle } from "../subscription/labels";

/** Statuts réels de l'intention : FAILED et AUTHORIZED n'existent plus côté backend. */
export const INTENT_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  PROCESSING: { label: "En cours", tone: "info" },
  SUCCEEDED: { label: "Payé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
  REFUNDED: { label: "Remboursé", tone: "pink" },
  PARTIALLY_REFUNDED: { label: "Remboursé en partie", tone: "pink" },
  REVERSED: { label: "Extourné", tone: "danger" },
};

export const TXN_STATUS: Record<string, StatusStyle> = {
  PROCESSING: { label: "En cours", tone: "info" },
  SUCCEEDED: { label: "Réussie", tone: "success" },
  FAILED: { label: "Échouée", tone: "danger" },
  REFUNDED: { label: "Remboursée", tone: "pink" },
  REVERSED: { label: "Extournée", tone: "danger" },
};

/** Les 9 moyens de paiement du backend. Préférer `paymentMethodLabel` quand la transaction le fournit. */
export const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  WALLET: "Portefeuille",
  MOBILE_MONEY: "Mobile Money",
  MOBILE_MONEY_OFFLINE: "Mobile Money hors plateforme",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  CHEQUE: "Chèque",
  MANUAL_ADJUSTMENT: "Ajustement manuel",
  CREDIT_NOTE: "Avoir",
};

/** Libellé d'un paiement : celui du serveur s'il existe, sinon la table ci-dessus. */
export const methodText = (
  method?: string | null,
  serverLabel?: string | null,
): string => serverLabel || (method ? METHOD_LABEL[method] ?? method : "");

/** Opérateurs du mobile money hors plateforme (numéro marchand). */
export const OFFLINE_OPERATORS = [
  { value: "MTN_MOMO", label: "MTN MoMo Pay" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
];

export const OFFLINE_OPERATOR_LABEL: Record<string, string> =
  Object.fromEntries(OFFLINE_OPERATORS.map((o) => [o.value, o.label]));

export const CHANNEL_LABEL: Record<string, string> = {
  SELF_SERVICE: "Libre-service",
  BACK_OFFICE: "Guichet",
  SYSTEM: "Système",
};

export const CUSTOMER_TYPES = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

export const CUSTOMER_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CUSTOMER_TYPES.map((t) => [t.value, t.label]),
);

/** Objets proposés à la création manuelle d'une intention. */
export const PURPOSES = [
  { value: "MANUAL_PAYMENT", label: "Paiement manuel" },
  { value: "BOOKING", label: "Réservation" },
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "PASS", label: "Pass" },
];

export const PURPOSE_LABEL: Record<string, string> = {
  ...Object.fromEntries(PURPOSES.map((t) => [t.value, t.label])),
  PASS_RENEWAL: "Renouvellement de pass",
  WALLET_TOPUP: "Rechargement de portefeuille",
  INVOICE_PAYMENT: "Règlement de facture",
};

/** Origines (`sourceType`) produites par le module. */
export const SOURCE_TYPE_LABEL: Record<string, string> = {
  BILLING_DOCUMENT: "Facture",
  MULTI_BILLING_DOCUMENT: "Plusieurs factures",
  PAYABLE_RECOVERY: "Recouvrement",
  SUBSCRIPTION: "Abonnement",
  PASS: "Pass",
  PASS_RENEWAL: "Renouvellement de pass",
  BOOKING: "Réservation",
  WALLET_TOPUP: "Rechargement de portefeuille",
  MANUAL: "Manuel",
};

export const sourceLabel = (t?: string | null): string =>
  t ? SOURCE_TYPE_LABEL[t] ?? humanize(t) : "";

export const SESSION_STATUS: Record<string, StatusStyle> = {
  OPENING: { label: "Ouverture à confirmer", tone: "info" },
  OPEN: { label: "Ouverte", tone: "success" },
  PAUSED: { label: "En pause", tone: "warn" },
  SUSPENDED: { label: "Suspendue", tone: "danger" },
  COUNTING: { label: "Comptage", tone: "info" },
  CLOSING_REVIEW: { label: "À valider", tone: "warn" },
  RECOUNT: { label: "Recomptage", tone: "warn" },
  CLOSED: { label: "Clôturée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

/** `inflow` = argent qui entre en caisse, `false` = sortie */
export const MOVEMENT_TYPES: Record<string, { label: string; inflow: boolean }> = {
  OPENING_FLOAT: { label: "Fonds d'ouverture", inflow: true },
  PAYMENT: { label: "Encaissement", inflow: true },
  REFUND: { label: "Remboursement", inflow: false },
  CASH_IN: { label: "Entrée de caisse", inflow: true },
  CASH_OUT: { label: "Sortie de caisse", inflow: false },
  SAFE_DEPOSIT: { label: "Dépôt au coffre", inflow: false },
  TRANSFER_IN: { label: "Transfert reçu", inflow: true },
  TRANSFER_OUT: { label: "Transfert émis", inflow: false },
  ADJUSTMENT: { label: "Ajustement", inflow: true },
  CLOSING_COUNT: { label: "Comptage de clôture", inflow: false },
  EXCHANGE: { label: "Change", inflow: true },
  VARIANCE: { label: "Écart de caisse", inflow: false },
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
  REVERSED: { label: "Contre-passé", tone: "danger" },
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

/** Statuts d'une anomalie de caisse (champ `status` de l'API). */
export const ANOMALY_STATUS: Record<string, StatusStyle> = {
  OPEN: { label: "À examiner", tone: "warn" },
  ACKNOWLEDGED: { label: "Pris en compte", tone: "info" },
  DISMISSED: { label: "Écartée", tone: "neutral" },
  ESCALATED: { label: "Escaladée", tone: "danger" },
  RESOLVED: { label: "Résolue", tone: "success" },
};

/** Ancien nom, conservé pour les écrans existants. */
export const ANOMALY_REVIEW = ANOMALY_STATUS;

export const ANOMALY_TYPE_LABEL: Record<string, string> = {
  VARIANCE_OUTLIER: "Écart hors norme",
  ROUND_NUMBER_PATTERN: "Montants trop ronds",
  EXCESSIVE_REFUNDS: "Remboursements excessifs",
  EXCESSIVE_ADJUSTMENTS: "Ajustements excessifs",
  OFF_HOURS_SESSION: "Session hors horaires",
  THRESHOLD_STRUCTURING: "Fractionnement sous un seuil",
  NEAR_MAX_CASH_RECURRENCE: "Plafond de caisse souvent frôlé",
  OPENING_VARIANCE: "Écart à l'ouverture",
  LONG_SESSION: "Session trop longue",
  LONG_PAUSES: "Pauses trop longues",
  REPEATED_REVERSALS: "Annulations répétées",
  DETENTION_CAP_EXCEEDED: "Plafond de détention dépassé",
  UNKNOWN_DEVICE: "Appareil inconnu",
  DAMAGED_NOTES: "Billets abîmés",
  TRANSFER_VARIANCE: "Écart sur transfert",
};

export const anomalyTypeLabel = (t?: string | null): string =>
  t ? ANOMALY_TYPE_LABEL[t] ?? humanize(t) : "";

/** Phase d'un dépôt mobile money (`phase`), calculée par le serveur pour l'écran. */
export const MM_PHASE: Record<string, StatusStyle> = {
  WAITING_FOR_PAYER: { label: "En attente du payeur", tone: "info" },
  CONFIRMING: { label: "Confirmation en cours", tone: "warn" },
  COMPLETED: { label: "Payé", tone: "success" },
  FAILED: { label: "Échoué", tone: "danger" },
  UNRESOLVED: { label: "Non résolu", tone: "danger" },
};

/** Statut technique d'un dépôt (filtre `status` de la supervision). */
export const MM_STATUS: Record<string, StatusStyle> = {
  CREATED: { label: "Créé", tone: "neutral" },
  PROCESSING: { label: "En cours", tone: "info" },
  SUBMITTED_UNCONFIRMED: { label: "Envoyé, non confirmé", tone: "warn" },
  SUCCEEDED: { label: "Réussi", tone: "success" },
  FAILED: { label: "Échoué", tone: "danger" },
  UNRESOLVED: { label: "Non résolu", tone: "danger" },
};

export const MM_OUTCOME: Record<string, StatusStyle> = {
  PROCESSED: { label: "Traité", tone: "success" },
  DEFERRED: { label: "Reporté", tone: "warn" },
  IGNORED: { label: "Ignoré", tone: "neutral" },
  FAILED: { label: "Échec du traitement", tone: "danger" },
};

export const MM_RESOLVE_ACTION: Record<string, string> = {
  SYNC: "Relire chez PawaPay",
  MARK_SUCCEEDED: "Forcer « payé »",
  MARK_FAILED: "Forcer « échoué »",
};

export const DISCREPANCY_SEVERITY: Record<string, StatusStyle> = {
  INFO: { label: "Information", tone: "info" },
  WARNING: { label: "Attention", tone: "warn" },
  WARN: { label: "Attention", tone: "warn" },
  ERROR: { label: "Écart", tone: "danger" },
  CRITICAL: { label: "Critique", tone: "danger" },
};

export const DECLARATION_STATUS: Record<string, StatusStyle> = {
  AWAITING_CONFIRMATION: { label: "À confirmer", tone: "warn" },
  CONFIRMED: { label: "Confirmée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
};

/** Libellé lisible pour un code technique inconnu (ex. UNUSUAL_HOUR) */
export const humanize = (code?: string | null): string => {
  if (!code) return "";
  const s = code.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
