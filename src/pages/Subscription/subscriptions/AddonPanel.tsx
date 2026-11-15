import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan, PlanVersion } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  subscriptionNumber: string;
  onDone: () => void;
  onCancel: () => void;
}

/** Remplace CreateAddonModal : formulaire déplié dans l'onglet Add-ons. */
export const AddonPanel: React.FC<Props> = ({ subscriptionNumber, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [planVersionId, setPlanVersionId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split("T")[0]);
  const [endsAt, setEndsAt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: () => subscriptionService.getPlans({ status: "ACTIVE", size: 100 }),
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", selectedPlanCode],
    queryFn: () => subscriptionService.getPlanVersions(selectedPlanCode),
    enabled: !!selectedPlanCode,
  });

  const plans: Plan[] = plansData?.content ?? [];
  const versions: PlanVersion[] = versionsData ?? [];
  const activeVersions = versions.filter((v) => v.status === "ACTIVE");

  const addMutation = useMutation({
    mutationFn: () =>
      subscriptionService.addAddon(subscriptionNumber, {
        planVersionId,
        quantity,
        startsAt,
        endsAt: endsAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-addons", subscriptionNumber] });
      toast.success("Add-on ajouté");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de l'ajout de l'add-on.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planVersionId) {
      setErrorMessage("Veuillez sélectionner une version de plan.");
      return;
    }
    setErrorMessage(null);
    addMutation.mutate();
  };

  return (
    <PanelForm
      title="Ajouter un add-on"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={addMutation.isPending}
      submitLabel="Ajouter"
      submitDisabled={!planVersionId}
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Plan" required>
          <select
            value={selectedPlanCode}
            onChange={(e) => {
              setSelectedPlanCode(e.target.value);
              setPlanVersionId("");
            }}
            required
            className={FIELD_SOFT}
          >
            <option value="">Sélectionner un plan</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        {selectedPlanCode && (
          <Field label={versionsLoading ? "Version (chargement)" : "Version"} required>
            <select
              value={planVersionId}
              onChange={(e) => setPlanVersionId(e.target.value)}
              required
              disabled={versionsLoading}
              className={FIELD_SOFT}
            >
              <option value="">Sélectionner une version</option>
              {activeVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Quantité" required>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            required
            className={FIELD_SOFT}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Début" required>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className={FIELD_SOFT}
            />
          </Field>
          <Field label="Fin">
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={startsAt}
              className={FIELD_SOFT}
            />
          </Field>
        </div>
      </div>
    </PanelForm>
  );
};
