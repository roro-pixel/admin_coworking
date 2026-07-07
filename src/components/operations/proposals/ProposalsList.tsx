import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
import { operationsService } from "../../../services/operations.service";
import type {
  ProposalResponse,
  ProposalStatus,
} from "../../../services/operations.service";
import { ProposalFormModal } from "./ProposalFormModal";
import { ProposalDetailModal } from "./ProposalDetailModal";

const statuses: { value: "" | ProposalStatus; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "SENT", label: "Envoyées" },
  { value: "VIEWED", label: "Consultées" },
  { value: "ACCEPTED", label: "Acceptées" },
  { value: "REJECTED", label: "Refusées" },
  { value: "EXPIRED", label: "Expirées" },
  { value: "CONVERTED", label: "Converties" },
];
const statusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-50 text-blue-700",
  VIEWED: "bg-purple-50 text-purple-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-orange-50 text-orange-700",
  CONVERTED: "bg-gray-950 text-white",
};
const money = (v?: number, c = "XAF") =>
  `${Number(v ?? 0).toLocaleString("fr-FR")} ${c}`;

export const ProposalsList: React.FC<{ leadId?: number | null }> = ({
  leadId,
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | ProposalStatus>("");
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalResponse | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useQuery({
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Propositions commerciales
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Créer, envoyer, accepter, rejeter et gérer les lignes commerciales.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={18} /> Nouvelle proposition
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titre, numéro, destinataire..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-xl border border-gray-200 px-3 py-2.5"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Chargement...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {proposals.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProposal(p)}
              className="rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-gray-950">
                    {p.title}
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {p.proposalNumber}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[p.status] ?? "bg-gray-100"}`}
                >
                  {p.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric
                  label="Client"
                  value={p.recipientName || p.recipientCode || "—"}
                />
                <Metric
                  label="Total"
                  value={money(p.totalAmount, p.currency)}
                />
                <Metric label="Lignes" value={String(p.lines?.length ?? 0)} />
                <Metric label="Validité" value={p.validUntil || "—"} />
              </div>
            </button>
          ))}
        </div>
      )}
      {!isLoading && proposals.length === 0 && (
        <div className="rounded-3xl bg-white p-12 text-center text-gray-500 ring-1 ring-gray-100">
          <FileText className="mx-auto mb-3 text-gray-300" size={42} />
          Aucune proposition.
        </div>
      )}
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-gray-100">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-xl px-3 py-2 text-sm disabled:opacity-40"
        >
          Précédent
        </button>
        <span className="text-sm text-gray-500">
          Page {page + 1} / {data?.totalPages || 1}
        </span>
        <button
          disabled={page + 1 >= (data?.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl px-3 py-2 text-sm disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
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
      <ProposalDetailModal
        isOpen={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        proposal={selectedProposal}
      />
    </div>
  );
};
const Metric: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-gray-900">{value}</p>
  </div>
);
