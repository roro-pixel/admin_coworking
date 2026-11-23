import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Field } from "../subscription/kit";
import { FIELD_SOFT, formatMoney } from "../subscription/kitUtils";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashCountRequest, CashDenomination } from "../../services/cashRegister.service";
import { parseDigits } from "../payment/paymentUtils";

export interface CountDraft {
  /** clé « BILL:10000 » → quantités */
  lines: Record<string, { quantity: number; damaged: number }>;
  totalAmount: number;
  secondCounterEmail: string;
  witnessEmail: string;
  keptFloat: number;
  varianceReasonCode: string;
  varianceReasonText: string;
  note: string;
}

export const emptyCount = (): CountDraft => ({
  lines: {},
  totalAmount: 0,
  secondCounterEmail: "",
  witnessEmail: "",
  keptFloat: 0,
  varianceReasonCode: "",
  varianceReasonText: "",
  note: "",
});

const keyOf = (d: { kind: string; value: number }) => `${d.kind}:${d.value}`;

/** Total compté : détail par coupure s'il y en a, sinon le montant saisi. */
export const countTotal = (draft: CountDraft, denoms: CashDenomination[], withLines: boolean): number =>
  withLines
    ? denoms.reduce((t, d) => t + d.value * (draft.lines[keyOf(d)]?.quantity ?? 0), 0)
    : draft.totalAmount;

export const buildCountRequest = (
  draft: CountDraft,
  denoms: CashDenomination[],
  currency: string,
  withLines: boolean,
  opts: { keptFloat?: boolean; secondCounter?: boolean; witness?: boolean } = {},
): CashCountRequest => ({
  currency,
  ...(withLines
    ? {
        lines: denoms
          .filter((d) => (draft.lines[keyOf(d)]?.quantity ?? 0) > 0 || (draft.lines[keyOf(d)]?.damaged ?? 0) > 0)
          .map((d) => ({
            value: d.value,
            kind: d.kind,
            quantity: draft.lines[keyOf(d)]?.quantity ?? 0,
            damagedQuantity: draft.lines[keyOf(d)]?.damaged || undefined,
          })),
      }
    : { totalAmount: draft.totalAmount }),
  secondCounterEmail: opts.secondCounter && draft.secondCounterEmail.trim() ? draft.secondCounterEmail.trim() : undefined,
  witnessEmail: opts.witness && draft.witnessEmail.trim() ? draft.witnessEmail.trim() : undefined,
  keptFloat: opts.keptFloat && draft.keptFloat > 0 ? draft.keptFloat : undefined,
  varianceReasonCode: draft.varianceReasonCode || undefined,
  varianceReasonText: draft.varianceReasonText.trim() || undefined,
  note: draft.note.trim() || undefined,
});

/**
 * Saisie d'un comptage de caisse : quantités par coupure (billets et pièces), ou montant global quand la caisse
 * n'impose pas le détail. Le solde attendu n'est montré que s'il est fourni (clôture à l'aveugle : le serveur le masque).
 */
export const CountForm: React.FC<{
  draft: CountDraft;
  onChange: (d: CountDraft) => void;
  denominations: CashDenomination[];
  /** Détail par coupure obligatoire. Sinon, saisie d'un montant global (le détail reste possible). */
  withLines: boolean;
  currency?: string;
  expected?: number | null;
  /** Champs facultatifs à montrer. */
  showSecondCounter?: boolean;
  showWitness?: boolean;
  showKeptFloat?: boolean;
  showVariance?: boolean;
}> = ({ draft, onChange, denominations, withLines, currency = "XAF", expected, showSecondCounter, showWitness, showKeptFloat, showVariance = true }) => {
  const total = countTotal(draft, denominations, withLines);
  const variance = expected === null || expected === undefined ? null : total - expected;
  const money = (n: number) => formatMoney(n, currency === "XAF" ? "FCFA" : currency);

  // Motifs d'écart : liste de référence dont le code évoque l'écart (nom exact non documenté).
  const lists = useQuery({ queryKey: ["cash-reference-lists"], queryFn: () => cashRegisterService.getReferenceLists(), staleTime: 300_000, enabled: showVariance });
  const reasons = useMemo(() => {
    const entries = Object.entries(lists.data ?? {}).find(([code]) => /VARIANCE|ECART|DIFFERENCE/i.test(code));
    return entries?.[1].filter((v) => v.active) ?? [];
  }, [lists.data]);

  const set = (patch: Partial<CountDraft>) => onChange({ ...draft, ...patch });
  const setLine = (d: CashDenomination, patch: Partial<{ quantity: number; damaged: number }>) =>
    onChange({ ...draft, lines: { ...draft.lines, [keyOf(d)]: { ...(draft.lines[keyOf(d)] ?? { quantity: 0, damaged: 0 }), ...patch } } });

  const bills = denominations.filter((d) => d.kind === "BILL").sort((a, b) => b.value - a.value);
  const coins = denominations.filter((d) => d.kind === "COIN").sort((a, b) => b.value - a.value);

  const Row: React.FC<{ d: CashDenomination }> = ({ d }) => {
    const line = draft.lines[keyOf(d)];
    return (
      <div className="grid grid-cols-[1fr_5rem_5rem_6rem] items-center gap-2 text-sm">
        <span className="font-semibold text-gray-800">{d.label || d.value.toLocaleString("fr-FR")}</span>
        <input
          aria-label={`Quantité ${d.label}`}
          inputMode="numeric"
          value={line?.quantity ? line.quantity : ""}
          onChange={(e) => setLine(d, { quantity: parseDigits(e.target.value) })}
          placeholder="0"
          className={`${FIELD_SOFT} !px-3 !py-2 text-right tabular-nums`}
        />
        <input
          aria-label={`Abîmés ${d.label}`}
          inputMode="numeric"
          value={line?.damaged ? line.damaged : ""}
          onChange={(e) => setLine(d, { damaged: parseDigits(e.target.value) })}
          placeholder="0"
          className={`${FIELD_SOFT} !px-3 !py-2 text-right tabular-nums`}
        />
        <span className="text-right tabular-nums text-gray-500">{money(d.value * (line?.quantity ?? 0))}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {withLines ? (
        <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
          <div className="grid grid-cols-[1fr_5rem_5rem_6rem] gap-2 text-xs font-semibold text-gray-400">
            <span>Coupure</span>
            <span className="text-right">Quantité</span>
            <span className="text-right">Abîmés</span>
            <span className="text-right">Montant</span>
          </div>
          {bills.map((d) => (
            <Row key={keyOf(d)} d={d} />
          ))}
          {bills.length > 0 && coins.length > 0 && <hr className="border-gray-200" />}
          {coins.map((d) => (
            <Row key={keyOf(d)} d={d} />
          ))}
          {denominations.length === 0 && <p className="text-sm text-gray-500">Aucune coupure active pour cette devise.</p>}
        </div>
      ) : (
        <Field label="Montant compté" required>
          <input
            inputMode="numeric"
            value={draft.totalAmount ? draft.totalAmount : ""}
            onChange={(e) => set({ totalAmount: parseDigits(e.target.value) })}
            className={`${FIELD_SOFT} tabular-nums`}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Total compté</p>
        <p className="text-xl font-bold tabular-nums text-gray-950">{money(total)}</p>
        {variance !== null && (
          <p className={`w-full text-sm font-semibold ${variance === 0 ? "text-emerald-700" : "text-red-600"}`}>
            {variance === 0 ? "Aucun écart" : `Écart de ${variance > 0 ? "+" : ""}${money(variance)} par rapport à l'attendu`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showKeptFloat && (
          <Field label="Fonds conservé en caisse" hint="Le reste est à remettre">
            <input inputMode="numeric" value={draft.keptFloat ? draft.keptFloat : ""} onChange={(e) => set({ keptFloat: parseDigits(e.target.value) })} className={`${FIELD_SOFT} tabular-nums`} />
          </Field>
        )}
        {showSecondCounter && (
          <Field label="Second compteur (e-mail)">
            <input type="email" value={draft.secondCounterEmail} onChange={(e) => set({ secondCounterEmail: e.target.value })} className={FIELD_SOFT} />
          </Field>
        )}
        {showWitness && (
          <Field label="Témoin (e-mail)">
            <input type="email" value={draft.witnessEmail} onChange={(e) => set({ witnessEmail: e.target.value })} className={FIELD_SOFT} />
          </Field>
        )}
        {showVariance && reasons.length > 0 && (
          <Field label="Motif de l'écart">
            <select value={draft.varianceReasonCode} onChange={(e) => set({ varianceReasonCode: e.target.value })} className={FIELD_SOFT}>
              <option value="">Aucun</option>
              {reasons.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showVariance && (
          <Field label={reasons.length > 0 ? "Précision sur l'écart" : "Motif de l'écart"} className={reasons.length > 0 ? "" : "sm:col-span-2"}>
            <input value={draft.varianceReasonText} onChange={(e) => set({ varianceReasonText: e.target.value })} className={FIELD_SOFT} />
          </Field>
        )}
        <Field label="Note" className="sm:col-span-2">
          <input value={draft.note} onChange={(e) => set({ note: e.target.value })} className={FIELD_SOFT} />
        </Field>
      </div>
    </div>
  );
};
