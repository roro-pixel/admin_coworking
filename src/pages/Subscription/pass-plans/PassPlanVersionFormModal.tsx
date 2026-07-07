import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassDurationUnit } from "../../../services/subscription.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planCode: string;
  onSuccess: () => void;
}
const durationUnits: { value: PassDurationUnit; label: string }[] = [
  { value: "DAY", label: "Jour(s)" },
  { value: "WEEK", label: "Semaine(s)" },
  { value: "MONTH", label: "Mois" },
  { value: "YEAR", label: "Année(s)" },
];

export const PassPlanVersionFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  planCode,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: 1,
    durationUnit: "MONTH" as PassDurationUnit,
    maxUses: "",
    autoRenewable: false,
    requiredKycLevel: 1,
    effectiveFrom: "",
    effectiveTo: "",
    termsJson: "",
  });
  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createPassPlanVersion(planCode, {
        name: form.name,
        description: form.description || undefined,
        duration: Number(form.duration) || 1,
        durationUnit: form.durationUnit,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        autoRenewable: form.autoRenewable,
        requiredKycLevel: Number(form.requiredKycLevel) || 0,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
        termsJson: form.termsJson || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pass-plan-versions", planCode],
      });
      onSuccess();
    },
    onError: (e: any) =>
      setErrorMessage(e?.response?.data?.message || "Erreur création version."),
  });
  if (!isOpen) return null;
  return (
    <ModalPortal onClose={onClose} size="xl">
      <div className="sticky top-0 z-10 flex justify-between rounded-t-2xl border-b bg-white/95 px-6 py-4 backdrop-blur">
        <div>
          <h3 className="text-xl font-bold">Nouvelle version</h3>
          <p className="text-sm text-gray-500">
            Durée, usage, KYC et conditions du plan.
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMessage(null);
          createMutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        {errorMessage && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Nom *
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Durée *
            </span>
            <input
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) =>
                setForm({ ...form, duration: Number(e.target.value) || 1 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Unité *
            </span>
            <select
              value={form.durationUnit}
              onChange={(e) =>
                setForm({
                  ...form,
                  durationUnit: e.target.value as PassDurationUnit,
                })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            >
              {durationUnits.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Max usages
            </span>
            <input
              type="number"
              min={0}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Illimité"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Niveau KYC
            </span>
            <input
              type="number"
              min={0}
              value={form.requiredKycLevel}
              onChange={(e) =>
                setForm({
                  ...form,
                  requiredKycLevel: Number(e.target.value) || 0,
                })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Valide dès
            </span>
            <input
              type="date"
              value={form.effectiveFrom}
              onChange={(e) =>
                setForm({ ...form, effectiveFrom: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Valide jusqu'à
            </span>
            <input
              type="date"
              value={form.effectiveTo}
              onChange={(e) =>
                setForm({ ...form, effectiveTo: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Conditions JSON
            </span>
            <textarea
              rows={3}
              value={form.termsJson}
              onChange={(e) => setForm({ ...form, termsJson: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.autoRenewable}
            onChange={(e) =>
              setForm({ ...form, autoRenewable: e.target.checked })
            }
          />{" "}
          Version renouvelable automatiquement
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2.5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-white"
          >
            {createMutation.isPending ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : (
              "Créer la version"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
