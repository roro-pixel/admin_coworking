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

const CHANGE_TYPES = [
  { value: "UPGRADE", label: "Upgrade" },
  { value: "DOWNGRADE", label: "Downgrade" },
  { value: "ADD_ADDON", label: "Ajouter un add-on" },
  { value: "REMOVE_ADDON", label: "Retirer un add-on" },
  { value: "QUANTITY_CHANGE", label: "Changement de quantité" },
];

const effectivePolicies = [
  { value: "IMMEDIATE", label: "Immédiat" },
  { value: "NEXT_BILLING_PERIOD", label: "Prochain cycle de facturation" },
  { value: "CUSTOM_DATE", label: "Date personnalisée" },
];

/** Remplace CreateChangeModal : formulaire déplié dans l'onglet Changements. */
export const ChangePanel: React.FC<Props> = ({ subscriptionNumber, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState("UPGRADE");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [targetPlanVersionId, setTargetPlanVersionId] = useState("");
  const [effectivePolicy, setEffectivePolicy] = useState("NEXT_BILLING_PERIOD");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [prorationAmount, setProrationAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("ADMIN");
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

  const needsVersion = ["UPGRADE", "DOWNGRADE"].includes(changeType);

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createChange(subscriptionNumber, {
        changeType: changeType as "UPGRADE" | "DOWNGRADE" | "ADD_ADDON" | "REMOVE_ADDON" | "QUANTITY_CHANGE",
        targetPlanVersionId: targetPlanVersionId || undefined,
        effectivePolicy: effectivePolicy as "IMMEDIATE" | "NEXT_BILLING_PERIOD" | "CUSTOM_DATE",
        effectiveDate: effectivePolicy === "CUSTOM_DATE" && effectiveDate ? effectiveDate : undefined,
        prorationAmount,
        reason: reason || undefined,
        requestedBy: requestedBy || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-changes", subscriptionNumber] });
      toast.success("Changement demandé");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de la création du changement.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsVersion && !targetPlanVersionId) {
      setErrorMessage("Veuillez sélectionner une version cible.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  return (
    <PanelForm
      title="Demander un changement"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={createMutation.isPending}
      submitLabel="Créer le changement"
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Type de changement" required>
          <select
            value={changeType}
            onChange={(e) => {
              setChangeType(e.target.value);
              setTargetPlanVersionId("");
              setSelectedPlanCode("");
            }}
            className={FIELD_SOFT}
          >
            {CHANGE_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Politique d'effet" required>
          <select
            value={effectivePolicy}
            onChange={(e) => setEffectivePolicy(e.target.value)}
            className={FIELD_SOFT}
          >
            {effectivePolicies.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        {effectivePolicy === "CUSTOM_DATE" && (
          <Field label="Date effective" required>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              className={FIELD_SOFT}
            />
          </Field>
        )}

        {needsVersion && (
          <>
            <Field label="Plan cible" required>
              <select
                value={selectedPlanCode}
                onChange={(e) => {
                  setSelectedPlanCode(e.target.value);
                  setTargetPlanVersionId("");
                }}
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
              <Field label={versionsLoading ? "Version cible (chargement)" : "Version cible"} required>
                <select
                  value={targetPlanVersionId}
                  onChange={(e) => setTargetPlanVersionId(e.target.value)}
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
          </>
        )}

        <Field label="Montant prorata (FCFA)">
          <input
            type="number"
            min="0"
            value={prorationAmount}
            onChange={(e) => setProrationAmount(parseFloat(e.target.value) || 0)}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Demandé par">
          <input
            type="text"
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Raison" className="md:col-span-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Motif du changement..."
            className={`${FIELD_SOFT} resize-none`}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
