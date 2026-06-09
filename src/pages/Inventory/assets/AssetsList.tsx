import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Eye, X } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Asset, InventoryItem } from "../../../services/inventory.service";
import { AssetDetailModal } from "./AssetDetailModal";
import { ModalPortal } from "../../../components/ui/ModalPortal";

const statusOptions = [
  {
    value: "AVAILABLE",
    label: "Disponible",
    color: "bg-green-100 text-green-700",
  },
  { value: "RESERVED", label: "Réservé", color: "bg-blue-100 text-blue-700" },
  {
    value: "ASSIGNED",
    label: "Attribué",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "IN_USE",
    label: "En utilisation",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "IN_MAINTENANCE",
    label: "En maintenance",
    color: "bg-orange-100 text-orange-700",
  },
  { value: "LOST", label: "Perdu", color: "bg-red-100 text-red-700" },
  { value: "RETIRED", label: "Retiré", color: "bg-gray-100 text-gray-700" },
  { value: "DAMAGED", label: "Endommagé", color: "bg-red-100 text-red-700" },
];

const conditionOptions = [
  { value: "NEW", label: "Neuf", color: "bg-green-100 text-green-700" },
  { value: "GOOD", label: "Bon", color: "bg-blue-100 text-blue-700" },
  { value: "FAIR", label: "Correct", color: "bg-yellow-100 text-yellow-700" },
  { value: "POOR", label: "Mauvais", color: "bg-orange-100 text-orange-700" },
  { value: "DAMAGED", label: "Endommagé", color: "bg-red-100 text-red-700" },
];

export const AssetsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    assetCode: "",
    itemCode: "",
    serialNumber: "",
    assetTag: "",
    status: "AVAILABLE" as Asset["status"],
    condition: "NEW" as Asset["condition"],
    locationCode: "",
    purchaseDate: "",
    purchaseCost: 0,
    warrantyEndDate: "",
    usefulLifeMonths: 60,
    residualValue: 0,
    notes: "",
  });
  const [itemSearch, setItemSearch] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["assets", statusFilter, locationFilter],
    queryFn: () =>
      inventoryService.getAssets({
        status: statusFilter || undefined,
        locationCode: locationFilter || undefined,
        size: 100,
      }),
  });

  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-assets", itemSearch],
    queryFn: () =>
      inventoryService.getItems({
        query: itemSearch || undefined,
        itemType: "ASSET",
        size: 20,
      }),
    enabled: itemSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const assets = assetsData?.content || [];
  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createAsset(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) =>
      inventoryService.updateAsset(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteAsset(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const filteredAssets = assets.filter(
    (asset: Asset) =>
      asset.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      asset.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      (asset.serialNumber &&
        asset.serialNumber.toLowerCase().includes(search.toLowerCase())),
  );

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        assetCode: asset.assetCode,
        itemCode: asset.itemCode,
        serialNumber: asset.serialNumber || "",
        assetTag: asset.assetTag || "",
        status: asset.status,
        condition: asset.condition,
        locationCode: asset.locationCode,
        purchaseDate: asset.purchaseDate?.split("T")[0] || "",
        purchaseCost: asset.purchaseCost,
        warrantyEndDate: asset.warrantyEndDate?.split("T")[0] || "",
        usefulLifeMonths: asset.usefulLifeMonths || 60,
        residualValue: asset.residualValue || 0,
        notes: asset.notes || "",
      });
    } else {
      setEditingAsset(null);
      setFormData({
        assetCode: "",
        itemCode: "",
        serialNumber: "",
        assetTag: "",
        status: "AVAILABLE",
        condition: "NEW",
        locationCode: "",
        purchaseDate: "",
        purchaseCost: 0,
        warrantyEndDate: "",
        usefulLifeMonths: 60,
        residualValue: 0,
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setItemSearch("");
  };

  const handleViewDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsset) {
      updateMutation.mutate({ code: editingAsset.assetCode, data: formData });
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet actif ?")) {
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
        <h2 className="text-2xl font-semibold text-gray-900">Actifs</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base"
        >
          <Plus size={20} />
          Nouvel actif
        </button>
      </div>

      {/* Filtres - AGRANDIS */}
      <div className="flex flex-col md:flex-row gap-5 mb-8">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un actif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-lg bg-white text-base min-w-[180px]"
        >
          <option value="">Tous les statuts</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-lg bg-white text-base min-w-[200px]"
        >
          <option value="">Tous les emplacements</option>
          {locations.map((loc: any) => (
            <option key={loc.locationCode} value={loc.locationCode}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Code</th>
                <th className="px-5 py-4 text-left font-semibold">Article</th>
                <th className="px-5 py-4 text-left font-semibold">Série/Tag</th>
                <th className="px-5 py-4 text-left font-semibold">
                  Emplacement
                </th>
                <th className="px-5 py-4 text-left font-semibold">Statut</th>
                <th className="px-5 py-4 text-left font-semibold">Condition</th>
                <th className="px-5 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAssets.map((asset: Asset) => (
                <tr key={asset.assetCode} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm">
                    {asset.assetCode}
                  </td>
                  <td className="px-5 py-4 font-medium">{asset.itemName}</td>
                  <td className="px-5 py-4">
                    {asset.serialNumber || asset.assetTag || "-"}
                  </td>
                  <td className="px-5 py-4">{asset.locationName}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs ${statusOptions.find((s) => s.value === asset.status)?.color}`}
                    >
                      {
                        statusOptions.find((s) => s.value === asset.status)
                          ?.label
                      }
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs ${conditionOptions.find((c) => c.value === asset.condition)?.color}`}
                    >
                      {
                        conditionOptions.find(
                          (c) => c.value === asset.condition,
                        )?.label
                      }
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewDetail(asset)}
                        className="p-1.5 text-gray-600 hover:text-primary-600"
                        title="Voir détail"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(asset)}
                        className="p-1.5 text-blue-600 hover:text-blue-800"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.assetCode)}
                        className="p-1.5 text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucun actif trouvé</p>
        </div>
      )}

      {/* ========== MODAL CRÉATION/ÉDITION AVEC ModalPortal - AGRANDI ========== */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="4xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">
              {editingAsset ? "Modifier" : "Nouvel"} actif
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
                        <p className="text-sm text-gray-500">{item.itemCode}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Numéro de série
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Tag
                </label>
                <input
                  type="text"
                  value={formData.assetTag}
                  onChange={(e) =>
                    setFormData({ ...formData, assetTag: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
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
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Coût d'achat (FCFA)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.purchaseCost === 0 ? "" : formData.purchaseCost
                  }
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      purchaseCost: val === "" ? 0 : parseInt(val),
                    });
                  }}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Date d'achat
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaseDate: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Fin garantie
                </label>
                <input
                  type="date"
                  value={formData.warrantyEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warrantyEndDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-5 py-3 border rounded-lg text-gray-700 text-base"
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
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-base"
              >
                {editingAsset ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}

      {/* ========== MODAL DÉTAIL ========== */}
      {selectedAsset && (
        <AssetDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedAsset(null);
          }}
          asset={selectedAsset}
        />
      )}
    </div>
  );
};
