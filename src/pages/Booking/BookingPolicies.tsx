import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Search, Shield, Loader2, X } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingAudiencePolicy } from "../../services/booking.service";
import { ModalPortal } from "../../components/ui/ModalPortal";

const audienceTypes = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
};

const buildDefaultFormData = (policy: BookingAudiencePolicy | null) => ({
  audienceType: policy?.audienceType || "MEMBER",
  resourceTypeCode: policy?.resourceTypeCode || "",
  resourceGroupCode: policy?.resourceGroupCode || "",
  approvalRequired: policy?.approvalRequired ?? false,
  maxActiveBookings: policy?.maxActiveBookings ?? 3,
  maxBookingsPerDay: policy?.maxBookingsPerDay ?? 2,
  maxBookingsPerWeek: policy?.maxBookingsPerWeek ?? 5,
  maxBookingsPerMonth: policy?.maxBookingsPerMonth ?? 20,
  maxNoShowsPerMonth: policy?.maxNoShowsPerMonth ?? 2,
  minBookingNoticeMinutes: policy?.minBookingNoticeMinutes ?? 60,
  maxBookingDurationMinutes: policy?.maxBookingDurationMinutes ?? 240,
  active: policy?.active ?? true,
});

export const BookingPolicies: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] =
    useState<BookingAudiencePolicy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData(null));

  // CORRECTION : resynchronisation à chaque ouverture du modal
  useEffect(() => {
    if (isModalOpen) {
      setFormData(buildDefaultFormData(editingPolicy));
      setErrorMessage(null);
    }
  }, [isModalOpen, editingPolicy]);

  const { data: policiesRaw = [], isLoading } = useQuery({
    queryKey: ["booking-policies"],
    queryFn: () => bookingService.getPolicies(),
  });

  // Wrapper défensif — getPolicies peut retourner tableau ou { data: [] }
  const policies: BookingAudiencePolicy[] = Array.isArray(policiesRaw)
    ? policiesRaw
    : (policiesRaw as any)?.data || (policiesRaw as any)?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      bookingService.createPolicy({
        ...formData,
        resourceTypeCode: formData.resourceTypeCode || undefined,
        resourceGroupCode: formData.resourceGroupCode || undefined,
      } as BookingAudiencePolicy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-policies"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message || "Erreur lors de la création.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingPolicy?.id) throw new Error("ID manquant");
      return bookingService.updatePolicy(editingPolicy.id, {
        ...formData,
        resourceTypeCode: formData.resourceTypeCode || undefined,
        resourceGroupCode: formData.resourceGroupCode || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-policies"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message || "Erreur lors de la mise à jour.",
      );
    },
  });

  const handleOpenModal = (policy?: BookingAudiencePolicy) => {
    setEditingPolicy(policy || null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingPolicy) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const filteredPolicies = search
    ? policies.filter(
        (p) =>
          p.audienceType.toLowerCase().includes(search.toLowerCase()) ||
          (p.resourceTypeCode &&
            p.resourceTypeCode.toLowerCase().includes(search.toLowerCase())) ||
          (p.resourceGroupCode &&
            p.resourceGroupCode.toLowerCase().includes(search.toLowerCase())),
      )
    : policies;

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Politiques de réservation
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle politique
        </button>
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher par audience ou type/groupe de ressource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Audience
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Type / Groupe ressource
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Approbation
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actives max
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Par jour
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                No-show/mois
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Durée max
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actif
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPolicies.map((policy) => (
              <tr
                key={policy.id}
                className={`hover:bg-gray-50 ${!policy.active ? "opacity-60" : ""}`}
              >
                <td className="px-6 py-4 text-sm font-medium">
                  {audienceTypes.find((a) => a.value === policy.audienceType)
                    ?.label || policy.audienceType}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {[policy.resourceTypeCode, policy.resourceGroupCode]
                    .filter(Boolean)
                    .join(" / ") || "Toutes"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      policy.approvalRequired
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {policy.approvalRequired ? "Requis" : "Non"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {policy.maxActiveBookings}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {policy.maxBookingsPerDay}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {policy.maxNoShowsPerMonth}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {formatDuration(policy.maxBookingDurationMinutes)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      policy.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {policy.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenModal(policy)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="Modifier"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPolicies.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune politique trouvée</p>
        </div>
      )}

      {/* CORRECTION : ModalPortal au lieu du double overlay */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl z-10">
            <h3 className="text-xl font-bold">
              {editingPolicy ? "Modifier la politique" : "Nouvelle politique"}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[75vh]">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audience *
                </label>
                <select
                  value={formData.audienceType}
                  onChange={(e) =>
                    setFormData({ ...formData, audienceType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {audienceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de ressource
                  </label>
                  <input
                    type="text"
                    value={formData.resourceTypeCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resourceTypeCode: e.target.value,
                      })
                    }
                    placeholder="ex: MEETING_ROOM"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Groupe de ressource
                  </label>
                  <input
                    type="text"
                    value={formData.resourceGroupCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resourceGroupCode: e.target.value,
                      })
                    }
                    placeholder="ex: ROOMS"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actives max
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxActiveBookings}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxActiveBookings: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Par jour
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxBookingsPerDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxBookingsPerDay: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Par semaine
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxBookingsPerWeek}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxBookingsPerWeek: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Par mois
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxBookingsPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxBookingsPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No-show max/mois
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxNoShowsPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxNoShowsPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Délai mini (min)
                    {formData.minBookingNoticeMinutes > 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        = {formatDuration(formData.minBookingNoticeMinutes)}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minBookingNoticeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minBookingNoticeMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée max (min)
                    {formData.maxBookingDurationMinutes > 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        = {formatDuration(formData.maxBookingDurationMinutes)}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxBookingDurationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxBookingDurationMinutes:
                          parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.approvalRequired}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        approvalRequired: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Approbation requise</span>
                </label>
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
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingPolicy ? (
                    "Mettre à jour"
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
