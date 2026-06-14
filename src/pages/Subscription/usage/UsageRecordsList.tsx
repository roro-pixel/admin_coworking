import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  UsageRecord,
  EntitlementDefinition,
} from "../../../services/subscription.service";
import { CreateUsageRecordModal } from "./CreateUsageRecordModal";

const PAGE_SIZE = 20;

export const UsageRecordsList: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [entitlementFilter, setEntitlementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const { data: usageData, isLoading } = useQuery({
    queryKey: [
      "usage-records",
      ownerTypeFilter,
      entitlementFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      subscriptionService.getUsageRecords({
        ownerType: ownerTypeFilter || undefined,
        entitlementCode: entitlementFilter || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        active: true,
        size: 100,
      }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const records = usageData?.content ?? [];
  const totalPages = usageData?.totalPages ?? 1;
  const totalElements = usageData?.totalElements ?? 0;

  // Filtre local sur ownerCode / referenceId
  const filtered = debouncedSearch
    ? records.filter(
        (r) =>
          r.ownerCode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          r.usageNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (r.referenceId &&
            r.referenceId
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase())),
      )
    : records;

  const hasActiveFilters =
    ownerTypeFilter || entitlementFilter || statusFilter || search;

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setOwnerTypeFilter("");
    setEntitlementFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const getEntName = (code: string) =>
    entDefs.find((d) => d.code === code)?.name ?? code;

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Enregistrements d'usage
        </h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-primary-700 hover:shadow transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Enregistrer un usage
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
            placeholder="Rechercher par n°, propriétaire ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-xl flex items-center gap-2 ${
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
        <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-6 shadow-sm shadow-gray-100/70 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type propriétaire
            </label>
            <select
              value={ownerTypeFilter}
              onChange={(e) =>
                handleFilterChange(setOwnerTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="">Tous</option>
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Droit
            </label>
            <select
              value={entitlementFilter}
              onChange={(e) =>
                handleFilterChange(setEntitlementFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="">Tous les droits</option>
              {entDefs.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="">Tous</option>
              <option value="RECORDED">Enregistré</option>
              <option value="BILLABLE">Facturable</option>
              <option value="BILLED">Facturé</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="md:col-span-3 flex justify-end">
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

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/70 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/60 text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                N° Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Propriétaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Droit
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quantité
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Référence
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Facturable
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r: UsageRecord) => (
              <tr key={r.usageNumber} className="hover:bg-primary-50/40 transition-colors">
                <td className="px-6 py-4 text-sm font-mono">{r.usageNumber}</td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-mono">{r.ownerCode}</p>
                  <p className="text-xs text-gray-400">{r.ownerType}</p>
                </td>
                <td className="px-6 py-4 text-sm">
                  {getEntName(r.entitlementCode)}
                </td>
                <td className="px-6 py-4 text-sm text-center font-medium">
                  {r.quantity} {r.unit}
                </td>
                <td className="px-6 py-4 text-sm">
                  {r.referenceType && (
                    <p className="text-xs text-gray-400">{r.referenceType}</p>
                  )}
                  {r.referenceId && (
                    <p className="font-mono text-xs">{r.referenceId}</p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(r.occurredAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {r.billable ? (
                    <span className="text-green-600 font-medium">
                      {r.billableAmount?.toLocaleString("fr-FR")} {r.currency}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      r.status === "RECORDED"
                        ? "bg-blue-100 text-blue-700"
                        : r.status === "BILLABLE"
                          ? "bg-yellow-100 text-yellow-700"
                          : r.status === "BILLED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.status ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 bg-white">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun usage enregistré</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} enregistrements au total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50/40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50/40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <CreateUsageRecordModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["usage-records"] });
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
};
