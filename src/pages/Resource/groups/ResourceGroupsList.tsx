import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Eye, EyeOff, Layers, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceGroupResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Fact, useDebounced } from "../../../components/resources/resKit";

const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_7rem_7rem_auto]";
const SIZE = 15;
const EMPTY = { name: "", description: "", portalVisible: true, active: true };
type Form = typeof EMPTY;

export const ResourceGroupsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: Form } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-groups", page, q],
    queryFn: () => (q ? resourceService.searchResourceGroups(q, { page, size: SIZE }) : resourceService.getResourceGroups({ page, size: SIZE })),
  });
  const groups = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-groups"] }), queryClient.invalidateQueries({ queryKey: ["resource-groups-list"] })]);
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { name: f.name.trim(), description: f.description.trim() || undefined, portalVisible: f.portalVisible, active: f.active };
      if (editing!.code === null) await resourceService.createResourceGroup(body);
      else await resourceService.updateResourceGroup(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Groupe créé" : "Groupe modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (g: ResourceGroupResponse) => resourceService.updateResourceGroup(g.code, { name: g.name, description: g.description ?? undefined, portalVisible: g.portalVisible, active: !g.active }),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceService.deleteResourceGroup(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (patch: Partial<Form>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Groupes de ressources"
        subtitle={isLoading ? undefined : `${total} groupe${total > 1 ? "s" : ""}`}
        action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouveau groupe</ActionButton>}
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau groupe" : `Modifier ${editing.code}`}
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
          <Field label="Description" hint="Zone, bâtiment, équipe ou espace métier.">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckField checked={f.portalVisible} onChange={(v) => set({ portalVisible: v })} label="Visible sur le portail" />
            <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Groupe actif" />
          </div>
        </PanelForm>
      )}

      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nom ou code du groupe" />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les groupes." onRetry={() => refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun groupe" hint={q ? "Aucun résultat pour cette recherche." : "Créez un groupe pour organiser vos ressources par bâtiment ou par zone."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Groupe</span>
            <span>Description</span>
            <span>Portail</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {groups.map((g) => {
              const open = expanded === g.code;
              return (
                <div key={g.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(open ? null : g.code)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{g.name}</p>
                        <p className="font-mono text-xs text-gray-400">{g.code}</p>
                      </div>
                    </div>
                    <Cell title="Description" className="max-lg:order-4 max-lg:col-span-2">
                      <span className="line-clamp-1 text-sm text-gray-600">{g.description || "Sans description"}</span>
                    </Cell>
                    <Cell title="Portail" className="max-lg:order-3 max-lg:col-span-2">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                        {g.portalVisible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-400" />}
                        {g.portalVisible ? "Visible" : "Masqué"}
                      </span>
                    </Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end">
                      <StatusChip tone={g.active ? "success" : "neutral"}>{g.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-5 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={g.active ? "Désactiver" : "Activer"} tone={g.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === g.code} onClick={() => toggle.mutate(g)} />
                      <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: g.code, form: { name: g.name, description: g.description ?? "", portalVisible: g.portalVisible, active: g.active } }); }} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer le groupe « ${g.name} » ?`,
                            detail: "La suppression échoue si des ressources appartiennent à ce groupe.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Groupe supprimé",
                            errorMessage: "Suppression impossible : le groupe est probablement utilisé",
                            onConfirm: () => remove.mutateAsync(g.code),
                          })
                        }
                      />
                    </div>
                  </div>
                  {open && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:mx-3 lg:mb-3">
                      <Fact title="Code"><span className="font-mono">{g.code}</span></Fact>
                      <Fact title="Description">{g.description || "Aucune"}</Fact>
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="groupe" onChange={setPage} />
        </>
      )}
    </div>
  );
};
