import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryLocation } from "../../../services/inventory.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, LOCATION_TYPES, LOCATION_TYPE_LABEL, label, usePaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_6rem_auto]";
const EMPTY = { locationCode: "", name: "", locationType: "WAREHOUSE" as InventoryLocation["locationType"], description: "", active: true };

export const LocationsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: locations = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory-locations"], queryFn: () => inventoryService.getLocations() });
  const q = search.trim().toLowerCase();
  const filtered = locations.filter((l) => !q || l.name.toLowerCase().includes(q) || l.locationCode.toLowerCase().includes(q));
  const paged = usePaged(filtered, 15);

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory-locations"] }), queryClient.invalidateQueries({ queryKey: ["inventory-locations-active"] })]);
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { locationCode: f.locationCode.trim(), name: f.name.trim(), locationType: f.locationType, description: f.description.trim() || undefined, active: f.active };
      if (editing!.code === null) await inventoryService.createLocation(body);
      else await inventoryService.updateLocation(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Emplacement créé" : "Emplacement modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (l: InventoryLocation) => (l.active ? inventoryService.deactivateLocation(l.locationCode) : inventoryService.activateLocation(l.locationCode)),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  // DELETE /inventory/locations/{code} n'est pas documenté côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteLocation(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));

  return (
    <div className="space-y-5">
      <ListHeader title="Emplacements" subtitle={isLoading ? undefined : `${filtered.length} emplacement${filtered.length > 1 ? "s" : ""} de stockage`} action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouvel emplacement</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouvel emplacement" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.locationCode.trim() || !f.name.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required hint={editing.code === null ? undefined : "Le code ne peut pas être modifié."}>
              <input value={f.locationCode} onChange={(e) => set({ locationCode: e.target.value })} disabled={editing.code !== null} placeholder="Ex : ENTREPOT-A" className={`${FIELD} disabled:opacity-60`} autoFocus={editing.code === null} />
            </Field>
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Type" required>
              <select value={f.locationType} onChange={(e) => set({ locationType: e.target.value as InventoryLocation["locationType"] })} className={FIELD}>
                {LOCATION_TYPES.map((t) => <option key={t} value={t}>{LOCATION_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <input value={f.description} onChange={(e) => set({ description: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Emplacement actif" />
        </PanelForm>
      )}

      <SearchField value={search} onChange={setSearch} placeholder="Nom ou code de l'emplacement" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les emplacements." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="Aucun emplacement" hint={q ? "Aucun résultat pour cette recherche." : "Créez un entrepôt, un bureau ou une salle pour y ranger vos articles."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Emplacement</span>
            <span>Type</span>
            <span>Description</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {paged.slice.map((l) => (
              <div key={l.locationCode} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{l.name}</p>
                  <p className="font-mono text-xs text-gray-400">{l.locationCode}</p>
                </div>
                <Cell title="Type" className="max-lg:order-3"><span className="text-sm text-gray-600">{label(LOCATION_TYPE_LABEL, l.locationType)}</span></Cell>
                <Cell title="Description" className="max-lg:order-3 max-lg:col-span-2"><span className="line-clamp-1 text-sm text-gray-600">{l.description || "Sans description"}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end"><StatusChip tone={l.active ? "success" : "neutral"}>{l.active ? "Actif" : "Inactif"}</StatusChip></div>
                <div className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Power} label={l.active ? "Désactiver" : "Activer"} tone={l.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.locationCode === l.locationCode} onClick={() => toggle.mutate(l)} />
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: l.locationCode, form: { locationCode: l.locationCode, name: l.name, locationType: l.locationType, description: l.description ?? "", active: l.active } }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: `Supprimer l'emplacement « ${l.name} » ?`,
                        detail: "La suppression échoue s'il contient du stock ou des mouvements.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Emplacement supprimé",
                        errorMessage: "Suppression impossible : l'emplacement est probablement utilisé",
                        onConfirm: () => remove.mutateAsync(l.locationCode),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} noun="emplacement" onChange={paged.setPage} />
        </>
      )}
    </div>
  );
};
