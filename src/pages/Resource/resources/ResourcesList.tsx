import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceResponse,
  ResourceTypeResponse,
  ResourceGroupResponse,
  ResourceStatus,
} from "../../../services/resource.service";

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

const PAGE_SIZE = 20;

export const ResourcesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ["resources", page, typeFilter, groupFilter, statusFilter],
    queryFn: () =>
      resourceService.getResources({
        typeCode: typeFilter || undefined,
        groupCode: groupFilter || undefined,
        status: (statusFilter || undefined) as ResourceStatus | undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const { data: typesData } = useQuery({
    queryKey: ["resource-types-list"],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ["resource-groups-list"],
    queryFn: () => resourceService.getResourceGroups(),
  });

  const resources = (resourcesData?.content || []) as ResourceResponse[];
  const types: ResourceTypeResponse[] = typesData?.content || [];
  const groups: ResourceGroupResponse[] = groupsData?.content || [];
  const totalPages = resourcesData?.totalPages ?? 0;
  const totalElements = resourcesData?.totalElements ?? 0;

  const filteredResources = search
    ? resources.filter(
        (res) =>
          res.name.toLowerCase().includes(search.toLowerCase()) ||
          res.code.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResource(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: () => alert("Erreur lors de la suppression de la ressource."),
  });

  const updateBookingEnabledMutation = useMutation({
    mutationFn: ({
      code,
      bookingEnabled,
    }: {
      code: string;
      bookingEnabled: boolean;
    }) => resourceService.updateResourceBookingEnabled(code, bookingEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: () => alert("Erreur lors de la mise à jour de la réservabilité."),
  });

  const updatePortalVisibleMutation = useMutation({
    mutationFn: ({
      code,
      portalVisible,
    }: {
      code: string;
      portalVisible: boolean;
    }) => resourceService.updateResourcePortalVisible(code, portalVisible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: () => alert("Erreur lors de la mise à jour de la visibilité."),
  });

  const updateActiveMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      resourceService.updateResourceActive(code, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: () => alert("Erreur lors de la mise à jour du statut actif."),
  });

  const updateDisplayOrderMutation = useMutation({
    mutationFn: ({
      code,
      displayOrder,
    }: {
      code: string;
      displayOrder: number;
    }) => resourceService.updateResourceDisplayOrder(code, displayOrder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: () =>
      alert("Erreur lors de la mise à jour de l'ordre d'affichage."),
  });

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette ressource ?")) {
      deleteMutation.mutate(code);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setGroupFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const hasActiveFilters = search || typeFilter || groupFilter || statusFilter;

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ressources</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les espaces, salles, bureaux et ressources réservables.
          </p>
        </div>
        <button
          onClick={() => navigate("/resources/create")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouvelle ressource
        </button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Metric label="Ressources" value={totalElements} />
        <Metric
          label="Actives"
          value={resources.filter((r) => r.active).length}
        />
        <Metric
          label="Réservables"
          value={resources.filter((r) => r.bookingEnabled).length}
        />
        <Metric
          label="Visibles portail"
          value={resources.filter((r) => r.portalVisible).length}
        />
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              showFilters || hasActiveFilters
                ? "border-primary-200 bg-primary-50 text-primary-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter size={16} />
            Filtres
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary-600" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <select
              value={typeFilter}
              onChange={(e) =>
                handleFilterChange(setTypeFilter, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Tous les types</option>
              {types.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              value={groupFilter}
              onChange={(e) =>
                handleFilterChange(setGroupFilter, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Tous les groupes</option>
              {groups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(statusConfig).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-semibold">Ressource</th>
              <th className="px-4 py-2 text-left font-semibold">
                Classification
              </th>
              <th className="px-4 py-2 text-center font-semibold">Capacité</th>
              <th className="px-4 py-2 text-center font-semibold">Statut</th>
              <th className="px-4 py-2 text-center font-semibold">Portail</th>
              <th className="px-4 py-2 text-center font-semibold">Ordre</th>
              <th className="px-4 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((res) => {
              const cfg = statusConfig[res.status] || statusConfig.INACTIVE;
              return (
                <tr
                  key={res.code}
                  onClick={() => navigate(`/resources/${res.code}`)}
                  className={`group cursor-pointer rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md ${!res.active ? "opacity-60" : ""}`}
                >
                  <td className="rounded-l-2xl px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{res.name}</p>
                        <p className="font-mono text-xs text-gray-400">
                          {res.code}
                        </p>
                        {res.locationLabel && (
                          <p className="text-xs text-gray-500">
                            {res.locationLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <p className="font-mono text-xs text-gray-500">
                      Type : {res.typeCode || "—"}
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      Groupe : {res.groupCode || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900">
                    {res.capacity ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePortalVisibleMutation.mutate({
                          code: res.code,
                          portalVisible: !res.portalVisible,
                        });
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${res.portalVisible ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}
                    >
                      {res.portalVisible ? (
                        <Eye size={13} />
                      ) : (
                        <EyeOff size={13} />
                      )}
                      {res.portalVisible ? "Visible" : "Masqué"}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center rounded-xl bg-gray-50 p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDisplayOrderMutation.mutate({
                            code: res.code,
                            displayOrder: (res.displayOrder ?? 0) - 1,
                          });
                        }}
                        className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <span className="px-2 text-xs font-medium text-gray-600">
                        {res.displayOrder ?? 0}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDisplayOrderMutation.mutate({
                            code: res.code,
                            displayOrder: (res.displayOrder ?? 0) + 1,
                          });
                        }}
                        className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBookingEnabledMutation.mutate({
                            code: res.code,
                            bookingEnabled: !res.bookingEnabled,
                          });
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        title="Réservabilité"
                      >
                        {res.bookingEnabled ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateActiveMutation.mutate({
                            code: res.code,
                            active: !res.active,
                          });
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        title="Actif/Inactif"
                      >
                        {res.active ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(res.code);
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredResources.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
          <Building2 size={42} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Aucune ressource trouvée</p>
          <p className="text-sm text-gray-500">
            Essayez de modifier les filtres ou créez une nouvelle ressource.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">{totalElements} ressource(s)</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-2xl font-bold text-gray-900">
      {value.toLocaleString("fr-FR")}
    </p>
  </div>
);
