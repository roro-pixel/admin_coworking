import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  AdjustmentType,
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

const adjustmentTypes: { value: AdjustmentType; label: string }[] = [
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

const dateOnly = (value?: string | null) => value?.slice(0, 10) ?? "";
const timeOnly = (value?: string | null) => value?.slice(0, 5) ?? "";

const toDayNumber = (value?: string | number | null): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  const days: Record<string, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
  };

  return days[value.toUpperCase()] ?? 0;
};

const toTimePayload = (value: string) => {
  if (!value) return undefined;
  return value.length === 5 ? `${value}:00` : value;
};

const buildDefaultFormData = (rule: ResourcePricingRuleResponse | null) => ({
  resourceCode: rule?.resourceCode || "",
  bookingUnit: (rule?.bookingUnit || "HOUR") as ResourceBookingUnit,
  price: rule?.price ?? 0,
  label: rule?.label || "",
  dayOfWeek: toDayNumber(rule?.dayOfWeek),
  startsAt: timeOnly(rule?.startsAt),
  endsAt: timeOnly(rule?.endsAt),
  adjustmentType: (rule?.adjustmentType || "") as "" | AdjustmentType,
  adjustmentValue: rule?.adjustmentValue ?? 0,
  lastMinuteMinutes: rule?.lastMinuteMinutes?.toString() ?? "",
  priority: rule?.priority ?? 0,
  validFrom: dateOnly(rule?.validFrom),
  validUntil: dateOnly(rule?.validUntil),
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

  const [selectedResourceSummary, setSelectedResourceSummary] =
    useState<ResourceSummaryResponse | null>(null);

  useEffect(() => {
    setFormData(buildDefaultFormData(editingRule));
    setSelectedResourceSummary(null);
    setErrorMessage(null);
  }, [editingRule, isOpen]);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createPricingRule({
        resourceCode: formData.resourceCode,
        bookingUnit: formData.bookingUnit,
        price: parseFloat(String(formData.price)) || 0,
        label: formData.label || undefined,
        dayOfWeek:
          Number(formData.dayOfWeek) > 0
            ? Number(formData.dayOfWeek)
            : undefined,
        startsAt: toTimePayload(formData.startsAt),
        endsAt: toTimePayload(formData.endsAt),
        adjustmentType: formData.adjustmentType || undefined,
        adjustmentValue: formData.adjustmentType
          ? Number(formData.adjustmentValue) || 0
          : undefined,
        lastMinuteMinutes: formData.lastMinuteMinutes
          ? Number(formData.lastMinuteMinutes)
          : null,
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
        dayOfWeek:
          Number(formData.dayOfWeek) > 0
            ? Number(formData.dayOfWeek)
            : undefined,
        startsAt: toTimePayload(formData.startsAt),
        endsAt: toTimePayload(formData.endsAt),
        adjustmentType: formData.adjustmentType || undefined,
        adjustmentValue: formData.adjustmentType
          ? Number(formData.adjustmentValue) || 0
          : undefined,
        lastMinuteMinutes: formData.lastMinuteMinutes
          ? Number(formData.lastMinuteMinutes)
          : null,
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

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b bg-white p-4">
        <h3 className="text-xl font-bold">
          {editingRule ? "Modifier la règle" : "Nouvelle règle de tarification"}
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
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

          {editingRule && (
            <p className="mt-1 text-xs text-gray-400">
              La ressource ne peut pas être modifiée
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          >
            {bookingUnits.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Prix (FCFA) *
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={formData.price === 0 ? "" : formData.price}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setFormData({
                ...formData,
                price: value === "" ? 0 : parseFloat(value),
              });
            }}
            required
            placeholder="0"
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Label
          </label>

          <input
            type="text"
            value={formData.label}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            placeholder="ex: Off-peak matin, Weekend, Last minute..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jour de la semaine
            </label>

            <select
              value={formData.dayOfWeek}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dayOfWeek: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <option value={0}>Tous les jours</option>
              {daysOfWeek.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Heure début
            </label>

            <input
              type="time"
              value={formData.startsAt}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startsAt: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Heure fin
            </label>

            <input
              type="time"
              value={formData.endsAt}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endsAt: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Type d'ajustement
          </label>

          <select
            value={formData.adjustmentType}
            onChange={(e) =>
              setFormData({
                ...formData,
                adjustmentType: e.target.value as "" | AdjustmentType,
              })
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <option value="">Aucun ajustement</option>
            {adjustmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {formData.adjustmentType && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valide du
            </label>

            <input
              type="date"
              value={formData.validFrom}
              onChange={(e) =>
                setFormData({ ...formData, validFrom: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valide jusqu'au
            </label>

            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) =>
                setFormData({ ...formData, validUntil: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Last minute (minutes avant réservation)
          </label>

          <input
            type="number"
            value={formData.lastMinuteMinutes ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                lastMinuteMinutes: e.target.value,
              })
            }
            placeholder="ex: 60 = applicable si réservé < 1h avant"
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2">
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
            className="flex-1 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isPending || !formData.resourceCode}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
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
