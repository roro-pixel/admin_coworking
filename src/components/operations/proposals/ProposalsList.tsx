import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { operationsService } from "../../../services/operations.service";
import type { ProposalResponse, ProposalStatus } from "../../../services/operations.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, ListHeader, Pagination, SearchField, StatusChip } from "../../subscription/kit";
import { FOCUS, ROW_HOVER, formatDate, formatMoney } from "../../subscription/kitUtils";
import { statusOf } from "../../subscription/labels";
import { Dots } from "../../ui/Toaster";
import { ListSkeleton } from "../../ui/Skeleton";
import { PROPOSAL_FILTERS, PROPOSAL_STATUS } from "../opsLabels";
import { ProposalFormModal } from "./ProposalFormModal";
import { ProposalDetailModal } from "./ProposalDetailModal";

export const ProposalsList: React.FC<{ leadId?: number | null }> = ({ leadId }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | ProposalStatus>("");
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["crm-proposals", status, debouncedSearch, page, leadId],
    queryFn: () =>
      operationsService.getProposals({
        status: status || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: 20,
        sort: "updatedAt,desc",
        opportunityId: undefined,
      }),
  });

  const proposals = useMemo(
    () => (data?.content || []).filter((p) => !leadId || p.leadId === leadId),
    [data, leadId],
  );

  return (
    <div className="space-y-5">
      <ListHeader
        title="Propositions commerciales"
        subtitle="Créer, envoyer, accepter ou rejeter, et gérer les lignes."
        action={
          <ActionButton icon={Plus} onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
            Nouvelle proposition
          </ActionButton>
        }
      />

      <div className="space-y-3">
        <SearchField value={search} onChange={setSearch} placeholder="Titre, numéro, destinataire" />
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {PROPOSAL_FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setStatus(f.value as "" | ProposalStatus);
                  setPage(0);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                  on
                    ? "bg-[color:var(--logo-pink-dark)] text-white"
                    : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {isFetching && !isLoading && <Dots />}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les propositions." onRetry={() => refetch()} />
      ) : proposals.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune proposition" hint="Ajustez la recherche ou créez-en une." />
      ) : (
        <>
          <DataCard>
            {proposals.map((p) => {
              const st = statusOf(PROPOSAL_STATUS, String(p.status));
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProposal(p)}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 text-left transition max-lg:mb-2 max-lg:bg-gray-50 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_5rem_7rem_auto] ${ROW_HOVER} ${FOCUS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-950">{p.title}</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{p.proposalNumber}</p>
                  </div>
                  <div className="lg:order-last">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                  <p className="col-span-2 truncate text-sm text-gray-600 lg:col-span-1">
                    {p.recipientName || p.recipientCode || ""}
                  </p>
                  <p className="text-sm font-bold text-gray-950">{formatMoney(p.totalAmount, p.currency)}</p>
                  <p className="text-sm text-gray-500 max-lg:hidden">
                    {p.lines?.length ?? 0} ligne{(p.lines?.length ?? 0) > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-gray-500 max-lg:text-right">
                    {p.validUntil ? `Jusqu'au ${formatDate(p.validUntil)}` : ""}
                  </p>
                </button>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages || 1} total={data?.totalElements ?? proposals.length} noun="proposition" onChange={setPage} />
        </>
      )}

      <ProposalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingProposal={null}
        leadId={leadId}
        onSuccess={(proposal) => {
          setIsFormOpen(false);
          setSelectedProposal(proposal);
        }}
      />
      <ProposalDetailModal isOpen={!!selectedProposal} onClose={() => setSelectedProposal(null)} proposal={selectedProposal} />
    </div>
  );
};
