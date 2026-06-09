import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Search,
  Eye,
  Play,
  Ticket,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Promotion } from "../../../services/subscription.service";
import { PromotionFormModal } from "./PromotionFormModal";
import { PromotionDetailModal } from "./PromotionDetailModal";

const discountTypeLabels: Record<string, string> = {
  PERCENTAGE: "Pourcentage",
  FIXED_AMOUNT: "Montant fixe",
  FREE_ENTITLEMENT: "Droit gratuit",
  WAIVE_SETUP_FEE: "Frais d'installation offerts",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expirée", color: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700" },
};

const PAGE_SIZE = 20;

export const PromotionsList: React.FC = () => {
  const queryClient = useQueryClient();

  // FIX : debounce sur la recherche locale (par nom)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ["promotions", statusFilter, page],
    queryFn: () =>
      subscriptionService.getPromotions({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.activatePromotion(code),
    onSuccess: (_, activatedCode) => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      // FIX : mise à jour optimiste de la promotion sélectionnée dans le détail
      if (selectedPromotion?.code === activatedCode) {
        setSelectedPromotion((prev) =>
          prev ? { ...prev, status: "ACTIVE" } : prev,
        );
      }
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.message ??
          "Erreur lors de l'activation de la promotion.",
      );
    },
  });

  const promotions = promotionsData?.content ?? [];
  const totalPages = promotionsData?.totalPages ?? 1;
  const totalElements = promotionsData?.totalElements ?? promotions.length;

  // Filtre client-side sur le nom (pas d'endpoint search/query côté API pour les promotions)
  const filteredPromotions = debouncedSearch
    ? promotions.filter((promo) =>
        promo.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : promotions;

  const handleActivate = (code: string) => {
    if (
      confirm(
        "Activer cette promotion ? Elle deviendra disponible pour les utilisateurs.",
      )
    ) {
      activateMutation.mutate(code);
    }
  };

  const handleViewDetail = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPage(0);
  };

  const hasActiveFilters = search || statusFilter;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Promotions</h2>
        <button
          onClick={() => {
            setEditingPromotion(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle promotion
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expirée</option>
          <option value="CANCELLED">Annulée</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg whitespace-nowrap"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Valeur
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Période
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Utilisations
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPromotions.map((promo) => (
              <tr
                key={promo.code}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleViewDetail(promo)}
              >
                <td className="px-6 py-4 text-sm font-mono">{promo.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{promo.name}</td>
                <td className="px-6 py-4 text-sm">
                  {discountTypeLabels[promo.discountType] ?? promo.discountType}
                </td>
                <td className="px-6 py-4 text-sm">
                  {promo.discountType === "PERCENTAGE"
                    ? `${promo.discountValue}%`
                    : promo.discountType === "FIXED_AMOUNT"
                      ? `${promo.discountValue.toLocaleString("fr-FR")} FCFA`
                      : "—"}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" />
                    {new Date(promo.startsAt).toLocaleDateString("fr-FR")}
                  </div>
                  {promo.endsAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar size={12} />
                      {new Date(promo.endsAt).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-gray-400" />
                    {promo.redeemedCount} / {promo.maxRedemptions ?? "∞"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      statusConfig[promo.status]?.color ??
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusConfig[promo.status]?.label ?? promo.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div
                    className="flex justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleViewDetail(promo)}
                      className="p-1 text-gray-600 hover:text-primary-600"
                      title="Voir détail"
                    >
                      <Eye size={16} />
                    </button>
                    {promo.status === "DRAFT" && (
                      <>
                        <button
                          onClick={() => handleActivate(promo.code)}
                          disabled={activateMutation.isPending}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-40"
                          title="Activer"
                        >
                          <Play size={16} />
                        </button>
                        {/* FIX : modification uniquement si DRAFT — une ACTIVE ne doit pas être modifiée */}
                        <button
                          onClick={() => {
                            setEditingPromotion(promo);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPromotions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune promotion trouvée</p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-2 text-primary-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} promotion{totalElements > 1 ? "s" : ""} au total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <PromotionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPromotion(null);
        }}
        editingPromotion={editingPromotion}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
          setIsModalOpen(false);
          setEditingPromotion(null);
        }}
      />

      {selectedPromotion && (
        <PromotionDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedPromotion(null);
          }}
          promotion={selectedPromotion}
          onActivate={() => {
            handleActivate(selectedPromotion.code);
            setIsDetailOpen(false);
          }}
        />
      )}
    </div>
  );
};
