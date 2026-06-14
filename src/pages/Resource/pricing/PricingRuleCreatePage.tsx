import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  AdjustmentType,
  ResourceBookingUnit,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

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

const buildDefaultForm = () => ({
  resourceCode: "",
  bookingUnit: "HOUR" as ResourceBookingUnit,
  price: 0,
  label: "",
  dayOfWeek: 0,
  startsAt: "",
  endsAt: "",
  adjustmentType: "" as "" | AdjustmentType,
  adjustmentValue: 0,
  lastMinuteMinutes: "",
  priority: 0,
  validFrom: "",
  validUntil: "",
  active: true,
});

export const PricingRuleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(buildDefaultForm);
  const [selectedResource, setSelectedResource] =
    useState<ResourceSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createPricingRule({
        resourceCode: formData.resourceCode,
        bookingUnit: formData.bookingUnit,
        price: Number(formData.price) || 0,
        label: formData.label || undefined,
        dayOfWeek: formData.dayOfWeek > 0 ? formData.dayOfWeek : undefined,
        startsAt: formData.startsAt || undefined,
        endsAt: formData.endsAt || undefined,
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
      navigate("/resources?tab=pricing");
    },
    onError: (error: any) =>
      setErrorMessage(
        error?.response?.data?.message || "Erreur lors de la création.",
      ),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!formData.resourceCode) return setErrorMessage("La ressource est obligatoire.");
    if (formData.price <= 0) return setErrorMessage("Le prix doit être supérieur à 0.");
    createMutation.mutate();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle règle de tarification</h1>
          <p className="mt-1 text-sm text-gray-500">
            Définissez une règle de prix applicable à une ressource et à une unité de réservation.
          </p>
        </div>
        <button
          form="pricing-rule-form"
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Créer la règle
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form id="pricing-rule-form" onSubmit={submit} className="max-w-5xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Informations principales</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ressource *</label>
              <ResourceAutocomplete
                selectedResource={selectedResource}
                selectedCode={formData.resourceCode}
                onSelect={(resource) => {
                  setSelectedResource(resource);
                  setFormData({ ...formData, resourceCode: resource?.code || "" });
                }}
                placeholder="Rechercher une ressource..."
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Unité *</label>
              <select
                value={formData.bookingUnit}
                onChange={(e) =>
                  setFormData({ ...formData, bookingUnit: e.target.value as ResourceBookingUnit })
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              >
                {bookingUnits.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Prix (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Libellé</label>
              <input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex : Week-end, matin, last minute..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">Conditions d'application</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Jour</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value={0}>Tous les jours</option>
                {daysOfWeek.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Priorité</label>
              <input
                type="number"
                min="0"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Heure début</label>
              <input type="time" value={formData.startsAt} onChange={(e) => setFormData({ ...formData, startsAt: e.target.value ? `${e.target.value}:00` : "" })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Heure fin</label>
              <input type="time" value={formData.endsAt} onChange={(e) => setFormData({ ...formData, endsAt: e.target.value ? `${e.target.value}:00` : "" })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Valide du</label>
              <input type="date" value={formData.validFrom} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Valide jusqu'au</label>
              <input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">Ajustements</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Type d'ajustement</label>
              <select
                value={formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as any })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Aucun ajustement</option>
                {adjustmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Valeur</label>
              <input
                type="number"
                value={formData.adjustmentValue}
                disabled={!formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentValue: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Last minute (minutes)</label>
              <input
                type="number"
                min="0"
                value={formData.lastMinuteMinutes}
                onChange={(e) => setFormData({ ...formData, lastMinuteMinutes: e.target.value })}
                placeholder="ex : 60"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-3 self-end rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              Règle active
            </label>
          </div>
        </section>
      </form>
    </div>
  );
};
