import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BellRing } from "lucide-react";
import { dunningService } from "../../../services/dunning.service";
import type { DunningNoticeView } from "../../../services/dunning.service";
import { ErrorBlock, ItemRow, Pagination, Section, StatusChip, Tag } from "../../subscription/kit";
import { FOCUS, MONO_LINK, formatDateTime, formatMoney } from "../../subscription/kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { ACTION_LABEL, OUTCOME_LABEL, OUTCOME_TONE, labelOf } from "./dunningLabels";

const PAGE_SIZE = 10;

type Scope = { documentNumber: string; customer?: undefined } | { customer: { type: string; code: string }; documentNumber?: undefined };

export const NoticeTimeline: React.FC<Scope & { className?: string }> = ({ documentNumber, customer, className }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dunning-notices", documentNumber ?? `${customer?.type}/${customer?.code}`],
    queryFn: () =>
      documentNumber ? dunningService.getDocumentNotices(documentNumber) : dunningService.getCustomerNotices(customer!.type, customer!.code),
  });

  const notices: DunningNoticeView[] = [...(data ?? [])].sort((a, b) => b.executedAt.localeCompare(a.executedAt));
  const totalPages = Math.max(1, Math.ceil(notices.length / PAGE_SIZE));
  const visible = notices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Section
      className={className}
      title="Relances"
      description={documentNumber ? "Rappels envoyés pour cette facture" : "Rappels envoyés à ce client"}
      icon={BellRing}
    >
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les relances." onRetry={() => refetch()} />
      ) : notices.length === 0 ? (
        <p className="py-3 text-center text-sm text-gray-400">Aucune relance envoyée.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((n) => (
              <ItemRow key={`${n.documentNumber}-${n.policyCode}-${n.stepOrder}-${n.executedAt}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {labelOf(ACTION_LABEL, n.action)}
                      <span className="font-normal text-gray-400"> · palier {n.stepOrder}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {customer && (
                        <button type="button" onClick={() => navigate(`/billing/documents/${n.documentNumber}`)} className={`${MONO_LINK} ${FOCUS} rounded`}>
                          {n.documentNumber}
                        </button>
                      )}
                      {customer && " · "}
                      {formatDateTime(n.executedAt)} · J+{n.daysOverdue} · solde {formatMoney(n.balanceDue)}
                    </p>
                    {n.detail && <p className="mt-1 text-xs text-gray-400">{n.detail}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Tag>{n.policyCode}</Tag>
                    <StatusChip tone={OUTCOME_TONE[n.outcome as keyof typeof OUTCOME_TONE] ?? "neutral"}>{labelOf(OUTCOME_LABEL, n.outcome)}</StatusChip>
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={notices.length} noun="relance" onChange={setPage} />
        </>
      )}
    </Section>
  );
};
