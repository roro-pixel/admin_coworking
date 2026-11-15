import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Pencil, Plus, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Asset, InventoryItem } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ASSET_STATUSES, ASSET_STATUS_LABEL, ASSET_STATUS_TONE, CONDITIONS, CONDITION_LABEL, Cell, Chip, Fact, ItemPicker, LocationSelect, label, useServerPaged } from "../../../components/inventory/invKit";
import { AssetDetail } from "./AssetDetail";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_9rem_6rem_auto]";
const SIZE = 15;
const EMPTY = {
  itemCode: "", serialNumber: "", assetTag: "", status: "AVAILABLE" as Asset["status"], condition: "NEW" as Asset["condition"], locationCode: "",
  purchaseDate: "", purchaseCost: 0, warrantyEndDate: "", usefulLifeMonths: 60, residualValue: 0, notes: "",
};

export const AssetsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<{ asset: Asset | null; form: typeof EMPTY } | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // GET /inventory/assets ne documente pas de paramètre de recherche texte : filtre côté client
  const list = useServerPaged<Asset>({
    key: ["assets", status, location],
    size: SIZE,
    search,
    resetKey: `${status}|${location}`,
    match: (a, q) => a.assetCode.toLowerCase().includes(q) || (a.itemName ?? "").toLowerCase().includes(q) || (a.serialNumber ?? "").toLowerCase().includes(q) || (a.assetTag ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getAssets({ status: status || undefined, locationCode: location || undefined, ...p }),
  });
  const hasFilters = !!(search || status || location);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assets"] });
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = {
        itemCode: editing!.asset ? editing!.asset.itemCode : item!.itemCode,
        serialNumber: f.serialNumber.trim() || undefined, assetTag: f.assetTag.trim() || undefined, status: f.status, condition: f.condition, locationCode: f.locationCode,
        purchaseDate: f.purchaseDate || undefined, purchaseCost: f.purchaseCost, warrantyEndDate: f.warrantyEndDate || undefined,
        usefulLifeMonths: f.usefulLifeMonths, residualValue: f.residualValue, notes: f.notes.trim() || undefined,
      };
      if (editing!.asset) await inventoryService.updateAsset(editing!.asset.assetCode, { ...body, assetCode: editing!.asset.assetCode });
      else await inventoryService.createAsset(body);
    },
    onSuccess: async () => {
      toast.success(editing?.asset ? "Actif modifié" : "Actif créé");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  // DELETE /inventory/assets/{code} n'est pas documenté côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteAsset(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const open = (a?: Asset) => {
    setError(null);
    setItem(null);
    setEditing({
      asset: a ?? null,
      form: a ? { itemCode: a.itemCode, serialNumber: a.serialNumber ?? "", assetTag: a.assetTag ?? "", status: a.status, condition: a.condition, locationCode: a.locationCode, purchaseDate: a.purchaseDate?.split("T")[0] ?? "", purchaseCost: a.purchaseCost, warrantyEndDate: a.warrantyEndDate?.split("T")[0] ?? "", usefulLifeMonths: a.usefulLifeMonths ?? 60, residualValue: a.residualValue ?? 0, notes: a.notes ?? "" } : { ...EMPTY },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (selected) {
    return <AssetDetail asset={list.rows.find((a) => a.assetCode === selected.assetCode) ?? selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <ListHeader title="Actifs" subtitle={list.isLoading ? undefined : `${list.total} actif${list.total > 1 ? "s" : ""} suivis individuellement`} action={<ActionButton icon={Plus} onClick={() => open()}>Nouvel actif</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.asset ? `Modifier ${editing.asset.assetCode}` : "Nouvel actif"}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.asset ? "Enregistrer" : "Créer l'actif"}
          submitDisabled={(!editing.asset && !item) || !f.locationCode}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <Field label="Article" required>
            {editing.asset ? <Fact title={editing.asset.itemCode}>{editing.asset.itemName || editing.asset.itemCode}</Fact> : <ItemPicker itemType="ASSET" value={item} onChange={setItem} placeholder="Rechercher un article de type Actif" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Numéro de série"><input value={f.serialNumber} onChange={(e) => set({ serialNumber: e.target.value })} className={FIELD} /></Field>
            <Field label="Tag"><input value={f.assetTag} onChange={(e) => set({ assetTag: e.target.value })} className={FIELD} /></Field>
            <Field label="Emplacement" required><LocationSelect value={f.locationCode} onChange={(v) => set({ locationCode: v })} /></Field>
            <Field label="Statut">
              <select value={f.status} onChange={(e) => set({ status: e.target.value as Asset["status"] })} className={FIELD}>
                {ASSET_STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Condition">
              <select value={f.condition} onChange={(e) => set({ condition: e.target.value as Asset["condition"] })} className={FIELD}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Coût d'achat (FCFA)"><input type="number" min={0} value={f.purchaseCost} onChange={(e) => set({ purchaseCost: Number(e.target.value) || 0 })} className={FIELD} /></Field>
            <Field label="Date d'achat"><input type="date" value={f.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} className={FIELD} /></Field>
            <Field label="Fin de garantie"><input type="date" value={f.warrantyEndDate} onChange={(e) => set({ warrantyEndDate: e.target.value })} className={FIELD} /></Field>
            <Field label="Durée de vie (mois)"><input type="number" min={1} value={f.usefulLifeMonths} onChange={(e) => set({ usefulLifeMonths: Number(e.target.value) || 0 })} className={FIELD} /></Field>
            <Field label="Valeur résiduelle (FCFA)"><input type="number" min={0} value={f.residualValue} onChange={(e) => set({ residualValue: Number(e.target.value) || 0 })} className={FIELD} /></Field>
          </div>
          <Field label="Notes"><textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} className={`${FIELD} resize-none`} /></Field>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code, article, numéro de série ou tag" />
        <FilterButton open={showFilters} active={!!(status || location)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); setLocation(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {ASSET_STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Emplacement"><LocationSelect value={location} onChange={setLocation} placeholder="Tous les emplacements" /></Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={8} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les actifs." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={HardDrive} title="Aucun actif" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Un actif est un équipement identifié, comme un ordinateur ou un écran."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Actif</span>
            <span>Série ou tag</span>
            <span>Emplacement</span>
            <span>Statut</span>
            <span>Condition</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((a) => (
              <div key={a.assetCode} onClick={() => setSelected(a)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{a.itemName || a.itemCode}</p><p className="font-mono text-xs text-gray-400">{a.assetCode}</p></div>
                <Cell title="Série" className="max-lg:order-3 max-lg:col-span-2"><span className="truncate font-mono text-sm text-gray-600">{a.serialNumber || a.assetTag || "Sans identifiant"}</span></Cell>
                <Cell title="Emplacement" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-600">{a.locationName || a.locationCode}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end"><Chip map={ASSET_STATUS_LABEL} tones={ASSET_STATUS_TONE} value={a.status} /></div>
                <Cell title="Condition" className="max-lg:order-3"><span className="text-sm text-gray-600">{label(CONDITION_LABEL, a.condition)}</span></Cell>
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => open(a)} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: `Supprimer l'actif ${a.assetCode} ?`,
                        detail: "Cette action est définitive.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Actif supprimé",
                        errorMessage: "Suppression impossible : l'actif est probablement utilisé",
                        onConfirm: () => remove.mutateAsync(a.assetCode),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="actif" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
