import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { AmenityResponse } from "../../../services/resource.service";
import { AmenityFormModal } from "./AmenityFormModal";

export const AmenitiesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityResponse | null>(
    null,
  );

  // CORRECTION : size: 500 (faible volume, pas de pagination nécessaire)
  const { data: amenitiesData, isLoading } = useQuery({
    queryKey: ["resource-amenities"],
    queryFn: () => resourceService.getAmenities({ size: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteAmenity(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-amenities"] });
      queryClient.invalidateQueries({ queryKey: ["all-amenities"] });
    },
    onError: () =>
      alert(
        "Erreur lors de la suppression. Cet équipement est peut-être associé à des ressources.",
      ),
  });

  const amenities: AmenityResponse[] = amenitiesData?.content || [];

  const filteredAmenities = search
    ? amenities.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()),
      )
    : amenities;

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet équipement ?")) {
      deleteMutation.mutate(code);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Équipements</h2>
        <button
          onClick={() => {
            setEditingAmenity(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvel équipement
        </button>
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher par nom ou code..."
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
                Qté
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Optionnel
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Supplément
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
            {filteredAmenities.map((amenity) => (
              <tr
                key={amenity.code}
                className={`hover:bg-gray-50 ${!amenity.active ? "opacity-60" : ""}`}
              >
                <td className="px-6 py-4 text-sm font-mono">{amenity.code}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  {amenity.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {amenity.description || "—"}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {amenity.quantity ?? 1}
                </td>
                <td className="px-6 py-4 text-center">
                  {amenity.optional ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                      Optionnel
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                      Inclus
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  {amenity.extraPrice && amenity.extraPrice > 0 ? (
                    <span className="text-orange-600 font-medium">
                      +{amenity.extraPrice.toLocaleString("fr-FR")} FCFA
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      amenity.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {amenity.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingAmenity(amenity);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(amenity.code)}
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

      {filteredAmenities.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun équipement trouvé</p>
        </div>
      )}

      <AmenityFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAmenity(null);
        }}
        editingAmenity={editingAmenity}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["resource-amenities"] });
          setIsModalOpen(false);
          // CORRECTION : reset editingAmenity après succès
          setEditingAmenity(null);
        }}
      />
    </div>
  );
};
