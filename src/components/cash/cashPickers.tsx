import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashRegisterListItem } from "../../services/cashRegister.service";
import { Field } from "../subscription/kit";
import { FIELD_SOFT } from "../subscription/kitUtils";

/** Caisses actives (jusqu'à 200) pour les sélecteurs. */
export function useRegisters(onlyActive = true) {
  return useQuery({
    queryKey: ["cash-registers-select", onlyActive],
    queryFn: async () => (await cashRegisterService.listRegisters({ active: onlyActive ? true : undefined, size: 200 })).content,
    staleTime: 120_000,
  });
}

export const RegisterSelect: React.FC<{
  value: string;
  onChange: (code: string) => void;
  label?: string;
  required?: boolean;
  emptyLabel?: string;
  filter?: (r: CashRegisterListItem) => boolean;
  hint?: string;
}> = ({ value, onChange, label = "Caisse", required, emptyLabel = "Choisir une caisse", filter, hint }) => {
  const q = useRegisters();
  const list = (q.data ?? []).filter((r) => (filter ? filter(r) : true));
  return (
    <Field label={label} required={required} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_SOFT}>
        <option value="">{emptyLabel}</option>
        {list.map((r) => (
          <option key={r.registerCode} value={r.registerCode}>
            {r.name} · {r.registerCode}
          </option>
        ))}
      </select>
    </Field>
  );
};

/** Coupures de la devise (billets et pièces en cours). */
export function useDenominations(currency = "XAF") {
  return useQuery({ queryKey: ["cash-denominations", currency], queryFn: () => cashRegisterService.getDenominations(currency), staleTime: 300_000 });
}
