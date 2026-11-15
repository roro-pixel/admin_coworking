import type { Tone } from "./kitUtils";

export interface StatusStyle {
  label: string;
  tone: Tone;
}

/** Retourne le style d'un statut, ou le code brut en neutre s'il est inconnu. */
export const statusOf = (map: Record<string, StatusStyle>, key?: string | null): StatusStyle =>
  (key && map[key]) || { label: key ?? "", tone: "neutral" };

export const SUBSCRIPTION_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_ACTIVATION: { label: "En attente", tone: "info" },
  ACTIVE: { label: "Actif", tone: "success" },
  PAST_DUE: { label: "En retard", tone: "danger" },
  SUSPENDED: { label: "Suspendu", tone: "warn" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
};

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  ONE_TIME: "Unique",
  DAILY: "Journalier",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

export const SUBSCRIBER_TYPE_LABELS: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Customer",
  BUSINESS_ENTITY: "Entreprise",
};

export const USAGE_STATUS: Record<string, StatusStyle> = {
  RECORDED: { label: "Enregistré", tone: "info" },
  BILLABLE: { label: "Facturable", tone: "warn" },
  BILLED: { label: "Facturé", tone: "success" },
};

export const BILLABLE_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  INVOICED: { label: "Facturé", tone: "success" },
  VOID: { label: "Annulé", tone: "neutral" },
};

export const OVERAGE_MODE_LABELS: Record<string, string> = {
  BLOCK: "Bloquer",
  BILLABLE: "Facturer",
  ALLOW_UNBILLED: "Autoriser sans facturer",
};

export const CHANGE_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  APPROVED: { label: "Approuvé", tone: "success" },
  APPLIED: { label: "Appliqué", tone: "info" },
};

export const NOTIFICATION_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Planifiée", tone: "warn" },
  SENT: { label: "Envoyée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const BILLING_SCHEDULE_STATUS: Record<string, StatusStyle> = {
  PAID: { label: "Payé", tone: "success" },
  PENDING: { label: "En attente", tone: "warn" },
};

export const PLAN_TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: "Adhésion",
  COWORKING_ACCESS: "Accès coworking",
  DEDICATED_DESK: "Bureau dédié",
  PRIVATE_OFFICE: "Bureau privé",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  VIRTUAL_OFFICE: "Bureau virtuel",
  COMPANY_PLAN: "Plan entreprise",
  CUSTOM: "Personnalisé",
};

export const TARGET_AUDIENCE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Particulier",
  COMPANY: "Entreprise",
  BOTH: "Les deux",
};

export const PLAN_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  ACTIVE: { label: "Actif", tone: "success" },
  ARCHIVED: { label: "Archivé", tone: "neutral" },
};

export const VERSION_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "success" },
  ARCHIVED: { label: "Archivée", tone: "neutral" },
};

export const ENTITLEMENT_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Accès",
  CREDIT: "Crédit",
  TIME: "Temps",
  DISCOUNT: "Réduction",
  QUOTA: "Quota",
  FEATURE_FLAG: "Fonctionnalité",
  SERVICE_ALLOWANCE: "Forfait",
};

export const CONSUMPTION_MODE_LABELS: Record<string, string> = {
  CHECK_ONLY: "Vérification",
  RESERVABLE: "Réservable",
  CONSUMABLE: "Consommable",
  RESERVE_THEN_CONSUME: "Réserver puis consommer",
};

export const RESET_POLICY_LABELS: Record<string, string> = {
  NEVER: "Jamais",
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  PER_BILLING_CYCLE: "Par cycle",
};

export const BENEFIT_CATEGORY_LABELS: Record<string, string> = {
  ACCESS: "Accès",
  SERVICE: "Service inclus",
  SUPPORT: "Support",
  FINANCIAL: "Avantage financier",
  FLEXIBILITY: "Flexibilité",
  COMFORT: "Confort",
  COMMUNITY: "Communauté",
  SECURITY: "Sécurité",
  OTHER: "Autre",
};

export const PASS_TYPE_LABELS: Record<string, string> = {
  DAY_PASS: "Pass journée",
  TIME_PACK: "Pack heures",
  VISITOR_PASS: "Pass visiteur",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  PROMOTIONAL_PASS: "Pass promotionnel",
  SUBSCRIPTION_PASS: "Pass souscription",
  COMPANY_SHARED_PASS: "Pass entreprise partagé",
  CUSTOM: "Personnalisé",
};

export const PASS_STATUS: Record<string, StatusStyle> = {
  ACTIVE: { label: "Actif", tone: "success" },
  PENDING: { label: "En attente", tone: "warn" },
  PENDING_ACTIVATION: { label: "En attente de paiement", tone: "warn" },
  PARTIALLY_USED: { label: "Partiellement utilisé", tone: "info" },
  CONSUMED: { label: "Consommé", tone: "pink" },
  SUSPENDED: { label: "Suspendu", tone: "warn" },
  CANCELLED: { label: "Annulé", tone: "danger" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
};

export const DURATION_UNIT_LABELS: Record<string, string> = {
  DAY: "jour(s)",
  WEEK: "semaine(s)",
  MONTH: "mois",
  YEAR: "année(s)",
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "Pourcentage",
  FIXED_AMOUNT: "Montant fixe",
  FREE_ENTITLEMENT: "Droit gratuit",
  WAIVE_SETUP_FEE: "Frais d'installation offerts",
};

export const PROMOTION_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "success" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};
