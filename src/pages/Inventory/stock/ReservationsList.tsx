import React, { useState } from "react";
import { CalendarClock } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { StockReservation } from "../../../services/inventory.service";
import { DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, ListHeader, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { Cell, Chip, qty, useServerPaged } from "../../../components/inventory/invKit";
import type { Tone } from "../../../components/subscription/kitUtils";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", CONSUMED: "Consommée", RELEASED: "Libérée" };
const STATUS_TONE: Record<string, Tone> = { ACTIVE: "success", CONSUMED: "info", RELEASED: "neutral" };
const COLS = "lg:grid-cols-[7rem_minmax(0,1.5fr)_minmax(0,1fr)_5rem_minmax(0,1fr)_7rem_6.5rem]";
const SIZE = 15;

export const ReservationsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const list = useServerPaged<StockReservation>({
    key: ["stock-reservations", status],
    size: SIZE,
    search,
    resetKey: status,
    match: (r, q) => (r.itemName ?? "").toLowerCase().includes(q) || r.reservationCode.toLowerCase().includes(q) || (r.referenceCode ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getStockReservations({ status: status || undefined, ...p }),
  });
  const hasFilters = !!(search || status);

  return (
    <div className="space-y-5">
      <ListHeader title="Réservations de stock" subtitle={list.isLoading ? undefined : `${list.total} réservation${list.total > 1 ? "s" : ""}`} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code, article ou référence" />
        <FilterButton open={showFilters} active={!!status} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les réservations." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucune réservation" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Les quantités mises de côté pour un besoin précis apparaîtront ici."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span>
            <span>Article</span>
            <span>Emplacement</span>
            <span>Quantité</span>
            <span>Référence</span>
            <span>Créée le</span>
            <span>Statut</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((r) => (
              <div key={r.reservationCode} className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <span className="font-mono text-xs text-gray-500">{r.reservationCode}</span>
                <div className="justify-self-end lg:hidden"><Chip map={STATUS_LABEL} tones={STATUS_TONE} value={r.status} /></div>
                <div className="min-w-0 max-lg:col-span-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{r.itemName}</p>
                  <p className="font-mono text-xs text-gray-400">{r.itemCode}</p>
                </div>
                <Cell title="Emplacement"><span className="text-sm text-gray-600">{r.locationName || r.locationCode}</span></Cell>
                <Cell title="Quantité"><span className="text-sm font-bold text-gray-950">{qty(r.quantity)}</span></Cell>
                <Cell title="Référence"><span className="truncate text-sm text-gray-600">{r.referenceCode || "Aucune"}</span></Cell>
                <Cell title="Créée le"><span className="text-sm text-gray-500">{r.createdAt ? formatDate(r.createdAt) : "Inconnue"}</span></Cell>
                <div className="max-lg:hidden"><Chip map={STATUS_LABEL} tones={STATUS_TONE} value={r.status} /></div>
              </div>
            ))}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="réservation" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
