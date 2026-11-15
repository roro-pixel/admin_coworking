import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PassPlanResponse,
  PassPlanVersionResponse,
  PassSubscriberType,
} from "../../../services/subscription.service";
import { Field, PanelForm, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  plan: PassPlanResponse;
  onDone: (passNumber: string) => void;
  onCancel: () => void;
}

const OWNER_TYPES: { value: PassSubscriberType; label: string }[] = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BUSINESS_ENTITY", label: "Entité commerciale" },
];

/** Formulaire déplié d'achat d'un pass depuis un plan, remplace PurchasePassModal. */
export const PurchasePassPanel: React.FC<Props> = ({ plan, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    ownerType: "MEMBER" as PassSubscriberType,
    ownerCode: "",
    planVersionId: "",
    currency: "XAF",
    validFrom: "",
    autoRenew: false,
    metadataJson: "",
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["pass-plan-versions", plan.code],
    queryFn: () => subscriptionService.getPassPlanVersions(plan.code),
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      subscriptionService.purchasePassPlan(plan.code, {
        ownerType: form.ownerType,
        ownerCode: form.ownerCode,
        planVersionId: form.planVersionId ? Number(form.planVersionId) : null,
        currency: form.currency || null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        autoRenew: form.autoRenew,
        metadataJson: form.metadataJson || null,
      }),
    onSuccess: (pass) => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      onDone(pass.passNumber);
    },
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur achat pass.")),
  });

  return (
    <PanelForm
      title={`Acheter un pass · ${plan.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        setErrorMessage(null);
        purchaseMutation.mutate();
      }}
      onCancel={onCancel}
      pending={purchaseMutation.isPending}
      submitLabel="Acheter / générer le pass"
      submitDisabled={!form.ownerCode.trim()}
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Type titulaire">
          <select
            value={form.ownerType}
            onChange={(e) => setForm({ ...form, ownerType: e.target.value as PassSubscriberType })}
            className={FIELD_SOFT}
          >
            {OWNER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Code titulaire" required>
          <input
            required
            value={form.ownerCode}
            onChange={(e) => setForm({ ...form, ownerCode: e.target.value })}
            placeholder="MBR-00045 / CLI-..."
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Version">
          <select
            value={form.planVersionId}
            onChange={(e) => setForm({ ...form, planVersionId: e.target.value })}
            className={FIELD_SOFT}
          >
            <option value="">Dernière version active</option>
            {(versions as PassPlanVersionResponse[]).map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} · {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Devise">
          <input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Valide dès">
          <input
            type="datetime-local"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            className={FIELD_SOFT}
          />
        </Field>
        <div className="self-end">
          <Switch
            checked={form.autoRenew}
            onChange={(v) => setForm({ ...form, autoRenew: v })}
            label="Renouvellement automatique"
          />
        </div>
        <div className="md:col-span-2">
          <Field label="Métadonnées JSON">
            <textarea
              rows={3}
              value={form.metadataJson}
              onChange={(e) => setForm({ ...form, metadataJson: e.target.value })}
              className={`${FIELD_SOFT} font-mono text-xs`}
            />
          </Field>
        </div>
      </div>
    </PanelForm>
  );
};
