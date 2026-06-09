import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourcePricingRuleResponse,
  ResourceBookingUnit,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

interface PricingRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule: ResourcePricingRuleResponse | null;
  onSuccess: () => void;
}

const bookingUnits: { value: ResourceBookingUnit; label: string }[] = [
  { value: "HOUR", label: "Heure" },
  { value: "HALF_DAY", label: "Demi-journée" },
  { value: "DAY", label: "Jour" },
  { value: "WEEK", label: "Semaine" },
  { value: "MONTH", label: "Mois" },
];

const adjustmentTypes = [
  { value: "FIXED_PRICE", label: "Prix fixe" },
  { value: "AMOUNT_DELTA", label: "Montant delta (±FCFA)" },
  { value: "PERCENT_DELTA", label: "Pourcentage delta (±%)" },
];

const daysOfWeek = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

const buildDefaultFormData = (rule: ResourcePricingRuleResponse | null) => ({
  resourceCode: rule?.resourceCode || "",
  bookingUnit: (rule?.bookingUnit || "HOUR") as ResourceBookingUnit,
  price: rule?.price ?? 0,
  label: rule?.label || "",
  dayOfWeek: rule?.dayOfWeek ?? 0,
  startsAt: rule?.startsAt || "",
  endsAt: rule?.endsAt || "",
  adjustmentType: (rule?.adjustmentType || "") as
    | ""
    | "FIXED_PRICE"
    | "AMOUNT_DELTA"
    | "PERCENT_DELTA",
  adjustmentValue: rule?.adjustmentValue ?? 0,
  lastMinuteMinutes: rule?.lastMinuteMinutes ?? null,
  priority: rule?.priority ?? 0,
  validFrom: rule?.validFrom || "",
  validUntil: rule?.validUntil || "",
  active: rule?.active ?? true,
});

export const PricingRuleFormModal: React.FC<PricingRuleFormModalProps> = ({
  isOpen,
  onClose,
  editingRule,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(editingRule),
  );

  // CORRECTION : resynchronisation à chaque ouverture ou changement de règle
  useEffect(() => {
    setFormData(buildDefaultFormData(editingRule));
    setErrorMessage(null);
  }, [editingRule, isOpen]);

  const [selectedResourceSummary, setSelectedResourceSummary] =
    useState<ResourceSummaryResponse | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createPricingRule({
        resourceCode: formData.resourceCode,
        bookingUnit: formData.bookingUnit,
        price: parseFloat(String(formData.price)) || 0,
        label: formData.label || undefined,
        dayOfWeek: formData.dayOfWeek > 0 ? formData.dayOfWeek : undefined,
        startsAt: formData.startsAt || undefined,
        endsAt: formData.endsAt || undefined,
        adjustmentType: formData.adjustmentType || undefined,
        adjustmentValue: formData.adjustmentValue || undefined,
        lastMinuteMinutes: formData.lastMinuteMinutes,
        priority: formData.priority || undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création de la règle.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      resourceService.updatePricingRule(editingRule!.id, {
        bookingUnit: formData.bookingUnit,
        price: parseFloat(String(formData.price)) || 0,
        label: formData.label || undefined,
        dayOfWeek: formData.dayOfWeek > 0 ? formData.dayOfWeek : undefined,
        startsAt: formData.startsAt || undefined,
        endsAt: formData.endsAt || undefined,
        adjustmentType: formData.adjustmentType || undefined,
        adjustmentValue: formData.adjustmentValue || undefined,
        lastMinuteMinutes: formData.lastMinuteMinutes,
        priority: formData.priority || undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la mise à jour de la règle.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price <= 0) {
      setErrorMessage("Le prix doit être supérieur à 0.");
      return;
    }
    setErrorMessage(null);
    if (editingRule) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  // CORRECTION : suppression du double overlay
  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingRule ? "Modifier la règle" : "Nouvelle règle de tarification"}
        </h3>
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
            Ressource *
          </label>
          <ResourceAutocomplete
            selectedResource={selectedResourceSummary}
            selectedCode={formData.resourceCode}
            onSelect={(resource) => {
              setSelectedResourceSummary(resource);
              setFormData({ ...formData, resourceCode: resource?.code || "" });
            }}
            placeholder="Rechercher une ressource..."
            required
          />
          {false && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Chargement des
              ressources...
            </p>
          )}
          {editingRule && (
            <p className="text-xs text-gray-400 mt-1">
              La ressource ne peut pas être modifiée
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unité de réservation *
          </label>
          <select
            value={formData.bookingUnit}
            onChange={(e) =>
              setFormData({
                ...formData,
                bookingUnit: e.target.value as ResourceBookingUnit,
              })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            {bookingUnits.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix (FCFA) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.price === 0 ? "" : formData.price}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setFormData({
                ...formData,
                price: val === "" ? 0 : parseFloat(val),
              });
            }}
            required
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        {/* === Champs MD 2.5 : tarification dynamique === */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            placeholder="ex: Off-peak matin, Weekend, Last minute..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jour de la semaine
            </label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) =>
                setFormData({ ...formData, dayOfWeek: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value={0}>Tous les jours</option>
              {daysOfWeek.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: Number(e.target.value) || 0,
                })
              }
              min="0"
              placeholder="0 = plus bas"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heure début
            </label>
            <input
              type="time"
              value={formData.startsAt}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startsAt: e.target.value ? e.target.value + ":00" : "",
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heure fin
            </label>
            <input
              type="time"
              value={formData.endsAt}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endsAt: e.target.value ? e.target.value + ":00" : "",
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type d'ajustement
          </label>
          <select
            value={formData.adjustmentType}
            onChange={(e) =>
              setFormData({
                ...formData,
                adjustmentType: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">Aucun ajustement</option>
            {adjustmentTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {formData.adjustmentType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valeur d'ajustement{" "}
              {formData.adjustmentType === "PERCENT_DELTA" ? "(%)" : "(FCFA)"}
            </label>
            <input
              type="number"
              value={formData.adjustmentValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  adjustmentValue: Number(e.target.value),
                })
              }
              placeholder={
                formData.adjustmentType === "PERCENT_DELTA"
                  ? "-20 = -20%"
                  : "-5000 = -5000 FCFA"
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valide du
            </label>
            <input
              type="date"
              value={formData.validFrom}
              onChange={(e) =>
                setFormData({ ...formData, validFrom: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valide jusqu'au
            </label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) =>
                setFormData({ ...formData, validUntil: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last minute (minutes avant réservation)
          </label>
          <input
            type="number"
            value={formData.lastMinuteMinutes ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                lastMinuteMinutes: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
            placeholder="ex: 60 = applicable si réservé < 1h avant"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) =>
              setFormData({ ...formData, active: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm">Actif</span>
        </label>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !formData.resourceCode}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : editingRule ? (
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
