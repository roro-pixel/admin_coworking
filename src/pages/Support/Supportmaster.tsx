import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, BarChart3, ListChecks, LifeBuoy } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { SupportAnalyticsPanel } from "./SupportAnalyticsPanel";
import {
  ActionButton,
  CheckField,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, ROW_HOVER, formatDate } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Dots } from "../../components/ui/Toaster";
import { Avatar, SectionBar, ViewSwitch } from "../../components/operations/opsKit";
import type { ViewItem } from "../../components/operations/opsKit";
import { KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { PRIORITY_STYLE, TICKET_CATEGORY, TICKET_STATUS } from "../../components/operations/opsLabels";

type Tab = "tickets" | "analytics";

const views: ViewItem<Tab>[] = [
  { id: "tickets", label: "Tickets", icon: ListChecks },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const COLS =
  "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_6rem]";

export const SupportMaster: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(
    new Set(["tickets"]),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">("");
  const [assignedTo, setAssignedTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "support-tickets",
      statusFilter,
      priorityFilter,
      categoryFilter,
      assignedTo,
      overdueOnly,
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      operationsService.getTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        assignedTo: assignedTo || undefined,
        overdueOnly: overdueOnly || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: 20,
        sort: "updatedAt,desc",
      }),
    enabled: visitedTabs.has("tickets"),
  });

  const canSeeMetrics =
    hasPermission("SUPPORT:METRICS") || hasPermission("SUPPORT_METRICS");
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["support-metrics"],
    queryFn: () => operationsService.getTicketMetrics(),
    enabled: canSeeMetrics,
  });

  const tickets = ticketsData?.content || [];
  const totalPages = ticketsData?.totalPages ?? 0;
  const totalElements = ticketsData?.totalElements ?? 0;

  const filtersActive = !!(statusFilter || priorityFilter || categoryFilter || assignedTo || overdueOnly);
  const resetFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setAssignedTo("");
    setOverdueOnly(false);
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <SectionBar
        action={
          <ActionButton icon={Plus} onClick={() => navigate("/operations/support/create")} className="w-full sm:w-auto">
            Nouveau ticket
          </ActionButton>
        }
      >
        <ViewSwitch items={views} active={activeTab} onChange={switchTab} />
      </SectionBar>

      {activeTab === "analytics" && visitedTabs.has("analytics") ? (
        <SupportAnalyticsPanel />
      ) : (
        <div className="space-y-5">
          {canSeeMetrics &&
            (metricsLoading ? (
              <KpiRowSkeleton />
            ) : (
              metrics && (
                <KpiRow
                  items={[
                    { label: "Tickets ouverts", value: metrics.openTickets ?? 0, tone: "danger" },
                    { label: "1ère réponse en retard", value: metrics.overdueFirstResponse ?? 0 },
                    { label: "Résolus", value: metrics.resolvedTickets ?? 0, tone: "success" },
                    { label: "Résolution en retard", value: metrics.overdueResolution ?? 0 },
                  ]}
                />
              )
            ))}

          <ListHeader
            title="Tickets support"
            subtitle={`${totalElements} ticket${totalElements > 1 ? "s" : ""}`}
            action={isFetching && !ticketsLoading ? <Dots className="text-gray-400" /> : undefined}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un titre, un numéro, un contact"
              className="flex-1"
            />
            <FilterButton open={showFilters} active={filtersActive} onClick={() => setShowFilters((v) => !v)} />
          </div>

          {showFilters && (
            <FilterPanel canReset={filtersActive} onReset={resetFilters}>
              <Field label="Statut">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as TicketStatus | "");
                    setPage(0);
                  }}
                  className={FIELD_SOFT}
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(TICKET_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priorité">
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value as TicketPriority | "");
                    setPage(0);
                  }}
                  className={FIELD_SOFT}
                >
                  <option value="">Toutes les priorités</option>
                  {Object.entries(PRIORITY_STYLE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Catégorie">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value as TicketCategory | "");
                    setPage(0);
                  }}
                  className={FIELD_SOFT}
                >
                  <option value="">Toutes les catégories</option>
                  {Object.entries(TICKET_CATEGORY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Agent assigné">
                <input
                  value={assignedTo}
                  onChange={(e) => {
                    setAssignedTo(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Nom ou identifiant"
                  className={FIELD_SOFT}
                />
              </Field>
              <div className="flex items-end md:col-span-2">
                <CheckField
                  checked={overdueOnly}
                  onChange={(v) => {
                    setOverdueOnly(v);
                    setPage(0);
                  }}
                  label="Uniquement les tickets dont le SLA est en retard"
                />
              </div>
            </FilterPanel>
          )}

          {ticketsLoading ? (
            <ListSkeleton rows={6} />
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Aucun ticket trouvé"
              hint={filtersActive || debouncedSearch ? "Essayez d'élargir la recherche ou les filtres." : "Les tickets créés apparaîtront ici."}
            />
          ) : (
            <DataCard>
              <HeadRow cols={COLS}>
                <span>Ticket</span>
                <span>Catégorie</span>
                <span>Priorité</span>
                <span>Statut</span>
                <span>Assigné</span>
                <span className="text-right">Mis à jour</span>
              </HeadRow>
              <div className="space-y-1">
                {tickets.map((ticket) => {
                  const priority = statusOf(PRIORITY_STYLE, ticket.priority);
                  const status = statusOf(TICKET_STATUS, ticket.status);
                  return (
                    <Link
                      key={ticket.ticketNumber}
                      to={`/operations/support/${ticket.ticketNumber}`}
                      className={`grid grid-cols-1 items-center gap-2 rounded-2xl max-lg:bg-gray-50 px-4 py-3 transition lg:gap-4 ${COLS} ${ROW_HOVER} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]`}
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-gray-950">{ticket.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                          <span className={MONO_LINK}>{ticket.ticketNumber}</span>
                          {ticket.relatedType && (
                            <span className="text-gray-500">
                              {ticket.relatedType} · {ticket.relatedCode}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:contents">
                        <p className="text-xs font-semibold text-gray-400 lg:text-sm lg:font-normal lg:text-gray-600">
                          {TICKET_CATEGORY[ticket.category] ?? ticket.category}
                        </p>
                        <div>
                          <StatusChip tone={priority.tone}>{priority.label}</StatusChip>
                        </div>
                        <div>
                          <StatusChip tone={status.tone}>{status.label}</StatusChip>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        {ticket.assignedTo ? (
                          <>
                            <Avatar name={ticket.assignedTo} size="sm" />
                            <span className="truncate font-semibold text-gray-800">{ticket.assignedTo}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Non assigné</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 lg:text-right lg:text-sm">
                        {formatDate(ticket.updatedAt)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </DataCard>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalElements}
            noun="ticket"
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
