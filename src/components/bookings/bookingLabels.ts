import { statusOf } from "../subscription/labels";
import type { StatusStyle } from "../subscription/labels";

export { statusOf };

export const BOOKING_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_APPROVAL: { label: "En attente", tone: "warn" },
  REJECTED: { label: "Rejetée", tone: "danger" },
  CONFIRMED: { label: "Confirmée", tone: "success" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  COMPLETED: { label: "Terminée", tone: "pink" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  NO_SHOW: { label: "Non présent", tone: "warn" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  DIRECT: "Paiement direct",
  SUBSCRIPTION: "Abonnement",
  PASS: "Pass",
};

export const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  HOST: "Organisateur",
  GUEST: "Invité",
  ORGANIZER: "Responsable",
};

export const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  INVITED: "Invité",
  CONFIRMED: "Confirmé",
  DECLINED: "Refusé",
  REMOVED: "Retiré",
};

export const OWNER_TYPE_LABELS: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Client",
  BUSINESS_ENTITY: "Entreprise",
  WALKIN: "Visiteur",
};

export const WAITLIST_STATUS: Record<string, StatusStyle> = {
  WAITING: { label: "En attente", tone: "warn" },
  OFFERED: { label: "Offre envoyée", tone: "info" },
  PROMOTED: { label: "Promue", tone: "success" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};

/** Extrait le code d'un QR : accepte le code seul ou l'URL complète du scan. */
export const extractAccessCode = (rawValue: string): string => {
  const value = rawValue.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || value;
  } catch {
    const cleaned = value.replace(/^.*\/check-in\/scan\//i, "");
    return cleaned.split(/[?#]/)[0].trim();
  }
};

export const getQrCodeUrl = (value: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}`;

export const formatTime = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
