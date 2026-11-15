import type { StatusStyle } from "../subscription/labels";

/*
 * Libellés et tons du module Opérations (Support, Visiteurs, CRM, Tâches).
 */

// ***************** Support ************

export const TICKET_STATUS: Record<string, StatusStyle> = {
  OPEN: { label: "Ouvert", tone: "danger" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  WAITING_CLIENT: { label: "Attente client", tone: "warn" },
  RESOLVED: { label: "Résolu", tone: "success" },
  CLOSED: { label: "Fermé", tone: "neutral" },
};

export const PRIORITY_STYLE: Record<string, StatusStyle> = {
  LOW: { label: "Faible", tone: "neutral" },
  MEDIUM: { label: "Moyenne", tone: "info" },
  HIGH: { label: "Élevée", tone: "warn" },
  URGENT: { label: "Urgente", tone: "danger" },
};

export const TICKET_CATEGORY: Record<string, string> = {
  BILLING: "Facturation",
  BOOKING: "Réservation",
  ACCESS: "Accès",
  TECHNICAL: "Technique",
  OTHER: "Autre",
};

/** Transitions proposées depuis un statut (règles d'origine, inchangées) */
export const nextTicketStatuses = (status: string): string[] => {
  switch (status) {
    case "OPEN":
      return ["IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"];
    case "IN_PROGRESS":
      return ["WAITING_CLIENT", "RESOLVED", "CLOSED"];
    case "WAITING_CLIENT":
      return ["IN_PROGRESS", "RESOLVED", "CLOSED"];
    case "RESOLVED":
      return ["CLOSED", "OPEN"];
    case "CLOSED":
      return ["OPEN"];
    default:
      return [];
  }
};

export const OWNER_TYPE_LABELS: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Client",
  BUSINESS_ENTITY: "Entreprise",
};

// ───────────── CRM ─────────────

export const LEAD_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"] as const;

export const LEAD_STAGE: Record<string, StatusStyle> = {
  NEW: { label: "Nouveau", tone: "neutral" },
  CONTACTED: { label: "Contacté", tone: "info" },
  QUALIFIED: { label: "Qualifié", tone: "pink" },
  PROPOSAL_SENT: { label: "Proposition", tone: "warn" },
  WON: { label: "Gagné", tone: "success" },
  LOST: { label: "Perdu", tone: "danger" },
};

export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: "WEBSITE", label: "Site web" },
  { value: "REFERRAL", label: "Recommandation" },
  { value: "COLD_CALL", label: "Prospection" },
  { value: "TRADE_SHOW", label: "Salon" },
  { value: "PARTNER", label: "Partenaire" },
  { value: "SOCIAL_MEDIA", label: "Réseaux sociaux" },
  { value: "EVENT", label: "Événement" },
  { value: "OTHER", label: "Autre" },
];

export const LEAD_INTERESTS: { value: string; label: string }[] = [
  { value: "WORKSPACE", label: "Espace de travail" },
  { value: "MEETING_ROOM", label: "Salle de réunion" },
  { value: "VIRTUAL_OFFICE", label: "Bureau virtuel" },
  { value: "DOMICILIATION", label: "Domiciliation" },
  { value: "DAY_PASS", label: "Pass journée" },
  { value: "DEDICATED_DESK", label: "Bureau dédié" },
  { value: "PRIVATE_OFFICE", label: "Bureau privé" },
  { value: "OTHER", label: "Autre" },
];

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "VISIT", "NOTE"] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  CALL: "Appel",
  EMAIL: "Email",
  MEETING: "Réunion",
  VISIT: "Visite",
  NOTE: "Note",
};

// ───────────── Tâches ─────────────

export const ACTIVE_TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const TASK_STATUS: Record<string, StatusStyle> = {
  OPEN: { label: "À faire", tone: "neutral" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  COMPLETED: { label: "Terminée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  ARCHIVED: { label: "Archivée", tone: "neutral" },
};

export const RECURRENCE_LABELS: Record<string, string> = {
  NONE: "Aucune",
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuelle",
  AFTER_BOOKING: "Après une réservation",
};

export const TASK_SOURCES: { value: string; label: string }[] = [
  { value: "CRM_LEAD", label: "Lead CRM" },
  { value: "BOOKING", label: "Réservation" },
  { value: "INVENTORY", label: "Inventaire" },
];

export const SOURCE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TASK_SOURCES.map((s) => [s.value, s.label]),
);

// ───────────── Visiteurs ─────────────

export const PASS_STATUS: Record<string, StatusStyle> = {
  SCHEDULED: { label: "Planifié", tone: "info" },
  CHECKED_IN: { label: "Présent", tone: "success" },
  CHECKED_OUT: { label: "Parti", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "danger" },
  EXPIRED: { label: "Expiré", tone: "warn" },
};

/** Libellé lisible d'une clé d'agrégat renvoyée par l'API (code brut si inconnu) */
export const labelFrom = (map: Record<string, string>, key: string): string => map[key] ?? key;

export const styleLabels = (map: Record<string, StatusStyle>): Record<string, string> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.label]));

// ───────── Propositions commerciales ─────────
export const PROPOSAL_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SENT: { label: "Envoyée", tone: "info" },
  VIEWED: { label: "Consultée", tone: "pink" },
  ACCEPTED: { label: "Acceptée", tone: "success" },
  REJECTED: { label: "Refusée", tone: "danger" },
  EXPIRED: { label: "Expirée", tone: "warn" },
  CONVERTED: { label: "Convertie", tone: "success" },
};

export const PROPOSAL_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "SENT", label: "Envoyées" },
  { value: "VIEWED", label: "Consultées" },
  { value: "ACCEPTED", label: "Acceptées" },
  { value: "REJECTED", label: "Refusées" },
  { value: "EXPIRED", label: "Expirées" },
  { value: "CONVERTED", label: "Converties" },
];

export const PROPOSAL_RECIPIENT_TYPES: { value: string; label: string }[] = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

export const PROPOSAL_SERVICE_TYPES: { value: string; label: string }[] = [
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "PASS", label: "Pass" },
  { value: "BOOKING", label: "Réservation" },
  { value: "CUSTOM", label: "Personnalisé" },
];
