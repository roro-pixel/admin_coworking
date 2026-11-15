import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, catCode, usePaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)_6rem_auto]";
const EMPTY = { categoryCode: "", name: "", description: "" };

export const CategoriesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory-categories"], queryFn: () => inventoryService.getCategories() });
  const q = search.trim().toLowerCase();
  const filtered = categories.filter((c) => !q || c.name.toLowerCase().includes(q) || catCode(c).toLowerCase().includes(q));
  const paged = usePaged(filtered, 15);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { categoryCode: f.categoryCode.trim(), name: f.name.trim(), description: f.description.trim() || undefined };
      if (editing!.code === null) await inventoryService.createCategory(body);
      else await inventoryService.updateCategory(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Catégorie créée" : "Catégorie modifiée");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  // DELETE /inventory/categories/{code} n'est pas documenté côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteCategory(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));

  return (
    <div className="space-y-5">
      <ListHeader title="Catégories" subtitle={isLoading ? undefined : `${filtered.length} catégorie${filtered.length > 1 ? "s" : ""}`} action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouvelle catégorie</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouvelle catégorie" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.categoryCode.trim() || !f.name.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required hint={editing.code === null ? undefined : "Le code ne peut pas être modifié."}>
              <input value={f.categoryCode} onChange={(e) => set({ categoryCode: e.target.value })} disabled={editing.code !== null} placeholder="Ex : MOBILIER" className={`${FIELD} disabled:opacity-60`} autoFocus={editing.code === null} />
            </Field>
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex : Mobilier" className={FIELD} autoFocus={editing.code !== null} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
        </PanelForm>
      )}

      <SearchField value={search} onChange={setSearch} placeholder="Nom ou code de la catégorie" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les catégories." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucune catégorie" hint={q ? "Aucun résultat pour cette recherche." : "Les catégories regroupent vos articles : fournitures, mobilier, informatique."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Catégorie</span>
            <span>Description</span>
            <span>Articles</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {paged.slice.map((c) => (
              <div key={catCode(c)} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="font-mono text-xs text-gray-400">{catCode(c)}</p>
                </div>
                <Cell title="Description" className="max-lg:order-3 max-lg:col-span-2"><span className="line-clamp-1 text-sm text-gray-600">{c.description || "Sans description"}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end">
                  {c.active === false ? <StatusChip tone="neutral">Inactive</StatusChip> : <span className="text-sm text-gray-600">{c.itemCount ?? 0} article{(c.itemCount ?? 0) > 1 ? "s" : ""}</span>}
                </div>
                <div className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: catCode(c), form: { categoryCode: catCode(c), name: c.name, description: c.description ?? "" } }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: `Supprimer la catégorie « ${c.name} » ?`,
                        detail: "La suppression échoue si des articles y sont rattachés.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Catégorie supprimée",
                        errorMessage: "Suppression impossible : la catégorie est probablement utilisée",
                        onConfirm: () => remove.mutateAsync(catCode(c)),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} noun="catégorie" onChange={paged.setPage} />
        </>
      )}
    </div>
  );
};
