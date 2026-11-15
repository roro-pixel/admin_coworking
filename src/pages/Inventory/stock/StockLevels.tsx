import React, { useState } from "react";
import { ArrowDown, ArrowUp, Boxes, Repeat, SlidersHorizontal } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { StockLevel } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, ListHeader, Pagination, SearchField, StatusChip, Switch } from "../../../components/subscription/kit";
import { ROW_HOVER, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { Cell, LocationSelect, levelState, qty, useServerPaged } from "../../../components/inventory/invKit";
import { StockInForm } from "./StockInForm";
import { StockOutForm } from "./StockOutForm";
import { StockTransferForm } from "./StockTransferForm";
import { StockAdjustmentForm } from "./StockAdjustmentForm";

const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_6rem_6rem_6.5rem_7rem]";
const SIZE = 15;
type Op = "in" | "out" | "transfer" | "adjust";

export const StockLevels: React.FC = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [belowMinimum, setBelowMinimum] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [op, setOp] = useState<Op | null>(null);

  const list = useServerPaged<StockLevel>({
    key: ["stock-levels", location, belowMinimum],
    size: SIZE,
    search,
    resetKey: `${location}|${belowMinimum}`,
    match: (l, q) => (l.itemName ?? "").toLowerCase().includes(q) || (l.itemCode ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getStockLevels({ locationCode: location || undefined, belowMinimum: belowMinimum || undefined, ...p }),
  });
  const hasFilters = !!(search || location || belowMinimum);
  const close = () => setOp(null);

  const actions: { id: Op; label: string; icon: React.ElementType; primary?: boolean }[] = [
    { id: "in", label: "Entrée", icon: ArrowUp, primary: true },
    { id: "out", label: "Sortie", icon: ArrowDown },
    { id: "transfer", label: "Transfert", icon: Repeat },
    { id: "adjust", label: "Ajustement", icon: SlidersHorizontal },
  ];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Niveaux de stock"
        subtitle={list.isLoading ? undefined : `${list.total} ligne${list.total > 1 ? "s" : ""} de stock`}
        action={
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <ActionButton key={a.id} icon={a.icon} variant={op === a.id || a.primary ? "primary" : "ghost"} onClick={() => setOp(op === a.id ? null : a.id)}>
                {a.label}
              </ActionButton>
            ))}
          </div>
        }
      />

      {op === "in" && <StockInForm onClose={close} />}
      {op === "out" && <StockOutForm onClose={close} />}
      {op === "transfer" && <StockTransferForm onClose={close} />}
      {op === "adjust" && <StockAdjustmentForm onClose={close} />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Nom ou code de l'article" />
        <FilterButton open={showFilters} active={!!(location || belowMinimum)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setLocation(""); setBelowMinimum(false); }}>
          <Field label="Emplacement">
            <LocationSelect value={location} onChange={setLocation} placeholder="Tous les emplacements" />
          </Field>
          <div className="self-end">
            <Switch checked={belowMinimum} onChange={setBelowMinimum} label="Stocks bas uniquement" hint="Sous le minimum défini côté serveur" />
          </div>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={8} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les niveaux de stock." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun niveau de stock" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Enregistrez une première entrée de stock pour commencer."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Article</span>
            <span>Emplacement</span>
            <span>En stock</span>
            <span>Réservé</span>
            <span>Disponible</span>
            <span>État</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((l) => {
              const st = levelState(l.quantityAvailable);
              return (
                <div key={`${l.itemCode}-${l.locationCode}`} className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                  <div className="min-w-0 max-lg:col-span-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{l.itemName}</p>
                    <p className="font-mono text-xs text-gray-400">{l.itemCode}</p>
                  </div>
                  <Cell title="Emplacement" className="max-lg:col-span-2"><span className="text-sm text-gray-600">{l.locationName}</span></Cell>
                  <Cell title="En stock"><span className="text-sm text-gray-700">{qty(l.quantityOnHand)}</span></Cell>
                  <Cell title="Réservé"><span className="text-sm text-gray-500">{qty(l.quantityReserved)}</span></Cell>
                  <Cell title="Disponible">
                    <span className="text-sm font-bold text-gray-950">{qty(l.quantityAvailable)}</span>
                    {l.averageCost > 0 && <span className="ml-2 hidden text-xs text-gray-400 2xl:inline">{formatMoney(l.averageCost)}</span>}
                  </Cell>
                  <div className="max-lg:col-span-2">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    {l.lastMovementAt && <span className="ml-2 text-xs text-gray-400 lg:hidden">Dernier mouvement le {formatDate(l.lastMovementAt)}</span>}
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="ligne" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
