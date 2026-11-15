import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryUnit } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, UNIT_TYPES, UNIT_TYPE_LABEL, label, unitCode, usePaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_auto]";
const EMPTY = { unitCode: "", name: "", unitType: "COUNT", symbol: "" };

export const UnitsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: units = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory-units"], queryFn: () => inventoryService.getUnits() });
  const q = search.trim().toLowerCase();
  const filtered = units.filter((u) => !q || u.name.toLowerCase().includes(q) || unitCode(u).toLowerCase().includes(q) || (u.symbol ?? "").toLowerCase().includes(q));
  const paged = usePaged(filtered, 15);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { unitCode: f.unitCode.trim(), name: f.name.trim(), unitType: f.unitType, symbol: f.symbol.trim() };
      if (editing!.code === null) await inventoryService.createUnit(body);
      else await inventoryService.updateUnit(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Unité créée" : "Unité modifiée");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  // PUT et DELETE sur /inventory/units/{code} ne sont pas documentés côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteUnit(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));

  return (
    <div className="space-y-5">
      <ListHeader title="Unités de mesure" subtitle={isLoading ? undefined : `${filtered.length} unité${filtered.length > 1 ? "s" : ""}`} action={<ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY } }); }}>Nouvelle unité</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouvelle unité" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.unitCode.trim() || !f.name.trim() || !f.symbol.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required hint={editing.code === null ? undefined : "Le code ne peut pas être modifié."}>
              <input value={f.unitCode} onChange={(e) => set({ unitCode: e.target.value })} disabled={editing.code !== null} placeholder="Ex : PIECE" className={`${FIELD} disabled:opacity-60`} autoFocus={editing.code === null} />
            </Field>
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex : Pièce" className={FIELD} />
            </Field>
            <Field label="Type" required>
              <select value={f.unitType} onChange={(e) => set({ unitType: e.target.value })} className={FIELD}>
                {UNIT_TYPES.map((t) => <option key={t} value={t}>{UNIT_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Symbole" required>
              <input value={f.symbol} onChange={(e) => set({ symbol: e.target.value })} placeholder="Ex : pcs" className={FIELD} />
            </Field>
          </div>
        </PanelForm>
      )}

      <SearchField value={search} onChange={setSearch} placeholder="Nom, code ou symbole de l'unité" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les unités." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Ruler} title="Aucune unité" hint={q ? "Aucun résultat pour cette recherche." : "Ajoutez par exemple « Pièce », « Boîte » ou « Kilogramme »."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Unité</span>
            <span>Type</span>
            <span>Symbole</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {paged.slice.map((u: InventoryUnit) => (
              <div key={unitCode(u)} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{u.name}</p>
                  <p className="font-mono text-xs text-gray-400">{unitCode(u)}</p>
                </div>
                <Cell title="Type" className="max-lg:order-3"><span className="text-sm text-gray-600">{label(UNIT_TYPE_LABEL, u.unitType)}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end"><span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs font-semibold text-gray-700">{u.symbol || "n/a"}</span></div>
                <div className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: unitCode(u), form: { unitCode: unitCode(u), name: u.name, unitType: u.unitType, symbol: u.symbol ?? "" } }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: `Supprimer l'unité « ${u.name} » ?`,
                        detail: "La suppression échoue si des articles l'utilisent.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Unité supprimée",
                        errorMessage: "Suppression impossible : l'unité est probablement utilisée",
                        onConfirm: () => remove.mutateAsync(unitCode(u)),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} noun="unité" onChange={paged.setPage} />
        </>
      )}
    </div>
  );
};
