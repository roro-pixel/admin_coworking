import { useEffect, useMemo, useState } from "react";
import type { Tone } from "../subscription/kitUtils";

/*
 * Libellés, tons et petits outils partagés par les écrans Documents et KYC.
 */

// **************** Libellés ********* 

export const DOC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  UPLOADED: "Déposé",
  PENDING_REVIEW: "En attente de revue",
  NEEDS_CORRECTION: "Correction demandée",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  SIGNED: "Signé",
  EXPIRED: "Expiré",
  ARCHIVED: "Archivé",
  SUPERSEDED: "Remplacé",
  PENDING: "En attente",
  VERIFIED: "Vérifié",
};

export const DOC_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  UPLOADED: "info",
  PENDING_REVIEW: "warn",
  PENDING: "warn",
  NEEDS_CORRECTION: "danger",
  APPROVED: "success",
  VERIFIED: "success",
  REJECTED: "danger",
  SIGNED: "pink",
  EXPIRED: "neutral",
  ARCHIVED: "neutral",
  SUPERSEDED: "neutral",
};

export const KYC_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  PENDING_CORRECTION: "Correction demandée",
  RENEWAL_REQUIRED: "Renouvellement requis",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  EXPIRED: "Expiré",
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de revue",
  IN_REVIEW: "En revue",
  CANCELLED: "Annulé",
};

export const KYC_STATUS_TONE: Record<string, Tone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  SUBMITTED: "warn",
  PENDING_REVIEW: "warn",
  UNDER_REVIEW: "pink",
  IN_REVIEW: "pink",
  PENDING_CORRECTION: "danger",
  RENEWAL_REQUIRED: "warn",
  APPROVED: "success",
  REJECTED: "danger",
  EXPIRED: "neutral",
  DRAFT: "neutral",
  CANCELLED: "neutral",
};

/** Statuts proposés dans les filtres */
export const KYC_FILTER_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PENDING_CORRECTION",
  "RENEWAL_REQUIRED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

export const RISK_TONE: Record<string, Tone> = {
  LOW: "success",
  MEDIUM: "warn",
  HIGH: "warn",
  CRITICAL: "danger",
  VERY_HIGH: "danger",
};

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "CRITICAL"];

export const OWNER_LABEL: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Client",
  BUSINESS: "Entreprise",
  CONTRACT: "Contrat",
  INVOICE: "Facture",
  PAYMENT: "Paiement",
  PROPOSAL: "Proposition",
  ASSET: "Actif",
};

export const OWNER_TYPES = ["CUSTOMER", "MEMBER", "BUSINESS", "CONTRACT", "INVOICE", "PAYMENT", "PROPOSAL", "ASSET"];
export const KYC_OWNER_TYPES = ["MEMBER", "CUSTOMER", "BUSINESS"];

export const SPACE_LABEL: Record<string, string> = {
  KYC_SPACE: "KYC",
  CONTRACT_SPACE: "Contrats",
  FINANCIAL_SPACE: "Financier",
  ASSET_SPACE: "Actifs",
  ADMINISTRATIVE: "Administratif",
  ADMINISTRATIVE_SPACE: "Administratif",
  GENERIC: "Général",
  GENERAL_SPACE: "Général",
};

export const SPACES = ["KYC_SPACE", "CONTRACT_SPACE", "FINANCIAL_SPACE", "ASSET_SPACE", "ADMINISTRATIVE", "GENERIC"];

export const CATEGORY_LABEL: Record<string, string> = {
  KYC: "KYC",
  LEGAL: "Juridique",
  SYSTEM: "Système",
  FINANCIAL: "Financier",
  ASSET: "Actifs",
  OTHER: "Autre",
};

export const CATEGORIES = ["KYC", "LEGAL", "SYSTEM", "FINANCIAL", "ASSET", "OTHER"];

export const DOC_STATUSES = [
  "DRAFT",
  "UPLOADED",
  "PENDING_REVIEW",
  "NEEDS_CORRECTION",
  "APPROVED",
  "REJECTED",
  "SIGNED",
  "EXPIRED",
  "ARCHIVED",
  "SUPERSEDED",
];

export const ACTIVITY_LABEL: Record<string, string> = {
  APPROVED: "Dossiers approuvés",
  REJECTED: "Dossiers rejetés",
  SUBMITTED: "Dossiers soumis",
  UNDER_REVIEW: "Dossiers pris en revue",
  PENDING_CORRECTION: "Corrections demandées",
  CORRECTION_REQUESTED: "Corrections demandées",
};

export const PERIOD_LABEL: Record<string, string> = {
  LAST_7_DAYS: "7 derniers jours",
  LAST_30_DAYS: "30 derniers jours",
  TODAY: "Aujourd'hui",
};

export const label = (map: Record<string, string>, key?: string | null): string =>
  key ? (map[key] ?? key.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())) : "";

// ───────────────────────── Couleurs de graphiques ─────────────────────────

export const STATUS_COLOR: Record<string, string> = {
  APPROVED: "#2E9E6B",
  VERIFIED: "#2E9E6B",
  SIGNED: "#E0529C",
  REJECTED: "#D6455D",
  NEEDS_CORRECTION: "#D6455D",
  PENDING_CORRECTION: "#D6455D",
  PENDING_REVIEW: "#E5A23B",
  SUBMITTED: "#E5A23B",
  RENEWAL_REQUIRED: "#E5A23B",
  UNDER_REVIEW: "#E0529C",
  IN_REVIEW: "#E0529C",
  UPLOADED: "#5B8DEF",
  IN_PROGRESS: "#5B8DEF",
  NOT_STARTED: "#B8BCC6",
  DRAFT: "#B8BCC6",
  EXPIRED: "#8A8F9C",
  ARCHIVED: "#8A8F9C",
  SUPERSEDED: "#8A8F9C",
};

export const PALETTE = ["#E0529C", "#5B8DEF", "#2E9E6B", "#E5A23B", "#9B8FD1", "#4FB6C4", "#D6455D", "#8A8F9C"];

// ************** Formats *************

export const fmtInt = (n: number): string => n.toLocaleString("fr-FR");

export const fmtHours = (value?: number): string => {
  const v = Math.max(0, Number(value ?? 0));
  return v < 1 ? `${Math.round(v * 60)} min` : `${v.toFixed(1).replace(".", ",")} h`;
};

export const formatBytes = (bytes?: number | null): string => {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2)).toLocaleString("fr-FR")} ${units[i]}`;
};

/** Date et heure lisibles à partir d'une chaîne ISO. Renvoie la chaîne telle quelle si elle n'est pas une date. */
export const dateTime = (value?: string | null): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

export const dayOnly = (value?: string | null): string => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR");
};

export const isPast = (value?: string | null): boolean => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};

/** Résumé lisible d'un traitement en masse (réponse de l'API KYC ou GED) */
export const bulkSummary = (r: { processed?: number; total?: number; succeeded?: number; failed?: number } | undefined): string => {
  const total = r?.processed ?? r?.total;
  const ok = r?.succeeded;
  const ko = r?.failed ?? 0;
  if (ok === undefined) return "Traitement terminé.";
  return `${ok} réussi${ok > 1 ? "s" : ""}${ko ? `, ${ko} en échec` : ""}${total !== undefined ? ` sur ${total}` : ""}.`;
};

/** Valeur numérique si la saisie en est une, sinon la chaîne (identifiants de rôle ou d'équipe) */
export const numericOrText = (v: string): number | string => {
  const t = v.trim();
  return t !== "" && /^\d+$/.test(t) ? Number(t) : t;
};

export const toCsv = (rows: (string | number | null | undefined)[][]): string =>
  rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

// ********************* Hooks ********************

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Pagination côté client pour les listes que l'API renvoie d'un bloc */
export function usePaged<T>(items: T[], size = 15) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(page, totalPages - 1);
  const slice = useMemo(() => items.slice(safe * size, safe * size + size), [items, safe, size]);
  return { page: safe, setPage, slice, totalPages, total: items.length };
}

/** Transforme un dictionnaire {clé: nombre} en éléments de graphique, triés par valeur décroissante */
export const toRank = (data: Record<string, number> | undefined, labels: Record<string, string>, colors?: Record<string, string>) =>
  Object.entries(data ?? {})
    .map(([key, value], i) => ({ key, label: label(labels, key), value: Number(value) || 0, color: colors?.[key] ?? PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
