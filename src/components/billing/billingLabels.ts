import type {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingLineType,
} from "../../services/billing.service";
import type { Tone } from "../subscription/kitUtils";

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
