/*
 * Constantes de style et formateurs partagés par tout le module Abonnements.
 * Aucun composant ici (règle react-refresh) : les composants sont dans kit.tsx.
 * Classes écrites en toutes lettres : Tailwind ne voit pas les classes assemblées.
 */

export const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";

export const PINK_SOFT = "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]";

/** Champ posé sur fond blanc (liste, barre de filtres) */
export const FIELD_SOFT =
  "w-full rounded-2xl border border-transparent bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[color:var(--logo-pink)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)] disabled:cursor-not-allowed disabled:text-gray-400";

/** Champ posé sur le panneau gris d'une Section (blanc + ombre pour rester visible) */
export const FIELD =
  "w-full rounded-2xl border border-transparent bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:border-[color:var(--logo-pink)] focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none";

export const MONO_LINK =
  "max-w-full truncate rounded-md font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)] hover:underline";

export const ROW_HOVER = "hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)]";

/** Formate une date ISO en jj/mm/aaaa. Chaîne vide si absente ou invalide. */
export const formatDate = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

export const formatNumber = (n?: number | null): string =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("fr-FR") : "";

export const formatMoney = (n?: number | null, currency = "FCFA"): string =>
  typeof n === "number" && Number.isFinite(n)
    ? `${n.toLocaleString("fr-FR")} ${currency}`
    : "";

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export type Tone = "success" | "warn" | "danger" | "neutral" | "pink" | "info";

/** Extrait le message d'erreur d'une réponse API (sans changer la forme des appels). */
export const apiMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
