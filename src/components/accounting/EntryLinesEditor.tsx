import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Account } from "../../services/accounting.service";
import { IconButton } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { money } from "./accountingLabels";

export interface LineDraft {
  key: number;
  accountNumber: string;
  thirdPartyCode: string;
  label: string;
  debit: string;
  credit: string;
  dueDate: string;
  reference: string;
}

let seq = 0;
export const newLine = (patch: Partial<LineDraft> = {}): LineDraft => ({
  key: ++seq,
  accountNumber: "",
  thirdPartyCode: "",
  label: "",
  debit: "",
  credit: "",
  dueDate: "",
  reference: "",
  ...patch,
});

const num = (s: string): number => {
  const n = Number(s.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const totals = (lines: LineDraft[]) => {
  const debit = lines.reduce((s, l) => s + num(l.debit), 0);
  const credit = lines.reduce((s, l) => s + num(l.credit), 0);
  return { debit, credit, diff: Math.round((debit - credit) * 100) / 100 };
};

/** Lignes prêtes pour l'API : montants numériques, champs vides retirés, lignes vides ignorées. */
export const toInputLines = (lines: LineDraft[]) =>
  lines
    .filter((l) => l.accountNumber.trim() || num(l.debit) || num(l.credit))
    .map((l) => ({
      accountNumber: l.accountNumber.trim(),
      thirdPartyCode: l.thirdPartyCode.trim() || undefined,
      label: l.label.trim() || undefined,
      debit: num(l.debit) || undefined,
      credit: num(l.credit) || undefined,
      dueDate: l.dueDate || undefined,
      reference: l.reference.trim() || undefined,
    }));

/** Saisie des lignes d'une écriture : un seul des deux montants par ligne, total en bas. */
export const EntryLinesEditor: React.FC<{
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  accounts: Account[];
}> = ({ lines, onChange, accounts }) => {
  const t = totals(lines);
  const set = (key: number, patch: Partial<LineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const labelOf = (n: string) => accounts.find((a) => a.number === n)?.label;

  return (
    <div className="space-y-3">
      <datalist id="acc-accounts">
        {accounts.map((a) => (
          <option key={a.number} value={a.number}>{a.label}</option>
        ))}
      </datalist>

      {lines.map((l, i) => (
        <div key={l.key} className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <input
                className={FIELD}
                list="acc-accounts"
                placeholder="Compte"
                aria-label={`Compte, ligne ${i + 1}`}
                value={l.accountNumber}
                onChange={(e) => set(l.key, { accountNumber: e.target.value })}
              />
              {labelOf(l.accountNumber) && <p className="mt-1 truncate text-xs text-gray-400">{labelOf(l.accountNumber)}</p>}
            </div>
            <input className={`${FIELD} sm:col-span-2`} placeholder="Tiers" aria-label="Code tiers" value={l.thirdPartyCode} onChange={(e) => set(l.key, { thirdPartyCode: e.target.value })} />
            <input className={`${FIELD} sm:col-span-3`} placeholder="Libellé de la ligne" aria-label="Libellé" value={l.label} onChange={(e) => set(l.key, { label: e.target.value })} />
            <input
              className={`${FIELD} text-right sm:col-span-2`}
              inputMode="decimal"
              placeholder="Débit"
              aria-label="Débit"
              value={l.debit}
              onChange={(e) => set(l.key, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
            />
            <div className="flex items-start gap-1 sm:col-span-2">
              <input
                className={`${FIELD} text-right`}
                inputMode="decimal"
                placeholder="Crédit"
                aria-label="Crédit"
                value={l.credit}
                onChange={(e) => set(l.key, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
              />
              <IconButton icon={Trash2} label="Retirer la ligne" tone="danger" disabled={lines.length <= 2} onClick={() => onChange(lines.filter((x) => x.key !== l.key))} />
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input type="date" className={FIELD} aria-label="Échéance" title="Échéance" value={l.dueDate} onChange={(e) => set(l.key, { dueDate: e.target.value })} />
            <input className={FIELD} placeholder="Référence (pièce, facture…)" aria-label="Référence" value={l.reference} onChange={(e) => set(l.key, { reference: e.target.value })} />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...lines, newLine()])}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
      >
        <Plus size={16} /> Ajouter une ligne
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
        <span className="font-semibold text-gray-600">
          Débit <span className="font-mono text-gray-900">{money(t.debit)}</span> · Crédit <span className="font-mono text-gray-900">{money(t.credit)}</span>
        </span>
        {t.diff === 0 ? (
          <span className="font-semibold text-emerald-700">Équilibrée</span>
        ) : (
          <span className="font-semibold text-amber-700">Écart {money(Math.abs(t.diff))} {t.diff > 0 ? "au débit" : "au crédit"}</span>
        )}
      </div>
    </div>
  );
};
