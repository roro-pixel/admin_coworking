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
  Filter,
  TrendingUp,
  Lock,
  Layers,
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
  ACTIVE: {
    label: "Actif",
    color: "bg-green-50 text-green-700 ring-green-100",
  },
  SUSPENDED: {
    label: "Suspendu",
    color: "bg-yellow-50 text-yellow-700 ring-yellow-100",
  },
  LOCKED: { label: "Verrouillé", color: "bg-red-50 text-red-700 ring-red-100" },
  CLOSED: { label: "Fermé", color: "bg-gray-50 text-gray-500 ring-gray-100" },
  UNDER_REVIEW: {
    label: "En révision",
    color: "bg-orange-50 text-orange-700 ring-orange-100",
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

  const statusCount = useMemo(() => {
    return wallets.reduce<Record<string, number>>((acc, wallet) => {
      acc[wallet.status] = (acc[wallet.status] || 0) + 1;
      return acc;
    }, {});
  }, [wallets]);

  const maxStatusCount = Math.max(1, ...Object.values(statusCount));

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
      <div className="flex items-center justify-center rounded-2xl bg-white py-16 text-gray-500 shadow-sm ring-1 ring-gray-100">
        <Loader2 size={20} className="mr-2 animate-spin text-primary-600" />
        Chargement des portefeuilles...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Liste des portefeuilles
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {totalElements} portefeuille{totalElements > 1 ? "s" : ""} trouvé
            {totalElements > 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={onOpenLookup}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-primary-100 transition hover:bg-primary-50 sm:w-auto"
          >
            <Search size={17} /> Rechercher / créer
          </button>
          <button
            onClick={onOpenTopUp}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 sm:w-auto"
          >
            <Plus size={17} /> Top-up
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Disponible sur la page"
          value={`${formatAmountOnly(totals.available)} XAF`}
          tone="green"
          icon={TrendingUp}
        />
        <SummaryCard
          label="Montant bloqué"
          value={`${formatAmountOnly(totals.held)} XAF`}
          tone="orange"
          icon={Lock}
        />
        <SummaryCard
          label="Ledger total"
          value={`${formatAmountOnly(totals.ledger)} XAF`}
          tone="gray"
          icon={Layers}
        />
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Répartition statut
            </p>
            <Filter size={16} className="text-gray-400" />
          </div>
          <div className="space-y-2">
            {Object.entries(statusConfig).map(([status, cfg]) => {
              const count = statusCount[status] || 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-gray-500">
                    {cfg.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-xs font-semibold text-gray-700">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par propriétaire, email, nom, wallet..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
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
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
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
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
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
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
            />
            {(search || statusFilter || ownerTypeFilter || currencyFilter) && (
              <button
                onClick={resetFilters}
                className="rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-gray-100">
          <WalletIcon size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aucun portefeuille trouvé</p>
          <button
            onClick={onOpenLookup}
            className="mt-3 text-sm font-medium text-primary-600 hover:underline"
          >
            Rechercher ou créer automatiquement
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {wallets.map((wallet) => (
              <MobileWalletCard
                key={wallet.walletNumber}
                wallet={wallet}
                status={statusConfig[wallet.status] || {
                  label: wallet.status,
                  color: "bg-gray-50 text-gray-500 ring-gray-100",
                }}
                onOpen={() => navigate(`/wallets/${wallet.walletNumber}`)}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 md:block">
            <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 px-3 pb-3">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Propriétaire
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Disponible
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Bloqué
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Ledger
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => {
                  const status = statusConfig[wallet.status] || {
                    label: wallet.status,
                    color: "bg-gray-50 text-gray-500 ring-gray-100",
                  };
                  return (
                    <tr
                      key={wallet.walletNumber}
                      className="group cursor-pointer rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 hover:shadow-md"
                      onClick={() =>
                        navigate(`/wallets/${wallet.walletNumber}`)
                      }
                    >
                      <td className="rounded-l-xl px-4 py-4">
                        <p className="font-mono text-sm font-semibold text-gray-900">
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
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {wallet.ownerCode}
                        </p>
                        <p className="text-xs text-gray-400">
                          {wallet.ownerType}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-green-600">
                        {formatAmountOnly(wallet.availableBalance)}{" "}
                        {wallet.currency}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-orange-600">
                        {formatAmountOnly(wallet.heldBalance)} {wallet.currency}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        {formatAmountOnly(wallet.ledgerBalance)}{" "}
                        {wallet.currency}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="rounded-r-xl px-4 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/wallets/${wallet.walletNumber}`);
                          }}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-primary-50 hover:text-primary-600"
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
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl bg-white p-2 text-gray-600 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-xl bg-white p-2 text-gray-600 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MobileWalletCard: React.FC<{
  wallet: Wallet;
  status: { label: string; color: string };
  onOpen: () => void;
}> = ({ wallet, status, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-black text-gray-950">
          {wallet.walletNumber}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-gray-400">
          {wallet.ownerType} · {wallet.ownerCode}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${status.color}`}>
        {status.label}
      </span>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
      <div className="rounded-xl bg-green-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-green-700/70">Disponible</p>
        <p className="mt-1 break-words text-sm font-black text-green-700">
          {formatAmountOnly(wallet.availableBalance)} {wallet.currency}
        </p>
      </div>
      <div className="rounded-xl bg-orange-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700/70">Bloqué</p>
        <p className="mt-1 break-words text-sm font-black text-orange-700">
          {formatAmountOnly(wallet.heldBalance)} {wallet.currency}
        </p>
      </div>
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Ledger</p>
        <p className="mt-1 break-words text-sm font-black text-gray-950">
          {formatAmountOnly(wallet.ledgerBalance)} {wallet.currency}
        </p>
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-400">
        Ouvert le {wallet.openedAt ? new Date(wallet.openedAt).toLocaleDateString("fr-FR") : "—"}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-black text-primary-600">
        Voir <Eye size={14} />
      </span>
    </div>
  </button>
);

const SummaryCard: React.FC<{
  label: string;
  value: string;
  tone: "green" | "orange" | "gray";
  icon: React.ElementType;
}> = ({ label, value, tone, icon: Icon }) => {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : "bg-gray-50 text-gray-700";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`rounded-xl p-2 ${toneClass}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
