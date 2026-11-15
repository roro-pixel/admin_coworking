import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Package, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { AmenityResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Fact, useDebounced } from "../../../components/resources/resKit";

const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_7rem_auto]";
const SIZE = 15;
const EMPTY = { name: "", description: "", active: true };

export const AmenitiesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-amenities", page, q],
    queryFn: () => (q ? resourceService.searchAmenities(q, { page, size: SIZE }) : resourceService.getAmenities({ page, size: SIZE })),
  });
  const items = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-amenities"] }), queryClient.invalidateQueries({ queryKey: ["all-amenities"] })]);
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { name: f.name.trim(), description: f.description.trim() || undefined, active: f.active };
      if (editing!.code === null) await resourceService.createAmenity(body);
      else await resourceService.updateAmenity(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Équipement créé" : "Équipement modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (a: AmenityResponse) => resourceService.updateAmenity(a.code, { name: a.name, description: a.description ?? undefined, active: !a.active }),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceService.deleteAmenity(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (patch: Partial<typeof EMPTY>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Équipements"
        subtitle={isLoading ? undefined : `${total} équipement${total > 1 ? "s" : ""} associables aux ressources`}
        action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouvel équipement</ActionButton>}
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouvel équipement" : `Modifier ${editing.code}`}
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
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Équipement actif" />
          <p className="text-sm text-gray-500">Ici, seul le référentiel global est géré. La quantité, le caractère optionnel et le supplément se renseignent au moment d'associer l'équipement à une ressource.</p>
        </PanelForm>
      )}

      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nom ou code de l'équipement" />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les équipements." onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="Aucun équipement" hint={q ? "Aucun résultat pour cette recherche." : "Ajoutez par exemple « Écran », « Wi-Fi » ou « Tableau blanc »."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Équipement</span>
            <span>Description</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {items.map((a) => {
              const open = expanded === a.code;
              return (
                <div key={a.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(open ? null : a.code)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                        <p className="font-mono text-xs text-gray-400">{a.code}</p>
                      </div>
                    </div>
                    <Cell title="Description" className="max-lg:order-3 max-lg:col-span-2">
                      <span className="line-clamp-1 text-sm text-gray-600">{a.description || "Sans description"}</span>
                    </Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end">
                      <StatusChip tone={a.active ? "success" : "neutral"}>{a.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={a.active ? "Désactiver" : "Activer"} tone={a.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === a.code} onClick={() => toggle.mutate(a)} />
                      <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: a.code, form: { name: a.name, description: a.description ?? "", active: a.active } }); }} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer l'équipement « ${a.name} » ?`,
                            detail: "La suppression échoue s'il est associé à des ressources.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Équipement supprimé",
                            errorMessage: "Suppression impossible : l'équipement est probablement associé à des ressources",
                            onConfirm: () => remove.mutateAsync(a.code),
                          })
                        }
                      />
                    </div>
                  </div>
                  {open && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:mx-3 lg:mb-3">
                      <Fact title="Code"><span className="font-mono">{a.code}</span></Fact>
                      <Fact title="Description">{a.description || "Aucune"}</Fact>
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="équipement" onChange={setPage} />
        </>
      )}
    </div>
  );
};
