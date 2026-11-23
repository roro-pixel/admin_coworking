import type { StatusStyle } from "../subscription/labels";

type Map = Record<string, StatusStyle>;

export const REGISTER_TYPE: Record<string, string> = {
  COUNTER: "Guichet",
  MAIN: "Caisse principale",
  PETTY_CASH: "Petite caisse",
  SAFE: "Coffre",
  AUTOMATIC: "Automatique",
};
export const REGISTER_TYPE_OPTIONS = Object.entries(REGISTER_TYPE)
  .filter(([k]) => k !== "AUTOMATIC")
  .map(([value, label]) => ({ value, label }));

export const REGISTER_STATUS: Map = {
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspendue", tone: "warn" },
  CLOSED: { label: "Close", tone: "neutral" },
};

export const ASSIGNMENT_ROLE: Record<string, string> = {
  CASHIER: "Caissier",
  HEAD_CASHIER: "Chef caissier",
  SUPERVISOR: "Superviseur",
  VIEWER: "Lecture seule",
};
export const ASSIGNMENT_QUALITY: Record<string, string> = { HOLDER: "Titulaire", BACKUP: "Suppléant", INTERIM: "Intérimaire" };

export const DEVICE_STATUS: Map = {
  PROPOSED: { label: "À décider", tone: "warn" },
  ALLOWED: { label: "Autorisé", tone: "success" },
  REFUSED: { label: "Refusé", tone: "danger" },
};

export const CAP_BEHAVIOR: Record<string, string> = { ALERT: "Alerter", BLOCK: "Bloquer" };

export const DAY_LABEL: Record<number, string> = { 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" };

export const RESPONSIBILITY_STATUS: Map = {
  PENDING_SIGNATURES: { label: "Signatures en attente", tone: "warn" },
  SIGNED: { label: "Signée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const VARIANCE_DECISION: Record<string, string> = {
  EXPENSE: "Passer en charge",
  INCOME: "Passer en produit",
  CASHIER: "À la charge du caissier",
  INVESTIGATION: "Enquête",
  TOLERATED: "Toléré",
};
export const VARIANCE_DECISION_OPTIONS = Object.entries(VARIANCE_DECISION).map(([value, label]) => ({ value, label }));

export const VARIANCE_KIND: Record<string, string> = {
  OPENING: "Ouverture",
  CLOSING: "Clôture",
  SPOT_CHECK: "Contrôle inopiné",
  HANDOVER: "Remise de caisse",
  FORCED_CLOSE: "Clôture forcée",
  UNSEAL: "Descellement",
  TRANSFER: "Transfert",
  RESPONSIBILITY_TRANSFER: "Passation",
};

export const VARIANCE_STATUS: Map = {
  PENDING: { label: "À décider", tone: "warn" },
  DECIDED: { label: "Décidé", tone: "success" },
  TOLERATED: { label: "Toléré", tone: "neutral" },
};

export const COUNT_MOMENT: Record<string, string> = {
  OPENING: "Ouverture",
  CLOSING: "Clôture",
  RECOUNT: "Recomptage",
  HANDOVER: "Remise de caisse",
  SPOT_CHECK: "Contrôle inopiné",
  TRANSFER_RECEIPT: "Réception de transfert",
  PERIODIC: "Périodique",
  RESPONSIBILITY_TRANSFER: "Passation",
  FORCED_CLOSE: "Clôture forcée",
  SEAL: "Scellé",
  UNSEAL: "Descellement",
};

export const HANDOVER_STATUS: Map = {
  PENDING: { label: "En attente", tone: "warn" },
  ACCEPTED: { label: "Acceptée", tone: "success" },
  DISPUTED: { label: "Contestée", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const TRANSFER_KIND: Record<string, string> = {
  FEED: "Approvisionnement",
  REMITTANCE: "Remise de fonds",
  SAFE_DEPOSIT: "Dépôt au coffre",
  SAFE_WITHDRAWAL: "Retrait du coffre",
  PETTY_REFILL: "Réapprovisionnement petite caisse",
  OTHER: "Autre",
};
export const TRANSFER_STATUS: Map = {
  IN_TRANSIT: { label: "En transit", tone: "info" },
  RECEIVED: { label: "Reçu", tone: "success" },
  DISPUTED: { label: "Contesté", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

export const ABSENCE_STATUS: Map = {
  PLANNED: { label: "Planifiée", tone: "info" },
  APPROVED: { label: "Approuvée", tone: "success" },
  ACTIVE: { label: "En cours", tone: "warn" },
  ENDED: { label: "Terminée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};
export const NO_REPLACEMENT_POLICY: Record<string, string> = {
  REMIT_TO_PARENT: "Remettre à la caisse mère",
  SEAL: "Sceller la caisse",
  SIMPLE_SUSPENSION: "Suspension simple",
};

export const NATURE_FAMILY: Record<string, string> = {
  ENCAISSEMENTS: "Encaissements",
  ACHATS: "Achats",
  DEPLACEMENTS: "Déplacements",
  AVANCES: "Avances",
  REMISES: "Remises",
  TRANSFERTS: "Transferts",
  REMBOURSEMENTS: "Remboursements",
  DIVERS: "Divers",
};
export const FLOW_DIRECTION: Record<string, string> = { IN: "Entrée", OUT: "Sortie", ADJUSTMENT: "Ajustement" };

/** Libellé du fil d'une session : le serveur envoie déjà `label` en français ; ce libellé ne sert que de repli. */
export const TIMELINE_KIND: Record<string, string> = {
  OPENED: "Ouverture",
  OPENING_VARIANCE: "Écart à l'ouverture",
  PAUSED: "Pause",
  SUSPENDED: "Suspension",
  COUNT: "Comptage",
  VARIANCE: "Écart",
  VARIANCE_DECIDED: "Écart décidé",
  ANOMALY: "Anomalie",
  HANDOVER: "Remise de caisse",
  CLOSING_REQUESTED: "Clôture demandée",
  CLOSED: "Clôture",
  REVIEWED: "Écart validé",
};

/** Droits de délégation proposés : à confirmer avec le backend, qui n'en documente pas la liste. */
export const CASH_STEP_MESSAGE = (messages?: string[]): string | undefined => (messages && messages.length ? messages.join(" ") : undefined);

/** Heure d'un horaire de caisse : le serveur renvoie un objet {hour, minute} ou un texte. */
export const timeText = (t: unknown): string => {
  if (!t) return "";
  if (typeof t === "string") return t.slice(0, 5);
  const o = t as { hour?: number; minute?: number };
  return `${String(o.hour ?? 0).padStart(2, "0")}:${String(o.minute ?? 0).padStart(2, "0")}`;
};

export const CASH_DOCUMENT_TYPE: Record<string, string> = {
  CASH_VOUCHER: "Bon de caisse",
  ENTRY_VOUCHER: "Bon d'entrée",
  EXIT_VOUCHER: "Bon de sortie",
  RECEIPT: "Reçu",
  INVOICE: "Facture",
  EXPENSE_NOTE: "Note de frais",
  BANK_SLIP: "Bordereau bancaire",
  TRANSFER_NOTE: "Bordereau de transfert",
  EXTERNAL_REFERENCE: "Référence externe",
  OTHER: "Autre",
};

export const MOVEMENT_CHANNEL: Record<string, string> = {
  MANUAL: "Manuel",
  AUTO_PAYMENT: "Paiement automatique",
  IMPORT: "Import",
  API: "API",
  POS: "Point de vente",
};

export const JOURNAL_TYPE: Record<string, string> = {
  SALES: "Ventes",
  PURCHASES: "Achats",
  CASH: "Caisse",
  BANK: "Banque",
  MOBILE_MONEY: "Mobile money",
  WALLET: "Portefeuille",
  MISC: "Opérations diverses",
  STOCK: "Stocks",
  OPENING: "À-nouveaux",
  REVERSAL: "Extournes",
  OFF_BALANCE: "Hors bilan",
  ANALYTIC: "Analytique",
  PAYROLL: "Paie",
};
