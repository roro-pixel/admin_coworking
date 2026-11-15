import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, PackageSearch, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, ReorderRule, ReorderSuggestion } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip, Switch } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Fact, ItemPicker, LocationSelect, SEVERITY_LABEL, SEVERITY_TONE, label, qty, useActor, useServerPaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_7rem_7rem_6rem_auto]";
const SIZE = 15;
const EMPTY = { locationCode: "", minimumQuantity: 10, reorderQuantity: 50, active: true };
const TREND: Record<string, string> = { UP: "En hausse", DOWN: "En baisse", STABLE: "Stable" };

export const ReorderRulesList: React.FC = () => {
  const queryClient = useQueryClient();
  const actor = useActor();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editing, setEditing] = useState<{ rule: ReorderRule | null; form: typeof EMPTY } | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // GET /inventory/reorder-rules : aucun filtre documenté, recherche côté client
  const list = useServerPaged<ReorderRule>({
    key: ["reorder-rules"],
    size: SIZE,
    search,
    match: (r, q) => (r.itemName ?? "").toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q) || (r.locationName ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getReorderRules(p),
  });
  const suggestions = useQuery({ queryKey: ["reorder-suggestions"], queryFn: () => inventoryService.getReorderSuggestions(), enabled: showSuggestions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });

  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const data = { itemCode: editing!.rule ? editing!.rule.itemCode : item!.itemCode, locationCode: f.locationCode, minimumQuantity: f.minimumQuantity, reorderQuantity: f.reorderQuantity, active: f.active };
      // PUT/DELETE par ruleCode ne sont pas documentés côté backend (seul le POST upsert l'est) : appels conservés tels quels
      if (editing!.rule) await inventoryService.updateReorderRule(editing!.rule.ruleCode, data);
      else await inventoryService.createReorderRule(data);
    },
    onSuccess: async () => { toast.success(editing?.rule ? "Règle modifiée" : "Règle créée"); await refresh(); setEditing(null); setError(null); },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteReorderRule(code), onSuccess: refresh });
  const fromSuggestion = useMutation({
    mutationFn: (s: ReorderSuggestion) => inventoryService.createPurchaseRequestFromReorderSuggestions({ locationCode: s.locationCode, supplierCode: s.bestSupplierCode || undefined, requestedBy: actor }),
    onMutate: (s) => setBusy(`${s.itemCode}-${s.locationCode}`),
    onSuccess: async () => {
      toast.success("Demande d'achat créée");
      await queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["reorder-suggestions"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Création impossible")),
    onSettled: () => setBusy(null),
  });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const open = (r?: ReorderRule) => {
    setError(null);
    setItem(null);
    setEditing({ rule: r ?? null, form: r ? { locationCode: r.locationCode, minimumQuantity: r.minimumQuantity, reorderQuantity: r.reorderQuantity, active: r.active } : { ...EMPTY } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Règles de réapprovisionnement"
        subtitle={list.isLoading ? undefined : `${list.total} règle${list.total > 1 ? "s" : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Lightbulb} onClick={() => setShowSuggestions(!showSuggestions)}>{showSuggestions ? "Masquer les suggestions" : "Suggestions"}</ActionButton>
            <ActionButton icon={Plus} onClick={() => open()}>Nouvelle règle</ActionButton>
          </div>
        }
      />

      {showSuggestions && (
        <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
          <div><h3 className="text-base font-semibold text-gray-900">Suggestions de réapprovisionnement</h3><p className="text-sm text-gray-500">Articles sous leur seuil, classés par priorité.</p></div>
          {suggestions.isLoading ? <ListSkeleton rows={3} /> : suggestions.isError ? <ErrorBlock message="Impossible de charger les suggestions." onRetry={() => suggestions.refetch()} /> : !suggestions.data?.length ? (
            <EmptyState icon={PackageSearch} title="Aucune suggestion" hint="Tous les stocks sont au-dessus de leur seuil." />
          ) : (
            <div className="space-y-2">
              {suggestions.data.map((s) => (
                <div key={`${s.itemCode}-${s.locationCode}`} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{s.itemName || s.itemCode}</p>
                        {s.severity && <StatusChip tone={SEVERITY_TONE[s.severity] ?? "neutral"}>{label(SEVERITY_LABEL, s.severity)}</StatusChip>}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">Stock {qty(s.currentQuantity)} pour un seuil de {qty(s.minQuantity ?? 0)}. Commande suggérée : <b className="text-gray-900">{qty(s.reorderQuantity)}</b> pour environ {formatMoney(s.estimatedOrderCost ?? 0, "FCFA")}.</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Fact title="Déjà en commande">{qty(s.quantityOnOrder ?? 0)}</Fact>
                        <Fact title="Jours de stock">{s.daysOfStockRemaining ?? "Non estimé"}</Fact>
                        <Fact title="Tendance">{s.consumptionTrend ? `${label(TREND, String(s.consumptionTrend))}${s.consumptionTrendPercent !== undefined ? ` (${s.consumptionTrendPercent}%)` : ""}` : "Non estimée"}</Fact>
                        <Fact title="Commander avant">{s.recommendedOrderByDate ? formatDate(s.recommendedOrderByDate) : "Non estimé"}</Fact>
                        <Fact title="Fournisseur conseillé">{s.bestSupplierCode || "Aucun"}</Fact>
                        <Fact title="Prix fournisseur">{s.bestSupplierPrice ? formatMoney(s.bestSupplierPrice, "FCFA") : "Non renseigné"}</Fact>
                        <Fact title="Délai fournisseur">{s.bestSupplierLeadTimeDays !== undefined ? `${s.bestSupplierLeadTimeDays} j` : "Non renseigné"}</Fact>
                      </div>
                    </div>
                    <ActionButton icon={ShoppingCart} pending={busy === `${s.itemCode}-${s.locationCode}`} onClick={() => fromSuggestion.mutate(s)}>Créer la demande</ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {editing && f && (
        <PanelForm title={editing.rule ? "Modifier la règle" : "Nouvelle règle"} onCancel={() => setEditing(null)} pending={save.isPending} submitLabel={editing.rule ? "Enregistrer" : "Créer la règle"} submitDisabled={(!editing.rule && !item) || !f.locationCode} error={error} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Article" required>{editing.rule ? <Fact title={editing.rule.itemCode}>{editing.rule.itemName || editing.rule.itemCode}</Fact> : <ItemPicker value={item} onChange={setItem} />}</Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Emplacement" required><LocationSelect value={f.locationCode} onChange={(v) => set({ locationCode: v })} /></Field>
            <Field label="Seuil minimum" required><input type="number" min={0} value={f.minimumQuantity} onChange={(e) => set({ minimumQuantity: Number(e.target.value) || 0 })} className={FIELD} /></Field>
            <Field label="Quantité à commander" required><input type="number" min={0} value={f.reorderQuantity} onChange={(e) => set({ reorderQuantity: Number(e.target.value) || 0 })} className={FIELD} /></Field>
          </div>
          <Switch checked={f.active} onChange={(v) => set({ active: v })} label="Règle active" hint="Une règle inactive ne génère plus de suggestion" />
        </PanelForm>
      )}

      <SearchField value={search} onChange={setSearch} placeholder="Article ou emplacement" className="max-w-md" />

      {list.isLoading ? <ListSkeleton rows={6} /> : list.isError ? <ErrorBlock message="Impossible de charger les règles." onRetry={() => list.refetch()} /> : list.rows.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Aucune règle" hint={search ? "Aucun résultat pour cette recherche." : "Une règle déclenche une suggestion de commande quand un stock passe sous son seuil."} />
      ) : (
        <>
          <HeadRow cols={COLS}><span>Article</span><span>Emplacement</span><span className="text-right">Seuil</span><span className="text-right">À commander</span><span>Statut</span><span className="text-right">Actions</span></HeadRow>
          <DataCard>
            {list.rows.map((r) => (
              <div key={r.ruleCode} className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0 max-lg:col-span-2"><p className="truncate text-sm font-semibold text-gray-900">{r.itemName || r.itemCode}</p><p className="font-mono text-xs text-gray-400">{r.itemCode}</p></div>
                <Cell title="Emplacement"><span className="text-sm text-gray-600">{r.locationName || r.locationCode}</span></Cell>
                <Cell title="Seuil" className="lg:text-right"><span className="text-sm text-gray-600">{qty(r.minimumQuantity)}</span></Cell>
                <Cell title="À commander" className="lg:text-right"><span className="text-sm text-gray-600">{qty(r.reorderQuantity)}</span></Cell>
                <div><StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip></div>
                <div className="flex items-center gap-1 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => open(r)} />
                  <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => toast.confirm({ message: "Supprimer cette règle ?", detail: `${r.itemName || r.itemCode} : plus aucune suggestion ne sera générée.`, confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Règle supprimée", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(r.ruleCode) })} />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="règle" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
