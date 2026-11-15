import type { Tone } from "../../subscription/kitUtils";
import type { DunningAction, DunningChannel, DunningOutcome, DunningSegment, DunningTone } from "../../../services/dunning.service";

export const SEGMENT_LABEL: Record<DunningSegment, string> = {
  DEFAULT: "Tous les clients (par défaut)",
  MEMBER: "Membres",
  CUSTOMER: "Clients",
  BUSINESS_ENTITY: "Entreprises",
};

export const TONE_LABEL: Record<DunningTone, string> = {
  SOFT: "Souple",
  STANDARD: "Standard",
  FIRM: "Ferme",
};

export const ACTION_LABEL: Record<DunningAction, string> = {
  REMINDER: "Rappel",
  FORMAL_NOTICE: "Mise en demeure",
  GRACE_PERIOD: "Période de tolérance",
  SUSPEND: "Suspension",
  HANDOVER: "Transmission au recouvrement",
};

export const CHANNEL_LABEL: Record<DunningChannel, string> = {
  EMAIL: "E-mail",
  IN_APP: "Notification dans l'application",
  STAFF: "Tâche pour l'équipe",
};

export const OUTCOME_LABEL: Record<DunningOutcome, string> = {
  SENT: "Envoyée",
  SKIPPED: "Ignorée",
  FAILED: "Échec",
};

export const OUTCOME_TONE: Record<DunningOutcome, Tone> = {
  SENT: "success",
  SKIPPED: "neutral",
  FAILED: "danger",
};

export const labelOf = (map: Record<string, string>, key: string): string => map[key] ?? key;
