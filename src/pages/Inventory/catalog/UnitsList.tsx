import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryUnit } from "../../../services/inventory.service";

const unitTypes = [
  { value: "COUNT", label: "Comptage" },
  { value: "WEIGHT", label: "Poids" },
  { value: "VOLUME", label: "Volume" },
  { value: "LENGTH", label: "Longueur" },
];

export const UnitsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<InventoryUnit | null>(null);
  const [formData, setFormData] = useState({
    unitCode: "",
    name: "",
    unitType: "COUNT" as InventoryUnit["unitType"],
    symbol: "",
  });

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["inventory-units"],
    queryFn: () => inventoryService.getUnits(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryService.createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateUnit(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteUnit(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
    },
  });

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenModal = (unit?: InventoryUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        unitCode: unit.code,
        name: unit.name,
        unitType: unit.unitType,
        symbol: unit.symbol || "",
      });
    } else {
      setEditingUnit(null);
      setFormData({ unitCode: "", name: "", unitType: "COUNT", symbol: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ code: editingUnit.code, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette unité ?")) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">
          Unités de mesure
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base"
        >
          <Plus size={20} />
          Nouvelle unité
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
          placeholder="Rechercher une unité..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Code</th>
              <th className="px-6 py-4 text-left font-semibold">Nom</th>
              <th className="px-6 py-4 text-left font-semibold">Type</th>
              <th className="px-6 py-4 text-left font-semibold">Symbole</th>
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUnits.map((unit) => (
              <tr key={unit.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{unit.code}</td>
                <td className="px-6 py-4 font-medium">{unit.name}</td>
                <td className="px-6 py-4">
                  {unitTypes.find((t) => t.value === unit.unitType)?.label}
                </td>
                <td className="px-6 py-4">{unit.symbol}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenModal(unit)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 mr-2"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(unit.code)}
                    className="p-1.5 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucune unité trouvée</p>
        </div>
      )}

      {/* Modal - AGRANDI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg">
            <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
              <h3 className="text-2xl font-bold">
                {editingUnit ? "Modifier l'unité" : "Nouvelle unité"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.unitCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitCode: e.target.value.toUpperCase(),
                    })
                  }
                  disabled={!!editingUnit}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 text-base"
                  placeholder="ex: PIECE"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-base"
                  placeholder="ex: Pièce"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.unitType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitType: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-base"
                >
                  {unitTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Symbole *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-base"
                  placeholder="ex: pcs"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-base"
                >
                  {editingUnit ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
