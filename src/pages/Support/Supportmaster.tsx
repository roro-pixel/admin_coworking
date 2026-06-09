import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  ListChecks,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { SupportAnalyticsPanel } from "./SupportAnalyticsPanel";

type Tab = "tickets" | "analytics";

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  WAITING_CLIENT: {
    label: "Attente client",
    color: "bg-yellow-100 text-yellow-700",
  },
  RESOLVED: { label: "Résolu", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Fermé", color: "bg-gray-100 text-gray-600" },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string }> =
  {
    LOW: { label: "Faible", color: "bg-gray-100 text-gray-600" },
    MEDIUM: { label: "Moyen", color: "bg-blue-100 text-blue-700" },
    HIGH: { label: "Élevé", color: "bg-orange-100 text-orange-700" },
    URGENT: { label: "Urgent", color: "bg-red-100 text-red-700" },
  };

const categoryLabels: Record<TicketCategory, string> = {
  BILLING: "Facturation",
  BOOKING: "Réservation",
  ACCESS: "Accès",
  TECHNICAL: "Technique",
  OTHER: "Autre",
};

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

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["support-metrics"],
    queryFn: () => operationsService.getTicketMetrics(),
    enabled:
      hasPermission("SUPPORT:METRICS") || hasPermission("SUPPORT_METRICS"),
  });

  const tickets = ticketsData?.content || [];
  const totalPages = ticketsData?.totalPages ?? 0;
  const totalElements = ticketsData?.totalElements ?? 0;

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => switchTab("tickets")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${activeTab === "tickets" ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <ListChecks size={16} /> Tickets
        </button>
        <button
          onClick={() => switchTab("analytics")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${activeTab === "analytics" ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {activeTab === "analytics" && visitedTabs.has("analytics") ? (
        <SupportAnalyticsPanel />
      ) : (
        <div>
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 shadow-sm animate-pulse h-20"
                />
              ))}
            </div>
          ) : (
            metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Metric
                  value={metrics.openTickets}
                  label="Tickets ouverts"
                  color="text-red-600"
                />
                <Metric
                  value={metrics.overdueFirstResponse}
                  label="1ère réponse en retard"
                  color="text-yellow-600"
                />
                <Metric
                  value={metrics.resolvedTickets}
                  label="Résolus"
                  color="text-green-600"
                />
                <Metric
                  value={metrics.overdueResolution}
                  label="Résolution en retard"
                  color="text-orange-600"
                />
              </div>
            )
          )}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Tickets support
              </h2>
              <p className="text-sm text-gray-500">
                {totalElements} ticket{totalElements > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => navigate("/operations/support/create")}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
            >
              <Plus size={18} /> Nouveau ticket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-6">
            <div className="xl:col-span-2 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher titre, numéro, contact..."
                className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg"
              />
              {isFetching && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                />
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous statuts</option>
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as any);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Toutes priorités</option>
              {Object.entries(priorityConfig).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as any);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Toutes catégories</option>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={assignedTo}
              onChange={(e) => {
                setAssignedTo(e.target.value);
                setPage(0);
              }}
              placeholder="Agent assigné"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => {
                setOverdueOnly(e.target.checked);
                setPage(0);
              }}
            />
            Afficher uniquement les tickets SLA en retard
          </label>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {ticketsLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="animate-spin mx-auto text-primary-600" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Catégorie</th>
                    <th className="px-4 py-3 text-center">Priorité</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-left">Assigné</th>
                    <th className="px-4 py-3 text-right">Mis à jour</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.ticketNumber}
                      onClick={() =>
                        navigate(`/operations/support/${ticket.ticketNumber}`)
                      }
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {ticket.title}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {ticket.ticketNumber}
                        </p>
                        {ticket.relatedType && (
                          <p className="text-xs text-blue-600">
                            {ticket.relatedType} · {ticket.relatedCode}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {categoryLabels[ticket.category]}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${priorityConfig[ticket.priority]?.color}`}
                        >
                          {priorityConfig[ticket.priority]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${statusConfig[ticket.status]?.color}`}
                        >
                          {statusConfig[ticket.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.assignedTo || "Non assigné"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {new Date(ticket.updatedAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-500"
                      >
                        Aucun ticket trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-4">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                Page {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Metric = ({
  value,
  label,
  color,
}: {
  value?: number;
  label: string;
  color: string;
}) => (
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);
