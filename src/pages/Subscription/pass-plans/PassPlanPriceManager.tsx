import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassPlanPriceResponse } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { ActionButton, Field, ItemRow, Section, Tag } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";

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
      subscriptionService.upsertPassPlanPrice(versionId, { ...form, taxCode: form.taxCode || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan-prices", versionId] });
      toast.success("Prix enregistré");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'enregistrement du prix.")),
  });

  const prices = data as PassPlanPriceResponse[];

  return (
    <Section title="Prix" description="Un prix par devise : l'enregistrement crée ou met à jour le prix." icon={DollarSign}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Devise">
            <input
              value={form.currency}
              maxLength={3}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className={FIELD}
              placeholder="XAF"
            />
          </Field>
          <Field label="Montant">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
              className={FIELD}
            />
          </Field>
          <Field label="Frais d'activation">
            <input
              type="number"
              value={form.setupFee}
              onChange={(e) => setForm({ ...form, setupFee: Number(e.target.value) || 0 })}
              className={FIELD}
            />
          </Field>
          <Field label="Caution">
            <input
              type="number"
              value={form.depositAmount}
              onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) || 0 })}
              className={FIELD}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
            <input
              type="checkbox"
              checked={form.taxIncluded}
              onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })}
              className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
            />
            Prix TTC
          </label>
          <ActionButton type="submit" icon={Plus} pending={mutation.isPending}>
            Enregistrer le prix
          </ActionButton>
        </div>
      </form>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {isLoading
          ? [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)
          : prices.map((p) => (
              <ItemRow key={p.id}>
                <p className="font-bold text-gray-950">{formatMoney(p.amount, p.currency)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Activation {p.setupFee ?? 0} · Caution {p.depositAmount ?? 0}
                </p>
                <p className="mt-2">
                  <Tag tone={p.taxIncluded ? "pink" : "gray"}>{p.taxIncluded ? "TTC" : "HT"}</Tag>
                </p>
              </ItemRow>
            ))}
      </div>
      {!isLoading && prices.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500">Aucun prix défini pour cette version.</p>
      )}
    </Section>
  );
};
