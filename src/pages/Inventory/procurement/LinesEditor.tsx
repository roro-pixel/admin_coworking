import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "../../../services/inventory.service";
import { ActionButton, Field, IconButton } from "../../../components/subscription/kit";
import { FIELD, formatMoney } from "../../../components/subscription/kitUtils";
import { ItemPicker } from "../../../components/inventory/invKit";

export interface DraftLine {
  item: InventoryItem | null;
  quantity: number;
  unitCost: number;
}
export const newLine = (): DraftLine => ({ item: null, quantity: 1, unitCost: 0 });
export const linesTotal = (lines: DraftLine[]) => lines.reduce((s, l) => s + (l.item ? l.quantity * l.unitCost : 0), 0);
/** Lignes prêtes à envoyer : article choisi et quantité positive */
export const validLines = (lines: DraftLine[]) => lines.filter((l) => l.item && l.quantity > 0).map((l) => ({ itemCode: l.item!.itemCode, quantity: l.quantity, unitCost: l.unitCost }));

/** Lignes d'article d'une demande d'achat ou d'un bon de commande : chaque ligne a son propre article, bien visible une fois choisi */
export const LinesEditor: React.FC<{ lines: DraftLine[]; onChange: (lines: DraftLine[]) => void }> = ({ lines, onChange }) => {
  const patch = (i: number, p: Partial<DraftLine>) => onChange(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  return (
    <div className="space-y-3">
      {lines.map((l, i) => (
        <div key={i} className="space-y-3 rounded-2xl bg-gray-50 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ItemPicker value={l.item} onChange={(it) => patch(i, { item: it, unitCost: it && l.unitCost === 0 ? it.defaultCost : l.unitCost })} />
            </div>
            {lines.length > 1 && <IconButton icon={Trash2} label="Retirer la ligne" tone="danger" onClick={() => onChange(lines.filter((_, k) => k !== i))} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Quantité">
              <input type="number" min={1} value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
            <Field label="Prix unitaire (FCFA)">
              <input type="number" min={0} value={l.unitCost} onChange={(e) => patch(i, { unitCost: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
            <div className="self-end pb-3 text-sm text-gray-500">
              Sous-total <span className="font-semibold text-gray-900">{formatMoney(l.item ? l.quantity * l.unitCost : 0)}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActionButton variant="ghost" icon={Plus} onClick={() => onChange([...lines, newLine()])}>Ajouter une ligne</ActionButton>
        <p className="text-sm text-gray-500">Total <span className="text-base font-bold text-gray-950">{formatMoney(linesTotal(lines))}</span></p>
      </div>
    </div>
  );
};

/** Lecture seule des lignes d'une demande ou d'un bon de commande */
export const LinesView: React.FC<{ lines?: { itemCode: string; itemName?: string; quantity: number; unitCost: number; totalCost?: number }[] }> = ({ lines }) => {
  if (!lines || lines.length === 0) return <p className="text-sm text-gray-400">Aucune ligne.</p>;
  const total = lines.reduce((s, l) => s + (l.totalCost ?? l.quantity * l.unitCost), 0);
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={`${l.itemCode}-${i}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{l.itemName || l.itemCode}</p>
            <p className="font-mono text-xs text-gray-400">{l.itemCode}</p>
          </div>
          <p className="text-sm text-gray-500">
            {l.quantity.toLocaleString("fr-FR")} x {formatMoney(l.unitCost)} <span className="ml-2 font-semibold text-gray-900">{formatMoney(l.totalCost ?? l.quantity * l.unitCost)}</span>
          </p>
        </div>
      ))}
      <p className="px-1 text-right text-sm text-gray-500">Total <span className="text-base font-bold text-gray-950">{formatMoney(total)}</span></p>
    </div>
  );
};
