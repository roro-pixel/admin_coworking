import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  Play,
  Pause,
  XCircle,
  Users,
  Plus,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Subscription } from "../../../services/subscription.service";
import { CreateSubscriptionModal } from "./CreateSubscriptionModal";

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  PENDING_ACTIVATION: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
  },
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "En retard", color: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspendu", color: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500" },
};

const PAGE_SIZE = 20;

export const SubscriptionsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Recherche locale (l'API subscriptions n'expose pas d'endpoint search)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filtres API
  const [statusFilter, setStatusFilter] = useState("");
  const [subscriberTypeFilter, setSubscriberTypeFilter] = useState("");
  const [subscriberCodeFilter, setSubscriberCodeFilter] = useState("");
  const [planCodeFilter, setPlanCodeFilter] = useState("");
  const [nextBillingBefore, setNextBillingBefore] = useState("");
  const [page, setPage] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // FIX : debounce 400 ms sur la recherche locale pour ne pas re-filtrer à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: [
      "subscriptions",
      page,
      statusFilter,
      subscriberTypeFilter,
      subscriberCodeFilter,
      planCodeFilter,
      nextBillingBefore,
    ],
    queryFn: () =>
      subscriptionService.getSubscriptions({
        status: statusFilter || undefined,
        subscriberType: subscriberTypeFilter || undefined,
        subscriberCode: subscriberCodeFilter || undefined,
        planCode: planCodeFilter || undefined,
        nextBillingBefore: nextBillingBefore || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionService.getPlans({ size: 100 }),
  });

  const plans = plansData?.content ?? [];

  // FIX : changedBy = 'ADMIN' aligné sur la doc
  const activateMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.activateSubscription(
        subscriptionNumber,
        "Activé par admin",
        "ADMIN",
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    onError: (error: any) =>
      alert(error?.response?.data?.message ?? "Erreur lors de l'activation."),
  });

  const suspendMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.suspendSubscription(
        subscriptionNumber,
        "Suspendu par admin",
        "ADMIN",
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    onError: (error: any) =>
      alert(error?.response?.data?.message ?? "Erreur lors de la suspension."),
  });

  const cancelMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.cancelSubscription(
        subscriptionNumber,
        "Annulé par admin",
        "ADMIN",
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    onError: (error: any) =>
      alert(error?.response?.data?.message ?? "Erreur lors de l'annulation."),
  });

  const renewMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.renewSubscription(
        subscriptionNumber,
        "Renouvelé par admin",
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    onError: (error: any) =>
      alert(error?.response?.data?.message ?? "Erreur lors du renouvellement."),
  });

  const subscriptions = subscriptionsData?.content ?? [];
  const totalPages = subscriptionsData?.totalPages ?? 0;
  const totalElements = subscriptionsData?.totalElements ?? 0;

  // Filtre client-side sur la page courante (search local)
  const filteredSubscriptions = debouncedSearch
    ? subscriptions.filter(
        (sub) =>
          sub.subscriptionNumber
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          sub.planName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (sub.subscriberName &&
            sub.subscriberName
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase())) ||
          sub.subscriberCode
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()),
      )
    : subscriptions;

  const handleViewDetail = (subscription: Subscription) => {
    navigate(`/subscriptions/${subscription.subscriptionNumber}`);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setSubscriberTypeFilter("");
    setSubscriberCodeFilter("");
    setPlanCodeFilter("");
    setNextBillingBefore("");
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
  };

  const hasActiveFilters =
    statusFilter ||
    subscriberTypeFilter ||
    subscriberCodeFilter ||
    planCodeFilter ||
    nextBillingBefore ||
    search;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Souscriptions</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle souscription
        </button>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher par n° souscription, plan ou souscripteur..."
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
            <Filter size={16} />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-primary-600 rounded-full" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING_ACTIVATION">En attente</option>
                <option value="ACTIVE">Actif</option>
                <option value="PAST_DUE">En retard</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="CANCELLED">Annulé</option>
                <option value="EXPIRED">Expiré</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type souscripteur
              </label>
              <select
                value={subscriberTypeFilter}
                onChange={(e) =>
                  handleFilterChange(setSubscriberTypeFilter, e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Tous les types</option>
                <option value="MEMBER">Membre</option>
                <option value="CUSTOMER">Customer</option>
                <option value="BUSINESS_ENTITY">Entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={planCodeFilter}
                onChange={(e) =>
                  handleFilterChange(setPlanCodeFilter, e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Tous les plans</option>
                {plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code souscripteur
              </label>
              <input
                type="text"
                value={subscriberCodeFilter}
                onChange={(e) =>
                  handleFilterChange(setSubscriberCodeFilter, e.target.value)
                }
                placeholder="ex: MBR-000001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prochaine facture avant
              </label>
              <input
                type="date"
                value={nextBillingBefore}
                onChange={(e) =>
                  handleFilterChange(setNextBillingBefore, e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            {hasActiveFilters && (
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto p-2">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="bg-transparent">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  N° Souscription
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Plan
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Souscripteur
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Période
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Statut
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Renouvellement
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub) => (
                <tr
                  key={sub.subscriptionNumber}
                  className="group cursor-pointer rounded-xl transition-colors hover:bg-primary-50/40"
                  onClick={() => handleViewDetail(sub)}
                >
                  <td className="rounded-l-xl px-5 py-4 text-sm font-mono text-gray-700 group-hover:bg-transparent">
                    {sub.subscriptionNumber}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                    {sub.planName}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">
                    <div>
                      <p>{sub.subscriberName ?? sub.subscriberCode}</p>
                      <p className="text-xs text-gray-500">
                        {sub.subscriberType}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">
                    <div>
                      <p>
                        Début :{" "}
                        {new Date(sub.startDate).toLocaleDateString("fr-FR")}
                      </p>
                      {sub.endDate && (
                        <p className="text-xs text-gray-500">
                          Fin :{" "}
                          {new Date(sub.endDate).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      {/* FIX : prochaine facturation affichée si disponible */}
                      {sub.nextBillingDate && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Facture :{" "}
                          {new Date(sub.nextBillingDate).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        statusConfig[sub.status]?.color ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {statusConfig[sub.status]?.label ?? sub.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-700">
                    {sub.autoRenew ? "Auto" : "Manuel"}
                  </td>
                  <td className="rounded-r-xl px-5 py-4 text-center">
                    <div
                      className="flex justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleViewDetail(sub)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-primary-600"
                        title="Voir détail"
                      >
                        <Eye size={16} />
                      </button>
                      {sub.status === "PENDING_ACTIVATION" && (
                        <button
                          onClick={() =>
                            activateMutation.mutate(sub.subscriptionNumber)
                          }
                          disabled={activateMutation.isPending}
                          className="rounded-lg p-2 text-green-600 hover:bg-white hover:text-green-800 disabled:opacity-40"
                          title="Activer"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {/* FIX : PAST_DUE — réactivation possible */}
                      {sub.status === "PAST_DUE" && (
                        <button
                          onClick={() =>
                            activateMutation.mutate(sub.subscriptionNumber)
                          }
                          disabled={activateMutation.isPending}
                          className="rounded-lg p-2 text-green-600 hover:bg-white hover:text-green-800 disabled:opacity-40"
                          title="Réactiver"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {sub.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() =>
                              suspendMutation.mutate(sub.subscriptionNumber)
                            }
                            disabled={suspendMutation.isPending}
                            className="rounded-lg p-2 text-orange-600 hover:bg-white hover:text-orange-800 disabled:opacity-40"
                            title="Suspendre"
                          >
                            <Pause size={16} />
                          </button>
                          <button
                            onClick={() =>
                              renewMutation.mutate(sub.subscriptionNumber)
                            }
                            disabled={renewMutation.isPending}
                            className="rounded-lg p-2 text-blue-600 hover:bg-white hover:text-blue-800 disabled:opacity-40"
                            title="Renouveler"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </>
                      )}
                      {(sub.status === "ACTIVE" ||
                        sub.status === "SUSPENDED" ||
                        sub.status === "PAST_DUE") && (
                        <button
                          onClick={() => {
                            if (confirm("Confirmer l'annulation ?")) {
                              cancelMutation.mutate(sub.subscriptionNumber);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                          className="rounded-lg p-2 text-red-600 hover:bg-white hover:text-red-800 disabled:opacity-40"
                          title="Annuler"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubscriptions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune souscription trouvée</p>
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
            {totalElements} souscription{totalElements > 1 ? "s" : ""} au total
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

      <CreateSubscriptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};
