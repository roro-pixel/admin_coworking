import type { WalletStatus } from "../../services/wallet.service";
import type { Tone } from "../subscription/kitUtils";

export type OwnerType = "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY";

export const OWNER_TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "Client",
  MEMBER: "Membre",
  BUSINESS_ENTITY: "Entreprise",
};

export const OWNER_TYPE_OPTIONS: { value: OwnerType; label: string }[] = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  LOCKED: "Verrouillé",
  CLOSED: "Fermé",
  UNDER_REVIEW: "En révision",
};

export const WALLET_STATUS_TONE: Record<WalletStatus, Tone> = {
  ACTIVE: "success",
  SUSPENDED: "warn",
  LOCKED: "danger",
  CLOSED: "neutral",
  UNDER_REVIEW: "info",
};

export const ENTRY_TYPE_LABEL: Record<string, string> = {
  ADMIN_TOPUP: "Top-up admin",
  TOPUP: "Recharge",
  TRANSFER_IN: "Transfert reçu",
  TRANSFER_OUT: "Transfert émis",
  TRANSFER_FEE: "Frais de transfert",
  ADMIN_DEBIT: "Débit admin",
  PAYMENT: "Paiement",
  REFUND: "Remboursement",
  REVERSAL: "Inversion",
  HOLD: "Réservation",
  HOLD_RELEASE: "Libération de réservation",
  ADJUSTMENT: "Ajustement",
  CASHBACK: "Cashback",
  PROMOTIONAL_CREDIT: "Crédit promotionnel",
  OVERPAYMENT_CREDIT: "Trop-perçu",
};

export const HOLD_STATUS_LABEL: Record<string, string> = { ACTIVE: "Actif", CAPTURED: "Capturé", RELEASED: "Libéré", EXPIRED: "Expiré" };
export const HOLD_STATUS_TONE: Record<string, Tone> = { ACTIVE: "info", CAPTURED: "success", RELEASED: "neutral", EXPIRED: "danger" };

export const ACTION_TYPE_LABEL: Record<string, string> = {
  TOPUP: "Crédit",
  DEBIT: "Débit",
  ADJUST: "Ajustement",
  REVERSE: "Inversion",
  SUSPEND: "Suspension",
  UNSUSPEND: "Levée de suspension",
  RESET_PIN: "Réinitialisation du code",
  RAISE_LIMIT: "Relèvement de plafond",
  CLOSE: "Clôture",
  REVIEW_FLAG: "Revue d'alerte",
  RELEASE_HOLD: "Libération de réservation",
  TRANSFER: "Transfert",
  RESTITUTE: "Restitution",
};
export const ACTION_TYPE_OPTIONS = Object.entries(ACTION_TYPE_LABEL).map(([value, label]) => ({ value, label }));
/** Types d'action qui portent un montant */
export const ACTION_WITH_AMOUNT = new Set(["TOPUP", "DEBIT", "ADJUST", "REVERSE", "RAISE_LIMIT", "TRANSFER", "RESTITUTE"]);
/** Types d'action qui portent une date de fin */
export const ACTION_WITH_UNTIL = new Set(["SUSPEND", "RAISE_LIMIT"]);

export const ACTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_APPROVAL: { label: "En attente de visa", tone: "warn" },
  EXECUTED: { label: "Exécutée", tone: "success" },
  REJECTED: { label: "Rejetée", tone: "neutral" },
};

export const SEVERITY: Record<string, { label: string; tone: Tone }> = {
  INFO: { label: "Information", tone: "neutral" },
  LOW: { label: "Faible", tone: "neutral" },
  MEDIUM: { label: "Moyenne", tone: "warn" },
  HIGH: { label: "Élevée", tone: "danger" },
  CRITICAL: { label: "Critique", tone: "danger" },
};

export const FLAG_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Ouverte", tone: "warn" },
  UNDER_REVIEW: { label: "En revue", tone: "info" },
  CONFIRMED: { label: "Confirmée", tone: "danger" },
  DISMISSED: { label: "Écartée", tone: "neutral" },
};

export const FLAG_TYPE_LABEL: Record<string, string> = {
  UNUSUAL_VOLUME: "Volume inhabituel",
  RAPID_IN_OUT: "Entrées et sorties rapides",
  STRUCTURING: "Fractionnement",
  MANY_COUNTERPARTIES: "Nombreuses contreparties",
  DORMANT_REACTIVATION: "Réactivation d'un compte dormant",
  FAILED_PIN_BURST: "Rafale de codes erronés",
  LIMIT_BREACH_ATTEMPT: "Tentative de dépassement de plafond",
  NEGATIVE_BALANCE: "Solde négatif",
  INTEGRITY_BREAK: "Rupture d'intégrité",
  REVOKED_DEVICE_USED: "Appareil révoqué utilisé",
  NEW_DEVICE_LARGE_TRANSFER: "Gros transfert depuis un nouvel appareil",
  LIST_MATCH: "Correspondance de liste",
  IDENTITY_REVIEW_DUE: "Revue d'identité à faire",
  PHONE_CHANGED: "Téléphone modifié",
};

export const CASE_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Ouvert", tone: "warn" },
  IN_REVIEW: { label: "En revue", tone: "info" },
  ESCALATED: { label: "Escaladé", tone: "danger" },
  CLOSED_CLEARED: { label: "Clos, levé", tone: "success" },
  CLOSED_CONFIRMED: { label: "Clos, confirmé", tone: "neutral" },
  CLOSED_REPORTED: { label: "Clos, déclaré", tone: "neutral" },
};

export const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "Basse", tone: "neutral" },
  MEDIUM: { label: "Moyenne", tone: "warn" },
  HIGH: { label: "Haute", tone: "danger" },
  CRITICAL: { label: "Critique", tone: "danger" },
};

export const DECISION_LABEL: Record<string, string> = {
  CLEARED: "Soupçon levé",
  CONFIRMED: "Soupçon confirmé",
  REPORTED: "Déclaré aux autorités",
};
export const DECISION_OPTIONS = Object.entries(DECISION_LABEL).map(([value, label]) => ({ value, label }));

export const RULE_CATEGORY_LABEL: Record<string, string> = {
  VELOCITY: "Fréquence",
  AMOUNT: "Montant",
  PATTERN: "Schéma",
  COUNTERPARTY: "Contrepartie",
  IDENTITY: "Identité",
  GEOGRAPHY: "Géographie",
};

export const RULE_ACTION_LABEL: Record<string, string> = {
  FLAG: "Signaler",
  REQUIRE_REVIEW: "Exiger une revue",
  BLOCK_OPERATION: "Bloquer l'opération",
  FREEZE_WALLET: "Geler le portefeuille",
};
export const RULE_ACTION_OPTIONS = Object.entries(RULE_ACTION_LABEL).map(([value, label]) => ({ value, label }));
export const SEVERITY_OPTIONS = Object.entries(SEVERITY).map(([value, v]) => ({ value, label: v.label }));

export const SCREENING_RESULT: Record<string, { label: string; tone: Tone }> = {
  CLEAR: { label: "Aucune correspondance", tone: "success" },
  POSSIBLE_MATCH: { label: "Correspondance possible", tone: "warn" },
  MATCH: { label: "Correspondance", tone: "danger" },
};

export const SUBJECT_TYPE_OPTIONS = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

export const WALLET_STATUS_LABEL_OPEN = (s: string) => WALLET_STATUS_LABEL[s as WalletStatus] ?? s;
