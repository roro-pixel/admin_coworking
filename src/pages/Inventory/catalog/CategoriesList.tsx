import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryCategory } from "../../../services/inventory.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

export const CategoriesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<InventoryCategory | null>(null);
  const [formData, setFormData] = useState({
    categoryCode: "",
    name: "",
    description: "",
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => inventoryService.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateCategory(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteCategory(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
    },
  });

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      (cat.code || cat.categoryCode || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const handleOpenModal = (category?: InventoryCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        categoryCode: category.categoryCode || category.code || "",
        name: category.name,
        description: category.description || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ categoryCode: "", name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ categoryCode: "", name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({
        code: editingCategory.categoryCode || editingCategory.code || "",
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
          Catégories d'articles
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto justify-center bg-primary-600 text-white px-4 py-3 rounded-2xl hover:bg-primary-700 flex items-center gap-2 text-sm sm:text-base"
        >
          <Plus size={20} />
          Nouvelle catégorie
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
          placeholder="Rechercher une catégorie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl outline-none transition focus:ring-4 focus:ring-primary-100 text-sm sm:text-base"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm sm:text-base">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-4 text-left font-semibold">Code</th>
                <th className="px-4 py-4 text-left font-semibold">Nom</th>
                <th className="px-4 py-4 text-left font-semibold">
                  Description
                </th>
                <th className="px-4 py-4 text-left font-semibold">Articles</th>
                <th className="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {filteredCategories.map((cat) => (
                <tr
                  key={cat.categoryCode || cat.code}
                  className="transition hover:bg-gray-50/70"
                >
                  <td className="px-4 py-4 font-mono text-sm">
                    {cat.categoryCode || cat.code}
                  </td>
                  <td className="px-4 py-4 font-medium">{cat.name}</td>
                  <td className="px-4 py-4 text-gray-500">
                    {cat.description || "-"}
                  </td>
                  <td className="px-4 py-4">{cat.itemCount || 0}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(cat)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 mr-2"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(cat.categoryCode || cat.code || "")
                      }
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
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl">
          <p className="text-gray-500 text-sm sm:text-base">Aucune catégorie trouvée</p>
        </div>
      )}

      {/* ========== MODAL AVEC ModalPortal - AGRANDI ========== */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          <div className="sticky top-0 bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
            <h3 className="text-xl sm:text-2xl font-bold">
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </h3>
            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-gray-100 rounded-2xl"
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Code *
              </label>
              <input
                type="text"
                value={formData.categoryCode}
                onChange={(e) =>
                  setFormData({ ...formData, categoryCode: e.target.value })
                }
                disabled={!!editingCategory}
                required
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl outline-none transition focus:ring-4 focus:ring-primary-100 disabled:bg-gray-100 text-sm sm:text-base"
                placeholder="ex: MOBILIER"
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
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl outline-none transition focus:ring-4 focus:ring-primary-100 text-sm sm:text-base"
                placeholder="ex: Mobilier"
              />
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
                rows={4}
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl outline-none transition focus:ring-4 focus:ring-primary-100 text-sm sm:text-base"
                placeholder="Description optionnelle"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row pt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-5 py-3 ring-1 ring-gray-100 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 justify-center bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {editingCategory ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};
