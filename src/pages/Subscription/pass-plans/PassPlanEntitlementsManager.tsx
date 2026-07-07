import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  EntitlementDefinition,
  PassPlanEntitlementResponse,
} from "../../../services/subscription.service";

interface Props {
  versionId: number;
}
export const PassPlanEntitlementsManager: React.FC<Props> = ({ versionId }) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    entitlementCode: "",
    quantity: 1,
    unlimited: false,
    rolloverAllowed: false,
    rolloverLimit: "",
    validForDays: "",
    priority: 100,
  });
  const { data = [], isLoading } = useQuery({
    queryKey: ["pass-plan-entitlements", versionId],
    queryFn: () => subscriptionService.getPassPlanEntitlements(versionId),
    enabled: !!versionId,
  });
  const { data: definitions = [] } = useQuery({
    queryKey: ["entitlement-definitions-basic", query],
    queryFn: () =>
      query
        ? subscriptionService.searchEntitlementDefinitions(query)
        : Promise.resolve([]),
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
      queryClient.invalidateQueries({
        queryKey: ["pass-plan-entitlements", versionId],
      });
      setForm({
        entitlementCode: "",
        quantity: 1,
        unlimited: false,
        rolloverAllowed: false,
        rolloverLimit: "",
        validForDays: "",
        priority: 100,
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      subscriptionService.deletePassPlanEntitlement(versionId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["pass-plan-entitlements", versionId],
      }),
  });
  const entitlements = data as PassPlanEntitlementResponse[];
  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div>
        <h3 className="text-lg font-semibold text-gray-950">Entitlements</h3>
        <p className="text-sm text-gray-500">
          Droits accordés automatiquement à l'achat du pass.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Rechercher une définition..."
        />
        <select
          value={form.entitlementCode}
          onChange={(e) =>
            setForm({ ...form, entitlementCode: e.target.value })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Sélectionner un droit</option>
          {(definitions as EntitlementDefinition[]).map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => addMutation.mutate()}
          disabled={!form.entitlementCode || addMutation.isPending}
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {addMutation.isPending ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Plus size={16} />
          )}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <input
          type="number"
          value={form.quantity}
          onChange={(e) =>
            setForm({ ...form, quantity: Number(e.target.value) || 0 })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Quantité"
          disabled={form.unlimited}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.unlimited}
            onChange={(e) => setForm({ ...form, unlimited: e.target.checked })}
          />{" "}
          Illimité
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.rolloverAllowed}
            onChange={(e) =>
              setForm({ ...form, rolloverAllowed: e.target.checked })
            }
          />{" "}
          Report
        </label>
        <input
          value={form.rolloverLimit}
          onChange={(e) => setForm({ ...form, rolloverLimit: e.target.value })}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Limite report"
        />
        <input
          value={form.validForDays}
          onChange={(e) => setForm({ ...form, validForDays: e.target.value })}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Validité jours"
        />
        <input
          type="number"
          value={form.priority}
          onChange={(e) =>
            setForm({ ...form, priority: Number(e.target.value) || 100 })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Priorité"
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {entitlements.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-2xl bg-gray-50 p-4"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-gray-900">
                  {e.entitlementCode}
                </p>
                <p className="text-xs text-gray-500">
                  {e.unlimited ? "Illimité" : e.quantity} · Priorité{" "}
                  {e.priority ?? 100}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(e.id)}
                className="rounded-xl p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
