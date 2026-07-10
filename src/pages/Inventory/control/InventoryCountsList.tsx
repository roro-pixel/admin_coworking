import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Search,
  X,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { InventoryCountEntry } from "./InventoryCountEntry";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: ClipboardList,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: Play,
  },
  UNDER_REVIEW: {
    label: "En revue",
    color: "bg-yellow-100 text-yellow-700",
    icon: Eye,
  },
  VALIDATED: {
    label: "Validé",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export const InventoryCountsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [showEntry, setShowEntry] = useState(false);
  const [formData, setFormData] = useState({
    locationCode: "",
    notes: "",
  });

  const { data: countsData, isLoading } = useQuery({
    queryKey: ["inventory-counts", statusFilter],
    queryFn: () =>
      inventoryService.getInventoryCounts({
        status: statusFilter || undefined,
        size: 100,
      }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const counts = countsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createInventoryCount({
        locationCode: formData.locationCode,
        createdBy: admin?.email || "admin",
        notes: formData.notes,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
      setIsModalOpen(false);
      setFormData({ locationCode: "", notes: "" });
      setSelectedCount(data);
      setShowEntry(true);
    },
  });

  const startMutation = useMutation({
    mutationFn: (countCode: string) =>
      inventoryService.startInventoryCount(countCode),
    onSuccess: (_, countCode) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
      const count = counts.find((c: any) => c.countCode === countCode);
      setSelectedCount(count);
      setShowEntry(true);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (countCode: string) =>
      inventoryService.reviewInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (countCode: string) =>
      inventoryService.validateInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (countCode: string) =>
      inventoryService.cancelInventoryCount(countCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
  });

  const filteredCounts = counts.filter(
    (count: any) =>
      count.countCode.toLowerCase().includes(search.toLowerCase()) ||
      count.locationName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenModal = () => {
    setFormData({ locationCode: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleViewEntry = (count: any) => {
    setSelectedCount(count);
    setShowEntry(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-lg sm:text-xl sm:text-2xl font-semibold text-gray-900">
          Comptages physiques
        </h2>
        <button
          onClick={handleOpenModal}
          className="bg-primary-600 text-white px-4 py-2.5 sm:px-5 rounded-2xl hover:bg-primary-700 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Nouveau comptage
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
            placeholder="Rechercher un comptage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 ring-1 ring-gray-100 rounded-2xl bg-white text-sm sm:text-base min-w-[180px]"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="UNDER_REVIEW">En revue</option>
          <option value="VALIDATED">Validés</option>
          <option value="CANCELLED">Annulés</option>
        </select>
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm sm:text-base block md:table">
          <thead className="bg-gray-50 ring-1 ring-gray-100 hidden md:table-header-group">
            <tr>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Code</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Emplacement</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Statut</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Créé par</th>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Date</th>
              <th className="px-6 py-4 text-center font-semibold hidden md:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="space-y-2 md:space-y-0 block md:table-row-group">
            {filteredCounts.map((count: any) => {
              const status = statusConfig[count.status];
              const StatusIcon = status?.icon;
              return (
                <tr key={count.countCode} className="hover:bg-gray-50 block md:table-row rounded-3xl bg-white p-4 mb-3 shadow-sm ring-1 ring-gray-100">
                  <td className="px-6 py-4 font-mono text-sm flex justify-between gap-4 md:table-cell text-sm">
                    {count.countCode}
                  </td>
                  <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">{count.locationName}</td>
                  <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${status?.color}`}
                    >
                      {StatusIcon && <StatusIcon size={14} />}
                      {status?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">{count.createdBy}</td>
                  <td className="px-6 py-4 flex justify-between gap-4 md:table-cell text-sm">
                    {new Date(count.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-center flex justify-between gap-4 md:table-cell text-sm">
                    <div className="flex justify-center gap-3">
                      {count.status === "DRAFT" && (
                        <button
                          onClick={() => startMutation.mutate(count.countCode)}
                          className="p-1.5 text-blue-600 hover:text-blue-800"
                          title="Démarrer"
                        >
                          <Play size={20} />
                        </button>
                      )}
                      {count.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleViewEntry(count)}
                          className="p-1.5 text-primary-600 hover:text-primary-800"
                          title="Saisir"
                        >
                          <ClipboardList size={20} />
                        </button>
                      )}
                      {count.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => reviewMutation.mutate(count.countCode)}
                          className="p-1.5 text-yellow-600 hover:text-yellow-800"
                          title="Envoyer en revue"
                        >
                          <Eye size={20} />
                        </button>
                      )}
                      {count.status === "UNDER_REVIEW" && (
                        <button
                          onClick={() =>
                            validateMutation.mutate(count.countCode)
                          }
                          className="p-1.5 text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <CheckCircle size={20} />
                        </button>
                      )}
                      {(count.status === "DRAFT" ||
                        count.status === "IN_PROGRESS") && (
                        <button
                          onClick={() => cancelMutation.mutate(count.countCode)}
                          className="p-1.5 text-red-600 hover:text-red-800"
                          title="Annuler"
                        >
                          <XCircle size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCounts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <ClipboardList size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">Aucun comptage trouvé</p>
        </div>
      )}

      {/* Modal de création - AGRANDI */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
            <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Nouveau comptage physique</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-2xl"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Emplacement *
              </label>
              <select
                value={formData.locationCode}
                onChange={(e) =>
                  setFormData({ ...formData, locationCode: e.target.value })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
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
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!formData.locationCode || createMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base flex items-center justify-center gap-2 w-full sm:w-auto justify-center"
              >
                {createMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Écran de saisie */}
      {showEntry && selectedCount && (
        <InventoryCountEntry
          isOpen={showEntry}
          onClose={() => {
            setShowEntry(false);
            setSelectedCount(null);
            queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
          }}
          count={selectedCount}
        />
      )}
    </div>
  );
};
