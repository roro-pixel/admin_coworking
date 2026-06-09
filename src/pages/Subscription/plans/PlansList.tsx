import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Package,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan, PlanVersion } from "../../../services/subscription.service";
import { PlanFormModal } from "./PlanFormModal";
import { PlanDetailPage } from "./PlanDetailPage";
import { PlanVersionFormPage } from "./PlanVersionFormPage";
import { PlanVersionDetailPage } from "./PlanVersionDetailPage";

type View =
  | { type: "list" }
  | { type: "plan-detail"; plan: Plan }
  | { type: "version-form"; plan: Plan; baseVersion?: PlanVersion }
  | { type: "version-detail"; plan: Plan; version: PlanVersion };

// ─── Labels ──────────────────────────────────────────────────────────────────

const planTypeLabels: Record<string, string> = {
  MEMBERSHIP: "Adhésion",
  COWORKING_ACCESS: "Accès coworking",
  DEDICATED_DESK: "Bureau dédié",
  PRIVATE_OFFICE: "Bureau privé",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  VIRTUAL_OFFICE: "Bureau virtuel",
  COMPANY_PLAN: "Plan entreprise",
  CUSTOM: "Personnalisé",
};

const targetAudienceLabels: Record<string, string> = {
  INDIVIDUAL: "Particulier",
  COMPANY: "Entreprise",
  BOTH: "Les deux",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

const planTypeOptions = [
  { value: "", label: "Tous les types" },
  { value: "MEMBERSHIP", label: "Adhésion" },
  { value: "COWORKING_ACCESS", label: "Accès coworking" },
  { value: "DEDICATED_DESK", label: "Bureau dédié" },
  { value: "PRIVATE_OFFICE", label: "Bureau privé" },
  { value: "MEETING_ROOM_PACK", label: "Pack salle de réunion" },
  { value: "VIRTUAL_OFFICE", label: "Bureau virtuel" },
  { value: "COMPANY_PLAN", label: "Plan entreprise" },
  { value: "CUSTOM", label: "Personnalisé" },
];

const targetAudienceOptions = [
  { value: "", label: "Tous publics" },
  { value: "INDIVIDUAL", label: "Particulier" },
  { value: "COMPANY", label: "Entreprise" },
  { value: "BOTH", label: "Les deux" },
];

const visibleOptions = [
  { value: "", label: "Tous" },
  { value: "true", label: "Visible" },
  { value: "false", label: "Masqué" },
];

const PAGE_SIZE = 20;

// ─── Composant ───────────────────────────────────────────────────────────────

export const PlansList: React.FC = () => {
  const queryClient = useQueryClient();

  // ── Navigation interne ────────────────────────────────────────────────────
  const [view, setView] = useState<View>({ type: "list" });

  // ── État de la liste ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState("");
  const [targetAudienceFilter, setTargetAudienceFilter] = useState("");
  const [visibleFilter, setVisibleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Debounce 400 ms
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

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: plansData, isLoading } = useQuery({
    queryKey: [
      "subscription-plans",
      statusFilter,
      planTypeFilter,
      targetAudienceFilter,
      visibleFilter,
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      subscriptionService.getPlans({
        name: debouncedSearch || undefined,
        status: statusFilter || undefined,
        planType: planTypeFilter || undefined,
        targetAudience: targetAudienceFilter || undefined,
        visible: visibleFilter !== "" ? visibleFilter === "true" : undefined,
        page,
        size: PAGE_SIZE,
      }),
    // Seulement sur la vue liste
    enabled: view.type === "list",
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.deletePlan(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
    onError: (e: any) =>
      alert(
        e?.response?.data?.message ?? "Erreur lors de la suppression du plan.",
      ),
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: ({ code, visible }: { code: string; visible: boolean }) =>
      subscriptionService.updatePlan(code, { visible }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
    onError: () => alert("Erreur lors de la mise à jour de la visibilité."),
  });

  const plans = plansData?.content ?? [];
  const totalPages = plansData?.totalPages ?? 1;
  const totalElements = plansData?.totalElements ?? 0;
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const hasActiveFilters =
    statusFilter ||
    planTypeFilter ||
    targetAudienceFilter ||
    visibleFilter ||
    search;

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPlanTypeFilter("");
    setTargetAudienceFilter("");
    setVisibleFilter("");
    setPage(0);
  };

  // ── Navigations ───────────────────────────────────────────────────────────

  const goToPlanDetail = (plan: Plan) => setView({ type: "plan-detail", plan });

  // NOTE : navigations version-form et version-detail gérées inline dans les rendus ci-dessous

  // ── Rendu des vues non-liste ───────────────────────────────────────────────

  if (view.type === "plan-detail") {
    return (
      <PlanDetailPage
        plan={view.plan}
        onBack={() => setView({ type: "list" })}
        onNewVersion={(planCode) => {
          const plan = plans.find((p) => p.code === planCode) ?? view.plan;
          setView({ type: "version-form", plan });
        }}
        onVersionDetail={(planCode, version) => {
          const plan = plans.find((p) => p.code === planCode) ?? view.plan;
          setView({ type: "version-detail", plan, version });
        }}
      />
    );
  }

  if (view.type === "version-form") {
    return (
      <PlanVersionFormPage
        plan={view.plan}
        baseVersion={view.baseVersion}
        onBack={() => setView({ type: "plan-detail", plan: view.plan })}
        onSuccess={(newVersion) => {
          queryClient.invalidateQueries({
            queryKey: ["plan-versions", view.plan.code],
          });
          // Après création → on affiche le détail de la version créée
          setView({
            type: "version-detail",
            plan: view.plan,
            version: newVersion,
          });
        }}
      />
    );
  }

  if (view.type === "version-detail") {
    return (
      <PlanVersionDetailPage
        plan={view.plan}
        version={view.version}
        onBack={() => setView({ type: "plan-detail", plan: view.plan })}
      />
    );
  }

  // ── Vue liste ─────────────────────────────────────────────────────────────

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Plans d'abonnement
        </h2>
        <button
          onClick={() => {
            setEditingPlan(null);
            setIsFormOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} /> Nouveau plan
        </button>
      </div>

      {/* Barre de recherche + bouton filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un plan par nom ou code..."
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
            <span className="ml-1 w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Filtres avancés */}
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
              <option value="">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de plan
            </label>
            <select
              value={planTypeFilter}
              onChange={(e) =>
                handleFilterChange(setPlanTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              {planTypeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public cible
            </label>
            <select
              value={targetAudienceFilter}
              onChange={(e) =>
                handleFilterChange(setTargetAudienceFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              {targetAudienceOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibilité
            </label>
            <select
              value={visibleFilter}
              onChange={(e) =>
                handleFilterChange(setVisibleFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              {visibleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="md:col-span-4 flex justify-end">
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

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Ordre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Public
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Visible
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedPlans.map((plan) => (
              <tr
                key={plan.code}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => goToPlanDetail(plan)}
              >
                <td className="px-6 py-4 text-sm text-gray-500">
                  {plan.sortOrder}
                </td>
                <td className="px-6 py-4 text-sm font-mono">{plan.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{plan.name}</td>
                <td className="px-6 py-4 text-sm">
                  {planTypeLabels[plan.planType] ?? plan.planType}
                </td>
                <td className="px-6 py-4 text-sm">
                  {targetAudienceLabels[plan.targetAudience] ??
                    plan.targetAudience}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${statusConfig[plan.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusConfig[plan.status]?.label ?? plan.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateVisibilityMutation.mutate({
                        code: plan.code,
                        visible: !plan.visible,
                      });
                    }}
                    disabled={updateVisibilityMutation.isPending}
                    className="p-1 text-gray-600 hover:text-primary-600 disabled:opacity-40"
                    title={plan.visible ? "Masquer" : "Afficher"}
                  >
                    {plan.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div
                    className="flex justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Ouvre la page détail */}
                    <button
                      onClick={() => goToPlanDetail(plan)}
                      className="p-1 text-gray-600 hover:text-primary-600"
                      title="Voir le plan"
                    >
                      <Eye size={16} />
                    </button>
                    {/* Ouvre le formulaire d'édition (modal léger) */}
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsFormOpen(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    {/* Suppression avec avertissement si non-DRAFT */}
                    <button
                      onClick={() => {
                        const warning =
                          plan.status !== "DRAFT"
                            ? `\nCe plan est "${statusConfig[plan.status]?.label ?? plan.status}". La suppression sera refusée si des souscriptions y sont attachées.`
                            : "";
                        if (confirm(`Supprimer "${plan.name}" ?${warning}`)) {
                          deleteMutation.mutate(plan.code);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                      title={
                        plan.status !== "DRAFT"
                          ? `Supprimer (peut être refusé si ${statusConfig[plan.status]?.label})`
                          : "Supprimer"
                      }
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

      {sortedPlans.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun plan trouvé</p>
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
            {totalElements} plan{totalElements > 1 ? "s" : ""} au total
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

      {/* Modal léger création/édition plan */}
      <PlanFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPlan(null);
        }}
        editingPlan={editingPlan}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
          setIsFormOpen(false);
          setEditingPlan(null);
        }}
      />
    </div>
  );
};
