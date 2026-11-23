import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Download, Plus, Trash2, TrendingUp, Upload } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { CatalogComponent, CatalogMargin, CatalogSegment } from "../../services/billing.service";
import { ActionButton, DataCard, Field, HeadRow, IconButton, ListHeader, PanelForm, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { CATALOG_SEGMENT_LABEL } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState, toNum } from "../../components/billing/pageKit";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_8rem_8rem_8rem_6rem_6rem_3rem]";
const SEGMENTS = Object.keys(CATALOG_SEGMENT_LABEL) as CatalogSegment[];
const today = () => new Date().toLocaleDateString("sv-SE");

const Detail: React.FC<{ m: CatalogMargin; canUpdate: boolean; canCreate: boolean }> = ({ m, canUpdate, canCreate }) => {
  const qc = useQueryClient();
  const [links, setLinks] = useState({ inventoryItemCode: m.inventoryItemCode ?? "", revenueAccount: m.revenueAccount ?? "" });
  const [price, setPrice] = useState({ segment: "ALL" as CatalogSegment, unitPrice: "", validFrom: today(), reason: "" });
  const [comps, setComps] = useState<CatalogComponent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prices = useQuery({ queryKey: ["billing-catalog-prices", m.itemCode], queryFn: () => billingService.listCatalogPrices(m.itemCode) });
  const components = useQuery({ queryKey: ["billing-catalog-components", m.itemCode], queryFn: () => billingService.getCatalogComponents(m.itemCode) });
  const current = comps ?? components.data ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-catalog-margins"] }); qc.invalidateQueries({ queryKey: ["billing-catalog-prices", m.itemCode] }); qc.invalidateQueries({ queryKey: ["billing-catalog"] }); };

  const saveLinks = useMutation({
    mutationFn: () => billingService.setCatalogLinks(m.itemCode, { inventoryItemCode: links.inventoryItemCode.trim() || undefined, revenueAccount: links.revenueAccount.trim() || undefined }),
    onSuccess: () => { refresh(); setError(null); toast.success("Liens enregistrés."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });
  const addPrice = useMutation({
    mutationFn: () => billingService.addCatalogPrice(m.itemCode, { segment: price.segment, unitPrice: toNum(price.unitPrice) ?? 0, validFrom: price.validFrom || undefined, reason: price.reason.trim() || undefined }),
    onSuccess: () => { refresh(); setPrice({ ...price, unitPrice: "", reason: "" }); setError(null); toast.success("Prix ajouté : l'ancien est clôturé à la veille."); },
    onError: (e: unknown) => setError(billingError(e, "Ajout impossible.")),
  });
  const saveComps = useMutation({
    mutationFn: () => billingService.saveCatalogComponents(m.itemCode, current.filter((c) => c.componentCode.trim())),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-catalog-components", m.itemCode] }); setComps(null); setError(null); toast.success("Composition enregistrée."); },
    onError: (e: unknown) => setError(billingError(e, "Composition invalide.")),
  });
  const deposit = useMutation({
    mutationFn: (v: boolean) => billingService.setCatalogSecurityDeposit(m.itemCode, v),
    onSuccess: (_r, v) => { refresh(); toast.success(v ? "Article marqué comme caution." : "Article retiré des cautions."); },
    onError: (e: unknown) => toast.error(billingError(e, "Changement impossible.")),
  });

  return (
    <div className="space-y-4 px-4 pb-4">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      <PanelForm title="Liens comptables et stock" submitLabel="Enregistrer" pending={saveLinks.isPending} onCancel={() => setLinks({ inventoryItemCode: m.inventoryItemCode ?? "", revenueAccount: m.revenueAccount ?? "" })} onSubmit={(e) => { e.preventDefault(); if (canUpdate) saveLinks.mutate(); }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Article de stock" hint="Sorti du stock à la livraison"><input className={`${FIELD_SOFT} font-mono`} disabled={!canUpdate} value={links.inventoryItemCode} onChange={(e) => setLinks({ ...links, inventoryItemCode: e.target.value })} /></Field>
          <Field label="Compte de produit" hint="Remplace celui de la catégorie"><input className={`${FIELD_SOFT} font-mono`} disabled={!canUpdate} value={links.revenueAccount} onChange={(e) => setLinks({ ...links, revenueAccount: e.target.value })} /></Field>
        </div>
      </PanelForm>

      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">Historique des prix</p>
        {prices.isLoading ? <p className="text-sm text-gray-400">Chargement…</p> : (prices.data ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucun prix par segment.</p> : (
          <div className="space-y-1.5">
            {prices.data!.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <span className="text-gray-700">{CATALOG_SEGMENT_LABEL[p.segment ?? ""] ?? p.segment}</span>
                <span className="font-bold tabular-nums">{formatMoney(p.unitPrice ?? 0)}</span>
                <span className="text-xs text-gray-500">{formatDate(p.validFrom)} → {p.validUntil ? formatDate(p.validUntil) : "en cours"}{p.reason ? ` · ${p.reason}` : ""}</span>
              </div>
            ))}
          </div>
        )}
        {canCreate && (
          <div className="mt-4 space-y-3">
            <PillChoice label="Segment" options={SEGMENTS.map((s) => ({ value: s, label: CATALOG_SEGMENT_LABEL[s] }))} value={price.segment} onChange={(v) => setPrice({ ...price, segment: v as CatalogSegment })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Nouveau prix" required><input type="number" min={0} step="any" className={FIELD_SOFT} value={price.unitPrice} onChange={(e) => setPrice({ ...price, unitPrice: e.target.value })} /></Field>
              <Field label="Applicable dès le"><input type="date" className={FIELD_SOFT} value={price.validFrom} onChange={(e) => setPrice({ ...price, validFrom: e.target.value })} /></Field>
              <Field label="Motif" className="sm:col-span-2"><input className={FIELD_SOFT} value={price.reason} onChange={(e) => setPrice({ ...price, reason: e.target.value })} /></Field>
            </div>
            <ActionButton icon={Plus} pending={addPrice.isPending} disabled={toNum(price.unitPrice) == null} onClick={() => addPrice.mutate()}>Ajouter le prix</ActionButton>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="mb-1 text-sm font-bold text-gray-900">Composition (article composé)</p>
        <p className="mb-3 text-xs text-gray-500">À la livraison, chaque composant sort du stock selon sa quantité.</p>
        <div className="space-y-2">
          {current.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Field label="Composant" className="min-w-[10rem] flex-1"><input className={`${FIELD_SOFT} font-mono`} disabled={!canUpdate} value={c.componentCode} onChange={(e) => setComps(current.map((x, k) => (k === i ? { ...x, componentCode: e.target.value } : x)))} /></Field>
              <Field label="Quantité" className="w-28"><input type="number" min={0} step="any" className={FIELD_SOFT} disabled={!canUpdate} value={c.quantity} onChange={(e) => setComps(current.map((x, k) => (k === i ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} /></Field>
              {canUpdate && <IconButton icon={Trash2} tone="danger" label="Retirer" onClick={() => setComps(current.filter((_, k) => k !== i))} />}
            </div>
          ))}
        </div>
        {canUpdate && (
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setComps([...current, { componentCode: "", componentSource: "INVENTORY_ITEM", quantity: 1 }])}>Composant</ActionButton>
            {comps && <ActionButton className="!px-4 !py-2" pending={saveComps.isPending} onClick={() => saveComps.mutate()}>Enregistrer la composition</ActionButton>}
          </div>
        )}
      </div>

      {canUpdate && (
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="ghost" pending={deposit.isPending} onClick={() => deposit.mutate(true)}>Marquer comme caution</ActionButton>
          <ActionButton variant="ghost" pending={deposit.isPending} onClick={() => deposit.mutate(false)}>Retirer des cautions</ActionButton>
        </div>
      )}
    </div>
  );
};

/** Marges et prix du catalogue : marge par article, historique des prix, liens stock/compta, composition, import/export CSV. */
export const BillingCatalogMargins: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCreate = hasPermission("BILLING:CREATE");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [report, setReport] = useState<{ created?: number; updated?: number; errors?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-catalog-margins", search, category],
    queryFn: () => billingService.getCatalogMargins({ search: search.trim() || undefined, category: category.trim() || undefined }),
  });
  const list = data ?? [];

  const exp = useMutation({
    mutationFn: async () => saveBlob(await billingService.exportCatalog(), "catalogue.csv"),
    onError: (e: unknown) => toast.error(billingError(e, "Export impossible.")),
  });
  const imp = useMutation({
    mutationFn: async (file: File) => billingService.importCatalog(await file.text()),
    onSuccess: (r) => { setReport(r); qc.invalidateQueries({ queryKey: ["billing-catalog-margins"] }); qc.invalidateQueries({ queryKey: ["billing-catalog"] }); toast.success(`Import : ${r.created ?? 0} créé(s), ${r.updated ?? 0} mis à jour.`); },
    onError: (e: unknown) => toast.error(billingError(e, "Import impossible : vérifiez le fichier CSV.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Marges et prix"
        subtitle="Rentabilité des articles du catalogue et gestion des prix par segment"
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Download} pending={exp.isPending} onClick={() => exp.mutate()}>Exporter (CSV)</ActionButton>
            {canCreate && (
              <>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) imp.mutate(f); e.target.value = ""; }} />
                <ActionButton variant="ghost" icon={Upload} pending={imp.isPending} onClick={() => fileRef.current?.click()}>Importer (CSV)</ActionButton>
              </>
            )}
          </div>
        }
      />
      {report && (
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-gray-900">{report.created ?? 0} créé(s) · {report.updated ?? 0} mis à jour</p>
          {(report.errors ?? []).length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-red-600">{report.errors!.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_14rem]">
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un article (code ou nom)" />
        <input className={FIELD_SOFT} placeholder="Code catégorie" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" />
      </div>

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={TrendingUp} title="Aucun article">
        <HeadRow cols={COLS}><span>Article</span><span className="text-right">Prix</span><span className="text-right">Coût</span><span className="text-right">Marge</span><span className="text-right">Taux</span><span className="text-right">Remise max</span><span /></HeadRow>
        <DataCard>
          {list.map((m) => {
            const expanded = open === m.itemCode;
            const low = (m.marginRate ?? 0) < 0;
            return (
              <div key={m.itemCode} className="max-lg:mb-2">
                <div className={`grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:bg-gray-50 ${COLS}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{m.name ?? m.itemCode}</p>
                    <p className="truncate font-mono text-xs text-gray-400">{m.itemCode}{m.category ? ` · ${m.category}` : ""}{m.subcategory ? ` / ${m.subcategory}` : ""}</p>
                  </div>
                  <p className="text-sm tabular-nums lg:text-right">{formatMoney(m.unitPrice ?? 0)}</p>
                  <p className="text-sm tabular-nums text-gray-500 lg:text-right">{m.costPrice != null ? formatMoney(m.costPrice) : "—"}</p>
                  <p className={`text-sm font-semibold tabular-nums lg:text-right ${low ? "text-red-600" : ""}`}>{m.margin != null ? formatMoney(m.margin) : "—"}</p>
                  <div className="lg:text-right">{m.marginRate != null ? <StatusChip tone={low ? "danger" : m.marginRate < 0.1 ? "warn" : "success"}>{`${(m.marginRate <= 1 && m.marginRate >= -1 ? m.marginRate * 100 : m.marginRate).toFixed(1)} %`}</StatusChip> : <span className="text-gray-400">—</span>}</div>
                  <p className="text-sm tabular-nums text-gray-500 lg:text-right">{m.maxDiscountRate != null ? `${m.maxDiscountRate} %` : "—"}</p>
                  <div className="flex justify-end"><IconButton icon={expanded ? ChevronUp : ChevronDown} label="Détail" onClick={() => setOpen(expanded ? null : m.itemCode)} /></div>
                </div>
                {expanded && <Detail m={m} canUpdate={canUpdate} canCreate={canCreate} />}
              </div>
            );
          })}
        </DataCard>
      </QueryState>
    </div>
  );
};
