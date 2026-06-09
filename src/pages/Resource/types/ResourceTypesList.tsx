import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Tag } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceTypeResponse } from "../../../services/resource.service";
import { ResourceTypeFormModal } from "./ResourceTypeFormModal";

export const ResourceTypesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResourceTypeResponse | null>(
    null,
  );

  // Pas d'endpoint search par nom sur resource-types → charge tout et filtre client-side
  // size: 500 pour couvrir tous les types sans pagination (volume faible attendu)
  const { data: typesData, isLoading } = useQuery({
    queryKey: ["resource-types"],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResourceType(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-types"] });
      queryClient.invalidateQueries({ queryKey: ["resource-types-list"] });
    },
    onError: () =>
      alert(
        "Erreur lors de la suppression du type. Il est peut-être utilisé par des ressources.",
      ),
  });

  const types: ResourceTypeResponse[] = typesData?.content || [];

  const filteredTypes = search
    ? types.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.code.toLowerCase().includes(search.toLowerCase()),
      )
    : types;

  const handleDelete = (code: string) => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer ce type ? Cette action est irréversible.",
      )
    ) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Types de ressources
        </h2>
        <button
          onClick={() => {
            setEditingType(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau type
        </button>
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher un type par nom ou code..."
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
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Description
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
            {filteredTypes.map((type) => (
              <tr
                key={type.code}
                className={`hover:bg-gray-50 ${!type.active ? "opacity-60" : ""}`}
              >
                <td className="px-6 py-4 text-sm font-mono">{type.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{type.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {type.description || "—"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      type.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {type.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingType(type);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(type.code)}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
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

      {filteredTypes.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun type trouvé</p>
        </div>
      )}

      <ResourceTypeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingType(null);
        }}
        editingType={editingType}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["resource-types"] });
          setIsModalOpen(false);
          setEditingType(null);
        }}
      />
    </div>
  );
};
