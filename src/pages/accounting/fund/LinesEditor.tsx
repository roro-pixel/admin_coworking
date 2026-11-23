import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionButton, IconButton } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";

export interface Col { key: string; label: string; number?: boolean; wide?: boolean }
export type Row = Record<string, string>;

/** Grille de saisie de lignes (états de besoin, demandes de fonds). Les valeurs restent des chaînes ; la conversion se fait à l'envoi. */
export const LinesEditor: React.FC<{ cols: Col[]; rows: Row[]; onChange: (r: Row[]) => void }> = ({ cols, rows, onChange }) => {
  const set = (i: number, k: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const blank = (): Row => Object.fromEntries(cols.map((c) => [c.key, ""]));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-2.5 shadow-sm">
          {cols.map((c) => (
            <label key={c.key} className={`block ${c.wide ? "min-w-[14rem] flex-1" : "w-28"}`}>
              <span className="mb-1 block text-[11px] font-semibold text-gray-500">{c.label}</span>
              <input className={FIELD} inputMode={c.number ? "decimal" : undefined} value={r[c.key] ?? ""} onChange={(e) => set(i, c.key, e.target.value)} />
            </label>
          ))}
          <IconButton icon={Trash2} label="Retirer la ligne" tone="danger" onClick={() => onChange(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blank()])} />
        </div>
      ))}
      <ActionButton variant="ghost" icon={Plus} onClick={() => onChange([...rows, blank()])}>Ajouter une ligne</ActionButton>
    </div>
  );
};

/** Convertit les lignes saisies : champs vides omis, colonnes numériques converties. */
export const toPayload = <T,>(cols: Col[], rows: Row[]): T[] =>
  rows
    .filter((r) => cols.some((c) => (r[c.key] ?? "").trim()))
    .map((r) => Object.fromEntries(cols.flatMap((c) => { const s = (r[c.key] ?? "").trim(); return s ? [[c.key, c.number ? Number(s.replace(",", ".")) : s]] : []; })) as T);
export const fromPayload = (cols: Col[], rows: Record<string, unknown>[] | undefined): Row[] =>
  rows && rows.length ? rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, r[c.key] == null ? "" : String(r[c.key])]))) : [Object.fromEntries(cols.map((c) => [c.key, ""]))];
