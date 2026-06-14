import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, Package, CheckCircle, XCircle } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { AmenityResponse } from "../../../services/resource.service";
import { AmenityFormModal } from "./AmenityFormModal";
import { AmenityDetailModal } from "./AmenityDetailModal";

export const AmenitiesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityResponse | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityResponse | null>(null);

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
    onError: () => alert("Erreur lors de la suppression. Cet équipement est peut-être associé à des ressources."),
  });

  const amenities: AmenityResponse[] = amenitiesData?.content || [];
  const filteredAmenities = search
    ? amenities.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()))
    : amenities;

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet équipement ?")) deleteMutation.mutate(code);
  };

  const openDetail = (amenity: AmenityResponse) => {
    setSelectedAmenity(amenity);
    setIsDetailOpen(true);
  };

  const openEdit = (amenity: AmenityResponse) => {
    setIsDetailOpen(false);
    setEditingAmenity(amenity);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Équipements</h2>
          <p className="mt-1 text-sm text-gray-500">Gérez le référentiel des équipements associables aux ressources.</p>
        </div>
        <button onClick={() => { setEditingAmenity(null); setIsModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
          <Plus size={18} /> Nouvel équipement
        </button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Metric label="Équipements" value={amenities.length} />
        <Metric label="Actifs" value={amenities.filter((a) => a.active).length} />
        <Metric label="Avec supplément" value={amenities.filter((a) => (a.extraPrice ?? 0) > 0).length} />
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom ou code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-semibold">Équipement</th>
              <th className="px-4 py-2 text-center font-semibold">Quantité</th>
              <th className="px-4 py-2 text-center font-semibold">Option</th>
              <th className="px-4 py-2 text-right font-semibold">Supplément</th>
              <th className="px-4 py-2 text-center font-semibold">Statut</th>
              <th className="px-4 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAmenities.map((amenity) => (
              <tr key={amenity.code} onClick={() => openDetail(amenity)} className={`cursor-pointer bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md ${!amenity.active ? "opacity-60" : ""}`}>
                <td className="rounded-l-2xl px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary-50 p-2 text-primary-600"><Package size={18} /></div>
                    <div>
                      <p className="font-medium text-gray-900">{amenity.name}</p>
                      <p className="font-mono text-xs text-gray-400">{amenity.code}</p>
                      {amenity.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{amenity.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-sm font-medium text-gray-700">{amenity.quantity ?? "—"}</td>
                <td className="px-4 py-4 text-center"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${amenity.optional ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}`}>{amenity.optional ? "Optionnel" : "Inclus"}</span></td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">{(amenity.extraPrice ?? 0).toLocaleString("fr-FR")} FCFA</td>
                <td className="px-4 py-4 text-center"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${amenity.active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>{amenity.active ? <CheckCircle size={13} /> : <XCircle size={13} />}{amenity.active ? "Actif" : "Inactif"}</span></td>
                <td className="rounded-r-2xl px-4 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); handleDelete(amenity.code); }} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAmenities.length === 0 && <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100"><Package size={42} className="mx-auto mb-3 text-gray-300" /><p className="font-medium text-gray-700">Aucun équipement trouvé</p></div>}

      <AmenityFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAmenity(null); }} editingAmenity={editingAmenity} onSuccess={() => { setIsModalOpen(false); setEditingAmenity(null); }} />
      <AmenityDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} amenity={selectedAmenity} onEdit={openEdit} />
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString("fr-FR")}</p>
  </div>
);
