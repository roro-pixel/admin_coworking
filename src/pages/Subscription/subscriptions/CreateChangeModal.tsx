import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan, PlanVersion } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface CreateChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string;
  onSuccess: () => void;
}

const changeTypes = [
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

export const CreateChangeModal: React.FC<CreateChangeModalProps> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  onSuccess,
}) => {
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

  useEffect(() => {
    if (isOpen) {
      setChangeType("UPGRADE");
      setSelectedPlanCode("");
      setTargetPlanVersionId("");
      setEffectivePolicy("NEXT_BILLING_PERIOD");
      setEffectiveDate("");
      setProrationAmount(0);
      setReason("");
      setRequestedBy("ADMIN");
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

  const needsVersion = ["UPGRADE", "DOWNGRADE"].includes(changeType);

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createChange(subscriptionNumber, {
        changeType: changeType as any,
        targetPlanVersionId: targetPlanVersionId || undefined,
        effectivePolicy: effectivePolicy as any,
        effectiveDate:
          effectivePolicy === "CUSTOM_DATE" && effectiveDate
            ? effectiveDate
            : undefined,
        prorationAmount,
        reason: reason || undefined,
        requestedBy: requestedBy || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-changes", subscriptionNumber],
      });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ??
          "Erreur lors de la création du changement.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Demander un changement</h3>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de changement *
            </label>
            <select
              value={changeType}
              onChange={(e) => {
                setChangeType(e.target.value);
                setTargetPlanVersionId("");
                setSelectedPlanCode("");
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {changeTypes.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Politique d'effet *
            </label>
            <select
              value={effectivePolicy}
              onChange={(e) => setEffectivePolicy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {effectivePolicies.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {effectivePolicy === "CUSTOM_DATE" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date effective *
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}

        {/* Sélection plan + version si upgrade/downgrade */}
        {needsVersion && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan cible *
              </label>
              <select
                value={selectedPlanCode}
                onChange={(e) => {
                  setSelectedPlanCode(e.target.value);
                  setTargetPlanVersionId("");
                }}
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
                  Version cible *
                  {versionsLoading && (
                    <span className="text-xs text-gray-400 ml-2">
                      Chargement...
                    </span>
                  )}
                </label>
                <select
                  value={targetPlanVersionId}
                  onChange={(e) => setTargetPlanVersionId(e.target.value)}
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
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant prorata (FCFA)
            </label>
            <input
              type="number"
              min="0"
              value={prorationAmount}
              onChange={(e) =>
                setProrationAmount(parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Demandé par
            </label>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Raison
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Motif du changement..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Création...
              </>
            ) : (
              "Créer le changement"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
