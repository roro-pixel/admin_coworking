import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Ticket,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Pass } from "../../../services/subscription.service";
import { CreatePassModal } from "./CreatePassModal";
import { PassDetailModal } from "./PassDetailModal";

const passTypeLabels: Record<string, string> = {
  DAY_PASS: "Pass journée",
  TIME_PACK: "Pack heures",
  VISITOR_PASS: "Pass visiteur",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  PROMOTIONAL_PASS: "Pass promotionnel",
  SUBSCRIPTION_PASS: "Pass souscription",
  COMPANY_SHARED_PASS: "Pass entreprise partagé",
  CUSTOM: "Personnalisé",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500" },
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
};

const PAGE_SIZE = 20;

export const PassesList: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [passTypeFilter, setPassTypeFilter] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [expiringBefore, setExpiringBefore] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: passesData, isLoading } = useQuery({
    queryKey: [
      "passes",
      statusFilter,
      passTypeFilter,
      ownerTypeFilter,
      expiringBefore,
      page,
    ],
    queryFn: () =>
      subscriptionService.getPasses({
        status: statusFilter || undefined,
        passType: passTypeFilter || undefined,
        ownerType: ownerTypeFilter || undefined,
        expiringBefore: expiringBefore || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const passes = passesData?.content ?? [];
  const totalPages = passesData?.totalPages ?? 1;
  const totalElements = passesData?.totalElements ?? 0;

  // Filtre local sur ownerCode / passNumber
  const filtered = debouncedSearch
    ? passes.filter(
        (p) =>
          p.passNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.ownerCode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : passes;

  const hasActiveFilters =
    statusFilter ||
    passTypeFilter ||
    ownerTypeFilter ||
    expiringBefore ||
    search;

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPassTypeFilter("");
    setOwnerTypeFilter("");
    setExpiringBefore("");
    setPage(0);
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Passes</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} /> Nouveau pass
        </button>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher par n°, propriétaire ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
            showFilters || hasActiveFilters
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <Filter size={16} /> Filtres
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous</option>
              <option value="ACTIVE">Actif</option>
              <option value="CANCELLED">Annulé</option>
              <option value="EXPIRED">Expiré</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={passTypeFilter}
              onChange={(e) =>
                handleFilterChange(setPassTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous les types</option>
              {Object.entries(passTypeLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type propriétaire
            </label>
            <select
              value={ownerTypeFilter}
              onChange={(e) =>
                handleFilterChange(setOwnerTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous</option>
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expire avant
            </label>
            <input
              type="date"
              value={expiringBefore}
              onChange={(e) =>
                handleFilterChange(setExpiringBefore, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          {hasActiveFilters && (
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={handleReset}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                N° Pass
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Propriétaire
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Validité
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((pass) => (
              <tr
                key={pass.passNumber}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedPass(pass);
                  setIsDetailOpen(true);
                }}
              >
                <td className="px-6 py-4 text-sm font-mono">
                  {pass.passNumber}
                </td>
                <td className="px-6 py-4 text-sm font-medium">{pass.name}</td>
                <td className="px-6 py-4 text-sm">
                  {passTypeLabels[pass.passType] ?? pass.passType}
                </td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-mono">{pass.ownerCode}</p>
                  <p className="text-xs text-gray-400">{pass.ownerType}</p>
                </td>
                <td className="px-6 py-4 text-sm">
                  <p>{new Date(pass.validFrom).toLocaleDateString("fr-FR")}</p>
                  {pass.validUntil && (
                    <p className="text-xs text-gray-500">
                      → {new Date(pass.validUntil).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${statusConfig[pass.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusConfig[pass.status]?.label ?? pass.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPass(pass);
                      setIsDetailOpen(true);
                    }}
                    className="p-1 text-gray-600 hover:text-primary-600"
                    title="Voir détail"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun pass trouvé</p>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="mt-2 text-primary-600 hover:underline text-sm"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">{totalElements} pass au total</p>
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

      <CreatePassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["passes"] });
          setIsCreateOpen(false);
        }}
      />

      {selectedPass && (
        <PassDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedPass(null);
          }}
          pass={selectedPass}
        />
      )}
    </div>
  );
};
