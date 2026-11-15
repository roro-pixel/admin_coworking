/* Fonctions et constantes partagées par les rapports (aucun composant ici : voir reportKit.tsx). */
import { useState } from "react";
import { LOGO_PINK } from "../layout/adminTheme";
import { saveBlob } from "../payment/paymentUtils";
import { toast } from "../ui/toastStore";
import { apiMessage, formatMoney } from "../subscription/kitUtils";
import type { Tone } from "../subscription/kitUtils";

/** Date locale au format AAAA-MM-JJ (toISOString décale d'un jour dès que le fuseau est en avance sur UTC). */
export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface DateRange {
  from: string;
  to: string;
}

/** Mois courant (offset 0) ou précédent (offset -1) */
export const monthRange = (offset = 0): DateRange => {
  const now = new Date();
  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth() + offset, 1)),
    to: isoDate(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)),
  };
};

export const lastDaysRange = (days: number): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
};

/** "2026-10-06" -> "06/10" sans passer par Date (pas de décalage de fuseau) */
export const shortDay = (iso: string): string => {
  const [, m, d] = iso.slice(0, 10).split("-");
  return m && d ? `${d}/${m}` : iso;
};

export const longDay = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export const monthLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }).replace(".", "");
};

export const money = (n?: number | null): string => formatMoney(Math.round(n ?? 0));

export const fmtInt = (n?: number | null): string => (n ?? 0).toLocaleString("fr-FR");

export const fmtPct = (n?: number | null, digits = 1): string =>
  `${(n ?? 0).toFixed(digits).replace(".", ",")} %`;

export const fmtMinutes = (mins?: number | null): string => {
  const total = Math.round(mins ?? 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h${m > 0 ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
};

/** Valeur d'axe compacte : 1 250 000 -> "1,3 M" */
export const compact = (n: number): string => {
  const abs = Math.abs(n);
  const trim = (v: number) => v.toFixed(v >= 10 || Number.isInteger(v) ? 0 : 1).replace(".", ",");
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)} Md`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)} M`;
  if (abs >= 10_000) return `${trim(n / 1_000)} k`;
  return n.toLocaleString("fr-FR");
};

export const percentChange = (current: number, previous: number): number =>
  previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;

/** Couleurs stables par moyen de paiement, reprises dans tous les rapports */
export const METHOD_COLORS: Record<string, string> = {
  CASH: LOGO_PINK,
  WALLET: "#9B8FD1",
  MOBILE_MONEY: "#E8A33D",
  BANK_TRANSFER: "#7FB08A",
  CARD: "#E4C7D6",
  CHEQUE: "#B9B4B0",
};

/** Du plus sain au plus risqué : tranches d'ancienneté des créances */
export const AGING_COLORS = ["#7FB08A", "#E8A33D", "#E08A4B", "#D9534F", "#A83232"];

export const WARN = "#E8A33D";
export const DANGER = "#D9534F";
export const OK = "#7FB08A";

/** Couleur d'un taux d'utilisation : à surveiller en dessous de 40 %, solide au-delà de 70 % */
export const rateColor = (rate: number): string => (rate >= 70 ? OK : rate >= 40 ? WARN : DANGER);

/** Export de fichier avec état d'attente par bouton et message d'erreur en toast */
export const useExport = () => {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, produce: () => Promise<Blob>, fileName: string) => {
    setBusy(key);
    try {
      saveBlob(await produce(), fileName);
    } catch (e) {
      toast.error(apiMessage(e, "Export impossible pour le moment."));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
};

/** Entrées en rose, sorties en violet doux : mêmes teintes pour tous les flux de caisse */
export const FLOW_IN = LOGO_PINK;
export const FLOW_OUT = "#9B8FD1";

/** "MOBILE_MONEY" -> "Mobile money" */
export const humanize = (code?: string | null): string => {
  if (!code) return "";
  const s = code.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Teinte d'une pastille de statut à partir du code renvoyé par l'API */
export const statusTone = (status?: string | null): Tone => {
  const s = (status ?? "").toUpperCase();
  if (/(ACTIVE|PAID|SUCCEED|COMPLETED|CONFIRMED|RESOLVED|SIGNED|APPROVED|ISSUED|VALID)/.test(s) && !/(INACTIVE|UNPAID)/.test(s)) return "success";
  if (/(PENDING|DRAFT|OPEN|PARTIAL|PROGRESS|REVIEW|WAITING|SENT)/.test(s)) return "warn";
  if (/(CANCEL|FAIL|OVERDUE|EXPIRED|REJECT|SUSPEND|BLOCK|LOCK|UNPAID)/.test(s)) return "danger";
  return "neutral";
};

const FR: Record<string, string> = {
  ACTIVE: "Actif", INACTIVE: "Inactif", SUSPENDED: "Suspendu", PENDING: "En attente", DRAFT: "Brouillon", ISSUED: "Émise",
  PAID: "Payée", PARTIALLY_PAID: "Partiellement payée", UNPAID: "Impayée", OVERDUE: "En retard", CANCELLED: "Annulée",
  CONFIRMED: "Confirmée", COMPLETED: "Terminée", SUCCEEDED: "Réussi", FAILED: "Échoué", EXPIRED: "Expiré", SIGNED: "Signé",
  RESOLVED: "Résolu", CLOSED: "Clôturé", OPEN: "Ouvert", IN_PROGRESS: "En cours", TERMINATED: "Résilié", REFUNDED: "Remboursé",
  MONTHLY: "Mensuel", QUARTERLY: "Trimestriel", YEARLY: "Annuel", ANNUAL: "Annuel", WEEKLY: "Hebdomadaire", DAILY: "Journalier",
  LOW: "Basse", MEDIUM: "Moyenne", HIGH: "Haute", URGENT: "Urgente", CRITICAL: "Critique",
  BOOKING: "Réservations", SUBSCRIPTION: "Abonnements", MANUAL: "Saisies manuelles", EVENT: "Événements", PASS: "Pass",
  MAINTENANCE: "Maintenance", BILLING: "Facturation", TECHNICAL: "Technique",
};

/** Libellé français d'un code API connu, sinon le code lisible */
export const frLabel = (code?: string | null): string => (code ? FR[code.toUpperCase()] ?? humanize(code) : "");
