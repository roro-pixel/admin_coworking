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
  /** Jours de la règle (1 = lundi … 7 = dimanche), vide = tous les jours ; remplace dayOfWeek */
  days: number[];
  customerSegment: string;
  planCode: string;
  minParticipants: string;
  maxParticipants: string;
  minDurationMinutes: string;
  maxDurationMinutes: string;
  minLeadMinutes: string;
  channel: string;
  holidayMode: string;
  stackable: boolean;
  perParticipant: boolean;
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
  days: [],
  customerSegment: "",
  planCode: "",
  minParticipants: "",
  maxParticipants: "",
  minDurationMinutes: "",
  maxDurationMinutes: "",
  minLeadMinutes: "",
  channel: "",
  holidayMode: "",
  stackable: false,
  perParticipant: false,
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
  days: rule.daysOfWeek
    ? String(rule.daysOfWeek).split(",").map((d) => Number(d.trim())).filter((d) => d >= 1 && d <= 7)
    : toDayNumber(rule.dayOfWeek) > 0
      ? [toDayNumber(rule.dayOfWeek)]
      : [],
  customerSegment: rule.customerSegment ?? "",
  planCode: rule.planCode ?? "",
  minParticipants: rule.minParticipants?.toString() ?? "",
  maxParticipants: rule.maxParticipants?.toString() ?? "",
  minDurationMinutes: rule.minDurationMinutes?.toString() ?? "",
  maxDurationMinutes: rule.maxDurationMinutes?.toString() ?? "",
  minLeadMinutes: rule.minLeadMinutes?.toString() ?? "",
  channel: rule.channel ?? "",
  holidayMode: rule.holidayMode ?? "",
  stackable: !!rule.stackable,
  perParticipant: !!rule.perParticipant,
});

export const pricingError = (f: PricingForm): string | null => {
  if (f.price <= 0 && !f.adjustmentType) return "Le prix doit être supérieur à 0.";
  if (f.adjustmentType && !Number.isFinite(Number(f.adjustmentValue))) return "La valeur de l'ajustement est obligatoire.";
  const n = (v: string) => (v === "" ? null : Number(v));
  if (n(f.minParticipants) !== null && n(f.maxParticipants) !== null && Number(f.minParticipants) > Number(f.maxParticipants)) return "Le minimum de participants dépasse le maximum.";
  if (n(f.minDurationMinutes) !== null && n(f.maxDurationMinutes) !== null && Number(f.minDurationMinutes) > Number(f.maxDurationMinutes)) return "La durée minimale dépasse la durée maximale.";
  if (f.startsAt && f.endsAt && f.endsAt <= f.startsAt) return "L'heure de fin doit être après l'heure de début.";
  if (f.validFrom && f.validUntil && f.validUntil < f.validFrom) return "La fin de validité doit être après son début.";
  return null;
};

const sec = (t: string) => (t ? `${t}:00` : undefined);

/**
 * En création, un champ vide est omis. En modification (PUT partiel), un champ vidé est
 * listé dans `clear` : c'est ainsi que le serveur efface une condition (lot R7).
 * `extended: false` (pose groupée) n'envoie que les conditions acceptées par la route /bulk.
 */
export const pricingPayload = (
  f: PricingForm,
  mode: "create" | "update",
  extended = true,
): Omit<ResourcePricingRuleRequest, "resourceCode"> & { clear?: string[] } => {
  const clear: string[] = [];
  const text = (name: string, v: string) => {
    if (v.trim()) return v.trim();
    clear.push(name);
    return undefined;
  };
  const num = (name: string, v: string) => {
    if (v !== "") return Number(v);
    clear.push(name);
    return undefined;
  };
  const base: Omit<ResourcePricingRuleRequest, "resourceCode"> = {
    bookingUnit: f.bookingUnit,
    price: Number(f.price) || 0,
    label: f.label.trim() || undefined,
    startsAt: text("startsAt", f.startsAt) ? sec(f.startsAt) : undefined,
    endsAt: text("endsAt", f.endsAt) ? sec(f.endsAt) : undefined,
    adjustmentType: f.adjustmentType || undefined,
    adjustmentValue: f.adjustmentType ? Number(f.adjustmentValue) || 0 : undefined,
    lastMinuteMinutes: num("lastMinuteMinutes", f.lastMinuteMinutes),
    priority: Number(f.priority) || 0,
    validFrom: text("validFrom", f.validFrom),
    validUntil: text("validUntil", f.validUntil),
    active: f.active,
  };
  if (!f.adjustmentType) clear.push("adjustment");
  if (!extended) {
    base.dayOfWeek = f.dayOfWeek > 0 ? f.dayOfWeek : undefined;
    return base;
  }
  const days = [...f.days].sort((a, b) => a - b).join(",");
  if (!days) clear.push("daysOfWeek", "dayOfWeek");
  const out = {
    ...base,
    daysOfWeek: days || undefined,
    customerSegment: text("customerSegment", f.customerSegment),
    planCode: text("planCode", f.customerSegment === "SUBSCRIBER" ? f.planCode : ""),
    minParticipants: num("minParticipants", f.minParticipants),
    maxParticipants: num("maxParticipants", f.maxParticipants),
    minDurationMinutes: num("minDurationMinutes", f.minDurationMinutes),
    maxDurationMinutes: num("maxDurationMinutes", f.maxDurationMinutes),
    minLeadMinutes: num("minLeadMinutes", f.minLeadMinutes),
    channel: text("channel", f.channel),
    holidayMode: text("holidayMode", f.holidayMode),
    stackable: f.stackable,
    perParticipant: f.perParticipant,
  };
  return mode === "update" ? { ...out, clear: Array.from(new Set(clear)) } : out;
};

interface Props {
  value: PricingForm;
  onChange: (patch: Partial<PricingForm>) => void;
  /** false pour la pose groupée : la route /bulk n'accepte que les conditions de base */
  extended?: boolean;
}

export const SEGMENTS: Record<string, string> = { PUBLIC: "Client hors membre", MEMBER: "Membre", SUBSCRIBER: "Abonné", COMPANY: "Entreprise", PARTNER: "Partenaire" };
export const CHANNELS: Record<string, string> = { PORTAL: "Portail (espace client)", TEAM: "Back-office (équipe)" };
export const HOLIDAY_MODES: Record<string, string> = { ONLY: "Jours fériés seulement", EXCLUDED: "Hors jours fériés" };

/** Champs d'une règle de prix: communs à la création, à la modification et à la pose groupée */
export const PricingFields: React.FC<Props> = ({ value: f, onChange: set, extended = true }) => (
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
      {extended ? (
        <Field label="Jours" hint="Aucun jour coché : tous les jours." className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = f.days.includes(i + 1);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ days: on ? f.days.filter((x) => x !== i + 1) : [...f.days, i + 1] })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {DAY_LABEL[d]}
                </button>
              );
            })}
          </div>
        </Field>
      ) : (
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
      )}
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
    {extended && (
      <>
        <p className="pt-1 text-sm font-bold text-gray-900">Clientèle et réservation</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Segment de clientèle">
            <select value={f.customerSegment} onChange={(e) => set({ customerSegment: e.target.value })} className={FIELD}>
              <option value="">Tous</option>
              {Object.entries(SEGMENTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan d'abonnement" hint={f.customerSegment === "SUBSCRIBER" ? "Facultatif : un plan précis." : "Réservé au segment Abonné."}>
            <input value={f.planCode} disabled={f.customerSegment !== "SUBSCRIBER"} onChange={(e) => set({ planCode: e.target.value })} className={`${FIELD} disabled:opacity-50`} />
          </Field>
          <Field label="Canal">
            <select value={f.channel} onChange={(e) => set({ channel: e.target.value })} className={FIELD}>
              <option value="">Tous</option>
              {Object.entries(CHANNELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jours fériés">
            <select value={f.holidayMode} onChange={(e) => set({ holidayMode: e.target.value })} className={FIELD}>
              <option value="">Tous les jours</option>
              {Object.entries(HOLIDAY_MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Participants (min)">
            <input type="number" min={1} value={f.minParticipants} onChange={(e) => set({ minParticipants: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Participants (max)">
            <input type="number" min={1} value={f.maxParticipants} onChange={(e) => set({ maxParticipants: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Durée minimale (minutes)">
            <input type="number" min={0} value={f.minDurationMinutes} onChange={(e) => set({ minDurationMinutes: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Durée maximale (minutes)">
            <input type="number" min={0} value={f.maxDurationMinutes} onChange={(e) => set({ maxDurationMinutes: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Réservation anticipée (minutes avant le début)" hint="La règle ne s'applique que si l'on réserve au moins ce délai à l'avance.">
            <input type="number" min={0} value={f.minLeadMinutes} onChange={(e) => set({ minLeadMinutes: e.target.value })} className={FIELD} />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckField checked={f.stackable} onChange={(v) => set({ stackable: v })} label="Cumulable avec les autres ajustements" />
          <CheckField checked={f.perParticipant} onChange={(v) => set({ perParticipant: v })} label="Prix par participant (même pour une salle entière)" />
        </div>
      </>
    )}
  </>
);
