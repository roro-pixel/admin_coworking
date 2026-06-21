import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  Loader2,
  Calendar,
  Eye,
  RefreshCw,
  ArrowRight,
  Lock,
  Unlock,
  List,
  CalendarDays,
} from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceAvailabilityResponse,
  ResourceAvailabilityWindowResponse,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { ResourceAvailabilityCalendar } from "./ResourceAvailabilityCalendar";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const buildDefaultFormData = (selectedResourceCode: string) => ({
  resourceCode: selectedResourceCode,
  startedAt: "",
  endedAt: "",
  capacity: 1,
  active: true,
});

export const ResourceAvailability: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : formData réinitialisé à chaque ouverture du modal
  const [formData, setFormData] = useState(() => buildDefaultFormData(""));

  useEffect(() => {
    if (isModalOpen) {
      setFormData(buildDefaultFormData(selectedResource));
      setErrorMessage(null);
    }
  }, [isModalOpen, selectedResource]);

  const { data: availabilitiesData, isLoading } = useQuery({
    queryKey: ["resource-availabilities", selectedResource],
    queryFn: () =>
      resourceService.getAvailabilities({
        resourceCode: selectedResource,
        size: 100,
      }),
    enabled: !!selectedResource,
  });

  const availabilities: ResourceAvailabilityResponse[] =
    availabilitiesData?.content || [];

  const { data: closuresData } = useQuery({
    queryKey: ["resource-closures-calendar", selectedResource, calendarMonth],
    queryFn: () =>
      resourceService.getClosures({
        resourceCode: selectedResource,
        from: `${calendarMonth}-01`,
        to: `${calendarMonth}-31`,
        size: 200,
      }),
    enabled: !!selectedResource,
  });
  const closures = closuresData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createAvailability({
        resourceCode: formData.resourceCode,
        startedAt: formData.startedAt,
        endedAt: formData.endedAt,
        slotDurationMinutes: 30,
        totalCapacity: formData.capacity,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-availabilities"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la génération des créneaux.",
      );
    },
  });

  // === getRemainingAvailabilities : fenetres libres restantes ===
  const {
    data: remainingWindows,
    isLoading: remainingLoading,
    refetch: refetchRemaining,
  } = useQuery({
    queryKey: ["resource-availabilities-remaining", selectedResource, calendarMonth],
    queryFn: () => resourceService.searchRemainingSlots({
      resourceCode: selectedResource,
      from: `${calendarMonth}-01T00:00:00`,
      to: `${calendarMonth}-31T23:59:59`,
    }),
    enabled: !!selectedResource,
  });

  const windows: ResourceAvailabilityWindowResponse[] = remainingWindows || [];

  // === reserveAvailability ===
  const [reserveForm, setReserveForm] = useState({
    startedAt: "",
    endedAt: "",
    quantity: 1,
  });
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [isReserveOpen, setIsReserveOpen] = useState(false);

  const reserveMutation = useMutation({
    mutationFn: () =>
      {
        const slot = availabilities.find((item) =>
          item.startedAt === reserveForm.startedAt && item.endedAt === reserveForm.endedAt,
        );
        if (!slot) throw new Error("Créneau introuvable pour la réservation.");
        return resourceService.reserveAvailabilitySlot(slot.id, reserveForm.quantity);
      },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resource-availabilities", selectedResource],
      });
      queryClient.invalidateQueries({
        queryKey: ["resource-availabilities-remaining", selectedResource],
      });
      setIsReserveOpen(false);
      setReserveForm({ startedAt: "", endedAt: "", quantity: 1 });
      setReserveError(null);
    },
    onError: (error: any) => {
      setReserveError(
        error?.response?.data?.message || "Erreur lors de la reservation.",
      );
    },
  });

  // === releaseAvailability ===
  const [releaseForm, setReleaseForm] = useState({
    startedAt: "",
    endedAt: "",
    quantity: 1,
  });
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);

  const releaseMutation = useMutation({
    mutationFn: () =>
      {
        const slot = availabilities.find((item) =>
          item.startedAt === releaseForm.startedAt && item.endedAt === releaseForm.endedAt,
        );
        if (!slot) throw new Error("Créneau introuvable pour la libération.");
        return resourceService.releaseAvailabilitySlot(slot.id, releaseForm.quantity);
      },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resource-availabilities", selectedResource],
      });
      queryClient.invalidateQueries({
        queryKey: ["resource-availabilities-remaining", selectedResource],
      });
      setIsReleaseOpen(false);
      setReleaseForm({ startedAt: "", endedAt: "", quantity: 1 });
      setReleaseError(null);
    },
    onError: (error: any) => {
      setReleaseError(
        error?.response?.data?.message || "Erreur lors de la liberation.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.endedAt) <= new Date(formData.startedAt)) {
      setErrorMessage(
        "La date de fin doit être postérieure à la date de début.",
      );
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  // CORRECTION : filtre par nom de ressource (pas par resourceCode qui est déjà filtré par le select)
  const filteredAvailabilities = search
    ? availabilities.filter(
        (slot) =>
          new Date(slot.startedAt).toLocaleString("fr-FR").includes(search) ||
          new Date(slot.endedAt).toLocaleString("fr-FR").includes(search),
      )
    : availabilities;

  const [selectedResourceSummary, setSelectedResourceSummary] =
    useState<ResourceSummaryResponse | null>(null);
  const selectedResourceName =
    selectedResourceSummary?.name || selectedResource;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Disponibilités des ressources
        </h2>
        <div className="flex gap-2">
          {selectedResource && (
            <>
              <button
                onClick={() => setIsReleaseOpen(true)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                title="Libérer de la capacité"
              >
                <Unlock size={15} />
                Libérer
              </button>
              <button
                onClick={() => setIsReserveOpen(true)}
                className="px-3 py-2 border border-orange-200 bg-orange-50 rounded-lg text-sm text-orange-700 hover:bg-orange-100 flex items-center gap-1"
                title="Réserver de la capacité"
              >
                <Lock size={15} />
                Réserver
              </button>
            </>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Générer des créneaux
          </button>
        </div>
      </div>

      {/* Sélection de ressource + recherche dans les créneaux */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-80">
          <ResourceAutocomplete
            selectedResource={selectedResourceSummary}
            selectedCode={selectedResource}
            onSelect={(resource) => {
              setSelectedResourceSummary(resource);
              setSelectedResource(resource?.code || "");
            }}
            placeholder="Rechercher une ressource..."
          />
        </div>
        {selectedResource && (
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Filtrer par date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}
      </div>

      {selectedResource && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Mode d’affichage</p>
            <p className="mt-0.5 text-xs text-gray-500">Basculez entre la vue calendrier et la liste détaillée des créneaux.</p>
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                viewMode === "calendar"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <CalendarDays size={16} />
              Calendrier
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                viewMode === "list"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <List size={16} />
              Liste
            </button>
          </div>
        </div>
      )}

      {selectedResource && viewMode === "calendar" && (
        <div className="mb-6">
          <ResourceAvailabilityCalendar
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            slots={availabilities}
            closures={closures}
          />
        </div>
      )}

      {/* Tableau des créneaux */}
      {selectedResource && viewMode === "list" && (
        <>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : filteredAvailabilities.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {search
                  ? "Aucun créneau correspondant"
                  : "Aucun créneau pour cette ressource"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="px-5 py-4 bg-gray-50/70">
                <p className="text-sm font-medium text-gray-700">
                  {selectedResourceName} — {filteredAvailabilities.length}{" "}
                  créneau{filteredAvailabilities.length > 1 ? "x" : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        Début
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        Fin
                      </th>
                      {/* CORRECTION : slotDurationMinutes affiché */}
                      <th className="px-4 py-2 text-center text-sm font-semibold">
                        Durée (min)
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">
                        Capacité
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">
                        Disponible
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">
                        Actif
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailabilities.map((slot) => (
                      <tr key={slot.id} className="transition hover:bg-primary-50/40">
                        <td className="px-4 py-2 text-sm">
                          {new Date(slot.startedAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(slot.endedAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-600">
                          {slot.slotDurationMinutes}
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                          {slot.remainingCapacity} / {slot.totalCapacity}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              slot.available
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {slot.available ? "Oui" : "Non"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              slot.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {slot.active ? "Oui" : "Non"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fenetres libres restantes (getRemainingAvailabilities) */}
      {selectedResource && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-blue-800">
              Fenêtres disponibles restantes
            </h3>
            <button
              onClick={() => refetchRemaining()}
              disabled={remainingLoading}
              className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-40"
              title="Actualiser"
            >
              <RefreshCw
                size={14}
                className={remainingLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
          {remainingLoading ? (
            <p className="text-xs text-blue-500 animate-pulse">Chargement...</p>
          ) : windows.length === 0 ? (
            <p className="text-xs text-blue-500">Aucune fenêtre disponible</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {windows.map((w, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-1 text-blue-700 font-medium">
                    <span>
                      {new Date(w.startedAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <ArrowRight size={10} />
                    <span>
                      {new Date(w.endedAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-blue-500 mt-0.5">
                    {w.slotCount} créneau{w.slotCount > 1 ? "x" : ""} ·{" "}
                    {w.durationMinutes} min · {w.remainingCapacity} place
                    {w.remainingCapacity > 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedResource && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Eye size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Sélectionnez une ressource pour voir ses disponibilités
          </p>
        </div>
      )}

      {/* Modal de génération de créneaux — CORRECTION : ModalPortal */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              Générer des créneaux de disponibilité
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
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
                selectedCode={formData.resourceCode}
                onSelect={(resource) =>
                  setFormData({
                    ...formData,
                    resourceCode: resource?.code || "",
                  })
                }
                placeholder="Rechercher une ressource..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, startedAt: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endedAt}
                  min={formData.startedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, endedAt: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité par créneau
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Les créneaux sont générés automatiquement par le backend selon
                la politique de la ressource.
              </p>
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
              <span className="text-sm">Actif immédiatement</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !formData.resourceCode}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Générer"
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
      {/* Modal Réserver de la capacité (reserveAvailability) */}
      {isReserveOpen && (
        <ModalPortal onClose={() => setIsReserveOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-orange-600" />
              <h3 className="text-xl font-bold">Réserver de la capacité</h3>
            </div>
            <button
              onClick={() => setIsReserveOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                new Date(reserveForm.endedAt) <= new Date(reserveForm.startedAt)
              ) {
                setReserveError(
                  "La date de fin doit être postérieure à la date de début.",
                );
                return;
              }
              setReserveError(null);
              reserveMutation.mutate();
            }}
            className="p-6 space-y-4"
          >
            {reserveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {reserveError}
              </div>
            )}
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
              Ressource :{" "}
              <span className="font-medium">
                {selectedResourceName || selectedResource}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Début *
                </label>
                <input
                  type="datetime-local"
                  value={reserveForm.startedAt}
                  onChange={(e) =>
                    setReserveForm({
                      ...reserveForm,
                      startedAt: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin *
                </label>
                <input
                  type="datetime-local"
                  value={reserveForm.endedAt}
                  min={reserveForm.startedAt}
                  onChange={(e) =>
                    setReserveForm({ ...reserveForm, endedAt: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité à réserver *
              </label>
              <input
                type="number"
                value={reserveForm.quantity}
                min="1"
                onChange={(e) =>
                  setReserveForm({
                    ...reserveForm,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReserveOpen(false)}
                disabled={reserveMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={reserveMutation.isPending}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reserveMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Réserver"
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}

      {/* Modal Libérer de la capacité (releaseAvailability) */}
      {isReleaseOpen && (
        <ModalPortal onClose={() => setIsReleaseOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Unlock size={18} className="text-green-600" />
              <h3 className="text-xl font-bold">Libérer de la capacité</h3>
            </div>
            <button
              onClick={() => setIsReleaseOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                new Date(releaseForm.endedAt) <= new Date(releaseForm.startedAt)
              ) {
                setReleaseError(
                  "La date de fin doit être postérieure à la date de début.",
                );
                return;
              }
              setReleaseError(null);
              releaseMutation.mutate();
            }}
            className="p-6 space-y-4"
          >
            {releaseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {releaseError}
              </div>
            )}
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700">
              Ressource :{" "}
              <span className="font-medium">
                {selectedResourceName || selectedResource}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Début *
                </label>
                <input
                  type="datetime-local"
                  value={releaseForm.startedAt}
                  onChange={(e) =>
                    setReleaseForm({
                      ...releaseForm,
                      startedAt: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin *
                </label>
                <input
                  type="datetime-local"
                  value={releaseForm.endedAt}
                  min={releaseForm.startedAt}
                  onChange={(e) =>
                    setReleaseForm({ ...releaseForm, endedAt: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité à libérer *
              </label>
              <input
                type="number"
                value={releaseForm.quantity}
                min="1"
                onChange={(e) =>
                  setReleaseForm({
                    ...releaseForm,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReleaseOpen(false)}
                disabled={releaseMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={releaseMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {releaseMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Libérer"
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};
