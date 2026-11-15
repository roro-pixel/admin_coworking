import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus, Power, Shapes, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceTypeResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Fact, useDebounced } from "../../../components/resources/resKit";

const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_7rem_auto]";
const SIZE = 15;
const EMPTY = { name: "", description: "", active: true };

export const ResourceTypesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-types", page, q],
    queryFn: () => (q ? resourceService.searchResourceTypes(q, { page, size: SIZE }) : resourceService.getResourceTypes({ page, size: SIZE })),
  });
  const types = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-types"] }), queryClient.invalidateQueries({ queryKey: ["resource-types-list"] })]);
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { name: f.name.trim(), description: f.description.trim() || undefined, active: f.active };
      if (editing!.code === null) await resourceService.createResourceType(body);
      else await resourceService.updateResourceType(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Type créé" : "Type modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (t: ResourceTypeResponse) => resourceService.updateResourceType(t.code, { name: t.name, description: t.description ?? undefined, active: !t.active }),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceService.deleteResourceType(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (patch: Partial<typeof EMPTY>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Types de ressources"
        subtitle={isLoading ? undefined : `${total} type${total > 1 ? "s" : ""}`}
        action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouveau type</ActionButton>}
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau type de ressource" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.name.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <Field label="Nom" required>
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} autoFocus />
          </Field>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Type actif" />
        </PanelForm>
      )}

      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nom ou code du type" />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les types de ressources." onRetry={() => refetch()} />
      ) : types.length === 0 ? (
        <EmptyState icon={Shapes} title="Aucun type de ressource" hint={q ? "Aucun résultat pour cette recherche." : "Créez le premier type, par exemple « Salle de réunion »."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Type</span>
            <span>Description</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {types.map((t) => {
              const open = expanded === t.code;
              return (
                <div key={t.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(open ? null : t.code)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="font-mono text-xs text-gray-400">{t.code}</p>
                      </div>
                    </div>
                    <Cell title="Description" className="max-lg:order-3 max-lg:col-span-2">
                      <span className="line-clamp-1 text-sm text-gray-600">{t.description || "Sans description"}</span>
                    </Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end">
                      <StatusChip tone={t.active ? "success" : "neutral"}>{t.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={t.active ? "Désactiver" : "Activer"} tone={t.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === t.code} onClick={() => toggle.mutate(t)} />
                      <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: t.code, form: { name: t.name, description: t.description ?? "", active: t.active } }); }} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer le type « ${t.name} » ?`,
                            detail: "La suppression échoue si des ressources utilisent ce type.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Type supprimé",
                            errorMessage: "Suppression impossible : le type est probablement utilisé",
                            onConfirm: () => remove.mutateAsync(t.code),
                          })
                        }
                      />
                    </div>
                  </div>
                  {open && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:mx-3 lg:mb-3">
                      <Fact title="Code">{<span className="font-mono">{t.code}</span>}</Fact>
                      <Fact title="Description">{t.description || "Aucune"}</Fact>
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="type" onChange={setPage} />
        </>
      )}
    </div>
  );
};
