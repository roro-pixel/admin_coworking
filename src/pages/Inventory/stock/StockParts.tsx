import React from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, StockLot, InventoryItemSerial } from "../../../services/inventory.service";
import { Field } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { Fact, qty } from "../../../components/inventory/invKit";

/** Stock disponible d'un article à un emplacement. Calculé à chaque rendu : plus de valeur périmée au changement d'emplacement. */
export const useAvailable = (itemCode: string, locationCode: string) => {
  const { data } = useQuery({
    queryKey: ["stock-levels-check", itemCode, locationCode],
    queryFn: () => inventoryService.getStockLevels({ itemCode, locationCode }),
    enabled: !!itemCode && !!locationCode,
  });
  const level = (data?.content ?? []).find((l) => l.locationCode === locationCode);
  return { available: level?.quantityAvailable ?? 0, loaded: data !== undefined };
};

export const AvailableFact: React.FC<{ title: string; value: number; loaded: boolean }> = ({ title, value, loaded }) => (
  <Fact title={title}>{loaded ? qty(value) : "Calcul en cours"}</Fact>
);

export const ReferenceFields: React.FC<{ type: string; code: string; onType: (v: string) => void; onCode: (v: string) => void }> = ({ type, code, onType, onCode }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Type de référence">
      <input value={type} onChange={(e) => onType(e.target.value)} placeholder="Ex : PURCHASE_ORDER" className={FIELD} />
    </Field>
    <Field label="Code de référence">
      <input value={code} onChange={(e) => onCode(e.target.value)} placeholder="Ex : PO-2026-0014" className={FIELD} />
    </Field>
  </div>
);

/** Lots existants d'un article à un emplacement (articles suivis par lot) */
export const LotSelect: React.FC<{ item: InventoryItem | null; locationCode: string; queryKey: string; value: string; onChange: (v: string) => void }> = ({ item, locationCode, queryKey, value, onChange }) => {
  const { data: lots = [] } = useQuery({
    queryKey: [queryKey, item?.itemCode, locationCode],
    queryFn: () => inventoryService.getItemLots(item!.itemCode, { locationCode, activeOnly: true }),
    enabled: !!item?.requiresLotNumber && !!locationCode,
  });
  if (!item?.requiresLotNumber || !locationCode) return null;
  return (
    <Field label="Lot" required hint={lots.length === 0 ? "Aucun lot disponible ici. Si le lot est inconnu, le serveur proposera de le créer." : undefined}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        <option value="">Choisir un lot existant</option>
        {lots.map((l: StockLot) => (
          <option key={l.lotCode || l.lotNumber} value={l.lotNumber}>
            {l.lotNumber} · disponible {qty(l.quantityAvailable)}
          </option>
        ))}
      </select>
    </Field>
  );
};

/** Numéros de série disponibles à cocher (articles suivis par numéro de série) */
export const SerialPicker: React.FC<{ item: InventoryItem | null; locationCode: string; queryKey: string; value: string[]; onChange: (v: string[]) => void; quantity: number }> = ({ item, locationCode, queryKey, value, onChange, quantity }) => {
  const { data: serials = [] } = useQuery({
    queryKey: [queryKey, item?.itemCode, locationCode],
    queryFn: () => inventoryService.getItemSerials(item!.itemCode, { locationCode, status: "AVAILABLE" }),
    enabled: !!item?.requiresSerialNumber && !!locationCode,
  });
  if (!item?.requiresSerialNumber || !locationCode) return null;
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <Field label="Numéros de série disponibles" required hint={`${value.length} sur ${quantity} sélectionné${value.length > 1 ? "s" : ""}`}>
      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl bg-white p-2 shadow-sm">
        {serials.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Aucun numéro disponible à cet emplacement.</p>}
        {serials.map((s: InventoryItemSerial) => (
          <label key={s.serialNumber} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-gray-50">
            <input type="checkbox" checked={value.includes(s.serialNumber)} onChange={() => toggle(s.serialNumber)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
            <span className="font-mono font-semibold text-gray-800">{s.serialNumber}</span>
            {s.lotNumber && <span className="text-xs text-gray-400">Lot {s.lotNumber}</span>}
          </label>
        ))}
      </div>
    </Field>
  );
};

export const lotNotFoundOf = (e: unknown): boolean => (e as { response?: { data?: { code?: string } } })?.response?.data?.code === "LOT_NOT_FOUND";
