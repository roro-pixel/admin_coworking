import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, ListHeader, Pagination, SearchField } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocumentTable } from "../../components/documents/DocumentRows";
import { CATEGORIES, CATEGORY_LABEL, DOC_STATUSES, DOC_STATUS_LABEL, OWNER_LABEL, OWNER_TYPES, label, useDebounced } from "../../components/documents/docUtils";
import { DocumentDetailView } from "./DocumentDetail";

const PAGE_SIZE = 20;

export const DocumentsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [ownerType, setOwnerType] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DocumentResponse | null>(null);
  const debounced = useDebounced(search);

  useEffect(() => setPage(0), [debounced, ownerType, status, category]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["allDocuments", ownerType, status, category, debounced, page],
    queryFn: () =>
      documentService.searchDocuments({
        q: debounced.trim() || undefined,
        ownerType: ownerType || undefined,
        statuses: status ? [status] : undefined,
        category: category || undefined,
        page,
        size: PAGE_SIZE,
        sort: "uploadedAt,desc",
      }),
    placeholderData: keepPreviousData,
  });

  const download = useMutation({
    mutationFn: async (d: DocumentResponse) => saveBlob(await documentService.downloadDocument(d.code), d.fileName || d.code),
    onError: (e) => toast.error(apiMessage(e, "Téléchargement impossible")),
  });

  if (selected) return <DocumentDetailView document={selected} onBack={() => setSelected(null)} />;

  const docs = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const hasFilters = !!(search || ownerType || status || category);
  const reset = () => {
    setSearch("");
    setOwnerType("");
    setStatus("");
    setCategory("");
  };

  return (
    <div className="space-y-5">
      <ListHeader title="Tous les documents" subtitle={isLoading ? undefined : `${total} document${total > 1 ? "s" : ""}`} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Titre, type ou code du document" />
        <FilterButton open={showFilters} active={!!(ownerType || status || category)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={reset}>
          <Field label="Propriétaire">
            <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className={FIELD}>
              <option value="">Tous les propriétaires</option>
              {OWNER_TYPES.map((k) => (
                <option key={k} value={k}>
                  {label(OWNER_LABEL, k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {DOC_STATUSES.map((k) => (
                <option key={k} value={k}>
                  {label(DOC_STATUS_LABEL, k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catégorie">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((k) => (
                <option key={k} value={k}>
                  {label(CATEGORY_LABEL, k)}
                </option>
              ))}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les documents." onRetry={() => refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun document trouvé" hint={hasFilters ? "Ajustez ou réinitialisez les filtres." : "Aucun document n'a encore été envoyé."} />
      ) : (
        <>
          <DocumentTable documents={docs} onOpen={setSelected} onDownload={(d) => download.mutate(d)} downloading={download.isPending ? download.variables?.code : null} />
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="document" onChange={setPage} />
        </>
      )}
    </div>
  );
};
