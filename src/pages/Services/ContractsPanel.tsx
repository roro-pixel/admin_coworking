import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSignature, Plus } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, Pagination, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { ROW_HOVER, apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob, todayIso } from "../../components/wallet/control/controlUtils";
import { CONTRACT_FILTERS, CONTRACT_STATUS, DOMICILIATION_CYCLE_OPTIONS } from "../../components/services/serviceLabels";

const PAGE_SIZE = 10;
const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_10.5rem]";
const FILTER_TABS: TabItem<string>[] = CONTRACT_FILTERS.map((f) => ({ id: f.id, label: f.label }));
const CYCLE_LABEL = Object.fromEntries(DOMICILIATION_CYCLE_OPTIONS.map((o) => [o.value, o.label]));

/** Contrats de domiciliation par statut, ouverture d'un contrat et export du registre des domiciliés. */
export const ContractsPanel: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["domiciliation-contracts", filter, page],
    queryFn: () => domiciliationService.getContracts({ page, size: PAGE_SIZE, status: filter === "all" ? undefined : filter }),
  });
  const rows = data?.content ?? [];

  const exportMutation = useMutation({
    mutationFn: () => domiciliationService.exportRegistry(),
    onSuccess: (blob) => saveBlob(blob, `registre-domicilies-${todayIso()}.csv`),
    onError: (e) => toast.error(apiMessage(e, "Export impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Contrats de domiciliation"
        subtitle="Du brouillon à l'attestation : pièces, signature, enregistrement."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Download} pending={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              Registre des domiciliés
            </ActionButton>
            <ActionButton icon={Plus} onClick={() => navigate("/services/contracts/new")}>
              Ouvrir un contrat
            </ActionButton>
          </div>
        }
      />

      <Tabs
        variant="soft"
        items={FILTER_TABS}
        active={filter}
        onChange={(id) => {
          setFilter(id);
          setPage(0);
        }}
      />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les contrats." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Aucun contrat"
          hint={filter === "all" ? "Ouvrez un premier contrat de domiciliation." : "Aucun contrat dans ce statut."}
        />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Domicilié</span>
            <span>Abonnement</span>
            <span>Adresse</span>
            <span>Engagement</span>
            <span>Début</span>
            <span>Statut</span>
          </HeadRow>
          <div className="space-y-1.5">
            {rows.map((c) => {
              const st = statusOf(CONTRACT_STATUS, c.status);
              const go = () => navigate(`/services/contracts/${encodeURIComponent(c.contractNumber)}`);
              return (
                <div
                  key={c.contractNumber}
                  role="link"
                  tabIndex={0}
                  onClick={go}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                  className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${ROW_HOVER} ${COLS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{c.legalName || "Raison sociale à renseigner"}</p>
                    <p className="truncate font-mono text-xs text-gray-400">{c.contractNumber}</p>
                  </div>
                  <p className="truncate font-mono text-xs text-gray-600">{c.subscriptionNumber}</p>
                  <p className="truncate text-sm text-gray-700">
                    {c.addressCode}
                    {c.suiteNumber && <span className="text-gray-400"> · suite {c.suiteNumber}</span>}
                  </p>
                  <p className="text-sm text-gray-700">
                    {CYCLE_LABEL[c.billingCycle ?? ""] ?? c.billingCycle}
                    {c.commitmentMonths != null && <span className="block text-xs text-gray-400">{c.commitmentMonths} mois</span>}
                  </p>
                  <p className="text-sm text-gray-600">{formatDate(c.startDate) || "À fixer"}</p>
                  <div>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="contrat" onChange={setPage} />
    </div>
  );
};
