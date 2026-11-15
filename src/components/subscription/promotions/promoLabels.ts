import { formatDateTime } from "../kitUtils";
import type { Tone } from "../kitUtils";

export const COUPON_KIND_LABEL: Record<string, string> = {
  SINGLE_USE: "Usage unique",
  MULTI_USE: "Multi-usage",
  UNIQUE_PER_SUBSCRIBER: "Unique par abonné",
};

export const COUPON_KIND_OPTIONS = Object.entries(COUPON_KIND_LABEL).map(([value, label]) => ({ value, label }));

export const COUPON_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Actif", tone: "success" },
  USED: { label: "Utilisé", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "warn" },
  REVOKED: { label: "Révoqué", tone: "danger" },
};

export const SUBSCRIBER_TYPE_OPTIONS = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Client" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

/** Libellé lisible d'un nom de champ de réponse : « batchCode » devient « batch code » */
export const humanKey = (key: string): string => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();

/** Valeur d'un champ de réponse non typée : date lisible, Oui/Non, texte, JSON pour un objet */
export const formatOpenValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "Non renseigné";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};
