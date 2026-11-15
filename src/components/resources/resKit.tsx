import React, { useEffect, useMemo, useState } from "react";
import { StatusChip } from "../subscription/kit";
import type { Tone } from "../subscription/kitUtils";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { Toaster } from "../ui/Toaster";

/** Petit libellé gris au-dessus d'une valeur, visible seulement sur mobile et tablette */
export const Cell: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">{title}</span>
    {children}
  </div>
);

/** Bloc de lecture libellé / valeur sur panneau gris */
export const Fact: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <div className="mt-1 break-words text-sm font-semibold text-gray-900">{children}</div>
  </div>
);

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  MAINTENANCE: "Maintenance",
  OUT_OF_SERVICE: "Hors service",
  ARCHIVED: "Archivé",
};
export const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warn",
  OUT_OF_SERVICE: "danger",
  ARCHIVED: "neutral",
};
export const STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "ARCHIVED"] as const;

export const UNIT_LABEL: Record<string, string> = { HOUR: "Heure", HALF_DAY: "Demi-journée", DAY: "Jour", WEEK: "Semaine", MONTH: "Mois" };
export const UNITS = ["HOUR", "HALF_DAY", "DAY", "WEEK", "MONTH"] as const;
export const ADJ_LABEL: Record<string, string> = { FIXED_PRICE: "Prix fixe", AMOUNT_DELTA: "Écart en montant", PERCENT_DELTA: "Écart en pourcentage" };
export const ADJUSTMENTS = ["FIXED_PRICE", "AMOUNT_DELTA", "PERCENT_DELTA"] as const;
export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export const DAY_LABEL: Record<string, string> = { MONDAY: "Lundi", TUESDAY: "Mardi", WEDNESDAY: "Mercredi", THURSDAY: "Jeudi", FRIDAY: "Vendredi", SATURDAY: "Samedi", SUNDAY: "Dimanche" };
export const OCC_LABEL: Record<string, string> = { FREE: "Libre", PARTIALLY_OCCUPIED: "Partiel", HIGHLY_OCCUPIED: "Presque plein", FULL: "Complet" };

export const label = (map: Record<string, string>, key?: string | null) => (key ? map[key] ?? key : "");

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) =>
  status ? <StatusChip tone={STATUS_TONE[status] ?? "neutral"}>{label(STATUS_LABEL, status)}</StatusChip> : null;

/** Jour de la semaine : accepte MONDAY ou 1..7 */
export const dayLabel = (d?: string | number | null) => {
  if (d === null || d === undefined || d === "") return "Tous les jours";
  if (typeof d === "number" || /^\d$/.test(String(d))) return DAY_LABEL[DAYS[Number(d) - 1]] ?? String(d);
  return DAY_LABEL[String(d).toUpperCase()] ?? String(d);
};

export const formatDuration = (min?: number | null) => {
  if (min === null || min === undefined) return "";
  if (min === 0) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const d = Math.floor(h / 24);
  if (d >= 1 && h % 24 === 0 && m === 0) return `${d} j`;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

export const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");
/** Valeur datetime-local à partir d'une date ISO */
export const toLocalInput = (iso?: string | null) => (iso ? String(iso).slice(0, 16) : "");
/** Envoie le datetime-local avec les secondes, sans fuseau */
export const withSeconds = (v: string) => (v.length === 16 ? `${v}:00` : v);
export const dayKey = (iso: string) => String(iso).slice(0, 10);
export const timeRange = (a: string, b: string) => `${String(a).slice(11, 16)} - ${String(b).slice(11, 16)}`;

/** Habillage commun des pages détail et création : centré, avec le thème et les toasts */
export const DetailShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminLayout>
    <div style={brandVars}>
      <Toaster />
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </div>
  </AdminLayout>
);

/** Ligne blanche d'une liste secondaire, cliquable si onClick est fourni */
export const Row: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = "" }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ${onClick ? "cursor-pointer transition hover:bg-gray-50" : ""} ${className}`}
  >
    {children}
  </div>
);

/** Pagination côté client pour une liste déjà chargée en entier (ex. les créneaux d'un mois) */
export function usePaged<T>(items: T[], size = 15) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(page, totalPages - 1);
  const slice = useMemo(() => items.slice(safe * size, safe * size + size), [items, safe, size]);
  return { page: safe, setPage, slice, totalPages, total: items.length };
}

/** Dernier jour d'un mois "YYYY-MM" au format YYYY-MM-DD */
export const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
