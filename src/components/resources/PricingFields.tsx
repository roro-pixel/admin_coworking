import React from "react";
import { CheckField, Field } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import type { AdjustmentType, ResourceBookingUnit, ResourcePricingRuleRequest, ResourcePricingRuleResponse } from "../../services/resource.service";
import { ADJUSTMENTS, ADJ_LABEL, DAYS, DAY_LABEL, UNITS, UNIT_LABEL, hhmm } from "./resKit";

export interface PricingForm {
  bookingUnit: ResourceBookingUnit;
  price: number;
  label: string;
  dayOfWeek: number; // 0 = tous les jours, 1..7 = lundi..dimanche
  startsAt: string; // HH:mm
  endsAt: string;
  adjustmentType: "" | AdjustmentType;
  adjustmentValue: number;
  lastMinuteMinutes: string;
  priority: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
}

export const PRICING_DEFAULTS: PricingForm = {
  bookingUnit: "HOUR",
  price: 0,
  label: "",
  dayOfWeek: 0,
  startsAt: "",
  endsAt: "",
  adjustmentType: "",
  adjustmentValue: 0,
  lastMinuteMinutes: "",
  priority: 0,
  validFrom: "",
  validUntil: "",
  active: true,
};

/** Le serveur renvoie le jour en toutes lettres (MONDAY) ou en nombre */
export const toDayNumber = (value?: string | number | null): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return DAYS.indexOf(String(value).toUpperCase() as (typeof DAYS)[number]) + 1;
};

export const ruleToForm = (rule: ResourcePricingRuleResponse): PricingForm => ({
  bookingUnit: rule.bookingUnit,
  price: rule.price,
  label: rule.label ?? "",
  dayOfWeek: toDayNumber(rule.dayOfWeek),
  startsAt: hhmm(rule.startsAt),
  endsAt: hhmm(rule.endsAt),
  adjustmentType: (rule.adjustmentType ?? "") as "" | AdjustmentType,
  adjustmentValue: rule.adjustmentValue ?? 0,
  lastMinuteMinutes: rule.lastMinuteMinutes?.toString() ?? "",
  priority: rule.priority ?? 0,
  validFrom: rule.validFrom?.slice(0, 10) ?? "",
  validUntil: rule.validUntil?.slice(0, 10) ?? "",
  active: rule.active,
});

export const pricingError = (f: PricingForm): string | null => {
  if (f.price <= 0) return "Le prix doit être supérieur à 0.";
  if (f.startsAt && f.endsAt && f.endsAt <= f.startsAt) return "L'heure de fin doit être après l'heure de début.";
  if (f.validFrom && f.validUntil && f.validUntil < f.validFrom) return "La fin de validité doit être après son début.";
  return null;
};

const sec = (t: string) => (t ? `${t}:00` : undefined);

/** En modification, un champ vidé est envoyé à null pour pouvoir effacer une valeur existante */
export const pricingPayload = (f: PricingForm, mode: "create" | "update"): Omit<ResourcePricingRuleRequest, "resourceCode"> => {
  const empty = mode === "update" ? null : undefined;
  return {
    bookingUnit: f.bookingUnit,
    price: Number(f.price) || 0,
    label: f.label.trim() || undefined,
    dayOfWeek: f.dayOfWeek > 0 ? f.dayOfWeek : empty,
    startsAt: sec(f.startsAt) ?? empty,
    endsAt: sec(f.endsAt) ?? empty,
    adjustmentType: f.adjustmentType || empty,
    adjustmentValue: f.adjustmentType ? Number(f.adjustmentValue) || 0 : empty,
    lastMinuteMinutes: f.lastMinuteMinutes ? Number(f.lastMinuteMinutes) : null,
    priority: Number(f.priority) || 0,
    validFrom: f.validFrom || empty,
    validUntil: f.validUntil || empty,
    active: f.active,
  };
};

interface Props {
  value: PricingForm;
  onChange: (patch: Partial<PricingForm>) => void;
}

/** Champs d'une règle de prix: communs à la création, à la modification et à la pose groupée */
export const PricingFields: React.FC<Props> = ({ value: f, onChange: set }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Unité de réservation" required>
        <select value={f.bookingUnit} onChange={(e) => set({ bookingUnit: e.target.value as ResourceBookingUnit })} className={FIELD}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prix (FCFA)" required>
        <input type="number" min={1} value={f.price || ""} onChange={(e) => set({ price: Number(e.target.value) || 0 })} className={FIELD} />
      </Field>
      <Field label="Libellé" className="sm:col-span-2">
        <input value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="Ex. Week-end, matin, dernière minute" className={FIELD} />
      </Field>
    </div>

    <p className="pt-1 text-sm font-bold text-gray-900">Quand la règle s'applique</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Jour">
        <select value={f.dayOfWeek} onChange={(e) => set({ dayOfWeek: Number(e.target.value) })} className={FIELD}>
          <option value={0}>Tous les jours</option>
          {DAYS.map((d, i) => (
            <option key={d} value={i + 1}>
              {DAY_LABEL[d]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Priorité" hint="La règle de priorité la plus haute l'emporte.">
        <input type="number" min={0} value={f.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} className={FIELD} />
      </Field>
      <Field label="Heure de début">
        <input type="time" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Heure de fin">
        <input type="time" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Valide à partir du">
        <input type="date" value={f.validFrom} onChange={(e) => set({ validFrom: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Valide jusqu'au">
        <input type="date" value={f.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className={FIELD} />
      </Field>
    </div>

    <p className="pt-1 text-sm font-bold text-gray-900">Ajustement du prix</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Type d'ajustement">
        <select value={f.adjustmentType} onChange={(e) => set({ adjustmentType: e.target.value as "" | AdjustmentType })} className={FIELD}>
          <option value="">Aucun ajustement</option>
          {ADJUSTMENTS.map((a) => (
            <option key={a} value={a}>
              {ADJ_LABEL[a]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={f.adjustmentType === "PERCENT_DELTA" ? "Valeur (%)" : f.adjustmentType === "AMOUNT_DELTA" ? "Valeur (FCFA)" : "Valeur"}>
        <input type="number" value={f.adjustmentValue} disabled={!f.adjustmentType} onChange={(e) => set({ adjustmentValue: Number(e.target.value) })} className={`${FIELD} disabled:opacity-50`} />
      </Field>
      <Field label="Dernière minute (minutes avant le début)" hint="Laisser vide si la règle ne dépend pas du délai.">
        <input type="number" min={0} value={f.lastMinuteMinutes} onChange={(e) => set({ lastMinuteMinutes: e.target.value })} placeholder="Ex. 60" className={FIELD} />
      </Field>
      <div className="self-end">
        <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Règle active" />
      </div>
    </div>
  </>
);
