import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Package, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip, Switch } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Fact, ITEM_TYPES, ITEM_TYPE_LABEL, TRACKINGS, TRACKING_LABEL, catCode, label, unitCode, useDebounced } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)_6rem_auto]";
const SIZE = 15;
const EMPTY = {
  name: "", description: "", specification: "", categoryCode: "", unitCode: "",
  itemType: "CONSUMABLE" as InventoryItem["itemType"], trackingType: "NONE" as InventoryItem["trackingType"],
  defaultCost: 0, salePrice: 0, taxable: true, allowNegativeStock: false,
  requiresExpiryDate: false, requiresLotNumber: false, requiresSerialNumber: false, active: true,
};
const fromItem = (i: InventoryItem): typeof EMPTY => ({
  name: i.name, description: i.description ?? "", specification: i.specification ?? "", categoryCode: i.categoryCode ?? "", unitCode: i.unitCode ?? "",
  itemType: i.itemType, trackingType: i.trackingType, defaultCost: i.defaultCost, salePrice: i.salePrice ?? 0, taxable: i.taxable, allowNegativeStock: i.allowNegativeStock,
  requiresExpiryDate: i.requiresExpiryDate, requiresLotNumber: i.requiresLotNumber, requiresSerialNumber: i.requiresSerialNumber, active: i.active,
});
const yesNo = (v: boolean) => (v ? "Oui" : "Non");

export const ItemsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const { data: categories = [] } = useQuery({ queryKey: ["inventory-categories"], queryFn: () => inventoryService.getCategories() });
  const { data: units = [] } = useQuery({ queryKey: ["inventory-units"], queryFn: () => inventoryService.getUnits() });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory-items", q, category, type, status, page],
    queryFn: () => inventoryService.getItems({ query: q || undefined, categoryCode: category || undefined, itemType: type || undefined, active: status === "" ? undefined : status === "active", page, size: SIZE }),
  });
  const items = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const hasFilters = !!(search || category || type || status);
  const change = (fn: () => void) => { fn(); setPage(0); };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = {
        name: f.name.trim(), description: f.description.trim() || undefined, specification: f.specification.trim() || undefined,
        categoryCode: f.categoryCode, unitCode: f.unitCode, itemType: f.itemType, trackingType: f.trackingType,
        defaultCost: f.defaultCost, salePrice: f.salePrice, taxable: f.taxable, allowNegativeStock: f.allowNegativeStock,
        requiresExpiryDate: f.requiresExpiryDate, requiresLotNumber: f.requiresLotNumber, requiresSerialNumber: f.requiresSerialNumber, active: f.active,
      };
      if (editing!.code === null) await inventoryService.createItem(body);
      else await inventoryService.updateItem(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Article créé" : "Article modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (i: InventoryItem) => (i.active ? inventoryService.deactivateItem(i.itemCode) : inventoryService.activateItem(i.itemCode)),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  // DELETE /inventory/items/{code} n'est pas documenté côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteItem(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const open = (it?: InventoryItem) => { setError(null); setEditing({ code: it?.itemCode ?? null, form: it ? fromItem(it) : { ...EMPTY } }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="space-y-5">
      <ListHeader title="Articles" subtitle={isLoading ? undefined : `${total} article${total > 1 ? "s" : ""} au catalogue`} action={<ActionButton icon={Plus} onClick={() => open()}>Nouvel article</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouvel article" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer l'article" : "Enregistrer"}
          submitDisabled={!f.name.trim() || !f.categoryCode || !f.unitCode}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <Field label="Nom" required>
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie" required>
              <select value={f.categoryCode} onChange={(e) => set({ categoryCode: e.target.value })} className={FIELD}>
                <option value="">Choisir une catégorie</option>
                {categories.map((c) => <option key={catCode(c)} value={catCode(c)}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Unité" required>
              <select value={f.unitCode} onChange={(e) => set({ unitCode: e.target.value })} className={FIELD}>
                <option value="">Choisir une unité</option>
                {units.map((u) => <option key={unitCode(u)} value={unitCode(u)}>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Type d'article" required>
              <select value={f.itemType} onChange={(e) => set({ itemType: e.target.value as InventoryItem["itemType"] })} className={FIELD}>
                {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Type de suivi">
              <select value={f.trackingType} onChange={(e) => set({ trackingType: e.target.value as InventoryItem["trackingType"] })} className={FIELD}>
                {TRACKINGS.map((t) => <option key={t} value={t}>{TRACKING_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Coût par défaut (FCFA)">
              <input type="number" min={0} value={f.defaultCost} onChange={(e) => set({ defaultCost: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
            <Field label="Prix de vente (FCFA)">
              <input type="number" min={0} value={f.salePrice} onChange={(e) => set({ salePrice: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <Field label="Spécification">
            <textarea value={f.specification} onChange={(e) => set({ specification: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch checked={f.taxable} onChange={(v) => set({ taxable: v })} label="Soumis à la taxe" />
            <Switch checked={f.allowNegativeStock} onChange={(v) => set({ allowNegativeStock: v })} label="Stock négatif autorisé" />
            <Switch checked={f.requiresExpiryDate} onChange={(v) => set({ requiresExpiryDate: v })} label="Date d'expiration obligatoire" />
            <Switch checked={f.requiresLotNumber} onChange={(v) => set({ requiresLotNumber: v })} label="Numéro de lot obligatoire" />
            <Switch checked={f.requiresSerialNumber} onChange={(v) => set({ requiresSerialNumber: v })} label="Numéro de série obligatoire" />
            <Switch checked={f.active} onChange={(v) => set({ active: v })} label="Article actif" />
          </div>
          <p className="text-sm text-gray-500">Le code affiché, le code d'identification, le code court et le SKU sont générés par le serveur à la création.</p>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={(v) => change(() => setSearch(v))} placeholder="Nom ou code de l'article" />
        <FilterButton open={showFilters} active={!!(category || type || status)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => change(() => { setSearch(""); setCategory(""); setType(""); setStatus(""); })}>
          <Field label="Catégorie">
            <select value={category} onChange={(e) => change(() => setCategory(e.target.value))} className={FIELD}>
              <option value="">Toutes les catégories</option>
              {categories.map((c) => <option key={catCode(c)} value={catCode(c)}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => change(() => setType(e.target.value))} className={FIELD}>
              <option value="">Tous les types</option>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="État">
            <select value={status} onChange={(e) => change(() => setStatus(e.target.value))} className={FIELD}>
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les articles." onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="Aucun article" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Créez votre premier article pour commencer à suivre vos stocks."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Article</span>
            <span>Catégorie</span>
            <span>Type</span>
            <span>Unité</span>
            <span>Coût</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {items.map((it) => {
              const isOpen = expanded === it.itemCode;
              return (
                <div key={it.itemCode} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(isOpen ? null : it.itemCode)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${isOpen ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{it.name}</p>
                        <p className="font-mono text-xs text-gray-400">{it.displayCode || it.itemCode}</p>
                      </div>
                    </div>
                    <Cell title="Catégorie" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-600">{it.categoryName || it.categoryCode}</span></Cell>
                    <Cell title="Type" className="max-lg:order-3"><span className="text-sm text-gray-600">{label(ITEM_TYPE_LABEL, it.itemType)}</span></Cell>
                    <Cell title="Unité" className="max-lg:order-3"><span className="text-sm text-gray-600">{it.unitName || it.unitCode}</span></Cell>
                    <Cell title="Coût" className="max-lg:order-3"><span className="text-sm font-semibold text-gray-800">{formatMoney(it.defaultCost)}</span></Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end"><StatusChip tone={it.active ? "success" : "neutral"}>{it.active ? "Actif" : "Inactif"}</StatusChip></div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={it.active ? "Désactiver" : "Activer"} tone={it.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.itemCode === it.itemCode} onClick={() => toggle.mutate(it)} />
                      <IconButton icon={Pencil} label="Modifier" onClick={() => open(it)} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer l'article « ${it.name} » ?`,
                            detail: "Cette action est définitive. Elle échoue si l'article a déjà du stock ou des mouvements.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Article supprimé",
                            errorMessage: "Suppression impossible : l'article est probablement utilisé",
                            onConfirm: () => remove.mutateAsync(it.itemCode),
                          })
                        }
                      />
                    </div>
                  </div>
                  {isOpen && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:mx-3 lg:mb-3 lg:grid-cols-4">
                      <Fact title="Code article"><span className="font-mono">{it.itemCode}</span></Fact>
                      <Fact title="Code d'identification">{it.identificationCode || "Non généré"}</Fact>
                      <Fact title="Code court">{it.shortCode || "Non généré"}</Fact>
                      <Fact title="SKU">{it.psku || "Non généré"}</Fact>
                      <Fact title="Suivi">{label(TRACKING_LABEL, it.trackingType)}</Fact>
                      <Fact title="Prix de vente">{it.salePrice ? formatMoney(it.salePrice) : "Non défini"}</Fact>
                      <Fact title="Soumis à la taxe">{yesNo(it.taxable)}</Fact>
                      <Fact title="Stock négatif">{it.allowNegativeStock ? "Autorisé" : "Interdit"}</Fact>
                      <Fact title="Date d'expiration">{it.requiresExpiryDate ? "Obligatoire" : "Non requise"}</Fact>
                      <Fact title="Numéro de lot">{it.requiresLotNumber ? "Obligatoire" : "Non requis"}</Fact>
                      <Fact title="Numéro de série">{it.requiresSerialNumber ? "Obligatoire" : "Non requis"}</Fact>
                      <Fact title="Description">{it.description || "Aucune"}</Fact>
                      {it.specification && <div className="sm:col-span-2 lg:col-span-4"><Fact title="Spécification">{it.specification}</Fact></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="article" onChange={setPage} />
        </>
      )}
    </div>
  );
};
