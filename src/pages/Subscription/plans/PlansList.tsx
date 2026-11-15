import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowUpRight, Package } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan } from "../../../services/subscription.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import {
  PLAN_STATUS,
  PLAN_TYPE_LABELS,
  TARGET_AUDIENCE_LABELS,
  statusOf,
} from "../../../components/subscription/labels";
import { PlanPanel } from "./PlanPanel";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[2.5rem_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_7rem_9.5rem]";

export const PlansList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState("");
  const [targetAudienceFilter, setTargetAudienceFilter] = useState("");
  const [visibleFilter, setVisibleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

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
  });

  // Suppression : toast de confirmation, l'erreur de l'API y est affichée
  const deleteMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.deletePlan(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ code, visible }: { code: string; visible: boolean }) =>
      subscriptionService.updatePlan(code, { visible }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success(v.visible ? "Plan rendu visible" : "Plan masqué");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la mise à jour de la visibilité.")),
  });

  const plans = plansData?.content ?? [];
  const totalPages = plansData?.totalPages ?? 1;
  const totalElements = plansData?.totalElements ?? 0;
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const hasActiveFilters = !!(
    statusFilter ||
    planTypeFilter ||
    targetAudienceFilter ||
    visibleFilter ||
    search
  );

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPlanTypeFilter("");
    setTargetAudienceFilter("");
    setVisibleFilter("");
    setPage(0);
  };

  const openPlan = (plan: Plan) => navigate(`/subscriptions/plans/${plan.code}`);

  const askDelete = (plan: Plan) =>
    toast.confirm({
      message: `Supprimer « ${plan.name} » ?`,
      detail:
        plan.status !== "DRAFT"
          ? `Ce plan est « ${statusOf(PLAN_STATUS, plan.status).label} » : la suppression sera refusée si des souscriptions y sont rattachées.`
          : plan.code,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression en cours",
      successMessage: "Plan supprimé",
      errorMessage: "La suppression a échoué",
      onConfirm: () => deleteMutation.mutateAsync(plan.code),
    });

  const closePanel = () => {
    setPanelOpen(false);
    setEditingPlan(null);
  };

  const busyVisibility = (code: string) =>
    visibilityMutation.isPending && visibilityMutation.variables?.code === code;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Plans d'abonnement"
        action={
          <ActionButton
            icon={Plus}
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingPlan(null);
              setPanelOpen(true);
            }}
          >
            Nouveau plan
          </ActionButton>
        }
      />

      {panelOpen && (
        <PlanPanel
          key={editingPlan?.code ?? "new"}
          editingPlan={editingPlan}
          onDone={closePanel}
          onCancel={closePanel}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un plan par nom ou code..."
        />
        <FilterButton
          open={showFilters}
          active={hasActiveFilters}
          onClick={() => setShowFilters(!showFilters)}
        />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleReset}>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(PLAN_STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de plan">
            <select
              value={planTypeFilter}
              onChange={(e) => handleFilterChange(setPlanTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les types</option>
              {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Public cible">
            <select
              value={targetAudienceFilter}
              onChange={(e) => handleFilterChange(setTargetAudienceFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous publics</option>
              {Object.entries(TARGET_AUDIENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visibilité">
            <select
              value={visibleFilter}
              onChange={(e) => handleFilterChange(setVisibleFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous</option>
              <option value="true">Visible</option>
              <option value="false">Masqué</option>
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : sortedPlans.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun plan trouvé"
          action={
            hasActiveFilters ? (
              <ActionButton variant="ghost" onClick={handleReset}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>#</span>
            <span>Plan</span>
            <span>Type</span>
            <span>Public</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>

          <div className="space-y-2">
            {sortedPlans.map((plan) => {
              const st = statusOf(PLAN_STATUS, plan.status);
              const typeLabel = PLAN_TYPE_LABELS[plan.planType] ?? plan.planType;
              const audience = TARGET_AUDIENCE_LABELS[plan.targetAudience] ?? plan.targetAudience;
              const actions = (
                <>
                  <IconButton icon={ArrowUpRight} label="Voir le plan" onClick={() => openPlan(plan)} />
                  <IconButton
                    icon={plan.visible ? EyeOff : Eye}
                    label={plan.visible ? "Masquer" : "Rendre visible"}
                    tone="neutral"
                    pending={busyVisibility(plan.code)}
                    onClick={() =>
                      visibilityMutation.mutate({ code: plan.code, visible: !plan.visible })
                    }
                  />
                  <IconButton
                    icon={Pencil}
                    label="Modifier"
                    tone="neutral"
                    onClick={() => {
                      setEditingPlan(plan);
                      setPanelOpen(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    pending={deleteMutation.isPending && deleteMutation.variables === plan.code}
                    onClick={() => askDelete(plan)}
                  />
                </>
              );
              return (
                <div
                  key={plan.code}
                  onClick={() => openPlan(plan)}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="text-sm text-gray-400">{plan.sortOrder}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{plan.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <span className="truncate font-mono">{plan.code}</span>
                        {!plan.visible && <Tag>Masqué</Tag>}
                      </p>
                    </div>
                    <span className="truncate text-sm text-gray-700">{typeLabel}</span>
                    <span className="truncate text-sm text-gray-700">{audience}</span>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actions}
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{plan.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{plan.code}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{typeLabel}</Tag>
                      <Tag>{audience}</Tag>
                      {!plan.visible && <Tag>Masqué</Tag>}
                    </div>
                    <div className="mt-3 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actions}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={totalElements}
        noun="plan"
        onChange={setPage}
      />
    </div>
  );
};
