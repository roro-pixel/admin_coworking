import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Eye, EyeOff, Power, Plus, Coffee, Unlink } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceResponse,
  AmenityResponse,
  ResourcePricingRuleResponse,
  ResourceAvailabilityResponse,
  ResourceBookingUnit,
  ResourceStatus,
} from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface ResourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceResponse;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  INACTIVE: { label: "Inactif", color: "bg-gray-100 text-gray-700" },
  MAINTENANCE: { label: "Maintenance", color: "bg-orange-100 text-orange-700" },
  OUT_OF_SERVICE: { label: "Hors service", color: "bg-red-100 text-red-700" },
  ARCHIVED: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

const bookingUnitLabels: Record<string, string> = {
  HOUR: "Heure",
  HALF_DAY: "Demi-journée",
  DAY: "Journée",
  WEEK: "Semaine",
  MONTH: "Mois",
};

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  isOpen,
  onClose,
  resource: initialResource,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "info" | "amenities" | "pricing" | "availability" | "gallery" | "calendar"
  >("info");
  const [quoteForm, setQuoteForm] = useState<{
    bookingUnit: ResourceBookingUnit;
    startedAt: string;
    endedAt: string;
  }>({ bookingUnit: "HOUR", startedAt: "", endedAt: "" });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [showAmenitiesList, setShowAmenitiesList] = useState(false);
  const [amenityLinkForm] = useState({
    amenityCode: "",
    quantity: 1,
    optional: false,
    extraPrice: 0,
  });

  // CORRECTION : refresh de la ressource pour avoir l'état à jour après actions rapides
  const { data: refreshedResource } = useQuery({
    queryKey: ["resource", initialResource.code],
    queryFn: () => resourceService.getResource(initialResource.code),
    enabled: isOpen,
  });

  const resource = refreshedResource || initialResource;

  const { data: amenitiesRaw, isLoading: amenitiesLoading } = useQuery({
    queryKey: ["resource-amenities", resource.code],
    queryFn: () => resourceService.getResourceAmenities(resource.code),
    enabled: isOpen && activeTab === "amenities",
  });

  const { data: allAmenitiesData } = useQuery({
    queryKey: ["all-amenities"],
    queryFn: () => resourceService.getAmenities({ size: 500 }),
    enabled: showAmenitiesList,
  });

  const { data: pricingRulesData, isLoading: pricingLoading } = useQuery({
    queryKey: ["resource-pricing", resource.code],
    queryFn: () =>
      resourceService.getPricingRules({
        resourceCode: resource.code,
        size: 100,
      }),
    enabled: isOpen && activeTab === "pricing",
  });

  const { data: availabilitiesData, isLoading: availabilityLoading } = useQuery(
    {
      queryKey: ["resource-availabilities", resource.code],
      queryFn: () =>
        resourceService.getAvailabilities({
          resourceCode: resource.code,
          size: 50,
        }),
      enabled: isOpen && activeTab === "availability",
    },
  );

  // CORRECTION : getResourceAmenities retourne un tableau direct (pas { content: [] })
  const amenities: AmenityResponse[] = Array.isArray(amenitiesRaw)
    ? amenitiesRaw
    : [];

  // Galerie photos
  const { data: photosData } = useQuery({
    queryKey: ["resource-photos", resource.code],
    queryFn: () => resourceService.getResourcePhotos(resource.code),
    enabled: isOpen && activeTab === "gallery",
  });
  const photos: any[] = Array.isArray(photosData) ? photosData : [];

  // Calendrier public
  const [calMonth, setCalMonth] = React.useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const { data: calendarData, isLoading: calLoading } = useQuery({
    queryKey: ["resource-calendar", resource.code, calMonth],
    queryFn: () => {
      const [y, m] = calMonth.split("-");
      const from = `${calMonth}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${calMonth}-${String(lastDay).padStart(2, "0")}`;
      return resourceService.getPublicCalendar(resource.code, { fromDate: from, toDate: to });
    },
    enabled: isOpen && activeTab === "calendar",
  });
  const allAmenities: AmenityResponse[] = allAmenitiesData?.content || [];
  const pricingRules: ResourcePricingRuleResponse[] =
    pricingRulesData?.content || [];
  const availabilities: ResourceAvailabilityResponse[] =
    availabilitiesData?.content || [];

  const invalidateResource = () => {
    queryClient.invalidateQueries({ queryKey: ["resources"] });
    queryClient.invalidateQueries({ queryKey: ["resource", resource.code] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: (status: ResourceStatus) =>
      resourceService.updateResourceStatus(resource.code, status),
    onSuccess: invalidateResource,
    onError: () => alert("Erreur lors du changement de statut."),
  });

  const updateBookingEnabledMutation = useMutation({
    mutationFn: (bookingEnabled: boolean) =>
      resourceService.updateResourceBookingEnabled(
        resource.code,
        bookingEnabled,
      ),
    onSuccess: invalidateResource,
    onError: () => alert("Erreur lors de la mise à jour de la réservabilité."),
  });

  const updatePortalVisibleMutation = useMutation({
    mutationFn: (portalVisible: boolean) =>
      resourceService.updateResourcePortalVisible(resource.code, portalVisible),
    onSuccess: invalidateResource,
    onError: () => alert("Erreur lors de la mise à jour de la visibilité."),
  });

  const linkAmenityMutation = useMutation({
    mutationFn: (amenityCode?: string) =>
      resourceService.linkAmenity(
        resource.code,
        amenityCode || amenityLinkForm.amenityCode,
        {
          quantity: amenityLinkForm.quantity,
          optional: amenityLinkForm.optional,
          extraPrice:
            amenityLinkForm.extraPrice > 0
              ? amenityLinkForm.extraPrice
              : undefined,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resource-amenities", resource.code],
      });
      setShowAmenitiesList(false);
    },
    onError: () => alert("Erreur lors de l'ajout de l'équipement."),
  });

  const unlinkAmenityMutation = useMutation({
    mutationFn: (amenityCode: string) =>
      resourceService.unlinkAmenity(resource.code, amenityCode),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["resource-amenities", resource.code],
      }),
    onError: () => alert("Erreur lors du retrait de l'équipement."),
  });

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
        <div>
          <h3 className="text-xl font-bold">{resource.name}</h3>
          <p className="text-sm text-gray-500">Code : {resource.code}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Actions rapides — utilisent `resource` (refreshed) donc à jour */}
      <div className="flex flex-wrap gap-2 p-4 border-b bg-gray-50">
        <select
          value={resource.status}
          onChange={(e) => updateStatusMutation.mutate(e.target.value as ResourceStatus)}
          disabled={updateStatusMutation.isPending}
          className="px-3 py-1 border rounded-lg text-sm bg-white disabled:opacity-50"
        >
          {Object.entries(statusConfig).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            updateBookingEnabledMutation.mutate(!resource.bookingEnabled)
          }
          disabled={updateBookingEnabledMutation.isPending}
          className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 ${
            resource.bookingEnabled
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <Power size={14} />
          {resource.bookingEnabled ? "Réservable" : "Non réservable"}
        </button>

        <button
          onClick={() =>
            updatePortalVisibleMutation.mutate(!resource.portalVisible)
          }
          disabled={updatePortalVisibleMutation.isPending}
          className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 ${
            resource.portalVisible
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {resource.portalVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          {resource.portalVisible ? "Visible" : "Masqué"}
        </button>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {(
            [
              "info",
              "amenities",
              "pricing",
              "availability",
              "gallery",
              "calendar",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "info"
                ? "Informations"
                : tab === "amenities"
                  ? `Équipements (${amenities.length})`
                  : tab === "pricing"
                    ? `Tarifs (${pricingRules.length})`
                    : tab === "availability"
                      ? `Disponibilités (${availabilities.length})`
                      : tab === "gallery"
                        ? "Galerie"
                        : "Calendrier"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Informations */}
        {activeTab === "info" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Statut</p>
              <span
                className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs ${statusConfig[resource.status]?.color}`}
              >
                {statusConfig[resource.status]?.label}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Capacité</p>
              <p className="font-medium">
                {resource.capacity ?? 0} personne
                {(resource.capacity ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-medium">{resource.typeCode}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Groupe</p>
              <p className="font-medium">{resource.groupCode || "—"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Politique</p>
              <p className="font-medium">{resource.policyCode || "—"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Zone</p>
              <p className="font-medium">{resource.zone || "—"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Emplacement</p>
              <p className="font-medium">{resource.locationLabel || "—"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Ordre d'affichage</p>
              <p className="font-medium">{resource.displayOrder}</p>
            </div>
            {resource.description && (
              <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm mt-1">{resource.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Équipements */}
        {activeTab === "amenities" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">
                Équipements associés
              </p>
              <button
                onClick={() => setShowAmenitiesList(!showAmenitiesList)}
                className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {showAmenitiesList && (
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">
                  Sélectionner un équipement à associer
                </p>
                <div className="flex gap-2">
                  <select
                    onChange={(e) =>
                      e.target.value &&
                      linkAmenityMutation.mutate(e.target.value)
                    }
                    disabled={linkAmenityMutation.isPending}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                    defaultValue=""
                  >
                    <option value="">Sélectionner un équipement</option>
                    {allAmenities
                      .filter(
                        (a) =>
                          !amenities.some((linked) => linked.code === a.code),
                      )
                      .map((amenity) => (
                        <option key={amenity.code} value={amenity.code}>
                          {amenity.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => setShowAmenitiesList(false)}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {amenitiesLoading ? (
              <div className="text-center py-4 text-gray-500">
                Chargement...
              </div>
            ) : amenities.length === 0 && !showAmenitiesList ? (
              <div className="text-center py-8 text-gray-500">
                Aucun équipement associé
              </div>
            ) : (
              amenities.map((amenity) => (
                <div
                  key={amenity.code}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Coffee size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{amenity.name}</p>
                      {amenity.description && (
                        <p className="text-xs text-gray-500">
                          {amenity.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => unlinkAmenityMutation.mutate(amenity.code)}
                    disabled={unlinkAmenityMutation.isPending}
                    className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                    title="Retirer"
                  >
                    <Unlink size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tarifs */}
        {activeTab === "pricing" && (
          <>
            <div className="space-y-2">
              {pricingLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Chargement...
                </div>
              ) : pricingRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune règle de tarification
                </div>
              ) : (
                pricingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {bookingUnitLabels[rule.bookingUnit] ||
                          rule.bookingUnit}
                      </p>
                      <p className="text-sm text-gray-600">
                        {rule.price.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        rule.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Simulateur de prix */}
            <div className="mt-6 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                🧮 Simulateur de prix
              </h4>
              {quoteError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
                  {quoteError}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Unité
                  </label>
                  <select
                    value={quoteForm.bookingUnit}
                    onChange={(e) =>
                      setQuoteForm((f) => ({
                        ...f,
                        bookingUnit: e.target.value as ResourceBookingUnit,
                      }))
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    {[
                      { v: "HOUR", l: "Heure" },
                      { v: "HALF_DAY", l: "Demi-j." },
                      { v: "DAY", l: "Jour" },
                      { v: "WEEK", l: "Semaine" },
                      { v: "MONTH", l: "Mois" },
                    ].map((u) => (
                      <option key={u.v} value={u.v}>
                        {u.l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Début
                  </label>
                  <input
                    type="datetime-local"
                    value={quoteForm.startedAt}
                    onChange={(e) =>
                      setQuoteForm((f) => ({ ...f, startedAt: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={quoteForm.endedAt}
                    onChange={(e) =>
                      setQuoteForm((f) => ({ ...f, endedAt: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <button
                disabled={
                  !quoteForm.startedAt || !quoteForm.endedAt || quoteLoading
                }
                onClick={async () => {
                  setQuoteLoading(true);
                  setQuoteError(null);
                  setQuoteResult(null);
                  try {
                    const r = await resourceService.quotePrice({
                      resourceCode: resource.code,
                      bookingUnit: quoteForm.bookingUnit,
                      startedAt: quoteForm.startedAt,
                      endedAt: quoteForm.endedAt,
                    });
                    setQuoteResult(r);
                  } catch (e: any) {
                    setQuoteError(e?.response?.data?.message || "Erreur");
                  }
                  setQuoteLoading(false);
                }}
                className="w-full bg-primary-600 text-white py-1.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {quoteLoading ? "Calcul..." : "Calculer le prix"}
              </button>
              {quoteResult && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">
                      Prix de base :{" "}
                      {quoteResult.basePrice?.toLocaleString("fr-FR")} FCFA
                    </p>
                    {quoteResult.appliedRuleLabel && (
                      <p className="text-xs text-gray-400">
                        Règle : {quoteResult.appliedRuleLabel}
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-green-700">
                    {quoteResult.finalPrice?.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Disponibilités */}
        {activeTab === "availability" && (
          <div className="space-y-2">
            {availabilityLoading ? (
              <div className="text-center py-4 text-gray-500">
                Chargement...
              </div>
            ) : availabilities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun créneau de disponibilité
              </div>
            ) : (
              availabilities.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(slot.startedAt).toLocaleString("fr-FR")}
                    </p>
                    <p className="text-xs text-gray-500">
                      → {new Date(slot.endedAt).toLocaleString("fr-FR")}
                    </p>
                    {/* CORRECTION : slotDurationMinutes affiché */}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Durée du créneau : {slot.slotDurationMinutes} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {slot.remainingCapacity} / {slot.totalCapacity} place
                      {slot.totalCapacity > 1 ? "s" : ""}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        slot.available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {slot.available ? "Disponible" : "Complet"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Galerie photos */}
        {activeTab === "gallery" && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Pour ajouter une photo : uploadez d'abord le fichier via
              Documents, récupérez le <code>documentCode</code>, puis
              associez-le à cette ressource.
            </p>
            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>Aucune photo pour cette ressource</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo: any) => (
                  <div
                    key={photo.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <img
                      src={`/sni/api/v1/documents/${photo.documentCode}/preview`}
                      alt={photo.caption || "Photo"}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs font-medium">
                        {photo.caption || "—"}
                      </p>
                      {photo.cover && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-1 rounded">
                          Couverture
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendrier public de disponibilité */}
        {activeTab === "calendar" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">
                Disponibilité mensuelle
              </h4>
              <input
                type="month"
                value={calMonth}
                onChange={(e) => setCalMonth(e.target.value)}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            {calLoading && (
              <p className="text-center py-8 text-gray-400">Chargement...</p>
            )}
            {calendarData && (
              <div className="grid grid-cols-7 gap-1">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-gray-500 py-1"
                  >
                    {d}
                  </div>
                ))}
                {(() => {
                  const [y, m] = calMonth.split("-").map(Number);
                  const firstDay = new Date(y, m - 1, 1);
                  const offset = (firstDay.getDay() + 6) % 7;
                  const cells = [];
                  for (let i = 0; i < offset; i++)
                    cells.push(<div key={`e${i}`} />);
                  calendarData.days.forEach((day: any) => {
                    const color =
                      day.status === "AVAILABLE"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : day.status === "PARTIAL"
                          ? "bg-orange-100 text-orange-700 border-orange-200"
                          : "bg-red-100 text-red-600 border-red-200";
                    cells.push(
                      <div
                        key={day.date}
                        className={`border rounded p-1 text-center text-xs ${color}`}
                      >
                        <p className="font-medium">
                          {new Date(day.date + "T12:00").getDate()}
                        </p>
                        <p className="text-xs">
                          {day.availableSlots}/{day.totalSlots}
                        </p>
                      </div>,
                    );
                  });
                  return cells;
                })()}
              </div>
            )}
            <div className="flex gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 inline-block"></span>{" "}
                Disponible
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-200 inline-block"></span>{" "}
                Partiel
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-200 inline-block"></span>{" "}
                Complet
              </span>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
