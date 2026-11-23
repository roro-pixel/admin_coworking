import React from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { EmptyState, ErrorBlock, StatusChip } from "../../components/subscription/kit";
import type { Tone } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";

export const SOURCE_COLOR: Record<string, string> = {
  ACTION: "#2563eb", SECURITY: "#dc2626", ERROR: "#b91c1c", REQUEST: "#d97706", FISCAL: "#7c3aed", CONTRACT: "#0d9488", COMPLIANCE: "#9333ea", WALLET: "#0891b2", DOCUMENT_ACCESS: "#4f46e5",
  APPROVAL: "#16a34a", SETTING: "#ca8a04", EMAIL: "#0ea5e9", WHATSAPP: "#22c55e", OUTBOX: "#64748b", NOTIFICATION: "#ec4899", WEBHOOK: "#f97316", PAWAPAY: "#84cc16", JOB: "#6b7280",
};
export const sevTone = (s?: string): Tone => (s === "CRITICAL" ? "danger" : s === "WARNING" ? "warn" : "neutral");
export const statusTone = (s?: string): Tone => (!s ? "neutral" : /FAIL|ERROR|DEAD|DOWN|5\d\d|REJECT|OPEN/i.test(s) ? "danger" : /WARN|PENDING|ACKNOWLEDGED|SLOW/i.test(s) ? "warn" : /SUCCESS|OK|UP|SENT|RESOLVED|2\d\d|DELIVERED|PUBLISHED/i.test(s) ? "success" : "neutral");
export const Status: React.FC<{ s?: string | number }> = ({ s }) => (s == null || s === "" ? null : <StatusChip tone={statusTone(String(s))}>{String(s)}</StatusChip>);

/** Lien vers la chronologie filtrée (utilisateur, élément ou requête). */
export const tlHref = (p: { user?: string; entityCode?: string; entityType?: string; requestId?: string }) => {
  const q = new URLSearchParams({ tab: "timeline" });
  Object.entries(p).forEach(([k, v]) => v && q.set(k, v));
  return `/audit?${q.toString()}`;
};
export const TL: React.FC<{ user?: string; entityCode?: string; entityType?: string; requestId?: string; children?: React.ReactNode }> = ({ children, ...p }) => {
  const v = p.user ?? p.entityCode ?? p.requestId;
  if (!v) return null;
  return <Link to={tlHref(p)} className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)] hover:underline" title="Voir la chronologie">{children ?? v}</Link>;
};

export const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" }) : "—");
export const num = (n?: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR"));
/** `YYYY-MM-DD` ou date-heure locale vers ISO. */
export const iso = (v: string, end = false) => (v ? (v.length === 10 ? `${v}T${end ? "23:59:59" : "00:00:00"}` : v) : undefined);

export const Async: React.FC<{ q: { isLoading: boolean; isError: boolean; refetch: () => unknown }; empty?: string; isEmpty?: boolean; children: React.ReactNode }> = ({ q, empty = "Aucune donnée", isEmpty, children }) =>
  q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : isEmpty ? <EmptyState icon={Inbox} title={empty} /> : <>{children}</>;

export const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
    <table className="min-w-full text-xs">
      <thead><tr className="text-left text-gray-500">{head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
export const Td: React.FC<{ children?: React.ReactNode; mono?: boolean; wrap?: boolean }> = ({ children, mono, wrap }) => <td className={`px-3 py-2 align-top text-gray-700 ${wrap ? "" : "whitespace-nowrap"} ${mono ? "font-mono" : ""}`}>{children}</td>;
