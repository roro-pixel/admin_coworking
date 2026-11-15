import type { Tone } from "../kitUtils";

export const CREDENTIAL_TYPE_LABEL: Record<string, string> = {
  QR_CODE: "QR code",
  BARCODE: "Code-barres",
  NFC_TAG: "Badge NFC",
  ACCESS_CODE: "Code d'accès",
};
export const CREDENTIAL_TYPE_OPTIONS = Object.entries(CREDENTIAL_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const USAGE_TYPE_LABEL: Record<string, string> = {
  CHECK_IN: "Entrée",
  BOOKING: "Réservation",
  SERVICE: "Service",
  MEETING_ROOM: "Salle de réunion",
  PRINT: "Impression",
  OTHER: "Autre",
};
export const USAGE_TYPE_OPTIONS = Object.entries(USAGE_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const CHANNEL_LABEL: Record<string, string> = {
  QR_SCAN: "Scan de QR code",
  MANUAL: "Saisie manuelle",
  KIOSK: "Borne",
  API: "API",
};
export const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }));

export const TRANSFER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_ACCEPTANCE: { label: "En attente d'acceptation", tone: "warn" },
  ACCEPTED: { label: "Accepté", tone: "info" },
  COMPLETED: { label: "Terminé", tone: "success" },
  REJECTED: { label: "Rejeté", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};
