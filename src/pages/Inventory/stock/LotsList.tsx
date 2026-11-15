import React, { useState } from "react";
import { Layers } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { StockLot } from "../../../services/inventory.service";
import { DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, ListHeader, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { Cell, LocationSelect, daysUntil, qty, useDebounced, useServerPaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_5.5rem_7rem_8.5rem]";
const SIZE = 15;

const lotState = (expiry?: string) => {
  const d = daysUntil(expiry);
  if (d === null) return { label: "Valide", tone: "success" as const, text: "Sans date d'expiration" };
  if (d <= 0) return { label: "Expiré", tone: "danger" as const, text: formatDate(expiry) };
  if (d <= 30) return { label: "Expire bientôt", tone: "warn" as const, text: formatDate(expiry) };
  return { label: "Valide", tone: "success" as const, text: formatDate(expiry) };
};

export const LotsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const code = useDebounced(itemCode.trim());

  const list = useServerPaged<StockLot>({
    key: ["stock-lots", code, location],
    size: SIZE,
    search,
    resetKey: `${code}|${location}`,
    match: (l, q) => (l.itemName ?? "").toLowerCase().includes(q) || (l.lotNumber ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getStockLots({ itemCode: code || undefined, locationCode: location || undefined, ...p }),
  });
  const hasFilters = !!(search || itemCode || location);

  return (
    <div className="space-y-5">
      <ListHeader title="Lots traçables" subtitle={list.isLoading ? undefined : `${list.total} lot${list.total > 1 ? "s" : ""} en stock`} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Numéro de lot ou nom de l'article" />
        <FilterButton open={showFilters} active={!!(itemCode || location)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setItemCode(""); setLocation(""); }}>
          <Field label="Code article">
            <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="Ex : ITM-1003" className={FIELD} />
          </Field>
          <Field label="Emplacement">
            <LocationSelect value={location} onChange={setLocation} placeholder="Tous les emplacements" />
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les lots." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun lot" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Les lots apparaissent pour les articles suivis par lot."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Lot</span>
            <span>Article</span>
            <span>Emplacement</span>
            <span>Disponible</span>
            <span>Expiration</span>
            <span>État</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((l) => {
              const st = lotState(l.expiryDate);
              return (
                <div key={l.lotCode} className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                  <span className="font-mono text-sm font-semibold text-gray-800">{l.lotNumber}</span>
                  <div className="justify-self-end lg:hidden"><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                  <div className="min-w-0 max-lg:col-span-2"><p className="truncate text-sm font-semibold text-gray-900">{l.itemName}</p><p className="font-mono text-xs text-gray-400">{l.itemCode}</p></div>
                  <Cell title="Emplacement"><span className="text-sm text-gray-600">{l.locationCode}</span></Cell>
                  <Cell title="Disponible"><span className="text-sm font-bold text-gray-950">{qty(l.quantityAvailable)}</span><span className="ml-1 text-xs text-gray-400">sur {qty(l.quantityOnHand)}</span></Cell>
                  <Cell title="Expiration"><span className={`text-sm ${st.tone === "danger" ? "text-red-600" : st.tone === "warn" ? "text-amber-600" : "text-gray-600"}`}>{st.text}</span></Cell>
                  <div className="max-lg:hidden"><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="lot" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
