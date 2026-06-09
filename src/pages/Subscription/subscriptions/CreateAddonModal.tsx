import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan, PlanVersion } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface CreateAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string;
  onSuccess: () => void;
}

export const CreateAddonModal: React.FC<CreateAddonModalProps> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [planVersionId, setPlanVersionId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endsAt, setEndsAt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlanCode("");
      setPlanVersionId("");
      setQuantity(1);
      setStartsAt(new Date().toISOString().split("T")[0]);
      setEndsAt("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: () =>
      subscriptionService.getPlans({ status: "ACTIVE", size: 100 }),
    enabled: isOpen,
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", selectedPlanCode],
    queryFn: () => subscriptionService.getPlanVersions(selectedPlanCode),
    enabled: isOpen && !!selectedPlanCode,
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
      queryClient.invalidateQueries({
        queryKey: ["subscription-addons", subscriptionNumber],
      });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ?? "Erreur lors de l'ajout de l'add-on.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Ajouter un add-on</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plan *
          </label>
          <select
            value={selectedPlanCode}
            onChange={(e) => {
              setSelectedPlanCode(e.target.value);
              setPlanVersionId("");
            }}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Sélectionner un plan</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPlanCode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version *
              {versionsLoading && (
                <span className="text-xs text-gray-400 ml-2">
                  Chargement...
                </span>
              )}
            </label>
            <select
              value={planVersionId}
              onChange={(e) => setPlanVersionId(e.target.value)}
              required
              disabled={versionsLoading}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Sélectionner une version</option>
              {activeVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} — {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantité *
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Début *
            </label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fin
            </label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={startsAt}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={addMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={addMutation.isPending || !planVersionId}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {addMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Ajout...
              </>
            ) : (
              "Ajouter"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
