import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Loader2, Power, Save, X } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  AdjustmentType,
  ResourceBookingUnit,
  ResourcePricingRuleResponse,
} from "../../../services/resource.service";

const bookingUnitLabels: Record<ResourceBookingUnit, string> = {
  HOUR: "Heure",
  HALF_DAY: "Demi-journée",
  DAY: "Jour",
  WEEK: "Semaine",
  MONTH: "Mois",
};

const bookingUnits = Object.entries(bookingUnitLabels).map(
  ([value, label]) => ({
    value: value as ResourceBookingUnit,
    label,
  }),
);

const adjustmentLabels: Record<string, string> = {
  FIXED_PRICE: "Prix fixe",
  AMOUNT_DELTA: "Montant delta",
  PERCENT_DELTA: "Pourcentage delta",
};

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

const formatMoney = (value?: number) =>
  `${(value ?? 0).toLocaleString("fr-FR")} FCFA`;

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

const buildForm = (rule: ResourcePricingRuleResponse) => ({
  bookingUnit: rule.bookingUnit,
  price: rule.price,
  label: rule.label ?? "",
  dayOfWeek: toDayNumber(rule.dayOfWeek),
  startsAt: timeOnly(rule.startsAt),
  endsAt: timeOnly(rule.endsAt),
  adjustmentType: (rule.adjustmentType ?? "") as "" | AdjustmentType,
  adjustmentValue: rule.adjustmentValue ?? 0,
  lastMinuteMinutes: rule.lastMinuteMinutes?.toString() ?? "",
  priority: rule.priority ?? 0,
  validFrom: dateOnly(rule.validFrom),
  validUntil: dateOnly(rule.validUntil),
  active: rule.active,
});

export const PricingRuleDetailPage: React.FC = () => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id = Number(ruleId);

  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReturnType<typeof buildForm> | null>(
    null,
  );

  const {
    data: rule,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["resource-pricing-rule", id],
    queryFn: () => resourceService.getPricingRule(id),
    enabled: Number.isFinite(id),
  });

  useEffect(() => {
    if (rule && !isEditing) {
      setFormData(buildForm(rule));
    }
  }, [rule, isEditing]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!formData || !rule) throw new Error("Formulaire incomplet");

      return resourceService.updatePricingRule(rule.id, {
        bookingUnit: formData.bookingUnit,
        price: Number(formData.price) || 0,
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resource-pricing-rule", id],
      });
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
      setIsEditing(false);
      setErrorMessage(null);
    },
    onError: (e: any) =>
      setErrorMessage(
        e?.response?.data?.message || "Erreur lors de la modification.",
      ),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      resourceService.updatePricingRuleActive(id, !rule?.active),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resource-pricing-rule", id],
      });
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
    },
  });

  const save = () => {
    if (!formData) return;

    if (formData.price <= 0) {
      setErrorMessage("Le prix doit être supérieur à 0.");
      return;
    }

    setErrorMessage(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">Chargement...</div>;
  }

  if (error || !rule || !formData) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
        Règle de tarification introuvable.
      </div>
    );
  }

  const card = (label: string, value: React.ReactNode) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );

  const ruleDayNumber = toDayNumber(rule.dayOfWeek);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            onClick={() => navigate("/resources?tab=pricing")}
            className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Retour aux tarifs
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Règle #{rule.id}
            </h1>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                rule.active
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {rule.active ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Ressource <span className="font-mono">{rule.resourceCode}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setFormData(buildForm(rule));
                  setIsEditing(false);
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <X size={16} />
                Annuler
              </button>

              <button
                onClick={save}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Enregistrer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => toggleActiveMutation.mutate()}
                disabled={toggleActiveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Power size={16} />
                {rule.active ? "Désactiver" : "Activer"}
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              >
                <Edit size={16} />
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!isEditing ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {card("Unité", bookingUnitLabels[rule.bookingUnit])}
          {card(
            "Prix",
            <span className="text-lg font-bold">
              {formatMoney(rule.price)}
            </span>,
          )}
          {card("Libellé", rule.label || "—")}
          {card("Priorité", rule.priority ?? 0)}
          {card(
            "Jour",
            ruleDayNumber
              ? daysOfWeek.find((day) => day.value === ruleDayNumber)?.label
              : "Tous les jours",
          )}
          {card(
            "Créneau horaire",
            rule.startsAt || rule.endsAt
              ? `${rule.startsAt?.slice(0, 5) ?? "--:--"} – ${
                  rule.endsAt?.slice(0, 5) ?? "--:--"
                }`
              : "Toute la journée",
          )}
          {card(
            "Validité",
            `${
              rule.validFrom
                ? new Date(rule.validFrom).toLocaleDateString("fr-FR")
                : "Maintenant"
            } → ${
              rule.validUntil
                ? new Date(rule.validUntil).toLocaleDateString("fr-FR")
                : "Sans fin"
            }`,
          )}
          {card(
            "Ajustement",
            rule.adjustmentType
              ? `${adjustmentLabels[rule.adjustmentType]} · ${
                  rule.adjustmentValue ?? 0
                }`
              : "Aucun",
          )}
          {card(
            "Last minute",
            rule.lastMinuteMinutes ? `${rule.lastMinuteMinutes} min` : "Non",
          )}
        </div>
      ) : (
        <div className="max-w-5xl space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Informations principales
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Unité
                </label>
                <select
                  value={formData.bookingUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bookingUnit: e.target.value as ResourceBookingUnit,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  {bookingUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Prix
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Libellé
                </label>
                <input
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Conditions et ajustements
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Jour
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dayOfWeek: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Heure début
                </label>
                <input
                  type="time"
                  value={formData.startsAt}
                  onChange={(e) =>
                    setFormData({ ...formData, startsAt: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Heure fin
                </label>
                <input
                  type="time"
                  value={formData.endsAt}
                  onChange={(e) =>
                    setFormData({ ...formData, endsAt: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Aucun</option>
                  {adjustmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valeur d'ajustement
                </label>
                <input
                  type="number"
                  value={formData.adjustmentValue}
                  disabled={!formData.adjustmentType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adjustmentValue: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valide du
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valide jusqu'au
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) =>
                    setFormData({ ...formData, validUntil: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Last minute
                </label>
                <input
                  type="number"
                  value={formData.lastMinuteMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastMinuteMinutes: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <label className="flex items-center gap-3 self-end rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="rounded"
                />
                Règle active
              </label>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
