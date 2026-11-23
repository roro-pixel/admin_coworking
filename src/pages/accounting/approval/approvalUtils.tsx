import React from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { EmptyState, ErrorBlock, StatusChip } from "../../../components/subscription/kit";
import type { Tone } from "../../../components/subscription/kitUtils";
import { formatDate, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import type { ApprovalCenter, ApprovalRequest } from "../../../services/approval.service";

/** Centres branchés : la caisse (/accounting/approvals) et la facturation (/billing/approvals), mêmes composants. */
export type { ApprovalCenter };
export const CENTER_LABEL: Record<string, string> = { CASH: "Caisse (demandes de fonds)", BILLING: "Facturation", BOOKING: "Réservations (remises sur le prix)" };

export const LABEL: Record<string, string> = {
  PENDING: "En attente", APPROVED: "Approuvée", REJECTED: "Rejetée", RETURNED: "Renvoyée", CANCELLED: "Annulée", WAITING: "Pas encore atteint", APPROVED_BY_HIGHER: "Approuvé en avance",
  SUBMITTED: "Soumise", REMINDED: "Rappel", ESCALATED: "Escalade",
};
export const tone = (s?: string): Tone => (!s ? "neutral" : /REJECTED|CANCELLED/.test(s) ? "danger" : /APPROVED/.test(s) ? "success" : /PENDING|RETURNED|REMINDED|ESCALATED/.test(s) ? "warn" : "neutral");
export const Chip: React.FC<{ s?: string }> = ({ s }) => (s ? <StatusChip tone={tone(s)}>{LABEL[s] ?? s}</StatusChip> : null);
export const money = (n?: number | null, cur?: string) => (n == null ? "—" : formatMoney(n, cur ?? "FCFA"));

export const RequestRows: React.FC<{ q: { isLoading: boolean; isError: boolean; data?: ApprovalRequest[]; refetch: () => unknown }; empty: string; waiting?: boolean; basePath: string }> = ({ q, empty, waiting, basePath }) =>
  q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title={empty} /> : (
    <div className="space-y-1.5">
      {q.data!.map((r) => (
        <Link key={r.number} to={`${basePath}/${encodeURIComponent(r.number)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-sm transition hover:bg-gray-50">
          <span className="min-w-0">
            <span className="block font-semibold text-gray-900">{r.number} <span className="font-normal text-gray-500">· {r.title ?? r.requestType}</span></span>
            <span className="block truncate text-xs text-gray-500">
              {[r.requesterName ?? r.requester, r.subjectRef && `${r.subjectType ?? ""} ${r.subjectRef}`.trim(), r.currentLabel && `niveau ${r.currentLevel}/${r.requiredLevels} : ${r.currentLabel}`, waiting && r.waitingFor && `attend ${r.waitingFor}`, waiting && r.levelSince && `depuis ${formatDateTime(r.levelSince)}`, !waiting && r.submittedAt && `soumise le ${formatDate(r.submittedAt)}`].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="flex items-center gap-3"><span className="font-mono text-sm">{money(r.amount, r.currency)}</span><Chip s={r.status} /></span>
        </Link>
      ))}
    </div>
  );
