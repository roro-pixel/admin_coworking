import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, GitMerge, Layers, Plus, Ruler, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { ReferenceCategory, ReferenceUnit } from "../../services/billing.service";
import { ActionButton, Field, IconButton, ItemRow, ListHeader, PanelForm, Section, StatusChip, Switch, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState, toNum } from "../../components/billing/pageKit";

type Tab = "categories" | "units" | "merge";
const TABS: TabItem<Tab>[] = [
  { id: "categories", label: "Catégories", icon: Layers },
  { id: "units", label: "Unités", icon: Ruler },
  { id: "merge", label: "Fusion", icon: GitMerge },
];

type Editing =
  | { scope: "category"; code?: string }
  | { scope: "subcategory"; parent: string; code?: string }
  | { scope: "unit"; code?: string };

const emptyForm = { code: "", label: "", description: "", revenueAccount: "", displayOrder: "", pluralLabel: "", symbol: "", quantityScale: "", inventoryUnitCode: "" };

/**
 * Listes de référence du catalogue (catégories, sous-catégories, unités) et fusion de doublons.
 * Lecture : BILLING:READ. Toute écriture exige en plus l'autorité BILLING:CATALOG_REFERENCES.
 */
export const BillingCatalogReferences: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("BILLING:CATALOG_REFERENCES") && hasPermission("BILLING:UPDATE");
  const canCreate = hasPermission("BILLING:CATALOG_REFERENCES") && hasPermission("BILLING:CREATE");
  const canDelete = hasPermission("BILLING:CATALOG_REFERENCES") && hasPermission("BILLING:CANCEL");
  const [tab, setTab] = useState<Tab>("categories");
  const [inactive, setInactive] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merge, setMerge] = useState({ list: "CATEGORY" as "CATEGORY" | "SUBCATEGORY" | "UNIT", parentCode: "", sourceCode: "", targetCode: "" });

  const refs = useQuery({ queryKey: ["billing-catalog-references", inactive], queryFn: () => billingService.getCatalogReferences(inactive) });
  const categories = refs.data?.categories ?? [];
  const units = refs.data?.units ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-catalog-references"] }); qc.invalidateQueries({ queryKey: ["billing-catalog"] }); };
  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const startEdit = (e: Editing, src?: ReferenceCategory | ReferenceUnit) => {
    setEditing(e);
    setError(null);
    const u = src as ReferenceUnit | undefined;
    const c = src as ReferenceCategory | undefined;
    setForm({
      ...emptyForm,
      code: src?.code ?? "", label: src?.label ?? "", displayOrder: src?.displayOrder?.toString() ?? "",
      description: c?.description ?? "", revenueAccount: c?.revenueAccount ?? "",
      pluralLabel: u?.pluralLabel ?? "", symbol: u?.symbol ?? "", quantityScale: u?.quantityScale?.toString() ?? "", inventoryUnitCode: u?.inventoryUnitCode ?? "",
    });
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing!;
      const cat = { label: form.label.trim(), description: form.description.trim() || undefined, revenueAccount: form.revenueAccount.trim() || undefined, displayOrder: toNum(form.displayOrder) };
      const unit = { label: form.label.trim(), pluralLabel: form.pluralLabel.trim() || undefined, symbol: form.symbol.trim() || undefined, quantityScale: toNum(form.quantityScale), inventoryUnitCode: form.inventoryUnitCode.trim() || undefined, displayOrder: toNum(form.displayOrder) };
      if (e.scope === "category") return e.code ? billingService.updateCategory(e.code, cat) : billingService.createCategory({ ...cat, code: form.code.trim() || undefined });
      if (e.scope === "subcategory") return e.code ? billingService.updateSubcategory(e.parent, e.code, cat) : billingService.createSubcategory(e.parent, { ...cat, code: form.code.trim() || undefined });
      return e.code ? billingService.updateUnit(e.code, unit) : billingService.createUnit({ ...unit, code: form.code.trim() || undefined });
    },
    onSuccess: () => { refresh(); setEditing(null); setError(null); toast.success("Enregistré."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });

  const toggle = useMutation({
    mutationFn: (v: { scope: Editing["scope"]; code: string; parent?: string; active: boolean }) =>
      v.scope === "category" ? billingService.setCategoryActive(v.code, v.active)
        : v.scope === "subcategory" ? billingService.setSubcategoryActive(v.parent!, v.code, v.active)
        : billingService.setUnitActive(v.code, v.active),
    onSuccess: refresh,
    onError: (e: unknown) => toast.error(billingError(e, "Changement impossible.")),
  });

  const remove = (scope: Editing["scope"], code: string, parent?: string) =>
    toast.confirm({
      message: `Supprimer « ${code} » ?`,
      detail: "Impossible tant que des articles l'utilisent : fusionnez-le d'abord vers un autre code.",
      confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Supprimé.", errorMessage: "Suppression impossible : élément encore utilisé.",
      onConfirm: async () => {
        if (scope === "category") await billingService.deleteCategory(code);
        else if (scope === "subcategory") await billingService.deleteSubcategory(parent!, code);
        else await billingService.deleteUnit(code);
        refresh();
      },
    });

  const doMerge = useMutation({
    mutationFn: () => billingService.mergeReferences({ list: merge.list, parentCode: merge.list === "SUBCATEGORY" ? merge.parentCode.trim() : undefined, sourceCode: merge.sourceCode.trim(), targetCode: merge.targetCode.trim() }),
    onSuccess: (r) => { refresh(); setMerge((m) => ({ ...m, sourceCode: "", targetCode: "" })); setError(null); toast.success(`Fusion faite${Object.keys(r).length ? ` (${Object.entries(r).map(([k, v]) => `${k} : ${v}`).join(", ")})` : ""}.`); },
    onError: (e: unknown) => setError(billingError(e, "Fusion impossible.")),
  });

  const Actions: React.FC<{ scope: Editing["scope"]; item: ReferenceCategory | ReferenceUnit; parent?: string }> = ({ scope, item, parent }) => (
    <div className="flex items-center gap-2">
      <StatusChip tone={item.active === false ? "neutral" : "success"}>{item.active === false ? "Inactif" : "Actif"}</StatusChip>
      {canWrite && (
        <>
          <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => startEdit(scope === "subcategory" ? { scope, parent: parent!, code: item.code } : { scope, code: item.code } as Editing, item)}>Modifier</ActionButton>
          <ActionButton variant="ghost" className="!px-4 !py-2" pending={toggle.isPending && toggle.variables?.code === item.code} onClick={() => toggle.mutate({ scope, code: item.code, parent, active: item.active === false })}>{item.active === false ? "Activer" : "Désactiver"}</ActionButton>
        </>
      )}
      {canDelete && <IconButton icon={Trash2} tone="danger" label="Supprimer" onClick={() => remove(scope, item.code, parent)} />}
    </div>
  );

  const isUnit = editing?.scope === "unit";
  const title = editing ? `${editing.code ? "Modifier" : "Nouvelle"} ${editing.scope === "unit" ? "unité" : editing.scope === "subcategory" ? "sous-catégorie" : "catégorie"}` : "";

  return (
    <div className="space-y-5">
      <ListHeader title="Références du catalogue" subtitle={`Catégories, sous-catégories et unités proposées sur les articles${refs.data?.strict ? " · saisie stricte : seuls ces codes sont acceptés" : ""}`} />
      {!canWrite && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">Lecture seule : la modification des références exige l'autorité BILLING:CATALOG_REFERENCES.</p>}
      <Tabs items={TABS} active={tab} onChange={(t) => { setTab(t); setEditing(null); setError(null); }} variant="soft" />

      {editing && (
        <PanelForm title={title} submitLabel="Enregistrer" pending={save.isPending} submitDisabled={!form.label.trim() || (!editing.code && editing.scope !== "subcategory" && false)} error={error} onCancel={() => setEditing(null)} onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editing.code && <Field label="Code" hint="Vide : généré à partir du libellé"><input className={`${FIELD_SOFT} font-mono uppercase`} value={form.code} onChange={set("code")} /></Field>}
            <Field label="Libellé" required><input className={FIELD_SOFT} value={form.label} onChange={set("label")} /></Field>
            {isUnit ? (
              <>
                <Field label="Pluriel"><input className={FIELD_SOFT} value={form.pluralLabel} onChange={set("pluralLabel")} /></Field>
                <Field label="Symbole"><input className={FIELD_SOFT} value={form.symbol} onChange={set("symbol")} /></Field>
                <Field label="Décimales de quantité" hint="0 = entier"><input type="number" min={0} max={6} className={FIELD_SOFT} value={form.quantityScale} onChange={set("quantityScale")} /></Field>
                <Field label="Unité du stock" hint="Code d'unité de l'inventaire"><input className={`${FIELD_SOFT} font-mono`} value={form.inventoryUnitCode} onChange={set("inventoryUnitCode")} /></Field>
              </>
            ) : (
              <>
                <Field label="Description"><input className={FIELD_SOFT} value={form.description} onChange={set("description")} /></Field>
                <Field label="Compte de produit" hint="Compte comptable des ventes"><input className={`${FIELD_SOFT} font-mono`} value={form.revenueAccount} onChange={set("revenueAccount")} /></Field>
              </>
            )}
            <Field label="Ordre d'affichage"><input type="number" className={FIELD_SOFT} value={form.displayOrder} onChange={set("displayOrder")} /></Field>
          </div>
        </PanelForm>
      )}

      {tab !== "merge" && <Switch checked={inactive} onChange={setInactive} label="Afficher aussi les éléments inactifs" />}

      {tab === "categories" && (
        <Section title="Catégories" icon={Layers} action={canCreate ? <ActionButton className="!px-4 !py-2" icon={Plus} onClick={() => startEdit({ scope: "category" })}>Catégorie</ActionButton> : undefined}>
          <QueryState isLoading={refs.isLoading} isError={refs.isError} onRetry={() => refs.refetch()} isEmpty={categories.length === 0} icon={Layers} title="Aucune catégorie" rows={3}>
            <div className="space-y-2">
              {categories.map((c) => (
                <ItemRow key={c.code}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.label} <span className="font-mono text-xs font-normal text-gray-400">{c.code}</span></p>
                      <p className="text-xs text-gray-500">{c.itemCount ?? 0} article{(c.itemCount ?? 0) > 1 ? "s" : ""}{c.revenueAccount ? ` · compte ${c.revenueAccount}` : ""}{c.createdFromItem ? " · créée depuis un article" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Actions scope="category" item={c} />
                      <IconButton icon={open === c.code ? ChevronUp : ChevronDown} label="Sous-catégories" onClick={() => setOpen(open === c.code ? null : c.code)} />
                    </div>
                  </div>
                  {open === c.code && <SubList parent={c.code} inactive={inactive} canCreate={canCreate} onAdd={() => startEdit({ scope: "subcategory", parent: c.code })} Actions={Actions} />}
                </ItemRow>
              ))}
            </div>
          </QueryState>
        </Section>
      )}

      {tab === "units" && (
        <Section title="Unités" icon={Ruler} action={canCreate ? <ActionButton className="!px-4 !py-2" icon={Plus} onClick={() => startEdit({ scope: "unit" })}>Unité</ActionButton> : undefined}>
          <QueryState isLoading={refs.isLoading} isError={refs.isError} onRetry={() => refs.refetch()} isEmpty={units.length === 0} icon={Ruler} title="Aucune unité" rows={3}>
            <div className="space-y-2">
              {units.map((u) => (
                <ItemRow key={u.code}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{u.label}{u.symbol ? ` (${u.symbol})` : ""} <span className="font-mono text-xs font-normal text-gray-400">{u.code}</span></p>
                      <p className="text-xs text-gray-500">{u.itemCount ?? 0} article{(u.itemCount ?? 0) > 1 ? "s" : ""}{u.quantityScale != null ? ` · ${u.quantityScale} décimale(s)` : ""}{u.inventoryUnitCode ? ` · stock ${u.inventoryUnitCode}` : ""}</p>
                    </div>
                    <Actions scope="unit" item={u} />
                  </div>
                </ItemRow>
              ))}
            </div>
          </QueryState>
        </Section>
      )}

      {tab === "merge" && (
        <Section title="Fusionner deux codes" icon={GitMerge} description="Tous les articles du code source passent sur le code cible, puis le source est retiré. Utile pour résorber les doublons nés d'une saisie libre.">
          {canCreate ? (
            <PanelForm title="Fusion" submitLabel="Fusionner" pending={doMerge.isPending} submitDisabled={!merge.sourceCode.trim() || !merge.targetCode.trim() || (merge.list === "SUBCATEGORY" && !merge.parentCode.trim())} error={error} onCancel={() => setMerge((m) => ({ ...m, sourceCode: "", targetCode: "" }))} onSubmit={(e) => { e.preventDefault(); setError(null); toast.confirm({ message: `Fusionner ${merge.sourceCode} vers ${merge.targetCode} ?`, detail: "Opération groupée non réversible.", confirmLabel: "Fusionner", pendingLabel: "Fusion", successMessage: "Fusion faite.", errorMessage: "Fusion impossible.", onConfirm: async () => { await doMerge.mutateAsync(); } }); }}>
              <PillChoice label="Liste" options={[{ value: "CATEGORY", label: "Catégories" }, { value: "SUBCATEGORY", label: "Sous-catégories" }, { value: "UNIT", label: "Unités" }]} value={merge.list} onChange={(v) => setMerge((m) => ({ ...m, list: v as typeof m.list }))} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {merge.list === "SUBCATEGORY" && <Field label="Catégorie parente" required><input className={`${FIELD_SOFT} font-mono`} value={merge.parentCode} onChange={(e) => setMerge((m) => ({ ...m, parentCode: e.target.value }))} /></Field>}
                <Field label="Code à retirer" required><input className={`${FIELD_SOFT} font-mono`} value={merge.sourceCode} onChange={(e) => setMerge((m) => ({ ...m, sourceCode: e.target.value }))} /></Field>
                <Field label="Code conservé" required><input className={`${FIELD_SOFT} font-mono`} value={merge.targetCode} onChange={(e) => setMerge((m) => ({ ...m, targetCode: e.target.value }))} /></Field>
              </div>
            </PanelForm>
          ) : <p className="text-sm text-gray-500">La fusion exige BILLING:CREATE et l'autorité BILLING:CATALOG_REFERENCES.</p>}
        </Section>
      )}
    </div>
  );
};

const SubList: React.FC<{
  parent: string; inactive: boolean; canCreate: boolean; onAdd: () => void;
  Actions: React.FC<{ scope: "subcategory"; item: ReferenceCategory; parent?: string } | { scope: Editing["scope"]; item: ReferenceCategory | ReferenceUnit; parent?: string }>;
}> = ({ parent, inactive, canCreate, onAdd, Actions }) => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["billing-catalog-references", "sub", parent, inactive], queryFn: () => billingService.listSubcategories(parent, inactive) });
  const list = data ?? [];
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 p-3">
      {isLoading ? <p className="text-sm text-gray-400">Chargement…</p> : isError ? <p className="text-sm text-red-600">Chargement impossible.</p> : list.length === 0 ? <p className="text-sm text-gray-400">Aucune sous-catégorie.</p> : list.map((s) => (
        <div key={s.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
          <p className="text-sm text-gray-800">{s.label} <span className="font-mono text-xs text-gray-400">{s.code}</span>{s.itemCount != null ? <span className="text-xs text-gray-400"> · {s.itemCount} art.</span> : null}</p>
          <Actions scope="subcategory" item={s} parent={parent} />
        </div>
      ))}
      {canCreate && <ActionButton variant="ghost" className="!px-4 !py-2" icon={Plus} onClick={onAdd}>Sous-catégorie</ActionButton>}
    </div>
  );
};
