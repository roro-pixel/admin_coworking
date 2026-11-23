import type {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingLineType,
} from "../../services/billing.service";
import type { Tone } from "../subscription/kitUtils";
import type { DealStage } from "../../services/billing.service";

/* Libellés et tons de statut partagés par tous les écrans Facturation. */

export const DOC_TYPE_LABEL: Record<BillingDocumentType, string> = {
  QUOTE: "Devis",
  PROFORMA_INVOICE: "Proforma",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  DEBIT_NOTE: "Note de débit",
  CORRECTIVE_INVOICE: "Rectificative",
};

export const DOC_TYPE_OPTIONS: { value: BillingDocumentType; label: string }[] = (
  Object.keys(DOC_TYPE_LABEL) as BillingDocumentType[]
).map((value) => ({ value, label: DOC_TYPE_LABEL[value] }));

export const STATUS_LABEL: Record<BillingDocumentStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émis",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
  CONVERTED: "Converti",
  PARTIALLY_PAID: "Partiellement payé",
  PAID: "Payé",
  OVERDUE: "En retard",
  CANCELLED: "Annulé",
  VOIDED: "Invalidé",
  REFUNDED: "Remboursé",
  WRITTEN_OFF: "Passé en perte",
  VIEWED: "Consulté",
  NEGOTIATION: "En négociation",
  DEPOSIT_REQUESTED: "Acompte demandé",
  DEPOSIT_PAID: "Acompte payé",
  VALIDATED: "Validé (scellé)",
};

export const STATUS_TONE: Record<BillingDocumentStatus, Tone> = {
  DRAFT: "neutral",
  ISSUED: "info",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "neutral",
  CONVERTED: "success",
  PARTIALLY_PAID: "warn",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
  VOIDED: "neutral",
  REFUNDED: "pink",
  WRITTEN_OFF: "danger",
  VIEWED: "info",
  NEGOTIATION: "warn",
  DEPOSIT_REQUESTED: "warn",
  DEPOSIT_PAID: "success",
  VALIDATED: "success",
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as BillingDocumentStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

export const LINE_TYPE_LABEL: Record<BillingLineType, string> = {
  SERVICE: "Service",
  PRODUCT: "Produit",
  BOOKING: "Réservation",
  SUBSCRIPTION: "Abonnement",
  PASS: "Pass",
  ADDON: "Option",
  OVERAGE: "Dépassement",
  DISCOUNT: "Remise",
  FEE: "Frais",
  OTHER: "Autre",
};

export const LINE_TYPE_OPTIONS = (Object.keys(LINE_TYPE_LABEL) as BillingLineType[]).map((value) => ({
  value,
  label: LINE_TYPE_LABEL[value],
}));

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  SERVICE_CATALOG: "Catalogue de services",
  INVENTORY_ITEM: "Article inventaire",
  RESOURCE: "Ressource",
  ASSET: "Équipement",
  MANUAL: "Saisie manuelle",
};

/** Tranches d'ancienneté de l'état des créances, dans l'ordre d'affichage */
export const AGING_BUCKETS = [
  { key: "current", label: "Non échu" },
  { key: "days1To30", label: "1 à 30 j" },
  { key: "days31To60", label: "31 à 60 j" },
  { key: "days61To90", label: "61 à 90 j" },
  { key: "daysOver90", label: "Plus de 90 j" },
] as const;

export const BUCKET_LABEL: Record<string, string> = {
  CURRENT: "Non échu",
  DAYS_1_TO_30: "1 à 30 j",
  DAYS_31_TO_60: "31 à 60 j",
  DAYS_61_TO_90: "61 à 90 j",
  DAYS_OVER_90: "Plus de 90 j",
  DAYS_1_30: "1 à 30 j",
  DAYS_31_60: "31 à 60 j",
  DAYS_61_90: "61 à 90 j",
  OVER_90: "Plus de 90 j",
  days1To30: "1 à 30 j",
  days31To60: "31 à 60 j",
  days61To90: "61 à 90 j",
  daysOver90: "Plus de 90 j",
  current: "Non échu",
};

export const RECOVERABLE_LABEL: Record<string, string> = {
  PENDING: "À récupérer",
  RECOVERED: "Récupéré",
  PARTIALLY_RECOVERED: "Récupéré en partie",
  WRITTEN_OFF: "Passé en perte",
};

export const RECOVERABLE_TONE: Record<string, Tone> = {
  PENDING: "warn",
  RECOVERED: "success",
  PARTIALLY_RECOVERED: "info",
  WRITTEN_OFF: "danger",
};

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "Client",
  MEMBER: "Membre",
  BUSINESS_ENTITY: "Entreprise",
};

/* ── Lot 53 : libellés des nouveaux écrans ───────────────────────────────── */

type L = Record<string, string>;
type T = Record<string, Tone>;

export const DEPOSIT_STATUS_LABEL: L = {
  PLANNED: "Prévu", INVOICED: "Facturé", PARTIALLY_PAID: "Encaissé en partie", PAID: "Encaissé",
  DEDUCTED: "Déduit", CANCELLED: "Annulé", REFUNDED: "Remboursé", CREDITED: "Gardé en avoir",
};
export const DEPOSIT_STATUS_TONE: T = {
  PLANNED: "neutral", INVOICED: "info", PARTIALLY_PAID: "warn", PAID: "success",
  DEDUCTED: "success", CANCELLED: "neutral", REFUNDED: "pink", CREDITED: "pink",
};

export const INVOICE_CHANGE_LABEL: L = {
  PENDING: "En attente d'approbation", APPLIED: "Appliquée", REJECTED: "Refusée", RETURNED: "Renvoyée", CANCELLED: "Retirée",
};
export const INVOICE_CHANGE_TONE: T = {
  PENDING: "warn", APPLIED: "success", REJECTED: "danger", RETURNED: "info", CANCELLED: "neutral",
};

export const CLAIM_STATUS_LABEL: L = {
  OPEN: "Ouverte", ACCEPTED: "Acceptée", PARTIALLY_ACCEPTED: "Acceptée en partie", REJECTED: "Rejetée", WITHDRAWN: "Retirée",
};
export const CLAIM_STATUS_TONE: T = {
  OPEN: "warn", ACCEPTED: "success", PARTIALLY_ACCEPTED: "info", REJECTED: "danger", WITHDRAWN: "neutral",
};

export const PROMISE_STATUS_LABEL: L = { OPEN: "En cours", KEPT: "Tenue", BROKEN: "Non tenue", CANCELLED: "Annulée" };
export const PROMISE_STATUS_TONE: T = { OPEN: "warn", KEPT: "success", BROKEN: "danger", CANCELLED: "neutral" };
export const PROMISE_CHANNEL_LABEL: L = { PHONE: "Téléphone", EMAIL: "E-mail", WHATSAPP: "WhatsApp", VISIT: "Visite", PORTAL: "Espace client" };

export const DELIVERY_STATUS_LABEL: L = { DRAFT: "Brouillon", DELIVERED: "Livré", CANCELLED: "Annulé", INVOICED: "Facturé" };
export const DELIVERY_STATUS_TONE: T = { DRAFT: "neutral", DELIVERED: "success", CANCELLED: "neutral", INVOICED: "info" };

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  PROSPECTING: "Prospection", PROPOSAL: "Proposition", NEGOTIATION: "Négociation", WON: "Gagnée", LOST: "Perdue",
};
export const DEAL_STAGE_TONE: Record<DealStage, Tone> = {
  PROSPECTING: "neutral", PROPOSAL: "info", NEGOTIATION: "warn", WON: "success", LOST: "danger",
};
export const DEAL_SOURCE_LABEL: L = { CRM: "CRM", AUTO: "Automatique", MANUAL: "Saisie manuelle" };

export const BATCH_STATUS_LABEL: L = { PREVIEW: "Aperçu", ISSUED: "Émis", CANCELLED: "Annulé" };
export const BATCH_STATUS_TONE: T = { PREVIEW: "warn", ISSUED: "success", CANCELLED: "neutral" };

export const SENDING_CHANNEL_LABEL: L = { EMAIL: "E-mail", WHATSAPP: "WhatsApp" };

export const PAYMENT_METHOD_LABEL: L = {
  CASH: "Espèces", WALLET: "Portefeuille", MOBILE_MONEY: "Mobile money", MOBILE_MONEY_OFFLINE: "Mobile money (hors ligne)",
  BANK_TRANSFER: "Virement", CARD: "Carte", CHEQUE: "Chèque", MANUAL_ADJUSTMENT: "Ajustement manuel", CREDIT_NOTE: "Avoir",
};

export const ELEMENT_TYPE_LABEL: L = { SUBSCRIPTION: "Abonnement", PASS: "Pass", BOOKING: "Réservation", DOMICILIATION: "Domiciliation" };
export const ACTIVATION_MODE_LABEL: L = {
  FULL_SETTLEMENT: "Activer au règlement complet", FIRST_PAYMENT: "Activer au premier paiement",
};

export const NEGOTIATION_ORIGIN_LABEL: L = {
  CLIENT_PROPOSAL: "Proposition du client", COUNTER_PROPOSAL: "Contre-proposition", INTERNAL: "Interne",
};
export const LINE_CHANGE_LABEL: L = { ADDED: "Ajoutée", REMOVED: "Retirée", CHANGED: "Modifiée" };
export const LINE_CHANGE_TONE: T = { ADDED: "success", REMOVED: "danger", CHANGED: "info" };

export const TAX_TREATMENT_LABEL: L = {
  STANDARD: "Standard", REDUCED: "Réduit", EXEMPT: "Exonéré", OUT_OF_SCOPE: "Hors champ",
};
export const WITHHOLDING_BASE_LABEL: L = { TTC: "Montant TTC", HT: "Montant HT", TVA: "TVA" };
export const WITHHOLDING_STATUS_TONE: T = { RECORDED: "success", CANCELLED: "neutral" };

export const SECURITY_DEPOSIT_KIND_LABEL: L = { RELEASE: "Restitution", RETAIN: "Retenue", APPLY: "Imputation sur facture" };

export const CATALOG_SEGMENT_LABEL: L = { ALL: "Tous", MEMBER: "Membres", COMPANY: "Entreprises", VISITOR: "Visiteurs" };

export const ALERT_TONE: T = { INFO: "info", WARN: "warn", BLOCK: "danger" };
