import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Promotion } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPromotion: Promotion | null;
  onSuccess: () => void;
}

// NOTE : FREE_TRIAL_DAYS non exposé — le backend le rejette dans cette version (doc)
const discountTypes = [
  { value: "PERCENTAGE", label: "Pourcentage (%)" },
  { value: "FIXED_AMOUNT", label: "Montant fixe (FCFA)" },
  { value: "FREE_ENTITLEMENT", label: "Droit gratuit" },
  { value: "WAIVE_SETUP_FEE", label: "Frais d'installation offerts" },
];

const buildDefaultFormData = (promo: Promotion | null) => ({
  name: promo?.name ?? "",
  description: promo?.description ?? "",
  discountType: promo?.discountType ?? "PERCENTAGE",
  discountValue: promo?.discountValue ?? 0,
  // FIX : startsAt/endsAt peuvent être des datetime ISO — on tronque à la date
  startsAt:
    promo?.startsAt?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  endsAt: promo?.endsAt?.split("T")[0] ?? "",
  maxRedemptions: promo?.maxRedemptions?.toString() ?? "",
  metadataJson: promo?.metadataJson ?? "",
});

export const PromotionFormModal: React.FC<PromotionFormModalProps> = ({
  isOpen,
  onClose,
  editingPromotion,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(editingPromotion),
  );

  // Resynchronisation à chaque changement de promotion ou d'ouverture
  useEffect(() => {
    setFormData(buildDefaultFormData(editingPromotion));
    setErrorMessage(null);
  }, [editingPromotion, isOpen]);

  // Validation JSON metadata inline
  const isMetadataJsonValid =
    !formData.metadataJson.trim() ||
    (() => {
      try {
        JSON.parse(formData.metadataJson);
        return true;
      } catch {
        return false;
      }
    })();

  // FIX : le backend génère `code` — on ne l'envoie jamais dans le payload
  const buildPayload = () => ({
    name: formData.name,
    description: formData.description || undefined,
    discountType: formData.discountType as Promotion["discountType"],
    discountValue: parseFloat(String(formData.discountValue)) || 0,
    // FIX : startsAt est required dans le service (type string, pas string | undefined)
    // formData.startsAt est toujours initialisé avec la date du jour donc jamais vide
    startsAt: `${formData.startsAt}T00:00:00Z`,
    endsAt: formData.endsAt ? `${formData.endsAt}T23:59:59Z` : undefined,
    maxRedemptions: formData.maxRedemptions
      ? parseInt(formData.maxRedemptions)
      : undefined,
    metadataJson:
      formData.metadataJson.trim() && isMetadataJsonValid
        ? formData.metadataJson
        : undefined,
  });

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPromotion(buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "Erreur lors de la création de la promotion.";
      setErrorMessage(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      subscriptionService.updatePromotion(
        editingPromotion!.code,
        buildPayload(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "Erreur lors de la mise à jour de la promotion.";
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMetadataJsonValid) {
      setErrorMessage("Le JSON des métadonnées est invalide.");
      return;
    }
    setErrorMessage(null);
    if (editingPromotion) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingPromotion ? "Modifier la promotion" : "Nouvelle promotion"}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
            {errorMessage}
          </div>
        )}

        {/* FIX : code affiché en lecture seule en mode édition */}
        {editingPromotion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={editingPromotion.code}
              readOnly
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de réduction *
            </label>
            <select
              value={formData.discountType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountType: e.target.value as Promotion["discountType"],
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            >
              {discountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valeur *
              {formData.discountType === "PERCENTAGE"
                ? " (%)"
                : formData.discountType === "FIXED_AMOUNT"
                  ? " (FCFA)"
                  : ""}
            </label>
            <input
              type="number"
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountValue: parseFloat(e.target.value) || 0,
                })
              }
              required
              min="0"
              step={formData.discountType === "PERCENTAGE" ? "0.1" : "100"}
              max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début *
            </label>
            <input
              type="date"
              value={formData.startsAt}
              onChange={(e) =>
                setFormData({ ...formData, startsAt: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={formData.endsAt}
              onChange={(e) =>
                setFormData({ ...formData, endsAt: e.target.value })
              }
              min={formData.startsAt}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre max d'utilisations
          </label>
          <input
            type="number"
            value={formData.maxRedemptions}
            onChange={(e) =>
              setFormData({ ...formData, maxRedemptions: e.target.value })
            }
            min="1"
            placeholder="Illimité"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Métadonnées (JSON)
          </label>
          <textarea
            value={formData.metadataJson}
            onChange={(e) =>
              setFormData({ ...formData, metadataJson: e.target.value })
            }
            placeholder='{"internal_note": "Promotion spéciale Q1", "campaign": "2026"}'
            rows={2}
            className={`w-full px-3 py-2 border rounded-lg font-mono text-sm resize-none ${
              formData.metadataJson && !isMetadataJsonValid
                ? "border-red-300 bg-red-50"
                : "border-gray-200"
            }`}
          />
          {formData.metadataJson && !isMetadataJsonValid && (
            <p className="text-xs text-red-500 mt-1">JSON invalide</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-slate-50/80 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !isMetadataJsonValid}
            className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : editingPromotion ? (
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
