import React from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { EmptyState, ErrorBlock, StatusChip } from "../../../components/subscription/kit";
import type { Tone } from "../../../components/subscription/kitUtils";
import { formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { FUND_TYPES } from "../../../services/fund.service";
import type { FundRequest } from "../../../services/fund.service";

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon", SUBMITTED: "Soumise", IN_APPROVAL: "En validation", APPROVED: "Approuvée", PARTIALLY_DISBURSED: "Décaissée en partie", DISBURSED: "Décaissée",
  TO_JUSTIFY: "À justifier", PARTIALLY_JUSTIFIED: "Justifiée en partie", JUSTIFIED: "Justifiée", SETTLED: "Soldée", REJECTED: "Rejetée", CANCELLED: "Annulée", EXPIRED: "Expirée",
  VALIDATED: "Validé", TRANSFORMED: "Transformé", PARTIALLY_TRANSFORMED: "Transformé en partie", PENDING: "En attente",
};
export const fundTone = (s?: string): Tone =>
  !s ? "neutral" : /REJECTED|CANCELLED|EXPIRED/.test(s) ? "danger" : /SETTLED|JUSTIFIED$|VALIDATED|^DISBURSED|^TRANSFORMED/.test(s) ? "success" : /IN_APPROVAL|SUBMITTED|PARTIALLY|TO_JUSTIFY|APPROVED|PENDING/.test(s) ? "warn" : "neutral";
export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => (status ? <StatusChip tone={fundTone(status)}>{STATUS_LABEL[status] ?? status}</StatusChip> : null);
export const typeLabel = (t?: string) => FUND_TYPES.find((x) => x.code === t)?.label ?? t ?? "";
export const money = (n?: number | null) => (n == null ? "—" : formatMoney(n));

/** Liste de demandes cliquables, avec chargement, erreur et vide. */
export const RequestList: React.FC<{ q: { isLoading: boolean; isError: boolean; data?: FundRequest[]; refetch: () => unknown }; empty: string; extra?: (r: FundRequest) => React.ReactNode }> = ({ q, empty, extra }) =>
  q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title={empty} /> : (
    <div className="space-y-1.5">
      {q.data!.map((r) => (
        <Link key={r.number} to={`/accounting/fund/${encodeURIComponent(r.number)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-sm transition hover:bg-gray-50">
          <span className="min-w-0">
            <span className="block font-semibold text-gray-900">{r.number} <span className="font-normal text-gray-500">· {typeLabel(r.type)}</span></span>
            <span className="block truncate text-xs text-gray-500">{[r.subject, r.beneficiaryName ?? r.requester, r.wantedDate && `souhaitée le ${formatDate(r.wantedDate)}`].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="flex items-center gap-3">
            {extra?.(r)}
            <span className="font-mono text-sm">{money(r.approvedAmount ?? r.totalAmount)}</span>
            <StatusBadge status={r.status} />
          </span>
        </Link>
      ))}
    </div>
  );
