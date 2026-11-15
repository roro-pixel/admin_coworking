import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tags } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  EntitlementDefinition,
  PassPlanEntitlementResponse,
} from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { ActionButton, Field, IconButton, ItemRow, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  versionId: number;
}

const emptyForm = {
  entitlementCode: "",
  quantity: 1,
  unlimited: false,
  rolloverAllowed: false,
  rolloverLimit: "",
  validForDays: "",
  priority: 100,
};

export const PassPlanEntitlementsManager: React.FC<Props> = ({ versionId }) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["pass-plan-entitlements", versionId],
    queryFn: () => subscriptionService.getPassPlanEntitlements(versionId),
    enabled: !!versionId,
  });

  const { data: definitions = [] } = useQuery({
    queryKey: ["entitlement-definitions-basic", query],
    queryFn: () => (query ? subscriptionService.searchEntitlementDefinitions(query) : Promise.resolve([])),
    enabled: query.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      subscriptionService.addPassPlanEntitlement(versionId, {
        entitlementCode: form.entitlementCode,
        quantity: form.unlimited ? null : Number(form.quantity) || 0,
        unlimited: form.unlimited,
        rolloverAllowed: form.rolloverAllowed,
        rolloverLimit: form.rolloverLimit ? Number(form.rolloverLimit) : null,
        validForDays: form.validForDays ? Number(form.validForDays) : null,
        priority: Number(form.priority) || 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan-entitlements", versionId] });
      setForm(emptyForm);
      toast.success("Droit ajouté");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'ajout du droit.")),
  });

  // Suppression : toast de confirmation, l'erreur de l'API y est affichée
  const deleteMutation = useMutation({
    mutationFn: (id: number) => subscriptionService.deletePassPlanEntitlement(versionId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pass-plan-entitlements", versionId] }),
  });

  const askDelete = (e: PassPlanEntitlementResponse) =>
    toast.confirm({
      message: "Retirer ce droit de la version ?",
      detail: e.entitlementCode,
      confirmLabel: "Retirer",
      pendingLabel: "Retrait en cours",
      successMessage: "Droit retiré",
      errorMessage: "Le retrait a échoué",
      onConfirm: () => deleteMutation.mutateAsync(e.id),
    });

  const entitlements = data as PassPlanEntitlementResponse[];

  return (
    <Section
      title="Droits inclus"
      description="Droits accordés automatiquement à l'achat du pass."
      icon={Tags}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Rechercher une définition" hint="Saisissez au moins 2 caractères">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={FIELD}
              placeholder="Ex. salle, heures..."
            />
          </Field>
          <Field label="Droit">
            <select
              value={form.entitlementCode}
              onChange={(e) => setForm({ ...form, entitlementCode: e.target.value })}
              className={FIELD}
            >
              <option value="">Sélectionner un droit</option>
              {(definitions as EntitlementDefinition[]).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} · {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Quantité">
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })}
              disabled={form.unlimited}
              className={FIELD}
            />
          </Field>
          <Field label="Limite de report">
            <input
              value={form.rolloverLimit}
              onChange={(e) => setForm({ ...form, rolloverLimit: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label="Validité (jours)">
            <input
              value={form.validForDays}
              onChange={(e) => setForm({ ...form, validForDays: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label="Priorité">
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 100 })}
              className={FIELD}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
              <input
                type="checkbox"
                checked={form.unlimited}
                onChange={(e) => setForm({ ...form, unlimited: e.target.checked })}
                className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
              />
              Illimité
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
              <input
                type="checkbox"
                checked={form.rolloverAllowed}
                onChange={(e) => setForm({ ...form, rolloverAllowed: e.target.checked })}
                className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
              />
              Report autorisé
            </label>
          </div>
          <ActionButton
            icon={Plus}
            pending={addMutation.isPending}
            disabled={!form.entitlementCode}
            onClick={() => addMutation.mutate()}
          >
            Ajouter le droit
          </ActionButton>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          [0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)
        ) : entitlements.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">Aucun droit pour cette version.</p>
        ) : (
          entitlements.map((e) => (
            <ItemRow key={e.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-gray-900">{e.entitlementCode}</p>
                  <p className="text-xs text-gray-500">
                    {e.unlimited ? "Illimité" : e.quantity} · Priorité {e.priority ?? 100}
                  </p>
                </div>
                <IconButton
                  icon={Trash2}
                  label="Retirer ce droit"
                  tone="danger"
                  pending={deleteMutation.isPending && deleteMutation.variables === e.id}
                  onClick={() => askDelete(e)}
                />
              </div>
            </ItemRow>
          ))
        )}
      </div>
    </Section>
  );
};
