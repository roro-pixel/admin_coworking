import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  X,
  Edit,
  Loader2,
  Power,
  Eye,
  EyeOff,
  Coffee,
  Plus,
  Unlink,
  DollarSign,
  CalendarDays,
  Calculator,
  Settings,
} from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { resourceService } from "../../../services/resource.service";
import type {
  AmenityResponse,
  ResourceAvailabilityResponse,
  ResourceBookingUnit,
  ResourceGroupResponse,
  ResourcePolicyResponse,
  ResourcePricingRuleResponse,
  ResourceStatus,
  ResourceTypeResponse,
} from "../../../services/resource.service";
import { ResourceAvailabilityCalendar } from "./ResourceAvailabilityCalendar";

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: {
    label: "Actif",
    color: "bg-green-50 text-green-700 ring-green-100",
  },
  INACTIVE: {
    label: "Inactif",
    color: "bg-gray-50 text-gray-700 ring-gray-100",
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-orange-50 text-orange-700 ring-orange-100",
  },
  OUT_OF_SERVICE: {
    label: "Hors service",
    color: "bg-red-50 text-red-700 ring-red-100",
  },
  ARCHIVED: {
    label: "Archivé",
    color: "bg-gray-50 text-gray-500 ring-gray-100",
  },
};

const bookingUnitLabels: Record<string, string> = {
  HOUR: "Heure",
  HALF_DAY: "Demi-journée",
  DAY: "Journée",
  WEEK: "Semaine",
  MONTH: "Mois",
};

const statusOptions: { value: ResourceStatus; label: string }[] = [
  { value: "ACTIVE", label: "Actif" },
  { value: "INACTIVE", label: "Inactif" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Hors service" },
  { value: "ARCHIVED", label: "Archivé" },
];

const getEntityId = (entity: any): string =>
  entity?.code ? String(entity.code) : "";

type Tab =
  | "info"
  | "amenities"
  | "pricing"
  | "availability"
  | "calendar";

export const ResourceDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["info"]));
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAmenitiesList, setShowAmenitiesList] = useState(false);
  const [quoteForm, setQuoteForm] = useState<{
    bookingUnit: ResourceBookingUnit;
    startedAt: string;
    endedAt: string;
  }>({ bookingUnit: "HOUR", startedAt: "", endedAt: "" });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const {
    data: resource,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["resource", code],
    queryFn: () => resourceService.getResource(code!),
    enabled: !!code,
  });

  const { data: typesData } = useQuery({
    queryKey: ["resource-types-list"],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
    enabled: isEditing,
  });
  const { data: groupsData } = useQuery({
    queryKey: ["resource-groups-list"],
    queryFn: () => resourceService.getResourceGroups(),
    enabled: isEditing,
  });
  const { data: policiesData } = useQuery({
    queryKey: ["resource-policies-list"],
    queryFn: () => resourceService.getResourcePolicies({ size: 500 }),
    enabled: isEditing,
  });

  const types: ResourceTypeResponse[] = typesData?.content || [];
  const groups: ResourceGroupResponse[] = groupsData?.content || [];
  const policies: ResourcePolicyResponse[] = policiesData?.content || [];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    typeId: "",
    groupId: "",
    policyId: "",
    capacity: 1,
    zone: "",
    locationLabel: "",
    status: "ACTIVE" as ResourceStatus,
    bookingEnabled: true,
    portalVisible: true,
    active: true,
    displayOrder: 0,
  });

  React.useEffect(() => {
    if (!resource) return;
    setFormData({
      name: resource.name || "",
      description: resource.description || "",
      typeId: "",
      groupId: "",
      policyId: "",
      capacity: resource.capacity ?? 1,
      zone: resource.zone || "",
      locationLabel: resource.locationLabel || "",
      status: resource.status as ResourceStatus,
      bookingEnabled: resource.bookingEnabled,
      portalVisible: resource.portalVisible,
      active: resource.active,
      displayOrder: resource.displayOrder ?? 0,
    });
  }, [resource]);

  const tabEnabled = (tab: Tab) => visitedTabs.has(tab);
  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const { data: amenitiesRaw, isLoading: amenitiesLoading } = useQuery({
    queryKey: ["resource-amenities", code],
    queryFn: () => resourceService.getResourceAmenities(code!),
    enabled: !!code && tabEnabled("amenities"),
  });
  const amenities: AmenityResponse[] = Array.isArray(amenitiesRaw)
    ? amenitiesRaw
    : [];

  const { data: allAmenitiesData } = useQuery({
    queryKey: ["all-amenities"],
    queryFn: () => resourceService.getAmenities({ size: 500 }),
    enabled: showAmenitiesList,
  });
  const allAmenities: AmenityResponse[] = allAmenitiesData?.content || [];

  const { data: pricingRulesData, isLoading: pricingLoading } = useQuery({
    queryKey: ["resource-pricing", code],
    queryFn: () =>
      resourceService.getPricingRules({ resourceCode: code!, size: 100 }),
    enabled: !!code && tabEnabled("pricing"),
  });
  const pricingRules: ResourcePricingRuleResponse[] =
    pricingRulesData?.content || [];

  const { data: availabilitiesData, isLoading: availabilityLoading } = useQuery(
    {
      queryKey: ["resource-availabilities", code],
      queryFn: () =>
        resourceService.getAvailabilities({ resourceCode: code!, size: 100 }),
      enabled: !!code && tabEnabled("availability"),
    },
  );
  const availabilities: ResourceAvailabilityResponse[] =
    availabilitiesData?.content || [];


  const { data: calendarData, isLoading: calLoading } = useQuery({
    queryKey: ["resource-calendar", code, calMonth],
    queryFn: () => {
      const [year, month] = calMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      return resourceService.getPublicCalendar(code!, {
        fromDate: `${calMonth}-01`,
        toDate: `${calMonth}-${String(lastDay).padStart(2, "0")}`,
      });
    },
    enabled: !!code && tabEnabled("calendar"),
  });

  const invalidateResource = () => {
    queryClient.invalidateQueries({ queryKey: ["resources"] });
    queryClient.invalidateQueries({ queryKey: ["resource", code] });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!code) return;
      await resourceService.updateResource(code, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        capacity: formData.capacity,
        zone: formData.zone.trim() || undefined,
        locationLabel: formData.locationLabel.trim() || undefined,
        bookingEnabled: formData.bookingEnabled,
        portalVisible: formData.portalVisible,
      });

      if (formData.typeId || formData.groupId || formData.policyId) {
        if (!formData.typeId)
          throw new Error(
            "Le type est requis pour modifier la classification.",
          );
        await resourceService.updateResourceClassification(code, {
          typeId: formData.typeId,
          groupId: formData.groupId || undefined,
          policyId: formData.policyId || undefined,
        });
      }

      await resourceService.updateResourceStatus(code, formData.status);
      await resourceService.updateResourceActive(code, formData.active);
      await resourceService.updateResourceDisplayOrder(
        code,
        formData.displayOrder,
      );
    },
    onSuccess: () => {
      invalidateResource();
      setIsEditing(false);
    },
    onError: (error: any) =>
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Erreur lors de la modification.",
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ResourceStatus) =>
      resourceService.updateResourceStatus(code!, status),
    onSuccess: invalidateResource,
  });
  const updateBookingEnabledMutation = useMutation({
    mutationFn: (bookingEnabled: boolean) =>
      resourceService.updateResourceBookingEnabled(code!, bookingEnabled),
    onSuccess: invalidateResource,
  });
  const updatePortalVisibleMutation = useMutation({
    mutationFn: (portalVisible: boolean) =>
      resourceService.updateResourcePortalVisible(code!, portalVisible),
    onSuccess: invalidateResource,
  });

  const linkAmenityMutation = useMutation({
    mutationFn: (amenityCode: string) =>
      resourceService.linkAmenity(code!, amenityCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-amenities", code] });
      setShowAmenitiesList(false);
    },
  });
  const unlinkAmenityMutation = useMutation({
    mutationFn: (amenityCode: string) =>
      resourceService.unlinkAmenity(code!, amenityCode),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resource-amenities", code] }),
  });
  const quoteMutation = useMutation({
    mutationFn: () =>
      resourceService.quotePrice({ resourceCode: code!, ...quoteForm }),
    onSuccess: (data) => {
      setQuoteResult(data);
      setQuoteError(null);
    },
    onError: (error: any) => {
      setQuoteResult(null);
      setQuoteError(
        error?.response?.data?.message || "Impossible de calculer le tarif.",
      );
    },
  });

  const selectedTypeLabel = useMemo(() => {
    return (
      types.find((t) => getEntityId(t) === formData.typeId)?.name ||
      resource?.typeCode ||
      "—"
    );
  }, [types, formData.typeId, resource?.typeCode]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !resource) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          Ressource introuvable.
        </div>
      </AdminLayout>
    );
  }

  const cfg = statusConfig[resource.status] || statusConfig.INACTIVE;

  return (
    <AdminLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate("/resources")}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Retour aux ressources
        </button>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {resource.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cfg.color}`}
              >
                {cfg.label}
              </span>
              {resource.bookingEnabled ? (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-100">
                  Réservable
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100">
                  Non réservable
                </span>
              )}
              {resource.portalVisible ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                  Visible portail
                </span>
              ) : (
                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-100">
                  Masqué
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">
              {resource.code}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X size={16} /> Annuler
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  Enregistrer
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Edit size={16} /> Modifier
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <button
          onClick={() =>
            updateBookingEnabledMutation.mutate(!resource.bookingEnabled)
          }
          className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
        >
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Réservation
            </span>
            <span className="text-xs text-gray-500">
              Activer ou bloquer les réservations
            </span>
          </span>
          <Power
            size={18}
            className={
              resource.bookingEnabled ? "text-green-600" : "text-red-600"
            }
          />
        </button>
        <button
          onClick={() =>
            updatePortalVisibleMutation.mutate(!resource.portalVisible)
          }
          className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
        >
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Portail
            </span>
            <span className="text-xs text-gray-500">
              Visibilité côté client
            </span>
          </span>
          {resource.portalVisible ? (
            <Eye size={18} className="text-blue-600" />
          ) : (
            <EyeOff size={18} className="text-gray-500" />
          )}
        </button>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Statut rapide
          </label>
          <select
            value={resource.status}
            onChange={(e) =>
              updateStatusMutation.mutate(e.target.value as ResourceStatus)
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
        <div className="flex min-w-max gap-1">
          {[
            ["info", "Informations", Settings],
            ["amenities", `Équipements (${amenities.length})`, Coffee],
            ["pricing", `Tarifs (${pricingRules.length})`, DollarSign],
            [
              "availability",
              `Disponibilités (${availabilities.length})`,
              CalendarDays,
            ],
            ["calendar", "Calendrier", CalendarDays],
          ].map(([id, label, Icon]: any) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeTab === id ? "bg-primary-600 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-5 font-semibold text-gray-900">
              Informations générales
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nom"
                editing={isEditing}
                value={resource.name}
                input={
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                }
              />
              <Field
                label="Capacité"
                editing={isEditing}
                value={String(resource.capacity ?? "—")}
                input={
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                }
              />
              <Field
                label="Zone"
                editing={isEditing}
                value={resource.zone || "—"}
                input={
                  <input
                    value={formData.zone}
                    onChange={(e) =>
                      setFormData({ ...formData, zone: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                }
              />
              <Field
                label="Emplacement"
                editing={isEditing}
                value={resource.locationLabel || "—"}
                input={
                  <input
                    value={formData.locationLabel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        locationLabel: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                }
              />
              <div className="md:col-span-2">
                <Field
                  label="Description"
                  editing={isEditing}
                  value={resource.description || "—"}
                  input={
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  }
                />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 font-semibold text-gray-900">
                Classification
              </h2>
              {isEditing ? (
                <div className="space-y-3">
                  <select
                    value={formData.typeId}
                    onChange={(e) =>
                      setFormData({ ...formData, typeId: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Type inchangé</option>
                    {types.map((t) => (
                      <option key={t.code} value={getEntityId(t)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.groupId}
                    onChange={(e) =>
                      setFormData({ ...formData, groupId: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Groupe inchangé</option>
                    {groups.map((g) => (
                      <option key={g.code} value={getEntityId(g)}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.policyId}
                    onChange={(e) =>
                      setFormData({ ...formData, policyId: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Politique inchangée</option>
                    {policies.map((p) => (
                      <option key={p.code} value={getEntityId(p)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <InfoLine label="Type" value={selectedTypeLabel} />
                  <InfoLine label="Groupe" value={resource.groupCode || "—"} />
                  <InfoLine
                    label="Politique"
                    value={resource.policyCode || "—"}
                  />
                </div>
              )}
            </section>
            {isEditing && (
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <h2 className="mb-4 font-semibold text-gray-900">Paramètres</h2>
                <div className="space-y-3">
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as ResourceStatus,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                    <span>Actif</span>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                    <span>Réservable</span>
                    <input
                      type="checkbox"
                      checked={formData.bookingEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bookingEnabled: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                    <span>Visible portail</span>
                    <input
                      type="checkbox"
                      checked={formData.portalVisible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          portalVisible: e.target.checked,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

      {activeTab === "amenities" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Équipements liés</h2>
              <p className="text-sm text-gray-500">
                Services et équipements disponibles avec cette ressource.
              </p>
            </div>
            <button
              onClick={() => setShowAmenitiesList(!showAmenitiesList)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {showAmenitiesList && (
            <div className="mb-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {allAmenities
                .filter((a) => !amenities.some((x) => x.code === a.code))
                .map((a) => (
                  <button
                    key={a.code}
                    onClick={() => linkAmenityMutation.mutate(a.code)}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-left text-sm hover:bg-primary-50"
                  >
                    <span className="font-medium text-gray-900">{a.name}</span>
                    <span className="block font-mono text-xs text-gray-400">
                      {a.code}
                    </span>
                  </button>
                ))}
            </div>
          )}
          {amenitiesLoading ? (
            <Loader2 size={22} className="animate-spin text-primary-600" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a) => (
                <div
                  key={a.code}
                  className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{a.name}</p>
                      <p className="font-mono text-xs text-gray-400">
                        {a.code}
                      </p>
                    </div>
                    <button
                      onClick={() => unlinkAmenityMutation.mutate(a.code)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Unlink size={15} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {a.description || "Aucune description"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "pricing" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Tarifs</h2>
              <p className="text-sm text-gray-500">
                Règles de prix appliquées à cette ressource.
              </p>
            </div>
          </div>
          {pricingLoading ? (
            <Loader2 size={22} className="animate-spin text-primary-600" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pricingRules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {r.label || bookingUnitLabels[r.bookingUnit]}
                      </p>
                      <p className="text-sm text-gray-500">
                        {bookingUnitLabels[r.bookingUnit] || r.bookingUnit}
                      </p>
                    </div>
                    <p className="font-semibold text-primary-700">
                      {r.price.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calculator size={16} className="text-primary-600" />
              <h3 className="font-medium text-gray-900">Calculer un tarif</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={quoteForm.bookingUnit}
                onChange={(e) =>
                  setQuoteForm((f) => ({
                    ...f,
                    bookingUnit: e.target.value as ResourceBookingUnit,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                {Object.entries(bookingUnitLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={quoteForm.startedAt}
                onChange={(e) =>
                  setQuoteForm((f) => ({ ...f, startedAt: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <input
                type="datetime-local"
                value={quoteForm.endedAt}
                onChange={(e) =>
                  setQuoteForm((f) => ({ ...f, endedAt: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <button
                onClick={() => quoteMutation.mutate()}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Calculer
              </button>
            </div>
            {quoteError && (
              <p className="mt-2 text-sm text-red-600">{quoteError}</p>
            )}
            {quoteResult && (
              <p className="mt-3 text-sm text-gray-700">
                Prix final :{" "}
                <span className="font-semibold text-primary-700">
                  {quoteResult.finalPrice?.toLocaleString("fr-FR")} FCFA
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {activeTab === "availability" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-5 font-semibold text-gray-900">Disponibilités</h2>
          {availabilityLoading ? (
            <Loader2 size={22} className="animate-spin text-primary-600" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {availabilities.slice(0, 30).map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(slot.startedAt).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-gray-500">
                    jusqu’à {new Date(slot.endedAt).toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Capacité restante : {slot.remainingCapacity}/
                    {slot.totalCapacity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "calendar" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {calLoading ? (
            <Loader2 size={22} className="animate-spin text-primary-600" />
          ) : (
            <ResourceAvailabilityCalendar
              month={calMonth}
              onMonthChange={setCalMonth}
              slots={(calendarData?.days || []).map((d: any, i: number) => ({
                id: i,
                resourceCode: code!,
                startedAt: `${d.date}T00:00:00`,
                endedAt: `${d.date}T23:59:59`,
                slotDurationMinutes: 0,
                totalCapacity: d.totalCapacity,
                remainingCapacity: d.remainingCapacity,
                available: d.status !== "FULL",
                active: true,
              }))}
              closures={[]}
            />
          )}
        </section>
      )}
    </AdminLayout>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  editing: boolean;
  input: React.ReactNode;
}> = ({ label, value, editing, input }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
    </label>
    {editing ? (
      input
    ) : (
      <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 ring-1 ring-gray-100">
        {value}
      </p>
    )}
  </div>
);

const InfoLine: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);
