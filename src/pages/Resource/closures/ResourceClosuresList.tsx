import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Search,
  X,
  Loader2,
  Calendar,
  Power,
  Clock,
  Lock,
  Unlock,
  CalendarOff,
} from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceClosureResponse,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const buildDefaultFormData = (resourceCode: string = "") => ({
  resourceCode,
  startedAt: "",
  endedAt: "",
  reason: "",
  active: true,
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getDurationLabel = (startedAt: string, endedAt: string) => {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
};

export const ResourceClosuresList: React.FC = () => {
  const queryClient = useQueryClient();

  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedResourceSummary, setSelectedResourceSummary] =
    useState<ResourceSummaryResponse | null>(null);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData());

  useEffect(() => {
    if (isModalOpen) {
      setFormData(buildDefaultFormData(resourceFilter));
      setErrorMessage(null);
    }
  }, [isModalOpen, resourceFilter]);

  const { data: closuresData, isLoading } = useQuery({
    queryKey: ["resource-closures", resourceFilter],
    queryFn: () =>
      resourceService.getClosures({
        resourceCode: resourceFilter || undefined,
        size: 200,
      }),
  });

  const closures: ResourceClosureResponse[] = closuresData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createClosure({
        resourceCode: formData.resourceCode,
        startedAt: formData.startedAt,
        endedAt: formData.endedAt,
        reason: formData.reason || undefined,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-closures"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création de la fermeture.",
      );
    },
  });

  const updateActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      resourceService.updateClosureActive(id, active),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resource-closures"] }),
    onError: () => alert("Erreur lors de la mise à jour du statut."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceService.deleteClosure(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resource-closures"] }),
    onError: () => alert("Erreur lors de la suppression de la fermeture."),
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

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette fermeture ?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredClosures = search
    ? closures.filter(
        (c) =>
          c.resourceCode.toLowerCase().includes(search.toLowerCase()) ||
          (c.reason || "").toLowerCase().includes(search.toLowerCase()),
      )
    : closures;

  const getResourceName = (code: string) =>
    selectedResourceSummary?.code === code
      ? selectedResourceSummary.name
      : code;

  const activeCount = closures.filter((closure) => closure.active).length;
  const inactiveCount = closures.length - activeCount;
  const upcomingCount = closures.filter(
    (closure) => closure.active && new Date(closure.startedAt) > new Date(),
  ).length;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Fermetures de ressources
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Planifiez les indisponibilités liées à la maintenance, aux
            événements ou aux exceptions.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Nouvelle fermeture
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total</p>
            <CalendarOff size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {closures.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">Actives</p>
            <Lock size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700 mt-2">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-700">À venir</p>
            <Clock size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {upcomingCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Inactives</p>
            <Unlock size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-700 mt-2">
            {inactiveCount}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-80">
            <ResourceAutocomplete
              selectedResource={selectedResourceSummary}
              selectedCode={resourceFilter}
              onSelect={(resource) => {
                setSelectedResourceSummary(resource);
                setResourceFilter(resource?.code || "");
              }}
              placeholder="Filtrer par ressource..."
            />
          </div>
          {!resourceFilter && (
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Filtrer par code ressource ou motif..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}
          {(resourceFilter || search) && (
            <button
              onClick={() => {
                setResourceFilter("");
                setSelectedResourceSummary(null);
                setSearch("");
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {filteredClosures.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
          <Calendar size={46} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Aucune fermeture trouvée</p>
          <p className="text-sm text-gray-400 mt-1">
            Sélectionnez une autre ressource ou créez une fermeture.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 p-2">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2 text-left font-semibold">
                    Ressource
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">Période</th>
                  <th className="px-4 py-2 text-left font-semibold">Motif</th>
                  <th className="px-4 py-2 text-center font-semibold">Durée</th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Statut
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClosures.map((closure) => (
                  <tr
                    key={closure.id}
                    className={`group bg-gray-50/60 hover:bg-primary-50/40 transition-colors ${
                      !closure.active ? "opacity-70" : ""
                    }`}
                  >
                    <td className="px-4 py-4 rounded-l-2xl">
                      <p className="text-sm font-semibold text-gray-900">
                        {getResourceName(closure.resourceCode)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {closure.resourceCode} · #{closure.id}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-800">
                        {formatDateTime(closure.startedAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        jusqu’au {formatDateTime(closure.endedAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-md">
                      {closure.reason || "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {getDurationLabel(closure.startedAt, closure.endedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() =>
                          updateActiveMutation.mutate({
                            id: closure.id,
                            active: !closure.active,
                          })
                        }
                        disabled={updateActiveMutation.isPending}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium disabled:opacity-40 ${
                          closure.active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title={closure.active ? "Désactiver" : "Activer"}
                      >
                        {closure.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            updateActiveMutation.mutate({
                              id: closure.id,
                              active: !closure.active,
                            })
                          }
                          disabled={updateActiveMutation.isPending}
                          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          title={closure.active ? "Désactiver" : "Activer"}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(closure.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)} size="lg">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <CalendarOff size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Nouvelle fermeture
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Créez une période pendant laquelle une ressource ne pourra
                    pas être réservée.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errorMessage}
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date de début *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startedAt}
                    onChange={(e) =>
                      setFormData({ ...formData, startedAt: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="ex: Maintenance, événement exceptionnel..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, active: !formData.active })
              }
              className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between transition-colors ${
                formData.active
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-50 text-gray-500"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Lock size={17} />
                Fermeture active immédiatement
              </span>
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.active ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    formData.active ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
            </button>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !formData.resourceCode}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};
