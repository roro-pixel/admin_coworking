import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import { DataCard, EmptyState, ErrorBlock, HeadRow, Pagination, StatusChip, Tabs, Tag } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { statusOf } from "../../../components/subscription/labels";
import { DERIVATION_REASONS, DERIVATION_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";
import { DerivationBulkPanel } from "../../../components/subscription/lifecycle/DerivationBulkPanel";
import { ConcessionsPanel } from "../../../components/subscription/lifecycle/ConcessionsPanel";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_9rem]";
type TabId = "PENDING_APPROVAL" | "ACTIVE" | "all" | "bulk" | "concessions";
const TABS: TabItem<TabId>[] = [
  { id: "PENDING_APPROVAL", label: "À approuver" },
  { id: "ACTIVE", label: "Actives" },
  { id: "all", label: "Toutes" },
  { id: "bulk", label: "Lot et protection" },
  { id: "concessions", label: "Concessions" },
];

/** Prix négociés (dérivations) de tous les abonnements, avec le visa à deux personnes. */
export const DerivationsList: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("PENDING_APPROVAL");
  const [page, setPage] = useState(0);
  const isList = tab !== "bulk" && tab !== "concessions";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["derivations", tab, page],
    queryFn: () => subscriptionDerivationService.getDerivations({ page, size: PAGE_SIZE, status: tab === "all" ? undefined : tab }),
    enabled: isList,
  });
  const rows = data?.content ?? [];

  return (
      <div className="space-y-5">
        <Tabs variant="soft" items={TABS} active={tab} onChange={(id) => { setTab(id); setPage(0); }} />

        {tab === "bulk" && <DerivationBulkPanel />}
        {tab === "concessions" && <ConcessionsPanel />}

        {isList &&
          (isLoading ? (
            <ListSkeleton rows={6} />
          ) : isError ? (
            <ErrorBlock message="Impossible de charger les prix négociés." onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Handshake} title={tab === "PENDING_APPROVAL" ? "Rien à approuver" : "Aucun prix négocié"} hint={tab === "PENDING_APPROVAL" ? "Aucune dérivation n'attend de second visa." : "Rien à afficher dans cet onglet."} />
          ) : (
            <DataCard>
              <HeadRow cols={COLS}>
                <span>Dérivation</span>
                <span>Abonnement</span>
                <span>Raison</span>
                <span>Demandée par</span>
                <span>Effet</span>
                <span>Statut</span>
              </HeadRow>
              <div className="space-y-1.5">
                {rows.map((d) => {
                  const st = statusOf(DERIVATION_STATUS, d.status);
                  const reason = DERIVATION_REASONS.find((r) => r.value === d.reason)?.label;
                  const go = () => navigate(`/subscriptions/derivations/${d.derivationCode}`);
                  return (
                    <div
                      key={d.derivationCode}
                      role="link"
                      tabIndex={0}
                      onClick={go}
                      onKeyDown={(e) => e.key === "Enter" && go()}
                      className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS}`}
                    >
                      <p className="truncate font-mono text-sm font-semibold text-gray-900">{d.derivationCode}</p>
                      <p className="truncate font-mono text-xs text-gray-600">{d.subscriptionNumber ?? "Non renseigné"}</p>
                      <div>{reason ? <Tag>{reason}</Tag> : <span className="text-sm text-gray-400">Non renseigné</span>}</div>
                      <p className="truncate text-sm text-gray-600">{d.requestedBy ?? "Non renseigné"}</p>
                      <p className="text-sm text-gray-600">{d.effectiveFrom ? formatDate(d.effectiveFrom) : "Dès la création"}</p>
                      <div><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                    </div>
                  );
                })}
              </div>
            </DataCard>
          ))}
        {isList && <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="prix négocié" onChange={setPage} />}
      </div>
  );
};
