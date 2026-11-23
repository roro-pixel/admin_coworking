import type { StatusStyle } from "../subscription/labels";

export const ENTRY_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_BALANCE: { label: "À équilibrer", tone: "warn" },
  VALIDATED: { label: "Validée", tone: "success" },
  REVERSED: { label: "Contrepassée", tone: "pink" },
  REJECTED: { label: "Rejetée", tone: "danger" },
};

export const ACCOUNT_STATUS: Record<string, StatusStyle> = {
  PENDING_APPROVAL: { label: "À approuver", tone: "warn" },
  ACTIVE: { label: "Actif", tone: "success" },
  INACTIVE: { label: "Inactif", tone: "neutral" },
  MERGED: { label: "Fusionné", tone: "info" },
};

export const ORIGIN_LABEL: Record<string, string> = {
  MANUAL: "Saisie manuelle",
  CASH: "Caisse",
  PLATFORM: "Plateforme",
  IMPORT: "Import",
  CLOSING: "Clôture",
  OPENING: "Report à nouveau",
  REVERSAL: "Contrepassation",
  REGULARIZATION: "Régularisation",
};

export const PENDING_REASON_LABEL: Record<string, string> = {
  UNBALANCED: "Écriture déséquilibrée",
  COUNTERPART_NOT_ALLOWED: "Contrepartie non autorisée sur ce journal",
  MISSING_ACCOUNT: "Compte manquant",
  ANALYTIC_INCOMPLETE: "Ventilation analytique incomplète",
  INACTIVE_ACCOUNT: "Compte inactif",
};

export const NATURE_LABEL: Record<string, string> = {
  BALANCE: "Bilan",
  MANAGEMENT: "Gestion",
  HAO: "Hors activités ordinaires",
  ANALYTIC: "Analytique",
  OFF_BALANCE: "Hors bilan",
};

export const SIDE_LABEL: Record<string, string> = { DEBIT: "Débit", CREDIT: "Crédit" };

export const THIRD_PARTY_LABEL: Record<string, string> = {
  CUSTOMER: "Client",
  SUPPLIER: "Fournisseur",
  EMPLOYEE: "Salarié",
  PARTNER: "Associé",
  OTHER: "Autre",
};

export const TREASURY_LABEL: Record<string, string> = { CASH: "Caisse", BANK: "Banque", MOBILE_MONEY: "Mobile money" };

export const JOURNAL_TYPE_LABEL: Record<string, string> = {
  SALES: "Ventes",
  PURCHASES: "Achats",
  CASH: "Caisse",
  BANK: "Banque",
  MOBILE_MONEY: "Mobile money",
  WALLET: "Portefeuille",
  MISC: "Opérations diverses",
  STOCK: "Stocks",
  OPENING: "À-nouveaux",
  REVERSAL: "Contrepassations",
  OFF_BALANCE: "Hors bilan",
  ANALYTIC: "Analytique",
  PAYROLL: "Paie",
};

export const CLASS_LABEL: Record<string, string> = {
  "1": "1 · Capitaux",
  "2": "2 · Immobilisations",
  "3": "3 · Stocks",
  "4": "4 · Tiers",
  "5": "5 · Trésorerie",
  "6": "6 · Charges",
  "7": "7 · Produits",
  "8": "8 · Autres charges et produits",
  "9": "9 · Engagements, analytique",
};

/** Montant comptable : espace de milliers, deux décimales seulement si utiles. */
export const money = (n?: number | null): string =>
  n === undefined || n === null
    ? "—"
    : n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
