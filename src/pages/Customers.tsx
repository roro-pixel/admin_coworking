import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Search, Eye, Plus, Trash2, Users, UserCheck, UserX, X } from "lucide-react";
import { customerService } from "../services/customer.service";
import type { CustomerSummaryResponse } from "../services/customer.service";
import { useDebounce } from "../hooks/useDebounce";
import { customerPath } from "../components/companies/companyLabels";
import { Skeleton, ListSkeleton } from "../components/ui/Skeleton";
import { brandVars } from "../components/layout/adminTheme";
import { Toaster } from "../components/ui/Toaster";
import { toast } from "../components/ui/toastStore";

const PINK_SOFT = "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]";
const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";
const FIELD = `w-full rounded-2xl border border-transparent bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[color:var(--logo-pink)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)]`;

const statusLabel = (status: string) =>
  status === "ACTIVE" ? "Actif" : status === "INACTIVE" ? "Inactif" : "Suspendu";

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      status === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700"
        : status === "INACTIVE"
          ? "bg-gray-100 text-gray-600"
          : "bg-red-50 text-red-600"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        status === "ACTIVE" ? "bg-emerald-500" : status === "INACTIVE" ? "bg-gray-400" : "bg-red-500"
      }`}
    />
    {statusLabel(status)}
  </span>
);

const Avatar: React.FC<{ name: string; size?: string }> = ({ name, size = "h-10 w-10" }) => (
  <span
    className={`flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
  >
    {initials(name)}
  </span>
);

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
}> = ({ icon: Icon, label, value, sub }) => (
  <div className="flex flex-col gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2.5 px-2 pt-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm">
        <Icon size={17} />
      </span>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
    <div className="rounded-2xl bg-gray-50 px-4 py-4">
      <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-gray-950">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="mt-2 text-xs text-gray-500">{sub}</p>
    </div>
  </div>
);

interface RowProps {
  customer: CustomerSummaryResponse;
  onOpen: (customerId: string) => void;
  onDelete: (e: React.MouseEvent, customer: CustomerSummaryResponse) => void;
  deletePending: boolean;
}

const ActionButtons: React.FC<RowProps> = ({ customer, onOpen, onDelete, deletePending }) => (
  <div className="flex justify-end gap-1.5">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(customer.customerId);
      }}
      title="Voir le détail"
      aria-label="Voir le détail"
      className={`flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] hover:text-[color:var(--logo-pink-dark)] ${FOCUS}`}
    >
      <Eye size={17} />
    </button>
    <button
      type="button"
      onClick={(e) => onDelete(e, customer)}
      disabled={deletePending}
      title="Supprimer"
      aria-label="Supprimer"
      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
    >
      <Trash2 size={17} />
    </button>
  </div>
);

const CustomerMobileCard: React.FC<RowProps> = (props) => {
  const { customer, onOpen } = props;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(customer.customerId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(customer.customerId);
        }
      }}
      className={`cursor-pointer rounded-2xl bg-gray-50 p-3 text-left transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] ${FOCUS}`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={customer.displayName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-950">
            {customer.displayName || "Sans nom"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">{customer.customerId}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl bg-white px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Email</span>
          <span className="min-w-0 break-all text-right text-xs font-medium text-gray-700">
            {customer.email || "Non renseigné"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Téléphone</span>
          <span className="min-w-0 text-right text-xs font-medium text-gray-700">
            {customer.phone || "Non renseigné"}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <ActionButtons {...props} />
      </div>
    </div>
  );
};

export const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [typeFilter, setTypeFilter] = useState<"PERSON" | "COMPANY" | "">("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [page, setPage] = useState(0);
  const pageSize = 20;

  const {
    data: searchResults,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery({
    queryKey: ["customers", "search-basic", debouncedSearch, typeFilter],
    queryFn: () => customerService.searchCustomers(debouncedSearch, typeFilter || undefined),
    enabled: debouncedSearch.length >= 2,
  });

  const {
    data: paginatedResult,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["customers", "paginated", page, statusFilter],
    queryFn: () =>
      customerService.getCustomersPaginated({
        page,
        size: pageSize,
        sort: "createdAt,desc",
      }),
    enabled: debouncedSearch.length < 2,
  });

  const isSearchMode = debouncedSearch.length >= 2;

  const baseCustomers: CustomerSummaryResponse[] = isSearchMode
    ? searchResults || []
    : paginatedResult?.data || [];

  // Le statut est filtré côté écran, dans les deux modes (liste et recherche)
  const customers = statusFilter
    ? baseCustomers.filter((c) => c.status === statusFilter)
    : baseCustomers;

  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const inactiveCount = customers.filter((c) => c.status !== "ACTIVE").length;

  const pagination = isSearchMode ? null : paginatedResult?.pageable;
  const isLoading = isSearchMode ? isSearchLoading : isListLoading;
  const error = isSearchMode ? searchError : listError;

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => customerService.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleDelete = (e: React.MouseEvent, customer: CustomerSummaryResponse) => {
    e.stopPropagation();
    toast.confirm({
      message: "Supprimer ce customer ?",
      detail: customer.displayName || customer.customerId,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression en cours",
      successMessage: "Customer supprimé",
      errorMessage: "La suppression a échoué",
      onConfirm: () => deleteMutation.mutateAsync(customer.customerId),
    });
  };

  const handleOpen = (customerId: string) => navigate(customerPath(customerId));

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const hasFilters = !!(searchTerm || typeFilter || statusFilter);

  if (isLoading && page === 0 && !isSearchMode) {
    return (
      <AdminLayout>
        <div className="space-y-6" style={brandVars}>
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-3 h-3.5 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[1.75rem]" />
            ))}
          </div>
          <ListSkeleton rows={6} />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
          Erreur lors du chargement des customers : {(error as Error).message}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5" style={brandVars}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Clients</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez tous vos clients, personnes et compagnies.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/companies/create")}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 md:w-auto ${FOCUS}`}
            >
              <Plus size={17} />
              Créer une entreprise
            </button>
            <button
              type="button"
              onClick={() => navigate("/customers/create")}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 md:w-auto ${FOCUS}`}
            >
              <Plus size={17} />
              Créer un client
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            icon={Users}
            label="Clients"
            value={pagination ? pagination.totalElements : customers.length}
            sub={pagination ? "au total" : "dans cette recherche"}
          />
          <StatCard icon={UserCheck} label="Actifs" value={activeCount} sub="sur la liste affichée" />
          <StatCard icon={UserX} label="Inactifs ou suspendus" value={inactiveCount} sub="sur la liste affichée" />
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className={`${FIELD} pl-11`}
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "PERSON" | "COMPANY" | "");
                setPage(0);
              }}
              className={`${FIELD} md:w-auto`}
            >
              <option value="">Tous les types</option>
              <option value="PERSON">Personnes</option>
              <option value="COMPANY">Compagnies</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className={`${FIELD} md:w-auto`}
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 ${FOCUS}`}
              >
                <X size={15} />
                Effacer
              </button>
            )}
          </div>

          {(searchTerm && searchTerm !== debouncedSearch) ||
          (isSearchMode && searchResults) ||
          (typeFilter && !isSearchMode) ? (
            <p className="mt-3 px-1 text-xs text-gray-500">
              {searchTerm && searchTerm !== debouncedSearch
                ? "Recherche en cours..."
                : isSearchMode && searchResults
                  ? `${searchResults.length} résultat(s) trouvé(s)`
                  : "Le filtre par type s'applique lorsque vous lancez une recherche (2 caractères minimum)."}
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-2 shadow-sm sm:p-3">
          <div className="hidden lg:block">
            <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_9rem_6rem] gap-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500">
              <span>Client</span>
              <span>Contact</span>
              <span>Statut</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="mt-1.5 space-y-0.5">
              {customers.map((customer) => (
                <div
                  key={customer.customerId}
                  onClick={() => handleOpen(customer.customerId)}
                  className="grid cursor-pointer grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_9rem_6rem] items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={customer.displayName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {customer.displayName || "Sans nom"}
                      </p>
                      <p className="truncate font-mono text-xs text-gray-400">{customer.customerId}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-800">{customer.email}</p>
                    <p className="truncate text-xs text-gray-500">{customer.phone || "Sans numéro"}</p>
                  </div>

                  <div>
                    <StatusBadge status={customer.status} />
                  </div>

                  <ActionButtons
                    customer={customer}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    deletePending={deleteMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 lg:hidden">
            {customers.map((customer) => (
              <CustomerMobileCard
                key={customer.customerId}
                customer={customer}
                onOpen={handleOpen}
                onDelete={handleDelete}
                deletePending={deleteMutation.isPending}
              />
            ))}
          </div>

          {isLoading && customers.length === 0 && <ListSkeleton rows={6} />}

          {customers.length === 0 && !isLoading && (
            <div className="px-4 py-14 text-center">
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
                <Users size={24} />
              </span>
              <p className="mt-4 text-sm font-semibold text-gray-800">Aucun client trouvé</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--logo-pink-dark)] transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ${FOCUS}`}
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {!isSearchMode && pagination && pagination.totalPages > 1 && (
            <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
                Affichage de {page * pageSize + 1} à{" "}
                {Math.min((page + 1) * pageSize, pagination.totalElements)} sur {pagination.totalElements} clients
              </p>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNext}
                  className={`rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
        <Toaster />
      </div>
    </AdminLayout>
  );
};