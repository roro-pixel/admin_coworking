import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PackageX, Plus, Trash2, Undo2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument, BillingRecoverable } from "../../services/billing.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  ItemRow,
  ListHeader,
  Pagination,
  SearchField,
  Section,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, FOCUS, ROW_HOVER, apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { DOC_TYPE_LABEL, RECOVERABLE_LABEL, RECOVERABLE_TONE, SOURCE_TYPE_LABEL } from "../../components/billing/billingLabels";

const PAGE_SIZE = 20;

const emptyDraftItem = () => ({
  itemDescription: "",
  quantity: 1,
  unit: "",
  sourceType: "",
  sourceCode: "",
  notes: "",
});

type DraftItem = ReturnType<typeof emptyDraftItem>;
type RowMode = { number: string; kind: "return" | "writeoff" } | null;

export const BillingRecoverablesPanel: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<BillingDocument | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [returnForm, setReturnForm] = useState({ notes: "", partialQuantity: "" });
  const [writeOffNotes, setWriteOffNotes] = useState("");

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["billing-recoverables-documents", page, search],
    queryFn: () =>
      billingService.getDocuments({ searchText: search || undefined, page, size: PAGE_SIZE, sort: "createdAt,desc" }),
  });

  const documents = documentsData?.content ?? [];
  const totalPages = documentsData?.totalPages ?? 1;

  const {
    data: recoverables,
    isLoading: recoverablesLoading,
    refetch: refetchRecoverables,
  } = useQuery({
    queryKey: ["billing-recoverables", selectedDocument?.documentNumber, statusFilter],
    queryFn: () => billingService.getRecoverables(selectedDocument!.documentNumber, { status: statusFilter || undefined }),
    enabled: !!selectedDocument,
  });

  const items: BillingRecoverable[] = recoverables ?? [];

  const addRecoverablesMutation = useMutation({
    mutationFn: () =>
      billingService.addRecoverables(selectedDocument!.documentNumber, {
        items: draftItems
          .filter((i) => i.itemDescription.trim())
          .map((i) => ({
            itemDescription: i.itemDescription.trim(),
            quantity: i.quantity || undefined,
            unit: i.unit || undefined,
            sourceType: i.sourceType || undefined,
            sourceCode: i.sourceCode || undefined,
            notes: i.notes || undefined,
          })),
      }),
    onSuccess: () => {
      setError(null);
      setDraftItems([]);
      refetchRecoverables();
      toast.success("Articles enregistrés.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'ajout des articles à récupérer.")),
  });

  const confirmRecoverMutation = useMutation({
    mutationFn: (recoverableNumber: string) =>
      billingService.confirmRecoverable(selectedDocument!.documentNumber, recoverableNumber, {
        notes: returnForm.notes || undefined,
        partialQuantity: returnForm.partialQuantity ? Number(returnForm.partialQuantity) : null,
      }),
    onSuccess: () => {
      setError(null);
      setRowMode(null);
      setReturnForm({ notes: "", partialQuantity: "" });
      refetchRecoverables();
      queryClient.invalidateQueries({ queryKey: ["billing-document", selectedDocument?.documentNumber] });
      toast.success("Retour confirmé.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la confirmation du retour.")),
  });

  // Le motif (perdu, détruit...) était demandé par window.prompt : il se saisit maintenant dans la ligne.
  const writeOffMutation = useMutation({
    mutationFn: (recoverableNumber: string) =>
      billingService.writeOffRecoverable(selectedDocument!.documentNumber, recoverableNumber, { notes: writeOffNotes || undefined }),
    onSuccess: () => {
      setError(null);
      setRowMode(null);
      setWriteOffNotes("");
      refetchRecoverables();
      toast.success("Article passé en irrécouvrable.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors du passage en irrécouvrable.")),
  });

  const updateDraftItem = (index: number, field: keyof DraftItem, value: string | number) =>
    setDraftItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const selectDocument = (doc: BillingDocument) => {
    setSelectedDocument(doc);
    setDraftItems([]);
    setStatusFilter("");
    setRowMode(null);
    setError(null);
  };

  const hasDrafts = draftItems.some((d) => d.itemDescription.trim());

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <ListHeader title="Articles à récupérer" subtitle="Choisissez un document pour suivre le matériel remis (badges, clés, équipement) et confirmer les retours." />
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Rechercher un document"
        />

        {documentsLoading ? (
          <ListSkeleton rows={6} />
        ) : documents.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Aucun document trouvé" />
        ) : (
          <>
            <DataCard>
              {documents.map((doc) => {
                const on = selectedDocument?.documentNumber === doc.documentNumber;
                return (
                  <button
                    key={doc.documentNumber}
                    type="button"
                    onClick={() => selectDocument(doc)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition ${FOCUS} ${
                      on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]" : ROW_HOVER
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{doc.documentNumber}</p>
                      <p className="truncate text-sm text-gray-600">{doc.customerName || doc.customerCode || "Client non renseigné"}</p>
                    </div>
                    <Tag>{DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}</Tag>
                  </button>
                );
              })}
            </DataCard>
            <Pagination page={page} totalPages={totalPages} total={documentsData?.totalElements ?? documents.length} noun="document" onChange={setPage} />
          </>
        )}
      </div>

      <div className="min-w-0 space-y-5 xl:pt-1">
        {!selectedDocument ? (
          <EmptyState icon={PackageCheck} title="Aucun document sélectionné" hint="Sélectionnez un document pour gérer ses articles à récupérer." />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400">Document</p>
                <p className="font-mono text-base font-bold text-gray-950">{selectedDocument.documentNumber}</p>
                <p className="text-sm text-gray-500">{selectedDocument.customerName || selectedDocument.customerCode || "Client non renseigné"}</p>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${FIELD_SOFT} !w-auto`} aria-label="Filtrer par statut">
                <option value="">Tous les statuts</option>
                {Object.entries(RECOVERABLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <ErrorBanner message={error} />

            <Section title="Articles à récupérer" icon={PackageCheck}>
              {recoverablesLoading ? (
                <ListSkeleton rows={3} />
              ) : items.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Aucun article à récupérer pour ce document.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const mode = rowMode?.number === item.recoverableNumber ? rowMode.kind : null;
                    return (
                      <ItemRow key={item.recoverableNumber}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{item.itemDescription}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              <span className="font-mono">{item.recoverableNumber}</span>
                              {item.quantity ? ` · Qté ${item.quantity}` : ""}
                              {item.unit ? ` ${item.unit}` : ""}
                              {item.sourceCode ? ` · ${item.sourceCode}` : ""}
                            </p>
                            {item.notes && <p className="mt-1 text-xs text-gray-400">{item.notes}</p>}
                            {item.status !== "PENDING" && item.recoveredAt && (
                              <p className="mt-1 text-xs text-gray-400">
                                {item.status === "WRITTEN_OFF" ? "Passé en irrécouvrable" : "Retour confirmé"} le {formatDate(item.recoveredAt)}
                                {item.recoveredBy ? ` par ${item.recoveredBy}` : ""}
                              </p>
                            )}
                          </div>
                          <StatusChip tone={RECOVERABLE_TONE[item.status] ?? "neutral"}>{RECOVERABLE_LABEL[item.status] ?? item.status}</StatusChip>
                        </div>

                        {item.status === "PENDING" && !mode && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <ActionButton
                              icon={Undo2}
                              className="!px-4 !py-2"
                              onClick={() => {
                                setRowMode({ number: item.recoverableNumber, kind: "return" });
                                setReturnForm({ notes: "", partialQuantity: "" });
                              }}
                            >
                              Confirmer le retour
                            </ActionButton>
                            <ActionButton
                              variant="ghost"
                              icon={PackageX}
                              className="!px-4 !py-2"
                              onClick={() => {
                                setRowMode({ number: item.recoverableNumber, kind: "writeoff" });
                                setWriteOffNotes("");
                              }}
                            >
                              Irrécouvrable
                            </ActionButton>
                          </div>
                        )}

                        {mode === "return" && (
                          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[8rem_1fr_auto]">
                            <Field label="Quantité (si partiel)">
                              <input type="number" min={1} value={returnForm.partialQuantity} onChange={(e) => setReturnForm({ ...returnForm, partialQuantity: e.target.value })} className={FIELD} />
                            </Field>
                            <Field label="Notes de retour">
                              <input value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} className={FIELD} />
                            </Field>
                            <div className="flex items-end gap-2">
                              <ActionButton variant="ghost" onClick={() => setRowMode(null)} disabled={confirmRecoverMutation.isPending}>
                                Annuler
                              </ActionButton>
                              <ActionButton pending={confirmRecoverMutation.isPending} onClick={() => confirmRecoverMutation.mutate(item.recoverableNumber)}>
                                Confirmer
                              </ActionButton>
                            </div>
                          </div>
                        )}

                        {mode === "writeoff" && (
                          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto]">
                            <Field label="Motif (perdu, détruit...)">
                              <input value={writeOffNotes} onChange={(e) => setWriteOffNotes(e.target.value)} className={FIELD} />
                            </Field>
                            <div className="flex items-end gap-2">
                              <ActionButton variant="ghost" onClick={() => setRowMode(null)} disabled={writeOffMutation.isPending}>
                                Annuler
                              </ActionButton>
                              <ActionButton variant="danger" pending={writeOffMutation.isPending} onClick={() => writeOffMutation.mutate(item.recoverableNumber)}>
                                Passer en irrécouvrable
                              </ActionButton>
                            </div>
                          </div>
                        )}
                      </ItemRow>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="Ajouter des articles"
              description="Enregistrez le matériel remis au client sur ce document."
              icon={Plus}
              action={
                <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setDraftItems((c) => [...c, emptyDraftItem()])}>
                  Ajouter une ligne
                </ActionButton>
              }
            >
              {draftItems.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">Aucune ligne. Utilisez « Ajouter une ligne ».</p>
              ) : (
                <div className="space-y-3">
                  {draftItems.map((item, index) => (
                    <ItemRow key={index}>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 2xl:grid-cols-12">
                        <Field label="Description" className="col-span-2 md:col-span-6 2xl:col-span-4">
                          <input value={item.itemDescription} onChange={(e) => updateDraftItem(index, "itemDescription", e.target.value)} placeholder="Badge d'accès RFID" className={FIELD_SOFT} />
                        </Field>
                        <Field label="Qté" className="2xl:col-span-1">
                          <input type="number" min={1} value={item.quantity} onChange={(e) => updateDraftItem(index, "quantity", Number(e.target.value) || 1)} className={FIELD_SOFT} />
                        </Field>
                        <Field label="Unité" className="2xl:col-span-1">
                          <input value={item.unit} onChange={(e) => updateDraftItem(index, "unit", e.target.value)} className={FIELD_SOFT} />
                        </Field>
                        <Field label="Source" className="col-span-2 md:col-span-2 2xl:col-span-2">
                          <select value={item.sourceType} onChange={(e) => updateDraftItem(index, "sourceType", e.target.value)} className={FIELD_SOFT}>
                            <option value="">Optionnelle</option>
                            <option value="INVENTORY_ITEM">{SOURCE_TYPE_LABEL.INVENTORY_ITEM}</option>
                            <option value="ASSET">{SOURCE_TYPE_LABEL.ASSET}</option>
                            <option value="MANUAL">{SOURCE_TYPE_LABEL.MANUAL}</option>
                          </select>
                        </Field>
                        <Field label="Code source" className="col-span-2 md:col-span-3 2xl:col-span-2">
                          <input value={item.sourceCode} onChange={(e) => updateDraftItem(index, "sourceCode", e.target.value)} className={FIELD_SOFT} />
                        </Field>
                        <Field label="Notes" className="col-span-2 md:col-span-3 2xl:col-span-2">
                          <input value={item.notes} onChange={(e) => updateDraftItem(index, "notes", e.target.value)} className={FIELD_SOFT} />
                        </Field>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <IconButton icon={Trash2} tone="danger" label="Retirer la ligne" onClick={() => setDraftItems((c) => c.filter((_, i) => i !== index))} />
                      </div>
                    </ItemRow>
                  ))}
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-400">Les lignes sans description seront ignorées.</p>
                    <ActionButton icon={PackageCheck} pending={addRecoverablesMutation.isPending} disabled={!hasDrafts} onClick={() => addRecoverablesMutation.mutate()}>
                      Enregistrer
                    </ActionButton>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
};
