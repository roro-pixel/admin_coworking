import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PassPlanResponse,
  PassTargetAudience,
  PassType,
} from "../../../services/subscription.service";

interface PassPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlan: PassPlanResponse | null;
  onSuccess: (plan?: PassPlanResponse) => void;
}

const passTypes: { value: PassType; label: string }[] = [
  { value: "DAY_PASS", label: "Pass journée" },
  { value: "TIME_PACK", label: "Pack heures" },
  { value: "VISITOR_PASS", label: "Pass visiteur" },
  { value: "MEETING_ROOM_PACK", label: "Pack salle de réunion" },
  { value: "PROMOTIONAL_PASS", label: "Pass promotionnel" },
  { value: "SUBSCRIPTION_PASS", label: "Pass souscription" },
  { value: "COMPANY_SHARED_PASS", label: "Pass entreprise partagé" },
  { value: "CUSTOM", label: "Personnalisé" },
];

const audiences: { value: PassTargetAudience; label: string }[] = [
  { value: "INDIVIDUAL", label: "Particuliers" },
  { value: "COMPANY", label: "Entreprises" },
  { value: "BOTH", label: "Les deux" },
];

const buildDefaultForm = (plan: PassPlanResponse | null) => ({
  name: plan?.name || "",
  description: plan?.description || "",
  passType: (plan?.passType || "DAY_PASS") as PassType,
  targetAudience: (plan?.targetAudience || "INDIVIDUAL") as PassTargetAudience,
  visible: plan?.visible ?? true,
  sortOrder: plan?.sortOrder ?? 0,
  requiredKycLevel: plan?.requiredKycLevel ?? 1,
});

export const PassPlanFormModal: React.FC<PassPlanFormModalProps> = ({
  isOpen,
  onClose,
  editingPlan,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildDefaultForm(editingPlan));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildDefaultForm(editingPlan));
    setErrorMessage(null);
  }, [editingPlan, isOpen]);

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPassPlan(form),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
      onSuccess(plan);
    },
    onError: (e: any) =>
      setErrorMessage(
        e?.response?.data?.message || "Erreur création plan de pass.",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      subscriptionService.updatePassPlan(editingPlan!.code, form),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["pass-plan", editingPlan?.code],
      });
      onSuccess(plan);
    },
    onError: (e: any) =>
      setErrorMessage(
        e?.response?.data?.message || "Erreur modification plan de pass.",
      ),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingPlan) updateMutation.mutate();
    else createMutation.mutate();
  };

  if (!isOpen) return null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ModalPortal onClose={onClose} size="xl">
      <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {editingPlan ? "Modifier le plan" : "Nouveau plan de pass"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Définissez le catalogue commercial visible ou non côté portail.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {errorMessage && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {editingPlan && (
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Code
            </p>
            <p className="mt-1 font-mono text-sm text-gray-800">
              {editingPlan.code}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Nom *
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Type *
            </span>
            <select
              value={form.passType}
              onChange={(e) =>
                setForm({ ...form, passType: e.target.value as PassType })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {passTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Audience *
            </span>
            <select
              value={form.targetAudience}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetAudience: e.target.value as PassTargetAudience,
                })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {audiences.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </span>
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Ordre affichage
            </span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Niveau KYC requis
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
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setForm({ ...form, visible: !form.visible })}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${form.visible ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}
        >
          {form.visible
            ? "Visible dans le catalogue client"
            : "Masqué du catalogue client"}
        </button>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="mx-auto animate-spin" />
            ) : editingPlan ? (
              "Mettre à jour"
            ) : (
              "Créer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
