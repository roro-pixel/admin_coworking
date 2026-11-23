import React from "react";
import { Trash2 } from "lucide-react";
import type { LineInput } from "../../services/purchase.service";
import { FIELD } from "../subscription/kitUtils";
import { ActionButton } from "../subscription/kit";
import { money } from "./accountingLabels";

export interface PLine {
  key: number;
  designation: string;
  quantity: string;
  unitPrice: string;
  accountNumber: string;
  vatRate: string;
  sectionCode: string;
  orderLineNo: string;
  fixedAssetCode: string;
}

let seq = 0;
export const newPLine = (): PLine => ({ key: ++seq, designation: "", quantity: "1", unitPrice: "", accountNumber: "", vatRate: "", sectionCode: "", orderLineNo: "", fixedAssetCode: "" });

const n = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));

export const toLineInputs = (ls: PLine[]): LineInput[] =>
  ls.filter((l) => l.designation.trim() || l.unitPrice.trim()).map((l) => ({
    designation: l.designation, quantity: n(l.quantity), unitPrice: n(l.unitPrice), accountNumber: l.accountNumber || undefined,
    vatRate: n(l.vatRate), sectionCode: l.sectionCode || undefined, orderLineNo: n(l.orderLineNo), fixedAssetCode: l.fixedAssetCode || undefined,
  }));

export const linesTotal = (ls: PLine[]) => {
  let ht = 0, vat = 0;
  ls.forEach((l) => { const a = (n(l.quantity) ?? 0) * (n(l.unitPrice) ?? 0); ht += a; vat += (a * (n(l.vatRate) ?? 0)) / 100; });
  return { ht, vat, ttc: ht + vat };
};

/** Lignes d'une facture ou d'une commande. `invoice` ajoute le lien commande et l'immobilisation. */
export const PurchaseLinesEditor: React.FC<{ lines: PLine[]; onChange: (l: PLine[]) => void; invoice?: boolean }> = ({ lines, onChange, invoice }) => {
  const set = (k: number, p: Partial<PLine>) => onChange(lines.map((l) => (l.key === k ? { ...l, ...p } : l)));
  const t = linesTotal(lines);
  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <div key={l.key} className="grid gap-2 rounded-xl bg-gray-50 p-2 sm:grid-cols-12">
          <input className={`${FIELD} sm:col-span-4`} placeholder="Désignation" value={l.designation} onChange={(e) => set(l.key, { designation: e.target.value })} />
          <input className={`${FIELD} sm:col-span-1`} placeholder="Qté" inputMode="decimal" value={l.quantity} onChange={(e) => set(l.key, { quantity: e.target.value })} />
          <input className={`${FIELD} sm:col-span-2`} placeholder="Prix unitaire HT" inputMode="decimal" value={l.unitPrice} onChange={(e) => set(l.key, { unitPrice: e.target.value })} />
          <input className={`${FIELD} sm:col-span-2`} placeholder="Compte" value={l.accountNumber} onChange={(e) => set(l.key, { accountNumber: e.target.value })} />
          <input className={`${FIELD} sm:col-span-1`} placeholder="TVA %" inputMode="decimal" value={l.vatRate} onChange={(e) => set(l.key, { vatRate: e.target.value })} />
          <input className={`${FIELD} sm:col-span-1`} placeholder="Section" value={l.sectionCode} onChange={(e) => set(l.key, { sectionCode: e.target.value })} />
          <button type="button" aria-label="Retirer la ligne" className="flex items-center justify-center text-gray-400 hover:text-red-600 disabled:opacity-30" disabled={lines.length === 1} onClick={() => onChange(lines.filter((x) => x.key !== l.key))}><Trash2 size={16} /></button>
          {invoice && (
            <>
              <input className={`${FIELD} sm:col-span-3 sm:col-start-1`} placeholder="N° de ligne de la commande" inputMode="numeric" value={l.orderLineNo} onChange={(e) => set(l.key, { orderLineNo: e.target.value })} />
              <input className={`${FIELD} sm:col-span-3`} placeholder="Code immobilisation" value={l.fixedAssetCode} onChange={(e) => set(l.key, { fixedAssetCode: e.target.value })} />
            </>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActionButton variant="ghost" onClick={() => onChange([...lines, newPLine()])}>Ajouter une ligne</ActionButton>
        <p className="text-xs text-gray-500">HT {money(t.ht)} · TVA {money(t.vat)} · TTC <b>{money(t.ttc)}</b> <span className="text-gray-400">(estimation, le serveur recalcule)</span></p>
      </div>
    </div>
  );
};
