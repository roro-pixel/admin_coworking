import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassDurationUnit } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  planCode: string;
  onDone: () => void;
  onCancel: () => void;
}

const DURATION_UNITS: { value: PassDurationUnit; label: string }[] = [
  { value: "DAY", label: "Jour(s)" },
  { value: "WEEK", label: "Semaine(s)" },
  { value: "MONTH", label: "Mois" },
  { value: "YEAR", label: "Année(s)" },
];

/** Formulaire déplié de création d'une version de plan de pass, remplace PassPlanVersionFormModal. */
export const PassPlanVersionPanel: React.FC<Props> = ({ planCode, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: 1,
    durationUnit: "MONTH" as PassDurationUnit,
    maxUses: "",
    autoRenewable: false,
    requiredKycLevel: 1,
    effectiveFrom: "",
    effectiveTo: "",
    termsJson: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createPassPlanVersion(planCode, {
        name: form.name,
        description: form.description || undefined,
        duration: Number(form.duration) || 1,
        durationUnit: form.durationUnit,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        autoRenewable: form.autoRenewable,
        requiredKycLevel: Number(form.requiredKycLevel) || 0,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
        termsJson: form.termsJson || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan-versions", planCode] });
      toast.success("Version créée");
      onDone();
    },
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur création version.")),
  });

  return (
    <PanelForm
      title="Nouvelle version"
      onSubmit={(e) => {
        e.preventDefault();
        setErrorMessage(null);
        createMutation.mutate();
      }}
      onCancel={onCancel}
      pending={createMutation.isPending}
      submitLabel="Créer la version"
      submitDisabled={!form.name.trim()}
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Nom" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={FIELD_SOFT}
            />
          </Field>
        </div>
        <Field label="Durée" required>
          <input
            type="number"
            min={1}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 1 })}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Unité">
          <select
            value={form.durationUnit}
            onChange={(e) => setForm({ ...form, durationUnit: e.target.value as PassDurationUnit })}
            className={FIELD_SOFT}
          >
            {DURATION_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Utilisations max">
          <input
            type="number"
            min={0}
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            placeholder="Illimité"
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Niveau KYC requis">
          <input
            type="number"
            min={0}
            value={form.requiredKycLevel}
            onChange={(e) => setForm({ ...form, requiredKycLevel: Number(e.target.value) || 0 })}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Effectif dès">
          <input
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Effectif jusqu'au">
          <input
            type="date"
            value={form.effectiveTo}
            onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
            className={FIELD_SOFT}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={FIELD_SOFT}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Conditions JSON">
            <textarea
              rows={3}
              value={form.termsJson}
              onChange={(e) => setForm({ ...form, termsJson: e.target.value })}
              className={`${FIELD_SOFT} font-mono text-xs`}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Switch
            checked={form.autoRenewable}
            onChange={(v) => setForm({ ...form, autoRenewable: v })}
            label="Version renouvelable automatiquement"
          />
        </div>
      </div>
    </PanelForm>
  );
};
