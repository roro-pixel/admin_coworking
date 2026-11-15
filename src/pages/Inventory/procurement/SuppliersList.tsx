import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Supplier } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";
import { ChartCard, RatioBar } from "../../../components/operations/OpsCharts";
import { ListSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Chip, Fact, SUPPLIER_STATUS_LABEL, SUPPLIER_STATUS_TONE, supCode, useServerPaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_7rem_auto]";
const SIZE = 15;
const STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"] as const;
const EMPTY = { name: "", email: "", phone: "", taxId: "", address: "", status: "ACTIVE" as Supplier["status"] };
/** Le backend renvoie un taux entre 0 et 1 ; on tolère aussi un pourcentage déjà multiplié */
const percent = (v?: number) => (v === undefined || v === null ? 0 : Math.round(v > 1 ? v : v * 100));

const Performance: React.FC<{ code: string }> = ({ code }) => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["supplier-performance", code], queryFn: () => inventoryService.getSupplierPerformance(code) });
  if (isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (isError || !data) return <p className="text-sm text-gray-500">Performance indisponible pour ce fournisseur.</p>;
  const onTime = percent(data.onTimeDeliveryRate);
  const quality = percent(data.qualityAcceptanceRate);
  return (
    <ChartCard title="Performance" subtitle="Calculée par le serveur sur l'historique des commandes">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold text-gray-700">Livraisons à l'heure</span><span className="text-lg font-bold text-gray-950">{onTime}%</span></div>
            <RatioBar value={onTime} total={100} />
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold text-gray-700">Qualité acceptée</span><span className="text-lg font-bold text-gray-950">{quality}%</span></div>
            <RatioBar value={quality} total={100} color="#7FB08A" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div><p className="text-xs font-semibold text-gray-400">Commandes</p><p className="text-xl font-bold text-gray-950">{data.totalOrders ?? 0}</p></div>
          <div><p className="text-xs font-semibold text-gray-400">Terminées</p><p className="text-xl font-bold text-gray-950">{data.completedOrders ?? 0}</p></div>
          <div><p className="text-xs font-semibold text-gray-400">Retard moyen</p><p className="text-xl font-bold text-gray-950">{data.averageDeliveryDelayDays ?? 0} j</p></div>
          <div><p className="text-xs font-semibold text-gray-400">Coût unitaire moyen</p><p className="text-xl font-bold text-gray-950">{formatMoney(data.averageUnitCost)}</p></div>
        </div>
      </div>
    </ChartCard>
  );
};

export const SuppliersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // GET /procurement/suppliers ne documente que status, page et size : la recherche texte se fait côté client
  const list = useServerPaged<Supplier>({
    key: ["suppliers", status],
    size: SIZE,
    search,
    resetKey: status,
    match: (s, q) => s.name.toLowerCase().includes(q) || supCode(s).toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getSuppliers({ status: status || undefined, ...p }),
  });
  const hasFilters = !!(search || status);

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["suppliers"] }), queryClient.invalidateQueries({ queryKey: ["suppliers-active"] })]);
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = { name: f.name.trim(), email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, taxId: f.taxId.trim() || undefined, address: f.address.trim() || undefined, status: f.status };
      if (editing!.code === null) await inventoryService.createSupplier(body);
      else await inventoryService.updateSupplier(editing!.code, body);
    },
    onSuccess: async () => {
      toast.success(editing?.code === null ? "Fournisseur créé" : "Fournisseur modifié");
      await invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  // DELETE /procurement/suppliers/{code} n'est pas documenté côté backend : à confirmer
  const remove = useMutation({ mutationFn: (code: string) => inventoryService.deleteSupplier(code), onSuccess: invalidate });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const open = (s?: Supplier) => { setError(null); setEditing({ code: s ? supCode(s) : null, form: s ? { name: s.name, email: s.email ?? "", phone: s.phone ?? "", taxId: s.taxId ?? "", address: s.address ?? "", status: s.status } : { ...EMPTY } }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="space-y-5">
      <ListHeader title="Fournisseurs" subtitle={list.isLoading ? undefined : `${list.total} fournisseur${list.total > 1 ? "s" : ""}`} action={<ActionButton icon={Plus} onClick={() => open()}>Nouveau fournisseur</ActionButton>} />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau fournisseur" : `Modifier ${editing.code}`}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} className={FIELD} /></Field>
            <Field label="Téléphone"><input value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={FIELD} /></Field>
            <Field label="Numéro fiscal"><input value={f.taxId} onChange={(e) => set({ taxId: e.target.value })} className={FIELD} /></Field>
            <Field label="Statut">
              <select value={f.status} onChange={(e) => set({ status: e.target.value as Supplier["status"] })} className={FIELD}>
                {STATUSES.map((s) => <option key={s} value={s}>{SUPPLIER_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Adresse"><input value={f.address} onChange={(e) => set({ address: e.target.value })} className={FIELD} /></Field>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Nom, code ou email du fournisseur" />
        <FilterButton open={showFilters} active={!!status} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {STATUSES.map((s) => <option key={s} value={s}>{SUPPLIER_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les fournisseurs." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun fournisseur" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Ajoutez vos fournisseurs pour pouvoir leur passer commande."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Fournisseur</span>
            <span>Email</span>
            <span>Téléphone</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((s) => {
              const code = supCode(s);
              const isOpen = expanded === code;
              return (
                <div key={code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(isOpen ? null : code)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${isOpen ? "" : "-rotate-90"}`} />
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{s.name}</p><p className="font-mono text-xs text-gray-400">{code}</p></div>
                    </div>
                    <Cell title="Email" className="max-lg:order-3 max-lg:col-span-2"><span className="truncate text-sm text-gray-600">{s.email || "Non renseigné"}</span></Cell>
                    <Cell title="Téléphone" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-600">{s.phone || "Non renseigné"}</span></Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end"><Chip map={SUPPLIER_STATUS_LABEL} tones={SUPPLIER_STATUS_TONE} value={s.status} /></div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Pencil} label="Modifier" onClick={() => open(s)} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer le fournisseur « ${s.name} » ?`,
                            detail: "La suppression échoue s'il a des commandes ou des demandes.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Fournisseur supprimé",
                            errorMessage: "Suppression impossible : le fournisseur est probablement utilisé",
                            onConfirm: () => remove.mutateAsync(code),
                          })
                        }
                      />
                    </div>
                  </div>
                  {isOpen && (
                    <div className="space-y-3 rounded-2xl bg-gray-50 p-3 lg:mx-3 lg:mb-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Fact title="Numéro fiscal">{s.taxId || "Non renseigné"}</Fact>
                        <div className="sm:col-span-2"><Fact title="Adresse">{s.address || "Non renseignée"}</Fact></div>
                      </div>
                      <Performance code={code} />
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="fournisseur" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
