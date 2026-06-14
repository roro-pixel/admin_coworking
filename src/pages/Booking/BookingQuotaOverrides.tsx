import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Award, X } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingQuotaOverride } from "../../services/booking.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";

type OwnerType = "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";

const ownerTypeLabels: Record<
  OwnerType,
  { label: string; placeholder: string }
> = {
  MEMBER: { label: "Code membre", placeholder: "MBR-00001" },
  CUSTOMER: { label: "Code customer", placeholder: "CUS-00001" },
  BUSINESS_ENTITY: { label: "Code business", placeholder: "BUS-00001" },
};

const buildDefaultFormData = () => ({
  resourceCode: "",
  extraActiveBookings: 0,
  extraBookingsPerDay: 0,
  extraBookingsPerWeek: 0,
  extraBookingsPerMonth: 0,
  reason: "",
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: "",
});

export const BookingQuotaOverrides: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ownerType, setOwnerType] = useState<OwnerType>("MEMBER");
  const [ownerCode, setOwnerCode] = useState("");
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : reset complet à chaque ouverture
  useEffect(() => {
    if (isModalOpen) {
      setOwnerType("MEMBER");
      setOwnerCode("");
      setFormData(buildDefaultFormData());
      setErrorMessage(null);
    }
  }, [isModalOpen]);

  const { data: overridesRaw, isLoading } = useQuery({
    queryKey: ["booking-quota-overrides"],
    queryFn: () => bookingService.getQuotaOverrides(),
  });

  // Wrapper défensif
  const overrides: BookingQuotaOverride[] = Array.isArray(overridesRaw)
    ? overridesRaw
    : (overridesRaw as any)?.data || (overridesRaw as any)?.content || [];

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ownerType,
        ownerCode,
        reason: formData.reason,
        approvedBy: admin?.email || "admin",
        extraActiveBookings: formData.extraActiveBookings,
        extraBookingsPerDay: formData.extraBookingsPerDay,
        extraBookingsPerWeek: formData.extraBookingsPerWeek,
        extraBookingsPerMonth: formData.extraBookingsPerMonth,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || undefined,
      };
      if (formData.resourceCode) payload.resourceCode = formData.resourceCode;
      return bookingService.createQuotaOverride(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-quota-overrides"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création de la dérogation.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerCode.trim()) {
      setErrorMessage("Le code du bénéficiaire est obligatoire.");
      return;
    }
    if (!formData.reason.trim()) {
      setErrorMessage("Le motif est obligatoire.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Dérogations de quotas
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle dérogation
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full border-separate border-spacing-y-1">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">N°</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Bénéficiaire
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Ressource
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actives +
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Jour +
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Semaine +
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Mois +
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Période
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Motif
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((override) => (
              <tr
                key={override.overrideNumber}
                className={`hover:bg-primary-50/40 ${!override.active ? "opacity-60" : ""}`}
              >
                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                  {override.overrideNumber}
                </td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-medium">{override.ownerCode}</p>
                  <p className="text-xs text-gray-400">{override.ownerType}</p>
                </td>
                <td className="px-6 py-4 text-sm">
                  {override.resourceCode || "Toutes"}
                </td>
                <td className="px-6 py-4 text-center text-sm font-medium text-green-700">
                  +{override.extraActiveBookings}
                </td>
                <td className="px-6 py-4 text-center text-sm font-medium text-green-700">
                  +{override.extraBookingsPerDay}
                </td>
                <td className="px-6 py-4 text-center text-sm font-medium text-green-700">
                  +{override.extraBookingsPerWeek}
                </td>
                <td className="px-6 py-4 text-center text-sm font-medium text-green-700">
                  +{override.extraBookingsPerMonth}
                </td>
                <td className="px-6 py-4 text-sm">
                  <p>
                    Du{" "}
                    {new Date(override.validFrom).toLocaleDateString("fr-FR")}
                  </p>
                  {override.validUntil && (
                    <p className="text-xs text-gray-500">
                      Au{" "}
                      {new Date(override.validUntil).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  )}
                </td>
                <td
                  className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                  title={override.reason}
                >
                  {override.reason}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      override.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {override.active ? "Actif" : "Inactif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overrides.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Award size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune dérogation</p>
        </div>
      )}

      {/* CORRECTION : ModalPortal au lieu du double overlay */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl z-10">
            <h3 className="text-xl font-bold">Nouvelle dérogation de quota</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[75vh]">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Type bénéficiaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de bénéficiaire *
                </label>
                <div className="flex gap-4">
                  {(Object.keys(ownerTypeLabels) as OwnerType[]).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="ownerType"
                        checked={ownerType === type}
                        onChange={() => {
                          setOwnerType(type);
                          setOwnerCode("");
                        }}
                      />
                      <span className="text-sm">
                        {ownerTypeLabels[type].label.replace("Code ", "")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ownerTypeLabels[ownerType].label} *
                </label>
                <input
                  type="text"
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  placeholder={ownerTypeLabels[ownerType].placeholder}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ressource spécifique (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.resourceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, resourceCode: e.target.value })
                  }
                  placeholder="ROOM-001 — laisser vide pour toutes les ressources"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              {/* Extras */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Quotas supplémentaires accordés
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Réservations actives +
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.extraActiveBookings}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraActiveBookings: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Par jour +
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.extraBookingsPerDay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraBookingsPerDay: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Par semaine +
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.extraBookingsPerWeek}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraBookingsPerWeek: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Par mois +
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.extraBookingsPerMonth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraBookingsPerMonth: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={2}
                  required
                  placeholder="Ex: Événement exceptionnel, client VIP..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valide du *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valide au
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    min={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Laisser vide pour une durée illimitée
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 border rounded-xl text-gray-700 hover:bg-primary-50/40 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Créer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
