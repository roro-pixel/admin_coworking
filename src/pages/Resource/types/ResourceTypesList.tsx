import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  Layers,
  CheckCircle2,
  Archive,
} from "lucide-react";
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

  const activeCount = types.filter((type) => type.active).length;
  const inactiveCount = types.length - activeCount;

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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Types de ressources
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Organisez les espaces par typologie : bureaux, salles, postes ou zones dédiées.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingType(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Nouveau type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total</p>
            <Layers size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{types.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">Actifs</p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700 mt-2">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Inactifs</p>
            <Archive size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-700 mt-2">
            {inactiveCount}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un type par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {filteredTypes.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
          <Tag size={46} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Aucun type trouvé</p>
          <p className="text-sm text-gray-400 mt-1">
            Modifiez votre recherche ou créez un nouveau type.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 p-2">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Statut
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((type) => (
                  <tr
                    key={type.code}
                    className={`group bg-gray-50/60 hover:bg-primary-50/40 transition-colors ${
                      !type.active ? "opacity-70" : ""
                    }`}
                  >
                    <td className="px-4 py-4 rounded-l-2xl">
                      <p className="text-sm font-semibold text-gray-900">
                        {type.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {type.code}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xl">
                      {type.description || "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          type.active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {type.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(type.code)}
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
