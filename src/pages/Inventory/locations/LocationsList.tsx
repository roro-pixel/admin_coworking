import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Power, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryLocation } from "../../../services/inventory.service";

const locationTypes = [
  { value: "WAREHOUSE", label: "Entrepôt" },
  { value: "OFFICE", label: "Bureau" },
  { value: "ROOM", label: "Salle" },
  { value: "ZONE", label: "Zone" },
  { value: "VIRTUAL", label: "Virtuel" },
];

export const LocationsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<InventoryLocation | null>(null);
  const [formData, setFormData] = useState({
    locationCode: "",
    name: "",
    locationType: "WAREHOUSE" as InventoryLocation["locationType"],
    description: "",
    active: true,
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateLocation(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.activateLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deactivateLocation(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
    },
  });

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.locationCode.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenModal = (location?: InventoryLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        locationCode: location.locationCode,
        name: location.name,
        locationType: location.locationType,
        description: location.description || "",
        active: location.active,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        locationCode: "",
        name: "",
        locationType: "WAREHOUSE",
        description: "",
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({
        code: editingLocation.locationCode,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (location: InventoryLocation) => {
    if (location.active) {
      deactivateMutation.mutate(location.locationCode);
    } else {
      activateMutation.mutate(location.locationCode);
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet emplacement ?")) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-lg sm:text-xl sm:text-2xl font-semibold text-gray-900">Emplacements</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2.5 sm:px-5 rounded-2xl hover:bg-primary-700 flex items-center gap-2 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Nouvel emplacement
        </button>
      </div>

      {/* Recherche - AGRANDIE */}
      <div className="relative mb-8">
        <Search
          size={20}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher un emplacement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm sm:text-base block md:table">
          <thead className="bg-gray-50 ring-1 ring-gray-100 hidden md:table-header-group">
            <tr>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Code</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Nom</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Type</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Description</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Statut</th>
              <th className="px-6 py-4 text-right font-semibold hidden md:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="space-y-2 md:space-y-0 block md:table-row-group">
            {filteredLocations.map((loc) => (
              <tr key={loc.locationCode} className="hover:bg-gray-50 block md:table-row rounded-3xl bg-white p-4 mb-3 shadow-sm ring-1 ring-gray-100">
                <td className="px-6 py-4 font-mono text-sm flex justify-between gap-4 md:table-cell text-sm">
                  {loc.locationCode}
                </td>
                <td className="px-6 py-4 font-medium flex justify-between gap-4 md:table-cell text-sm">{loc.name}</td>
                <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">
                  {
                    locationTypes.find((t) => t.value === loc.locationType)
                      ?.label
                  }
                </td>
                <td className="px-6 py-4 text-gray-500 flex justify-between gap-4 md:table-cell text-sm">
                  {loc.description || "-"}
                </td>
                <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs ${loc.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {loc.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-between gap-4 md:table-cell text-sm">
                  <button
                    onClick={() => handleOpenModal(loc)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 mr-1"
                    title="Modifier"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(loc)}
                    className="p-1.5 text-yellow-600 hover:text-yellow-800 mr-1"
                    title={loc.active ? "Désactiver" : "Activer"}
                  >
                    <Power size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(loc.locationCode)}
                    className="p-1.5 text-red-600 hover:text-red-800"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <p className="text-gray-500 text-sm sm:text-base">Aucun emplacement trouvé</p>
        </div>
      )}

      {/* Modal - AGRANDI */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          <div className="relative bg-white rounded-3xl w-full max-w-lg">
            <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
              <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">
                {editingLocation
                  ? "Modifier l'emplacement"
                  : "Nouvel emplacement"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-2xl"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.locationCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationCode: e.target.value.toUpperCase(),
                    })
                  }
                  disabled={!!editingLocation}
                  required
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 text-sm sm:text-base"
                  placeholder="ex: ENTREPOT-A"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationType: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                >
                  {locationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="rounded w-5 h-5"
                />
                <span className="text-base">Actif</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
                >
                  {editingLocation ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
