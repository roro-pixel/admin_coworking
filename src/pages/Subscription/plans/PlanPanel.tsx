import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { PLAN_TYPE_LABELS, TARGET_AUDIENCE_LABELS } from "../../../components/subscription/labels";

interface Props {
  /** Plan à modifier ; absent = création */
  editingPlan?: Plan | null;
  onDone: () => void;
  onCancel: () => void;
}

/** Formulaire déplié (création ou modification d'un plan), remplace PlanFormModal. */
export const PlanPanel: React.FC<Props> = ({ editingPlan, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: editingPlan?.name ?? "",
    description: editingPlan?.description ?? "",
    planType: editingPlan?.planType ?? "MEMBERSHIP",
    targetAudience: editingPlan?.targetAudience ?? "BOTH",
    visible: editingPlan?.visible ?? false,
    sortOrder: editingPlan?.sortOrder ?? 0,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    if (editingPlan) {
      queryClient.invalidateQueries({ queryKey: ["subscription-plan-detail", editingPlan.code] });
    }
  };

  // Le code n'est jamais envoyé à la création (généré par le backend)
  const saveMutation = useMutation({
    mutationFn: () =>
      editingPlan
        ? subscriptionService.updatePlan(editingPlan.code, {
            name: form.name,
            description: form.description || undefined,
            planType: form.planType as Plan["planType"],
            targetAudience: form.targetAudience as Plan["targetAudience"],
            visible: form.visible,
            sortOrder: form.sortOrder,
          })
        : subscriptionService.createPlan({
            name: form.name,
            description: form.description || undefined,
            planType: form.planType,
            targetAudience: form.targetAudience,
            visible: form.visible,
            sortOrder: form.sortOrder,
          }),
    onSuccess: () => {
      invalidate();
      toast.success(editingPlan ? "Plan mis à jour" : "Plan créé");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(
        apiMessage(
          error,
          editingPlan ? "Erreur lors de la mise à jour du plan." : "Erreur lors de la création du plan.",
        ),
      ),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    saveMutation.mutate();
  };

  return (
    <PanelForm
      title={editingPlan ? `Modifier « ${editingPlan.name} »` : "Nouveau plan"}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={saveMutation.isPending}
      submitLabel={editingPlan ? "Enregistrer" : "Créer le plan"}
      submitDisabled={!form.name.trim()}
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nom" required>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            placeholder="Ex. Cowork Pro"
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Ordre d'affichage">
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Type de plan" required>
          <select
            value={form.planType}
            onChange={(e) => set("planType", e.target.value as Plan["planType"])}
            className={FIELD_SOFT}
          >
            {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Public cible" required>
          <select
            value={form.targetAudience}
            onChange={(e) => set("targetAudience", e.target.value as Plan["targetAudience"])}
            className={FIELD_SOFT}
          >
            {Object.entries(TARGET_AUDIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={FIELD_SOFT}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Switch
            checked={form.visible}
            onChange={(v) => set("visible", v)}
            label="Visible dans le catalogue"
          />
        </div>
      </div>
    </PanelForm>
  );
};
