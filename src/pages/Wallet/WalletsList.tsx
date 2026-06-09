import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Search,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  walletService,
  formatAmountOnly,
  safeNumber,
} from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";

interface WalletsListProps {
  onOpenLookup?: () => void;
  onOpenTopUp?: () => void;
}

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Suspendu", color: "bg-yellow-100 text-yellow-700" },
  LOCKED: { label: "Verrouillé", color: "bg-red-100 text-red-700" },
  CLOSED: { label: "Fermé", color: "bg-gray-100 text-gray-500" },
  UNDER_REVIEW: {
    label: "En révision",
    color: "bg-orange-100 text-orange-700",
  },
};

export const WalletsList: React.FC<WalletsListProps> = ({
  onOpenLookup,
  onOpenTopUp,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "wallets",
      page,
      debouncedSearch,
      statusFilter,
      ownerTypeFilter,
      currencyFilter,
    ],
    queryFn: () =>
      walletService.getWallets({
        searchText: debouncedSearch || undefined,
        status: statusFilter || undefined,
        ownerType: ownerTypeFilter || undefined,
        currency: currencyFilter || undefined,
        page,
        size: PAGE_SIZE,
        sort: "openedAt,desc",
      }),
  });

  const wallets: Wallet[] = data?.content || [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const totals = useMemo(() => {
    return wallets.reduce(
      (acc, wallet) => {
        acc.available += safeNumber(wallet.availableBalance);
        acc.held += safeNumber(wallet.heldBalance);
        acc.ledger += safeNumber(wallet.ledgerBalance);
        return acc;
      },
      { available: 0, held: 0, ledger: 0 },
    );
  }, [wallets]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setOwnerTypeFilter("");
    setCurrencyFilter("");
    setPage(0);
  };

  if (isLoading && wallets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chargement des portefeuilles...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Liste des portefeuilles
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalElements} portefeuille{totalElements > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenLookup}
            className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm"
          >
            <Search size={17} /> Rechercher / créer
          </button>
          <button
            onClick={onOpenTopUp}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Plus size={17} /> Top-up
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Disponible page"
          value={`${formatAmountOnly(totals.available)} XAF`}
          tone="green"
        />
        <SummaryCard
          label="Bloqué page"
          value={`${formatAmountOnly(totals.held)} XAF`}
          tone="orange"
        />
        <SummaryCard
          label="Ledger page"
          value={`${formatAmountOnly(totals.ledger)} XAF`}
          tone="gray"
        />
      </div>

      <div className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par propriétaire, email, nom, wallet..."
            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg"
          />
          {isFetching && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
            />
          )}
        </div>
        <select
          value={ownerTypeFilter}
          onChange={(e) => {
            setOwnerTypeFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les propriétaires</option>
          <option value="CUSTOMER">Customer</option>
          <option value="MEMBER">Membre</option>
          <option value="BUSINESS_ENTITY">Entreprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value.toUpperCase());
              setPage(0);
            }}
            placeholder="XAF"
            className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono"
          />
          {(search || statusFilter || ownerTypeFilter || currencyFilter) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {wallets.length === 0 ? (
          <div className="text-center py-12">
            <WalletIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun portefeuille trouvé</p>
            <button
              onClick={onOpenLookup}
              className="mt-3 text-primary-600 text-sm hover:underline"
            >
              Rechercher ou créer automatiquement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Wallet
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Propriétaire
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                    Disponible
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                    Bloqué
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                    Ledger
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {wallets.map((wallet) => {
                  const status = statusConfig[wallet.status] || {
                    label: wallet.status,
                    color: "bg-gray-100 text-gray-500",
                  };
                  return (
                    <tr key={wallet.walletNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-mono text-sm font-semibold">
                          {wallet.walletNumber}
                        </p>
                        <p className="text-xs text-gray-400">
                          Ouvert le{" "}
                          {wallet.openedAt
                            ? new Date(wallet.openedAt).toLocaleDateString(
                                "fr-FR",
                              )
                            : "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">
                          {wallet.ownerCode}
                        </p>
                        <p className="text-xs text-gray-400">
                          {wallet.ownerType}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        {formatAmountOnly(wallet.availableBalance)}{" "}
                        {wallet.currency}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-orange-600">
                        {formatAmountOnly(wallet.heldBalance)} {wallet.currency}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatAmountOnly(wallet.ledgerBalance)}{" "}
                        {wallet.currency}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            navigate(`/wallets/${wallet.walletNumber}`)
                          }
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          title="Voir détail"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-sm text-gray-500">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  tone: "green" | "orange" | "gray";
}> = ({ label, value, tone }) => {
  const color =
    tone === "green"
      ? "text-green-600"
      : tone === "orange"
        ? "text-orange-600"
        : "text-gray-900";
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
};
