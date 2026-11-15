import type { StatusStyle } from "../labels";

/** Libellés des statuts, motifs et options du cycle de vie des abonnements. */

export const TERMINATION_STATUS: Record<string, StatusStyle> = {
  REQUESTED: { label: "Demandée", tone: "warn" },
  ACCEPTED: { label: "Acceptée", tone: "info" },
  RETRACTED: { label: "Retirée", tone: "neutral" },
  COMPLETED: { label: "Terminée", tone: "success" },
};

export const TERMINATION_REASONS: { value: string; label: string }[] = [
  { value: "RELOCATION", label: "Déménagement" },
  { value: "COST", label: "Coût" },
  { value: "SERVICE_QUALITY", label: "Qualité de service" },
  { value: "BUSINESS_CLOSURE", label: "Fermeture de l'activité" },
  { value: "NO_LONGER_NEEDED", label: "Plus besoin" },
  { value: "COMPETITOR", label: "Concurrent" },
  { value: "NON_PAYMENT", label: "Impayé" },
  { value: "OTHER", label: "Autre" },
];

export const TERMINATION_CHANNELS: { value: string; label: string }[] = [
  { value: "STAFF", label: "Guichet" },
  { value: "LETTER", label: "Courrier" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PORTAL", label: "Portail" },
];

export const EXIT_ITEM_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "À faire", tone: "warn" },
  DONE: { label: "Fait", tone: "success" },
  WAIVED: { label: "Dispensé", tone: "neutral" },
};

export const QUOTE_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SENT: { label: "Envoyé", tone: "info" },
  ACCEPTED: { label: "Accepté", tone: "success" },
  REJECTED: { label: "Refusé", tone: "danger" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
  CONVERTED: { label: "Converti", tone: "success" },
};

export const DERIVATION_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_APPROVAL: { label: "À approuver", tone: "warn" },
  ACTIVE: { label: "Active", tone: "success" },
  SUPERSEDED: { label: "Remplacée", tone: "neutral" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
  REJECTED: { label: "Refusée", tone: "danger" },
};

export const DERIVATION_REASONS: { value: string; label: string }[] = [
  { value: "NEGOTIATION", label: "Négociation" },
  { value: "GOODWILL", label: "Geste commercial" },
  { value: "PARTNERSHIP", label: "Partenariat" },
  { value: "PILOT", label: "Pilote" },
  { value: "GRANDFATHERING", label: "Maintien d'un ancien tarif" },
  { value: "LOYALTY", label: "Fidélité" },
  { value: "CORRECTION", label: "Correction" },
];

export const RENEWAL_BEHAVIOURS: { value: string; label: string; hint: string }[] = [
  { value: "KEEP", label: "Le prix reste", hint: "La dérivation continue aux renouvellements." },
  { value: "REVERT_TO_CATALOGUE", label: "Retour au catalogue", hint: "Dès le premier renouvellement." },
  { value: "REVERT_AFTER_PERIODS", label: "Retour après N périodes", hint: "Précisez le nombre de périodes." },
];

export const DELTA_TYPE_LABELS: Record<string, string> = {
  PRICE: "Prix",
  ENTITLEMENT: "Droit",
  BILLING_CYCLE: "Cycle de facturation",
  COMMITMENT: "Engagement",
  NOTICE_PERIOD: "Préavis",
  TRIAL: "Essai",
  SETUP_FEE: "Frais de mise en service",
  PAYMENT_TERMS: "Conditions de paiement",
  ADDON_INCLUDED: "Option incluse",
};

export const FORMULA_LABELS: Record<string, string> = {
  NONE: "Aucune indemnité",
  FIXED_FEE: "Frais fixes",
  PERCENT_OF_REMAINING: "Pourcentage du reste dû",
  REMAINING_PERIODS: "Périodes restantes",
};

export const PRORATION_LABELS: Record<string, string> = {
  DAILY: "Au jour près",
  MONTH_STARTED: "Mois commencé, mois dû",
  NONE: "Pas de prorata",
};

export const COMMITMENT_SOURCE_LABELS: Record<string, string> = {
  PLAN: "Plan",
  QUOTE: "Devis",
  MANUAL: "Saisie manuelle",
};

export const MANDATE_STATUS: Record<string, StatusStyle> = {
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "warn" },
  REVOKED: { label: "Révoqué", tone: "neutral" },
};

export const MANDATE_CHANNELS: { value: string; label: string }[] = [
  { value: "STAFF", label: "Guichet" },
  { value: "SIGNED_FORM", label: "Formulaire signé" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PORTAL", label: "Portail" },
];

export const ATTEMPT_STATUS: Record<string, StatusStyle> = {
  SUCCEEDED: { label: "Prélevé", tone: "success" },
  INSUFFICIENT_FUNDS: { label: "Solde insuffisant", tone: "warn" },
  OVER_LIMIT: { label: "Plafond dépassé", tone: "warn" },
  FAILED: { label: "Échec", tone: "danger" },
};

export const BILLING_CYCLE_OPTIONS: { value: string; label: string }[] = [
  { value: "MONTHLY", label: "Mensuel" },
  { value: "QUARTERLY", label: "Trimestriel" },
  { value: "YEARLY", label: "Annuel" },
];

/** Traduit les codes de la liste de sortie d'une résiliation. */
export const EXIT_ITEM_HINTS: Record<string, string> = {
  BALANCE_DUE: "Se coche seul quand aucune facture n'est ouverte.",
  MAIL_PENDING: "Se coche seul quand le courrier en attente est traité.",
};
