import React, { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Search, SearchX } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, Pagination } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocumentTable } from "../../components/documents/DocumentRows";
import { CATEGORIES, CATEGORY_LABEL, DOC_STATUSES, DOC_STATUS_LABEL, OWNER_LABEL, OWNER_TYPES, SPACES, SPACE_LABEL, label } from "../../components/documents/docUtils";
import { DocumentDetailView } from "./DocumentDetail";

const PAGE_SIZE = 20;
const EMPTY = { q: "", space: "", category: "", ownerType: "", ownerCode: "", status: "", tag: "", expiresInDays: "", isExpired: "", uploadedAfter: "", uploadedBefore: "", metaKey: "", metaValue: "" };

export const DocumentAdvancedSearchPage: React.FC = () => {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState<typeof EMPTY | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DocumentResponse | null>(null);
  const set = (patch: Partial<typeof EMPTY>) => setForm((p) => ({ ...p, ...patch }));

  const { data: tags = [] } = useQuery({ queryKey: ["document-tags"], queryFn: () => documentService.getDocumentTags() });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["document-advanced-search", submitted, page],
    enabled: submitted !== null,
    queryFn: () => {
      const s = submitted!;
      return documentService.searchDocuments({
        q: s.q || undefined,
        space: s.space || undefined,
        category: s.category || undefined,
        ownerType: s.ownerType || undefined,
        ownerCode: s.ownerCode || undefined,
        statuses: s.status ? [s.status] : undefined,
        tags: s.tag ? [s.tag] : undefined,
        expiresInDays: s.expiresInDays ? Number(s.expiresInDays) : undefined,
        isExpired: s.isExpired === "" ? undefined : s.isExpired === "true",
        uploadedAfter: s.uploadedAfter || undefined,
        uploadedBefore: s.uploadedBefore || undefined,
        metaKey: s.metaKey || undefined,
        metaValue: s.metaValue || undefined,
        page,
        size: PAGE_SIZE,
        sort: "uploadedAt,desc",
      });
    },
    placeholderData: keepPreviousData,
  });

  const download = useMutation({
    mutationFn: async (d: DocumentResponse) => saveBlob(await documentService.downloadDocument(d.code), d.fileName || d.code),
    onError: (e) => toast.error(apiMessage(e, "Téléchargement impossible")),
  });

  if (selected) return <DocumentDetailView document={selected} onBack={() => setSelected(null)} />;

  const docs = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const select = (value: string, onChange: (v: string) => void, all: string, options: { value: string; label: string }[]) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-5">
      <ListHeader title="Recherche avancée" subtitle="Texte, espace, catégorie, propriétaire, statut, tag, dates et métadonnées" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSubmitted(form);
        }}
        className="rounded-[1.5rem] bg-gray-50 p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Texte" className="sm:col-span-2">
            <input value={form.q} onChange={(e) => set({ q: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Espace">{select(form.space, (v) => set({ space: v }), "Tous les espaces", SPACES.map((v) => ({ value: v, label: label(SPACE_LABEL, v) })))}</Field>
          <Field label="Catégorie">{select(form.category, (v) => set({ category: v }), "Toutes les catégories", CATEGORIES.map((v) => ({ value: v, label: label(CATEGORY_LABEL, v) })))}</Field>
          <Field label="Statut">{select(form.status, (v) => set({ status: v }), "Tous les statuts", DOC_STATUSES.map((v) => ({ value: v, label: label(DOC_STATUS_LABEL, v) })))}</Field>
          <Field label="Propriétaire">{select(form.ownerType, (v) => set({ ownerType: v }), "Tous les propriétaires", OWNER_TYPES.map((v) => ({ value: v, label: label(OWNER_LABEL, v) })))}</Field>
          <Field label="Code propriétaire">
            <input value={form.ownerCode} onChange={(e) => set({ ownerCode: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Tag">{select(form.tag, (v) => set({ tag: v }), "Tous les tags", tags.map((t) => ({ value: t.code, label: t.name || t.code })))}</Field>
          <Field label="Expire dans (jours)">
            <input type="number" min={0} value={form.expiresInDays} onChange={(e) => set({ expiresInDays: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Expiration">{select(form.isExpired, (v) => set({ isExpired: v }), "Indifférent", [{ value: "true", label: "Expirés" }, { value: "false", label: "Non expirés" }])}</Field>
          <Field label="Envoyé après le">
            <input type="date" value={form.uploadedAfter} onChange={(e) => set({ uploadedAfter: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Envoyé avant le">
            <input type="date" value={form.uploadedBefore} onChange={(e) => set({ uploadedBefore: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Clé de métadonnée">
            <input value={form.metaKey} onChange={(e) => set({ metaKey: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Valeur de métadonnée">
            <input value={form.metaValue} onChange={(e) => set({ metaValue: e.target.value })} className={FIELD} />
          </Field>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton
            variant="ghost"
            onClick={() => {
              setForm(EMPTY);
              setSubmitted(null);
              setPage(0);
            }}
          >
            Réinitialiser
          </ActionButton>
          <ActionButton type="submit" icon={Search}>
            Rechercher
          </ActionButton>
        </div>
      </form>

      {submitted === null ? (
        <EmptyState icon={Search} title="Lancez une recherche" hint="Renseignez un ou plusieurs critères puis appuyez sur Rechercher." />
      ) : isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="La recherche a échoué." onRetry={() => refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun résultat" hint="Aucun document ne correspond à ces critères." />
      ) : (
        <>
          <p className="px-1 text-sm text-gray-500">
            {total} résultat{total > 1 ? "s" : ""}
          </p>
          <DocumentTable documents={docs} onOpen={setSelected} onDownload={(d) => download.mutate(d)} downloading={download.isPending ? download.variables?.code : null} />
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="document" onChange={setPage} />
        </>
      )}
    </div>
  );
};
