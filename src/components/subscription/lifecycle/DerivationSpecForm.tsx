import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { DerivationReason, DerivationRenewalBehaviour, DerivationSpecRequest } from "../../../services/subscriptionDerivation.service";
import { ActionButton, CheckField, Field, IconButton } from "../kit";
import { FIELD_SOFT } from "../kitUtils";
import { DERIVATION_REASONS, RENEWAL_BEHAVIOURS } from "./lifecycleLabels";

/** État du formulaire : tout en chaînes, converti en requête par buildSpec. */
export interface DerivationSpecState {
  price: string;
  setupFee: string;
  trialDays: string;
  commitmentMonths: string;
  quantities: { code: string; quantity: string }[];
  unlimited: string;
  benefits: string;
  reason: DerivationReason;
  reasonDetails: string;
  effectiveFrom: string;
  effectiveTo: string;
  renewalBehaviour: DerivationRenewalBehaviour;
  revertAfterPeriods: string;
  promotionsAllowed: boolean;
}

export const emptySpecState = (): DerivationSpecState => ({
  price: "",
  setupFee: "",
  trialDays: "",
  commitmentMonths: "",
  quantities: [],
  unlimited: "",
  benefits: "",
  reason: "NEGOTIATION",
  reasonDetails: "",
  effectiveFrom: "",
  effectiveTo: "",
  renewalBehaviour: "KEEP",
  revertAfterPeriods: "",
  promotionsAllowed: true,
});

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));
const list = (s: string): string[] => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/** Convertit l'état du formulaire en requête : les champs vides sont omis (le catalogue s'applique). */
export const buildSpec = (s: DerivationSpecState): DerivationSpecRequest => {
  const quantities: Record<string, number> = {};
  s.quantities.forEach((q) => {
    if (q.code.trim() && q.quantity.trim() !== "") quantities[q.code.trim()] = Number(q.quantity);
  });
  return {
    price: num(s.price),
    setupFee: num(s.setupFee),
    trialDays: num(s.trialDays),
    commitmentMonths: num(s.commitmentMonths),
    entitlementQuantities: Object.keys(quantities).length ? quantities : undefined,
    unlimitedEntitlements: list(s.unlimited).length ? list(s.unlimited) : undefined,
    includedBenefits: list(s.benefits).length ? list(s.benefits) : undefined,
    reason: s.reason,
    reasonDetails: s.reasonDetails.trim() || undefined,
    effectiveFrom: s.effectiveFrom || null,
    effectiveTo: s.effectiveTo || null,
    renewalBehaviour: s.renewalBehaviour,
    revertAfterPeriods: s.renewalBehaviour === "REVERT_AFTER_PERIODS" ? num(s.revertAfterPeriods) : null,
    promotionsAllowed: s.promotionsAllowed,
  };
};

/** Au moins une valeur à faire différer du catalogue, et les champs conditionnels remplis. */
export const specIsValid = (s: DerivationSpecState): boolean => {
  const differs =
    s.price.trim() !== "" ||
    s.setupFee.trim() !== "" ||
    s.trialDays.trim() !== "" ||
    s.commitmentMonths.trim() !== "" ||
    s.quantities.some((q) => q.code.trim() && q.quantity.trim() !== "") ||
    list(s.unlimited).length > 0 ||
    list(s.benefits).length > 0;
  const revertOk = s.renewalBehaviour !== "REVERT_AFTER_PERIODS" || Number(s.revertAfterPeriods) > 0;
  return differs && revertOk;
};

/**
 * Champs d'une dérivation (prix, droits, avantages, durée de validité, comportement au renouvellement).
 * Les champs laissés vides gardent la valeur du catalogue.
 */
export const DerivationSpecForm: React.FC<{
  value: DerivationSpecState;
  onChange: (v: DerivationSpecState) => void;
  currency?: string;
}> = ({ value, onChange, currency = "FCFA" }) => {
  const set = (patch: Partial<DerivationSpecState>) => onChange({ ...value, ...patch });
  const defs = useQuery({
    queryKey: ["entitlement-definitions", "codes"],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Laissez vide ce qui doit rester identique au catalogue.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`Prix par période (${currency})`}>
          <input type="number" min={0} value={value.price} onChange={(e) => set({ price: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label={`Frais de mise en service (${currency})`}>
          <input type="number" min={0} value={value.setupFee} onChange={(e) => set({ setupFee: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label="Jours d'essai">
          <input type="number" min={0} value={value.trialDays} onChange={(e) => set({ trialDays: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label="Engagement (mois)">
          <input type="number" min={0} value={value.commitmentMonths} onChange={(e) => set({ commitmentMonths: e.target.value })} className={FIELD_SOFT} />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-600">Quantités de droits</p>
        <datalist id="derivation-entitlement-codes">
          {(defs.data?.content ?? []).map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </datalist>
        <div className="space-y-2">
          {value.quantities.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                list="derivation-entitlement-codes"
                value={q.code}
                onChange={(e) => set({ quantities: value.quantities.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)) })}
                placeholder="Code du droit"
                aria-label="Code du droit"
                className={`${FIELD_SOFT} font-mono`}
              />
              <input
                type="number"
                min={0}
                value={q.quantity}
                onChange={(e) => set({ quantities: value.quantities.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)) })}
                placeholder="Quantité"
                aria-label="Quantité"
                className={`${FIELD_SOFT} w-32 shrink-0`}
              />
              <IconButton icon={X} label="Retirer ce droit" tone="danger" onClick={() => set({ quantities: value.quantities.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <ActionButton variant="ghost" icon={Plus} onClick={() => set({ quantities: [...value.quantities, { code: "", quantity: "" }] })}>
            Ajouter un droit
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Droits illimités" hint="Codes séparés par des virgules.">
          <input value={value.unlimited} onChange={(e) => set({ unlimited: e.target.value })} placeholder="PRINT, WIFI" className={`${FIELD_SOFT} font-mono`} />
        </Field>
        <Field label="Avantages inclus" hint="Un par ligne ou séparés par des virgules.">
          <input value={value.benefits} onChange={(e) => set({ benefits: e.target.value })} placeholder="Casier, Café offert" className={FIELD_SOFT} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Raison" required>
          <select value={value.reason} onChange={(e) => set({ reason: e.target.value as DerivationReason })} className={FIELD_SOFT}>
            {DERIVATION_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Détail de la raison">
          <input value={value.reasonDetails} onChange={(e) => set({ reasonDetails: e.target.value })} placeholder="Accord du 12/09" className={FIELD_SOFT} />
        </Field>
        <Field label="Valable à partir du" hint="Vide : dès maintenant.">
          <input type="date" value={value.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label="Valable jusqu'au" hint="Vide : sans limite.">
          <input type="date" value={value.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} className={FIELD_SOFT} />
        </Field>
      </div>

      <Field label="Au renouvellement" hint={RENEWAL_BEHAVIOURS.find((r) => r.value === value.renewalBehaviour)?.hint}>
        <select value={value.renewalBehaviour} onChange={(e) => set({ renewalBehaviour: e.target.value as DerivationRenewalBehaviour })} className={FIELD_SOFT}>
          {RENEWAL_BEHAVIOURS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      {value.renewalBehaviour === "REVERT_AFTER_PERIODS" && (
        <Field label="Nombre de périodes avant le retour au catalogue" required>
          <input type="number" min={1} value={value.revertAfterPeriods} onChange={(e) => set({ revertAfterPeriods: e.target.value })} className={FIELD_SOFT} />
        </Field>
      )}
      <CheckField checked={value.promotionsAllowed} onChange={(v) => set({ promotionsAllowed: v })} label="Autoriser le cumul avec les promotions" />
    </div>
  );
};
