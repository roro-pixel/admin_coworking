import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import { DataCard, EmptyState, ErrorBlock, HeadRow, Pagination, StatusChip, Tabs, Tag } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { statusOf } from "../../../components/subscription/labels";
import { TERMINATION_REASONS, TERMINATION_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]";
const TABS: TabItem<string>[] = [
  { id: "REQUESTED", label: "Demandées" },
  { id: "ACCEPTED", label: "Acceptées" },
  { id: "BLOCKED", label: "Bloquées" },
  { id: "COMPLETED", label: "Terminées" },
  { id: "all", label: "Toutes" },
];

/** Résiliations de tous les abonnements. « Bloquées » : date d'effet passée et liste de sortie encore ouverte. */
export const TerminationsList: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("REQUESTED");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["terminations", tab, page],
    queryFn: () =>
      tab === "BLOCKED"
        ? subscriptionLifecycleService.getBlockedTerminations({ page, size: PAGE_SIZE })
        : subscriptionLifecycleService.getTerminations({ page, size: PAGE_SIZE, status: tab === "all" ? undefined : tab }),
  });
  const rows = data?.content ?? [];

  return (
      <div className="space-y-5">
        <Tabs variant="soft" items={TABS} active={tab} onChange={(id) => { setTab(id); setPage(0); }} />

        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorBlock message="Impossible de charger les résiliations." onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={LogOut} title={tab === "BLOCKED" ? "Aucune résiliation bloquée" : "Aucune résiliation"} hint={tab === "BLOCKED" ? "Toutes les listes de sortie arrivées à échéance sont closes." : "Rien à afficher dans cet onglet."} />
        ) : (
          <DataCard>
            <HeadRow cols={COLS}>
              <span>Résiliation</span>
              <span>Abonnement</span>
              <span>Motif</span>
              <span>Date d'effet</span>
              <span>Indemnité</span>
              <span>Statut</span>
            </HeadRow>
            <div className="space-y-1.5">
              {rows.map((t) => {
                const st = statusOf(TERMINATION_STATUS, t.status);
                const reason = TERMINATION_REASONS.find((r) => r.value === t.reasonCategory)?.label;
                const open = t.exitItems.filter((i) => i.mandatory && i.status === "PENDING").length;
                const go = () => navigate(`/subscriptions/terminations/${t.terminationCode}`);
                return (
                  <div
                    key={t.terminationCode}
                    role="link"
                    tabIndex={0}
                    onClick={go}
                    onKeyDown={(e) => e.key === "Enter" && go()}
                    className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS}`}
                  >
                    <p className="truncate font-mono text-sm font-semibold text-gray-900">{t.terminationCode}</p>
                    <p className="truncate font-mono text-xs text-gray-600">{t.subscriptionNumber}</p>
                    <div className="min-w-0">{reason ? <Tag>{reason}</Tag> : <span className="text-sm text-gray-400">Non renseigné</span>}</div>
                    <div className="text-sm text-gray-600">
                      <p>{t.effectiveDate ? formatDate(t.effectiveDate) : "À confirmer"}</p>
                      {open > 0 && <p className="text-xs text-amber-600">{open} point{open > 1 ? "s" : ""} de sortie ouvert{open > 1 ? "s" : ""}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{t.feeAmount != null ? formatMoney(t.feeAmount, "FCFA") : "Aucune"}</p>
                    <div><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                  </div>
                );
              })}
            </div>
          </DataCard>
        )}
        <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="résiliation" onChange={setPage} />
      </div>
  );
};
