import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  X,
  Loader2,
  BarChart3,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { Supplier } from "../../../services/inventory.service";

const statusOptions = [
  { value: "ACTIVE", label: "Actif", color: "bg-green-100 text-green-700" },
  { value: "INACTIVE", label: "Inactif", color: "bg-gray-100 text-gray-700" },
  {
    value: "BLACKLISTED",
    label: "Blacklisté",
    color: "bg-red-100 text-red-700",
  },
];

export const SuppliersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    taxId: "",
    address: "",
    status: "ACTIVE" as Supplier["status"],
  });

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ["suppliers", statusFilter],
    queryFn: () =>
      inventoryService.getSuppliers({
        status: statusFilter || undefined,
        size: 100,
      }),
  });

  const suppliers = suppliersData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createSupplier(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      inventoryService.updateSupplier(editingSupplier!.code, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => inventoryService.deleteSupplier(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const filteredSuppliers = suppliers.filter(
    (sup: Supplier) =>
      sup.name.toLowerCase().includes(search.toLowerCase()) ||
      (sup.email && sup.email.toLowerCase().includes(search.toLowerCase())),
  );

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        email: supplier.email || "",
        phone: supplier.phone || "",
        taxId: supplier.taxId || "",
        address: supplier.address || "",
        status: supplier.status,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        taxId: "",
        address: "",
        status: "ACTIVE",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      deleteMutation.mutate(code);
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
  };

  const handleViewPerformance = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowPerformance(true);
    setPerformanceData(null);
    try {
      const data = await inventoryService.getSupplierPerformance(supplier.code);
      setPerformanceData(data);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">Fournisseurs</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base font-medium"
        >
          <Plus size={20} />
          Nouveau fournisseur
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
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
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
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Code</th>
              <th className="px-6 py-4 text-left font-semibold">Nom</th>
              <th className="px-6 py-4 text-left font-semibold">Email</th>
              <th className="px-6 py-4 text-left font-semibold">Téléphone</th>
              <th className="px-6 py-4 text-left font-semibold">Statut</th>
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSuppliers.map((sup: Supplier) => (
              <tr key={sup.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{sup.code}</td>
                <td className="px-6 py-4 font-medium">{sup.name}</td>
                <td className="px-6 py-4">{sup.email || "-"}</td>
                <td className="px-6 py-4">{sup.phone || "-"}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs ${statusOptions.find((o) => o.value === sup.status)?.color}`}
                  >
                    {statusOptions.find((o) => o.value === sup.status)?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleViewDetail(sup)}
                      className="p-1.5 text-gray-600 hover:text-primary-600"
                      title="Voir détail"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleViewPerformance(sup)}
                      className="p-1.5 text-purple-600 hover:text-purple-800"
                      title="Performance"
                    >
                      <BarChart3 size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(sup)}
                      className="p-1.5 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sup.code)}
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

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucun fournisseur trouvé</p>
        </div>
      )}

      {/* ========== MODAL DÉTAIL FOURNISSEUR - AGRANDI ========== */}
      {isDetailOpen && selectedSupplier && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-2xl font-bold">{selectedSupplier.name}</h3>
              <p className="text-base text-gray-500 font-mono mt-1">
                {selectedSupplier.code}
              </p>
            </div>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Statut</p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs ${statusOptions.find((o) => o.value === selectedSupplier.status)?.color}`}
                >
                  {
                    statusOptions.find(
                      (o) => o.value === selectedSupplier.status,
                    )?.label
                  }
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-base">{selectedSupplier.email || "-"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Téléphone</p>
                <p className="text-base">{selectedSupplier.phone || "-"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">N° Fiscal</p>
                <p className="text-base font-mono">
                  {selectedSupplier.taxId || "-"}
                </p>
              </div>
            </div>
            {selectedSupplier.address && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Adresse</p>
                <p className="text-base">{selectedSupplier.address}</p>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  handleViewPerformance(selectedSupplier);
                }}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-base font-medium"
              >
                <BarChart3 size={18} /> Voir performance
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base"
              >
                Fermer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL PERFORMANCE - AGRANDI ========== */}
      {showPerformance && selectedSupplier && (
        <ModalPortal onClose={() => setShowPerformance(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">
              Performance - {selectedSupplier.name}
            </h3>
            <button
              onClick={() => setShowPerformance(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-4">
            {!performanceData ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                <p className="text-base text-gray-500">Chargement...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Commandes totales
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData.totalOrders}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Taux livraison à temps
                  </p>
                  <p className="text-2xl font-bold">
                    {(performanceData.onTimeDeliveryRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Taux acceptation qualité
                  </p>
                  <p className="text-2xl font-bold">
                    {(performanceData.qualityAcceptanceRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Délai moyen (jours)
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData.averageDeliveryDelayDays}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Commandes complétées
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData.completedOrders}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    Coût unitaire moyen
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData.averageUnitCost?.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL CRÉATION/ÉDITION FOURNISSEUR - AGRANDI ========== */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          {" "}
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">
              {editingSupplier ? "Modifier" : "Nouveau"} fournisseur
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
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Numéro fiscal
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
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
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : editingSupplier ? (
                  "Mettre à jour"
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
