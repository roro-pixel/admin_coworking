import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PassPlanResponse,
  PassTargetAudience,
  PassType,
} from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { PASS_TYPE_LABELS } from "../../../components/subscription/labels";

interface Props {
  editingPlan?: PassPlanResponse | null;
  onDone: () => void;
  onCancel: () => void;
}

const AUDIENCES: { value: PassTargetAudience; label: string }[] = [
  { value: "INDIVIDUAL", label: "Particuliers" },
  { value: "COMPANY", label: "Entreprises" },
  { value: "BOTH", label: "Les deux" },
];

/** Formulaire déplié (création / modification d'un plan de pass), remplace PassPlanFormModal. */
export const PassPlanPanel: React.FC<Props> = ({ editingPlan, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: editingPlan?.name || "",
    description: editingPlan?.description || "",
    passType: (editingPlan?.passType || "DAY_PASS") as PassType,
    targetAudience: (editingPlan?.targetAudience || "INDIVIDUAL") as PassTargetAudience,
    visible: editingPlan?.visible ?? true,
    sortOrder: editingPlan?.sortOrder ?? 0,
    requiredKycLevel: editingPlan?.requiredKycLevel ?? 1,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingPlan
        ? subscriptionService.updatePassPlan(editingPlan.code, form)
        : subscriptionService.createPassPlan(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
      if (editingPlan) queryClient.invalidateQueries({ queryKey: ["pass-plan", editingPlan.code] });
      toast.success(editingPlan ? "Plan de pass mis à jour" : "Plan de pass créé");
      onDone();
    },
    onError: (e: unknown) =>
      setErrorMessage(
        apiMessage(e, editingPlan ? "Erreur modification plan de pass." : "Erreur création plan de pass."),
      ),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    saveMutation.mutate();
  };

  return (
    <PanelForm
      title={editingPlan ? `Modifier « ${editingPlan.name} »` : "Nouveau plan de pass"}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={saveMutation.isPending}
      submitLabel={editingPlan ? "Enregistrer" : "Créer le plan"}
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
        <Field label="Type de pass">
          <select
            value={form.passType}
            onChange={(e) => setForm({ ...form, passType: e.target.value as PassType })}
            className={FIELD_SOFT}
          >
            {Object.entries(PASS_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Public cible">
          <select
            value={form.targetAudience}
            onChange={(e) => setForm({ ...form, targetAudience: e.target.value as PassTargetAudience })}
            className={FIELD_SOFT}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
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
        <Field label="Ordre d'affichage">
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
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
        <div className="md:col-span-2">
          <Switch
            checked={form.visible}
            onChange={(v) => setForm({ ...form, visible: v })}
            label="Visible côté portail"
          />
        </div>
      </div>
    </PanelForm>
  );
};
