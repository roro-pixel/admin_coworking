import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type {
  BillingDocument,
  BillingRecoverable,
} from "../../services/billing.service";

const PAGE_SIZE = 20;

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

const statusLabels: Record<string, string> = {
  PENDING: "À récupérer",
  RECOVERED: "Récupéré",
  PARTIALLY_RECOVERED: "Récupéré partiellement",
  WRITTEN_OFF: "Irrécouvrable",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  RECOVERED: "bg-green-100 text-green-700",
  PARTIALLY_RECOVERED: "bg-blue-100 text-blue-700",
  WRITTEN_OFF: "bg-red-100 text-red-700",
};

const emptyDraftItem = () => ({
  itemDescription: "",
  quantity: 1,
  unit: "",
  sourceType: "",
  sourceCode: "",
  notes: "",
});

export const BillingRecoverablesPanel: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedDocument, setSelectedDocument] =
    useState<BillingDocument | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [draftItems, setDraftItems] = useState<
    Array<ReturnType<typeof emptyDraftItem>>
  >([]);
  const [returningNumber, setReturningNumber] = useState<string | null>(null);
  const [returnForm, setReturnForm] = useState({
    notes: "",
    partialQuantity: "",
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["billing-recoverables-documents", page, search],
    queryFn: () =>
      billingService.getDocuments({
        searchText: search || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const documents = documentsData?.content ?? [];
  const totalPages = documentsData?.totalPages ?? 1;

  const {
    data: recoverables,
    isLoading: recoverablesLoading,
    refetch: refetchRecoverables,
  } = useQuery({
    queryKey: [
      "billing-recoverables",
      selectedDocument?.documentNumber,
      statusFilter,
    ],
    queryFn: () =>
      billingService.getRecoverables(selectedDocument!.documentNumber, {
        status: statusFilter || undefined,
      }),
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
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de l’ajout des articles à récupérer.",
      ),
  });

  const confirmRecoverMutation = useMutation({
    mutationFn: (recoverableNumber: string) =>
      billingService.confirmRecoverable(
        selectedDocument!.documentNumber,
        recoverableNumber,
        {
          notes: returnForm.notes || undefined,
          partialQuantity: returnForm.partialQuantity
            ? Number(returnForm.partialQuantity)
            : null,
        },
      ),
    onSuccess: () => {
      setError(null);
      setReturningNumber(null);
      setReturnForm({ notes: "", partialQuantity: "" });
      refetchRecoverables();
      queryClient.invalidateQueries({
        queryKey: ["billing-document", selectedDocument?.documentNumber],
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la confirmation du retour.",
      ),
  });

  const writeOffMutation = useMutation({
    mutationFn: (recoverableNumber: string) => {
      const notes = window.prompt(
        "Motif de la mise en irrécouvrable (perdu, détruit...) :",
      );
      if (notes === null) throw new Error("__cancelled__");
      return billingService.writeOffRecoverable(
        selectedDocument!.documentNumber,
        recoverableNumber,
        { notes: notes || undefined },
      );
    },
    onSuccess: () => {
      setError(null);
      refetchRecoverables();
    },
    onError: (e: any) => {
      if (e?.message === "__cancelled__") return;
      setError(
        e?.response?.data?.message ||
          "Erreur lors du passage en irrécouvrable.",
      );
    },
  });

  const addDraftItem = () =>
    setDraftItems((current) => [...current, emptyDraftItem()]);

  const updateDraftItem = (
    index: number,
    field: keyof ReturnType<typeof emptyDraftItem>,
    value: string | number,
  ) =>
    setDraftItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );

  const removeDraftItem = (index: number) =>
    setDraftItems((current) => current.filter((_, i) => i !== index));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-1 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Récupération d’articles
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez un document pour suivre le matériel remis au client
            (badges, clés, équipement) et confirmer les retours.
          </p>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            placeholder="Rechercher un document..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {documentsLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-primary-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Aucun document trouvé.
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <button
                  key={doc.documentNumber}
                  onClick={() => {
                    setSelectedDocument(doc);
                    setDraftItems([]);
                    setStatusFilter("");
                    setError(null);
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${selectedDocument?.documentNumber === doc.documentNumber ? "bg-primary-50" : ""}`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {doc.documentNumber}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {doc.customerName ||
                          doc.customerCode ||
                          "Client non renseigné"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {doc.documentType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Préc.
          </button>
          <span className="text-gray-500">
            Page {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
          >
            Suiv. <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="xl:col-span-2">
        {!selectedDocument ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <PackageCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Sélectionnez un document pour gérer ses articles à récupérer.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500">Document</p>
                  <p className="font-mono font-semibold">
                    {selectedDocument.documentNumber}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDocument.customerName ||
                      selectedDocument.customerCode ||
                      "Client non renseigné"}
                  </p>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm h-fit"
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">
                Articles à récupérer
              </h3>

              {recoverablesLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-primary-600" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun article à récupérer pour ce document.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.recoverableNumber} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.itemDescription}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.recoverableNumber}
                            {item.quantity ? ` · Qté ${item.quantity}` : ""}
                            {item.unit ? ` ${item.unit}` : ""}
                            {item.sourceCode ? ` · ${item.sourceCode}` : ""}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-1">
                              {item.notes}
                            </p>
                          )}
                          {item.status !== "PENDING" && item.recoveredAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {item.status === "WRITTEN_OFF"
                                ? "Passé en irrécouvrable"
                                : "Retour confirmé"}{" "}
                              le{" "}
                              {new Date(item.recoveredAt).toLocaleDateString(
                                "fr-FR",
                              )}
                              {item.recoveredBy ? ` par ${item.recoveredBy}` : ""}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-1 rounded-full text-xs ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {statusLabels[item.status] ?? item.status}
                        </span>
                      </div>

                      {item.status === "PENDING" && (
                        <div className="mt-3">
                          {returningNumber === item.recoverableNumber ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={returnForm.partialQuantity}
                                onChange={(e) =>
                                  setReturnForm({
                                    ...returnForm,
                                    partialQuantity: e.target.value,
                                  })
                                }
                                placeholder="Qté (si partiel)"
                                className="px-2 py-1 border rounded text-xs w-32"
                              />
                              <input
                                value={returnForm.notes}
                                onChange={(e) =>
                                  setReturnForm({
                                    ...returnForm,
                                    notes: e.target.value,
                                  })
                                }
                                placeholder="Notes de retour"
                                className="px-2 py-1 border rounded text-xs flex-1 min-w-[160px]"
                              />
                              <button
                                onClick={() =>
                                  confirmRecoverMutation.mutate(
                                    item.recoverableNumber,
                                  )
                                }
                                disabled={confirmRecoverMutation.isPending}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setReturningNumber(null)}
                                className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setReturningNumber(item.recoverableNumber);
                                  setReturnForm({
                                    notes: "",
                                    partialQuantity: "",
                                  });
                                }}
                                className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 inline-flex items-center gap-1"
                              >
                                <Undo2 size={13} /> Confirmer le retour
                              </button>
                              <button
                                onClick={() =>
                                  writeOffMutation.mutate(
                                    item.recoverableNumber,
                                  )
                                }
                                disabled={writeOffMutation.isPending}
                                className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <PackageX size={13} /> Irrécouvrable
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Ajouter des articles
                  </h3>
                  <p className="text-sm text-gray-500">
                    Enregistrez le matériel remis au client sur ce document.
                  </p>
                </div>
                <button
                  onClick={addDraftItem}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <Plus size={15} /> Ajouter une ligne
                </button>
              </div>

              {draftItems.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucune ligne - cliquez sur « Ajouter une ligne ».
                </p>
              ) : (
                <div className="space-y-3">
                  {draftItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-3"
                    >
                      <input
                        value={item.itemDescription}
                        onChange={(e) =>
                          updateDraftItem(
                            index,
                            "itemDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Description (ex: Badge d'accès RFID)"
                        className={`md:col-span-3 ${inputCls}`}
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateDraftItem(
                            index,
                            "quantity",
                            Number(e.target.value) || 1,
                          )
                        }
                        placeholder="Qté"
                        className={`md:col-span-1 ${inputCls}`}
                      />
                      <input
                        value={item.unit}
                        onChange={(e) =>
                          updateDraftItem(index, "unit", e.target.value)
                        }
                        placeholder="Unité"
                        className={`md:col-span-1 ${inputCls}`}
                      />
                      <select
                        value={item.sourceType}
                        onChange={(e) =>
                          updateDraftItem(index, "sourceType", e.target.value)
                        }
                        className={`md:col-span-2 ${inputCls} bg-white`}
                      >
                        <option value="">Source (optionnel)</option>
                        <option value="INVENTORY_ITEM">
                          Article inventaire
                        </option>
                        <option value="ASSET">Actif</option>
                        <option value="MANUAL">Manuel</option>
                      </select>
                      <input
                        value={item.sourceCode}
                        onChange={(e) =>
                          updateDraftItem(index, "sourceCode", e.target.value)
                        }
                        placeholder="Code source"
                        className={`md:col-span-2 ${inputCls}`}
                      />
                      <input
                        value={item.notes}
                        onChange={(e) =>
                          updateDraftItem(index, "notes", e.target.value)
                        }
                        placeholder="Notes"
                        className={`md:col-span-2 ${inputCls}`}
                      />
                      <button
                        onClick={() => removeDraftItem(index)}
                        className="md:col-span-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {draftItems.length > 0 && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t">
                  <p className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <AlertTriangle size={13} />
                    Les lignes sans description seront ignorées.
                  </p>
                  <button
                    onClick={() => addRecoverablesMutation.mutate()}
                    disabled={addRecoverablesMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {addRecoverablesMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PackageCheck size={16} />
                    )}
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};