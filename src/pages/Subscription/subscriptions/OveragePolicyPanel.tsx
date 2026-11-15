import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm, Switch } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { OVERAGE_MODE_LABELS } from "../../../components/subscription/labels";

interface Props {
  planVersionId: string;
  onDone: () => void;
  onCancel: () => void;
}

type Mode = "BLOCK" | "BILLABLE" | "ALLOW_UNBILLED";

/** Formulaire déplié dans l'onglet Overage : crée une règle de dépassement pour la version du plan. */
export const OveragePolicyPanel: React.FC<Props> = ({ planVersionId, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [entitlementCode, setEntitlementCode] = useState("");
  const [mode, setMode] = useState<Mode>("BILLABLE");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [freeQuantity, setFreeQuantity] = useState("");
  const [active, setActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createOveragePolicy({
        planVersionId,
        entitlementCode,
        mode,
        unitPrice: mode === "BILLABLE" && unitPrice ? parseFloat(unitPrice) : undefined,
        currency: mode === "BILLABLE" ? currency : undefined,
        freeQuantity: freeQuantity ? parseFloat(freeQuantity) : undefined,
        active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overage-policies", planVersionId] });
      toast.success("Règle de dépassement créée");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de la création de la règle.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entitlementCode) {
      setErrorMessage("Veuillez sélectionner un droit.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  return (
    <PanelForm
      title="Nouvelle règle de dépassement"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={createMutation.isPending}
      submitLabel="Créer la règle"
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Droit" required>
          <select
            value={entitlementCode}
            onChange={(e) => setEntitlementCode(e.target.value)}
            required
            className={FIELD_SOFT}
          >
            <option value="">Sélectionner un droit</option>
            {entDefs.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mode" required>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className={FIELD_SOFT}
          >
            {Object.entries(OVERAGE_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {mode === "BILLABLE" && (
          <>
            <Field label="Prix unitaire">
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Devise">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={FIELD_SOFT}
              >
                <option value="XAF">XAF (FCFA)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Quantité gratuite" hint="Franchise avant que la règle s'applique">
          <input
            type="number"
            min="0"
            value={freeQuantity}
            onChange={(e) => setFreeQuantity(e.target.value)}
            className={FIELD_SOFT}
          />
        </Field>
        <div className="self-end">
          <Switch checked={active} onChange={setActive} label="Règle active" />
        </div>
      </div>
    </PanelForm>
  );
};
