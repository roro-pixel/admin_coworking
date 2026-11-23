import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { resourceOpsService } from "../../../services/resourceOps.service";
import type { BundleItem, ResourceBundle } from "../../../services/resourceOps.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const EMPTY = { name: "", description: "", discountPercent: "", active: true, items: [] as { resourceCode: string; quantity: number }[] };

/** Lots de ressources réservées ensemble, avec une remise. */
export const ResourceBundlesPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("RESOURCE:CREATE");
  const canUpdate = hasPermission("RESOURCE:UPDATE");
  const canDelete = hasPermission("RESOURCE:DELETE");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const bundles = useQuery({ queryKey: ["resource-bundles"], queryFn: () => resourceOpsService.getBundles() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-bundles"] });

  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const items: BundleItem[] = f.items.map((i) => ({ resourceCode: i.resourceCode, quantity: i.quantity }));
      const body = { name: f.name.trim(), description: f.description.trim() || undefined, discountPercent: f.discountPercent === "" ? undefined : Number(f.discountPercent), active: f.active, items };
      if (editing!.code === null) await resourceOpsService.createBundle(body);
      else await resourceOpsService.updateBundle(editing!.code, body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(editing?.code === null ? "Lot créé" : "Lot modifié");
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (b: ResourceBundle) => resourceOpsService.updateBundle(b.code, { active: !b.active }),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceOpsService.deleteBundle(code), onSuccess: refresh });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const list = bundles.data ?? [];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Lots"
        subtitle={bundles.isLoading ? undefined : `${list.length} lot${list.length > 1 ? "s" : ""} de ressources réservées ensemble`}
        action={canCreate ? <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY, items: [] } }); }}>Nouveau lot</ActionButton> : undefined}
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau lot" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.name.trim() || f.items.length < 2}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} autoFocus />
            </Field>
            <Field label="Remise (%)">
              <input type="number" min={0} max={100} step="0.5" value={f.discountPercent} onChange={(e) => set({ discountPercent: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <Field label="Ressources du lot" required hint="Au moins deux ressources.">
            <div className="space-y-2">
              {f.items.map((it, idx) => (
                <div key={it.resourceCode} className="flex items-center gap-2 rounded-2xl bg-gray-50 p-2">
                  <span className="min-w-0 flex-1 truncate px-2 font-mono text-sm text-gray-800">{it.resourceCode}</span>
                  <input type="number" min={1} value={it.quantity} aria-label="Quantité" onChange={(e) => set({ items: f.items.map((x, i) => (i === idx ? { ...x, quantity: parseInt(e.target.value) || 1 } : x)) })} className={`${FIELD} !w-20`} />
                  <IconButton icon={X} label="Retirer" tone="danger" onClick={() => set({ items: f.items.filter((_, i) => i !== idx) })} />
                </div>
              ))}
              <ResourceAutocomplete
                key={pickerKey}
                placeholder="Ajouter une ressource"
                onSelect={(r) => {
                  if (!r || f.items.some((i) => i.resourceCode === r.code)) return;
                  set({ items: [...f.items, { resourceCode: r.code, quantity: 1 }] });
                  setPickerKey((k) => k + 1);
                }}
              />
            </div>
          </Field>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Lot actif" />
        </PanelForm>
      )}

      {bundles.isLoading ? (
        <ListSkeleton rows={4} />
      ) : bundles.isError ? (
        <ErrorBlock message="Les lots n'ont pas pu être chargés." onRetry={() => bundles.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun lot" hint="Regroupez des ressources réservées ensemble (salle et matériel, par exemple) avec une remise." />
      ) : (
        <DataCard>
          {list.map((b) => (
            <div key={b.code} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{b.name}</p>
                <p className="truncate text-xs text-gray-400">
                  {b.code}
                  {b.discountPercent ? ` · remise ${b.discountPercent} %` : ""} · {b.items.map((i) => `${i.resourceName || i.resourceCode}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                </p>
              </div>
              <StatusChip tone={b.active ? "success" : "neutral"}>{b.active ? "Actif" : "Inactif"}</StatusChip>
              {canUpdate && (
                <>
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: b.code, form: { name: b.name, description: b.description ?? "", discountPercent: b.discountPercent == null ? "" : String(b.discountPercent), active: b.active, items: b.items.map((i) => ({ resourceCode: i.resourceCode, quantity: i.quantity ?? 1 })) } }); }} />
                  <IconButton icon={Power} label={b.active ? "Désactiver" : "Activer"} tone={b.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === b.code} onClick={() => toggle.mutate(b)} />
                </>
              )}
              {canDelete && (
                <IconButton
                  icon={Trash2}
                  label="Supprimer"
                  tone="danger"
                  onClick={() => toast.confirm({ message: `Supprimer le lot ${b.name} ?`, confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Lot supprimé", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(b.code) })}
                />
              )}
            </div>
          ))}
        </DataCard>
      )}
    </div>
  );
};
