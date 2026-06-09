import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Package,
  TrendingUp,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type {
  ReorderRule,
  InventoryItem,
} from "../../../services/inventory.service";

export const ReorderRulesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReorderRule | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    itemCode: "",
    locationCode: "",
    minimumQuantity: 10,
    reorderQuantity: 50,
    active: true,
  });
  const [itemSearch, setItemSearch] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["reorder-rules"],
    queryFn: () => inventoryService.getReorderRules(),
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["reorder-suggestions"],
    queryFn: () => inventoryService.getReorderSuggestions(),
    enabled: showSuggestions,
  });

  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-search", itemSearch],
    queryFn: () =>
      inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const rules = rulesData || [];
  const items = itemsData?.content || [];
  const suggestions = suggestionsData || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createReorderRule(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateReorderRule(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteReorderRule(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
    },
  });

  const filteredRules = rules.filter(
    (rule: ReorderRule) =>
      rule.itemName.toLowerCase().includes(search.toLowerCase()) ||
      rule.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      rule.locationName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenModal = (rule?: ReorderRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        itemCode: rule.itemCode,
        locationCode: rule.locationCode,
        minimumQuantity: rule.minimumQuantity,
        reorderQuantity: rule.reorderQuantity,
        active: rule.active,
      });
      setItemSearch(rule.itemName);
    } else {
      setEditingRule(null);
      setFormData({
        itemCode: "",
        locationCode: "",
        minimumQuantity: 10,
        reorderQuantity: 50,
        active: true,
      });
      setItemSearch("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setItemSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateMutation.mutate({ code: editingRule.ruleCode, data: formData });
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) {
      deleteMutation.mutate(code);
    }
  };

  const selectItem = (item: InventoryItem) => {
    setFormData({ ...formData, itemCode: item.itemCode });
    setItemSearch(item.name);
    setShowItemResults(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">
          Règles de réapprovisionnement
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-base font-medium"
          >
            <TrendingUp size={20} />
            Suggestions
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base font-medium"
          >
            <Plus size={20} />
            Nouvelle règle
          </button>
        </div>
      </div>

      {/* Recherche - AGRANDIE */}
      <div className="relative mb-8">
        <Search
          size={20}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher une règle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
        />
      </div>

      {/* Suggestions de réapprovisionnement - AGRANDIES */}
      {showSuggestions && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-5">
            Suggestions de réapprovisionnement
          </h3>
          <div className="space-y-4">
            {suggestions.map((suggestion: any) => (
              <div
                key={suggestion.suggestionCode}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div>
                    <p className="font-semibold text-base">
                      {suggestion.itemName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock actuel: {suggestion.currentQuantity} / Seuil:{" "}
                      {suggestion.minimumQuantity}
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantité suggérée: {suggestion.suggestedOrderQuantity}
                    </p>
                    <p className="text-base font-semibold text-primary-600 mt-1">
                      Coût estimé:{" "}
                      {suggestion.estimatedOrderCost?.toLocaleString() || 0}{" "}
                      FCFA
                    </p>
                  </div>
                  <button className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-base font-medium">
                    Créer une demande d'achat
                  </button>
                </div>
              </div>
            ))}
            {suggestions.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-base">
                  Aucune suggestion de réapprovisionnement
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liste des règles - AGRANDIE */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Article</th>
              <th className="px-6 py-4 text-left font-semibold">Emplacement</th>
              <th className="px-6 py-4 text-right font-semibold">Seuil min</th>
              <th className="px-6 py-4 text-right font-semibold">
                Qté réappro
              </th>
              <th className="px-6 py-4 text-center font-semibold">Actif</th>
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRules.map((rule: ReorderRule) => (
              <tr key={rule.ruleCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">
                  {rule.itemName} ({rule.itemCode})
                </td>
                <td className="px-6 py-4">{rule.locationName}</td>
                <td className="px-6 py-4 text-right font-medium">
                  {rule.minimumQuantity}
                </td>
                <td className="px-6 py-4 text-right">{rule.reorderQuantity}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs ${rule.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {rule.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenModal(rule)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 mr-2"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.ruleCode)}
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

      {filteredRules.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-base">
            Aucune règle de réapprovisionnement configurée
          </p>
        </div>
      )}

      {/* Modal de création/édition - AGRANDI */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          <div className="relative bg-white rounded-2xl w-full max-w-lg">
            <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-2xl font-bold">
                {editingRule ? "Modifier" : "Nouvelle"} règle
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
                  Article *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemResults(true);
                    }}
                    placeholder="Rechercher un article..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                  />
                  {showItemResults && items.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {items.map((item: InventoryItem) => (
                        <button
                          key={item.itemCode}
                          type="button"
                          onClick={() => selectItem(item)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b text-base"
                        >
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.itemCode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Emplacement *
                </label>
                <select
                  value={formData.locationCode}
                  onChange={(e) =>
                    setFormData({ ...formData, locationCode: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                >
                  <option value="">Sélectionner</option>
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Seuil minimum *
                  </label>
                  <input
                    type="number"
                    value={formData.minimumQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumQuantity: Number(e.target.value) || 0,
                      })
                    }
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Quantité de réappro *
                  </label>
                  <input
                    type="number"
                    value={formData.reorderQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reorderQuantity: Number(e.target.value) || 0,
                      })
                    }
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                  />
                </div>
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
                    !formData.itemCode ||
                    !formData.locationCode ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-base font-medium"
                >
                  {editingRule ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
