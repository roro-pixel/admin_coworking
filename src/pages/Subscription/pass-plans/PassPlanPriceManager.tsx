import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassPlanPriceResponse } from "../../../services/subscription.service";

interface Props {
  versionId: number;
}
export const PassPlanPriceManager: React.FC<Props> = ({ versionId }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    currency: "XAF",
    amount: 0,
    setupFee: 0,
    depositAmount: 0,
    taxIncluded: true,
    taxCode: "",
  });
  const { data = [], isLoading } = useQuery({
    queryKey: ["pass-plan-prices", versionId],
    queryFn: () => subscriptionService.getPassPlanPrices(versionId),
    enabled: !!versionId,
  });
  const mutation = useMutation({
    mutationFn: () =>
      subscriptionService.upsertPassPlanPrice(versionId, {
        ...form,
        taxCode: form.taxCode || null,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["pass-plan-prices", versionId],
      }),
  });
  const prices = data as PassPlanPriceResponse[];
  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div>
        <h3 className="text-lg font-semibold text-gray-950">Prix</h3>
        <p className="text-sm text-gray-500">
          Un prix par devise. L'appel crée ou met à jour le prix.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="grid grid-cols-1 gap-3 md:grid-cols-6"
      >
        <input
          value={form.currency}
          maxLength={3}
          onChange={(e) =>
            setForm({ ...form, currency: e.target.value.toUpperCase() })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="XAF"
        />
        <input
          type="number"
          value={form.amount}
          onChange={(e) =>
            setForm({ ...form, amount: Number(e.target.value) || 0 })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Montant"
        />
        <input
          type="number"
          value={form.setupFee}
          onChange={(e) =>
            setForm({ ...form, setupFee: Number(e.target.value) || 0 })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Setup"
        />
        <input
          type="number"
          value={form.depositAmount}
          onChange={(e) =>
            setForm({ ...form, depositAmount: Number(e.target.value) || 0 })
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="Caution"
        />
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={form.taxIncluded}
            onChange={(e) =>
              setForm({ ...form, taxIncluded: e.target.checked })
            }
          />{" "}
          TTC
        </label>
        <button
          disabled={mutation.isPending}
          className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white"
        >
          {mutation.isPending ? (
            <Loader2 className="mx-auto animate-spin" size={16} />
          ) : (
            <>
              <Plus size={16} className="inline" /> Prix
            </>
          )}
        </button>
      </form>
      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {prices.map((p) => (
            <div key={p.id} className="rounded-2xl bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                {p.amount.toLocaleString("fr-FR")} {p.currency}
              </p>
              <p className="text-xs text-gray-500">
                Setup {p.setupFee ?? 0} · Caution {p.depositAmount ?? 0} ·{" "}
                {p.taxIncluded ? "TTC" : "HT"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
