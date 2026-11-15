import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Play, Pause, XCircle, Repeat, Plus, RefreshCw } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Subscription } from "../../../services/subscription.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  DataCard,
  EmptyState,
  FilterButton,
  FilterPanel,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import {
  FIELD_SOFT,
  MONO_LINK,
  ROW_HOVER,
  apiMessage,
  formatDate,
} from "../../../components/subscription/kitUtils";
import {
  SUBSCRIBER_TYPE_LABELS,
  SUBSCRIPTION_STATUS,
  statusOf,
} from "../../../components/subscription/labels";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_7rem_5rem_9.5rem]";

type RowMutation = { isPending: boolean; variables: string | undefined };
const busy = (m: RowMutation, id: string) => m.isPending && m.variables === id;

export const SubscriptionsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";

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
  const [showFilters, setShowFilters] = useState(false);

  // Debounce 400 ms sur la recherche locale pour ne pas re-filtrer à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Le panneau reste monté quand on change d'onglet : le statut demandé dans l'URL
  // (lien depuis les métriques) doit donc être repris à chaque changement.
  useEffect(() => {
    if (!statusParam) return;
    setStatusFilter(statusParam);
    setPage(0);
    setShowFilters(true);
  }, [statusParam]);

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

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    toast.success(message);
  };

  // changedBy = 'ADMIN' aligné sur la doc
  const activateMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.activateSubscription(subscriptionNumber, "Activé par admin", "ADMIN"),
    onSuccess: () => done("Souscription activée"),
    onError: (error: unknown) => toast.error(apiMessage(error, "Erreur lors de l'activation.")),
  });

  const suspendMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.suspendSubscription(subscriptionNumber, "Suspendu par admin", "ADMIN"),
    onSuccess: () => done("Souscription suspendue"),
    onError: (error: unknown) => toast.error(apiMessage(error, "Erreur lors de la suspension.")),
  });

  // L'annulation passe par un toast de confirmation : l'erreur est gérée par le toast
  const cancelMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.cancelSubscription(subscriptionNumber, "Annulé par admin", "ADMIN"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });

  const renewMutation = useMutation({
    mutationFn: (subscriptionNumber: string) =>
      subscriptionService.renewSubscription(subscriptionNumber, "Renouvelé par admin"),
    onSuccess: () => done("Souscription renouvelée"),
    onError: (error: unknown) => toast.error(apiMessage(error, "Erreur lors du renouvellement.")),
  });

  const askCancel = (sub: Subscription) =>
    toast.confirm({
      message: "Annuler cette souscription ?",
      detail: `${sub.subscriptionNumber} · ${sub.planName}`,
      confirmLabel: "Annuler la souscription",
      pendingLabel: "Annulation en cours",
      successMessage: "Souscription annulée",
      errorMessage: "L'annulation a échoué",
      onConfirm: () => cancelMutation.mutateAsync(sub.subscriptionNumber),
    });

  const subscriptions = subscriptionsData?.content ?? [];
  const totalPages = subscriptionsData?.totalPages ?? 0;
  const totalElements = subscriptionsData?.totalElements ?? 0;

  // Filtre client-side sur la page courante (recherche locale)
  const needle = debouncedSearch.toLowerCase();
  const filteredSubscriptions = debouncedSearch
    ? subscriptions.filter(
        (sub) =>
          sub.subscriptionNumber.toLowerCase().includes(needle) ||
          sub.planName.toLowerCase().includes(needle) ||
          (sub.subscriberName && sub.subscriberName.toLowerCase().includes(needle)) ||
          sub.subscriberCode.toLowerCase().includes(needle),
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

  const hasActiveFilters = !!(
    statusFilter ||
    subscriberTypeFilter ||
    subscriberCodeFilter ||
    planCodeFilter ||
    nextBillingBefore ||
    search
  );

  const rowActions = (sub: Subscription) => {
    const n = sub.subscriptionNumber;
    return (
      <>
        <IconButton icon={Eye} label="Voir le détail" onClick={() => handleViewDetail(sub)} />
        {sub.status === "PENDING_ACTIVATION" && (
          <IconButton
            icon={Play}
            label="Activer"
            tone="success"
            pending={busy(activateMutation, n)}
            onClick={() => activateMutation.mutate(n)}
          />
        )}
        {/* PAST_DUE : réactivation possible */}
        {sub.status === "PAST_DUE" && (
          <IconButton
            icon={Play}
            label="Réactiver"
            tone="success"
            pending={busy(activateMutation, n)}
            onClick={() => activateMutation.mutate(n)}
          />
        )}
        {sub.status === "ACTIVE" && (
          <>
            <IconButton
              icon={Pause}
              label="Suspendre"
              pending={busy(suspendMutation, n)}
              onClick={() => suspendMutation.mutate(n)}
            />
            <IconButton
              icon={RefreshCw}
              label="Renouveler"
              pending={busy(renewMutation, n)}
              onClick={() => renewMutation.mutate(n)}
            />
          </>
        )}
        {(sub.status === "ACTIVE" || sub.status === "SUSPENDED" || sub.status === "PAST_DUE") && (
          <IconButton icon={XCircle} label="Annuler" tone="danger" onClick={() => askCancel(sub)} />
        )}
      </>
    );
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Souscriptions"
        action={
          <ActionButton
            icon={Plus}
            className="w-full sm:w-auto"
            onClick={() => navigate("/subscriptions/subscriptions/create")}
          >
            Nouvelle souscription
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par n° souscription, plan ou souscripteur..."
        />
        <FilterButton
          open={showFilters}
          active={hasActiveFilters}
          onClick={() => setShowFilters(!showFilters)}
        />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleResetFilters}>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(SUBSCRIPTION_STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type souscripteur">
            <select
              value={subscriberTypeFilter}
              onChange={(e) => handleFilterChange(setSubscriberTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les types</option>
              {Object.entries(SUBSCRIBER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <select
              value={planCodeFilter}
              onChange={(e) => handleFilterChange(setPlanCodeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les plans</option>
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code souscripteur">
            <input
              type="text"
              value={subscriberCodeFilter}
              onChange={(e) => handleFilterChange(setSubscriberCodeFilter, e.target.value)}
              placeholder="ex: MBR-000001"
              className={FIELD_SOFT}
            />
          </Field>
          <Field label="Prochaine facture avant">
            <input
              type="date"
              value={nextBillingBefore}
              onChange={(e) => handleFilterChange(setNextBillingBefore, e.target.value)}
              className={FIELD_SOFT}
            />
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filteredSubscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Aucune souscription trouvée"
          action={
            hasActiveFilters ? (
              <ActionButton variant="ghost" onClick={handleResetFilters}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>N° souscription</span>
            <span>Plan</span>
            <span>Souscripteur</span>
            <span>Période</span>
            <span>Statut</span>
            <span>Renouv.</span>
            <span className="text-right">Actions</span>
          </HeadRow>

          <div className="space-y-2">
            {filteredSubscriptions.map((sub) => {
              const st = statusOf(SUBSCRIPTION_STATUS, sub.status);
              const subscriberType =
                SUBSCRIBER_TYPE_LABELS[sub.subscriberType] ?? sub.subscriberType;
              return (
                <div
                  key={sub.subscriptionNumber}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 transition ${ROW_HOVER}`}
                  onClick={() => handleViewDetail(sub)}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className={MONO_LINK}>{sub.subscriptionNumber}</span>
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {sub.planName}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">
                        {sub.subscriberName ?? sub.subscriberCode}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{subscriberType}</p>
                    </div>
                    <div className="min-w-0 text-sm text-gray-700">
                      <p>
                        {formatDate(sub.startDate)}
                        {sub.endDate && <span className="text-gray-400"> → {formatDate(sub.endDate)}</span>}
                      </p>
                      {sub.nextBillingDate && (
                        <p className="mt-0.5 text-xs text-amber-600">
                          Facture le {formatDate(sub.nextBillingDate)}
                        </p>
                      )}
                    </div>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <span className="text-sm text-gray-700">{sub.autoRenew ? "Auto" : "Manuel"}</span>
                    <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {rowActions(sub)}
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{sub.planName}</p>
                        <p className="mt-0.5 truncate text-sm text-gray-600">
                          {sub.subscriberName ?? sub.subscriberCode}
                        </p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={MONO_LINK}>{sub.subscriptionNumber}</span>
                      <Tag>{subscriberType}</Tag>
                      <Tag>{sub.autoRenew ? "Renouv. auto" : "Renouv. manuel"}</Tag>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(sub.startDate)}
                      {sub.endDate && ` → ${formatDate(sub.endDate)}`}
                      {sub.nextBillingDate && ` · facture le ${formatDate(sub.nextBillingDate)}`}
                    </p>
                    <div
                      className="mt-2 flex justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions(sub)}
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
        noun="souscription"
        onChange={setPage}
      />
    </div>
  );
};
