import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileSignature, Plus } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, HeadRow, Pagination, StatusChip, Tabs, Tag } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { statusOf } from "../../../components/subscription/labels";
import { QUOTE_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]";
const TABS: TabItem<string>[] = [{ id: "all", label: "Tous" }, ...Object.entries(QUOTE_STATUS).map(([id, s]) => ({ id, label: s.label }))];

/** Devis d'abonnement : prix négociés avant la souscription. */
export const QuotesList: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-quotes", status, page],
    queryFn: () => subscriptionLifecycleService.getQuotes({ page, size: PAGE_SIZE, status: status === "all" ? undefined : status }),
  });
  const rows = data?.content ?? [];

  return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => navigate("/subscriptions/quotes/new")}>Nouveau devis</ActionButton>
        </div>
        <Tabs variant="soft" items={TABS} active={status} onChange={(id) => { setStatus(id); setPage(0); }} />

        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorBlock message="Impossible de charger les devis." onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileSignature} title="Aucun devis" hint="Créez un devis pour proposer un abonnement." action={<ActionButton onClick={() => navigate("/subscriptions/quotes/new")}>Nouveau devis</ActionButton>} />
        ) : (
          <DataCard>
            <HeadRow cols={COLS}>
              <span>Devis</span>
              <span>Souscripteur</span>
              <span>Plan</span>
              <span>Prix proposé</span>
              <span>Valable jusqu'au</span>
              <span>Statut</span>
            </HeadRow>
            <div className="space-y-1.5">
              {rows.map((q) => {
                const st = statusOf(QUOTE_STATUS, q.status);
                const go = () => navigate(`/subscriptions/quotes/${q.quoteNumber}`);
                return (
                  <div
                    key={q.quoteNumber}
                    role="link"
                    tabIndex={0}
                    onClick={go}
                    onKeyDown={(e) => e.key === "Enter" && go()}
                    className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS}`}
                  >
                    <p className="truncate font-mono text-sm font-semibold text-gray-900">{q.quoteNumber}</p>
                    <p className="truncate font-mono text-xs text-gray-600">{q.subscriberCode ?? "Non renseigné"}</p>
                    <p className="truncate font-mono text-xs text-gray-600">{q.planCode ?? "Non renseigné"}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{q.quotedPrice != null ? formatMoney(q.quotedPrice, "FCFA") : "Prix du catalogue"}</span>
                      {q.negotiated && <Tag tone="pink">Négocié</Tag>}
                    </div>
                    <p className="text-sm text-gray-600">{q.validUntil ? formatDate(q.validUntil) : "Non renseigné"}</p>
                    <div><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                  </div>
                );
              })}
            </div>
          </DataCard>
        )}
        <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="devis" onChange={setPage} />
      </div>
  );
};
