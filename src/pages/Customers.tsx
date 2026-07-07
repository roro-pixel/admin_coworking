import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Search, Eye, User, Plus, Trash2 } from "lucide-react";
import { customerService } from "../services/customer.service";
import type {
  CustomerSummaryResponse,
  CustomerResponse,
} from "../services/customer.service";
import { useDebounce } from "../hooks/useDebounce";


const customerStatusLabel = (status: string) =>
  status === "ACTIVE"
    ? "Actif"
    : status === "INACTIVE"
      ? "Inactif"
      : "Suspendu";

const CustomerStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
      status === "ACTIVE"
        ? "bg-green-100 text-green-700"
        : status === "INACTIVE"
          ? "bg-gray-100 text-gray-700"
          : "bg-red-100 text-red-700"
    }`}
  >
    {customerStatusLabel(status)}
  </span>
);

const CustomerMobileCard: React.FC<{
  customer: CustomerSummaryResponse;
  onOpen: (customerId: string) => void;
  onDelete: (e: React.MouseEvent, customerId: string) => void;
  deletePending: boolean;
}> = ({ customer, onOpen, onDelete, deletePending }) => (
  <button
    type="button"
    onClick={() => onOpen(customer.customerId)}
    className="w-full rounded-2xl bg-gray-50 p-3 text-left ring-1 ring-gray-100 transition hover:bg-primary-50/40"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
        <User size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-gray-950">
          {customer.displayName || "Customer sans nom"}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] font-medium text-gray-400">
          {customer.customerId}
        </p>
      </div>

      <CustomerStatusBadge status={customer.status} />
    </div>

    <div className="mt-3 space-y-2 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-3">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Email
        </span>
        <span className="min-w-0 break-all text-right text-xs font-semibold text-gray-700">
          {customer.email || "—"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Téléphone
        </span>
        <span className="min-w-0 text-right text-xs font-semibold text-gray-700">
          {customer.phone || "—"}
        </span>
      </div>
    </div>

    <div className="mt-3 flex items-center justify-end gap-2">
      <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-primary-600 ring-1 ring-primary-100">
        <Eye size={15} />
        Voir
      </span>

      <button
        type="button"
        onClick={(e) => onDelete(e, customer.customerId)}
        disabled={deletePending}
        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 disabled:opacity-50"
      >
        <Trash2 size={15} />
        Supprimer
      </button>
    </div>
  </button>
);


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
    queryFn: () =>
      customerService.searchCustomers(debouncedSearch, typeFilter || undefined),
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

  const filteredSearchResults =
    searchResults?.filter((customer) => {
      if (statusFilter && customer.status !== statusFilter) return false;
      return true;
    }) || [];

  const isSearchMode = debouncedSearch.length >= 2;

  const customers: CustomerSummaryResponse[] = isSearchMode
    ? filteredSearchResults
    : paginatedResult?.data || [];

  const customerResponses = customers as unknown as CustomerResponse[];

  const personCount = customerResponses.filter(
    (c) => c.type === "PERSON",
  ).length;

  const companyCount = customerResponses.filter(
    (c) => c.type === "COMPANY",
  ).length;

  const pagination = isSearchMode ? null : paginatedResult?.pageable;
  const isLoading = isSearchMode ? isSearchLoading : isListLoading;
  const error = isSearchMode ? searchError : listError;

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) =>
      customerService.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleDelete = (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    if (confirm("Êtes-vous sûr de vouloir supprimer ce customer ?")) {
      deleteMutation.mutate(customerId);
    }
  };

  const handleRowClick = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(0);
  };

  if (isLoading && page === 0 && !isSearchMode) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          Erreur lors du chargement des customers : {(error as Error).message}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-5 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Customers</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez tous vos customers (personnes et compagnies)
            </p>
          </div>

          <button
            onClick={() => navigate("/customers/create")}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 md:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Créer un customer
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total affiché</p>
          <p className="mt-1 text-2xl font-black text-gray-900">
            {customers.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Personnes</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{personCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Compagnies</p>
          <p className="mt-1 text-2xl font-black text-gray-900">
            {companyCount}
          </p>
        </div>
      </div>

      <div
        className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards] sm:p-5"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 ring-1 ring-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "PERSON" | "COMPANY" | "");
                setPage(0);
              }}
              className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-gray-100 md:w-auto"
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
              className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-gray-100 md:w-auto"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>

            {(searchTerm || typeFilter || statusFilter) && (
              <button
                onClick={handleClearFilters}
                className="w-full whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-600 ring-1 ring-gray-100 hover:text-gray-800 md:w-auto"
              >
                Effacer les filtres
              </button>
            )}
          </div>

          {searchTerm && searchTerm !== debouncedSearch && (
            <div className="text-sm text-gray-500 italic">
              Recherche en cours...
            </div>
          )}

          {isSearchMode && searchResults && (
            <div className="text-sm text-gray-500">
              {searchResults.length} résultat(s) trouvé(s)
            </div>
          )}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-separate border-spacing-y-1">
            <thead className="bg-gray-50/70 text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  ID
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.customerId}
                  onClick={() => handleRowClick(customer.customerId)}
                  className="cursor-pointer transition-colors hover:bg-gray-50/70"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <User size={20} className="text-primary-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-medium text-gray-900">
                          {customer.displayName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {customer.customerId}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p className="max-w-[240px] truncate text-sm text-gray-900">
                      {customer.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.phone || "-"}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <CustomerStatusBadge status={customer.status} />
                  </td>

                  <td className="px-6 py-4 font-mono text-sm text-gray-500">
                    {customer.customerId}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${customer.customerId}`);
                        }}
                        className="p-1 text-primary-600 hover:text-primary-700"
                        title="Voir le détail"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={(e) => handleDelete(e, customer.customerId)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Supprimer"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 lg:hidden">
          {customers.map((customer) => (
            <CustomerMobileCard
              key={customer.customerId}
              customer={customer}
              onOpen={handleRowClick}
              onDelete={handleDelete}
              deletePending={deleteMutation.isPending}
            />
          ))}
        </div>

        {customers.length === 0 && !isLoading && (
          <div className="px-4 py-12 text-center">
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun customer trouvé</p>

            {(searchTerm || typeFilter || statusFilter) && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-primary-600 hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {!isSearchMode && pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-center text-xs font-medium text-gray-500 sm:text-left sm:text-sm">
              Affichage de {page * pageSize + 1} à{" "}
              {Math.min((page + 1) * pageSize, pagination.totalElements)} sur{" "}
              {pagination.totalElements} customers
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
