import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Wallet as WalletIcon } from "lucide-react";
import { walletService, safeNumber } from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, ListHeader, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ChartCard, DonutBreakdown, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import type { Slice } from "../../components/operations/opsChartData";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { OWNER_TYPE_LABEL, OWNER_TYPE_OPTIONS, WALLET_STATUS_LABEL, WALLET_STATUS_TONE } from "../../components/wallet/walletLabels";
import type { WalletStatus } from "../../services/wallet.service";

interface WalletsListProps {
  onOpenLookup?: () => void;
  onOpenTopUp?: () => void;
}

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_9rem_9rem_9rem_8rem]";

/**
 * Totaux dans la devise la plus présente sur la page : additionner XAF et EUR n'aurait aucun sens.
 * Les autres devises sont signalées en sous-titre.
 */
const pageTotals = (wallets: Wallet[]) => {
  const counts = new Map<string, number>();
  wallets.forEach((w) => counts.set(w.currency, (counts.get(w.currency) ?? 0) + 1));
  const main = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "XAF";
  const sum = (pick: (w: Wallet) => number | undefined | null) => wallets.filter((w) => w.currency === main).reduce((t, w) => t + safeNumber(pick(w)), 0);
  const others = Array.from(counts.keys()).filter((c) => c !== main);
  return {
    cur: currencyLabel(main),
    available: sum((w) => w.availableBalance),
    held: sum((w) => w.heldBalance),
    ledger: sum((w) => w.ledgerBalance),
    hint: others.length > 0 ? `Hors ${others.join(", ")}` : undefined,
  };
};

export const WalletsList: React.FC<WalletsListProps> = ({ onOpenLookup, onOpenTopUp }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [debouncedCurrency, setDebouncedCurrency] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // La devise se tape lettre par lettre : sans délai, chaque frappe lançait une requête.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedCurrency(currencyFilter);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [currencyFilter]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallets", page, debouncedSearch, statusFilter, ownerTypeFilter, debouncedCurrency],
    queryFn: () =>
      walletService.getWallets({
        searchText: debouncedSearch || undefined,
        status: statusFilter || undefined,
        ownerType: ownerTypeFilter || undefined,
        currency: debouncedCurrency || undefined,
        page,
        size: PAGE_SIZE,
        sort: "openedAt,desc",
      }),
  });

  const wallets: Wallet[] = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const totals = useMemo(() => pageTotals(wallets), [wallets]);
  const hasActiveFilters = !!(search || statusFilter || ownerTypeFilter || currencyFilter);

  // Répartition des statuts sur la page affichée (le backend ne fournit pas de total global).
  const statusSlices: Slice[] = useMemo(() => {
    const counts = wallets.reduce<Record<string, number>>((acc, w) => ({ ...acc, [w.status]: (acc[w.status] ?? 0) + 1 }), {});
    return Object.entries(counts).map(([status, value], i) => ({
      key: status,
      label: WALLET_STATUS_LABEL[status as WalletStatus] ?? status,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [wallets]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setOwnerTypeFilter("");
    setCurrencyFilter("");
    setDebouncedCurrency("");
    setPage(0);
  };

  const open = (n: string) => navigate(`/wallets/${n}`);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Liste des portefeuilles"
        subtitle={isLoading ? undefined : `${totalElements} portefeuille${totalElements > 1 ? "s" : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Search} onClick={onOpenLookup}>
              Rechercher ou créer
            </ActionButton>
            <ActionButton icon={Plus} onClick={onOpenTopUp}>
              Top-up
            </ActionButton>
          </div>
        }
      />

      {isLoading ? (
        <KpiRowSkeleton count={3} columns={3} />
      ) : (
        wallets.length > 0 && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <KpiRow
                columns={3}
                items={[
                  { label: "Disponible, page affichée", value: formatMoney(totals.available, totals.cur), tone: "success", hint: totals.hint },
                  { label: "Bloqué", value: formatMoney(totals.held, totals.cur), tone: "pink", hint: totals.hint },
                  { label: "Solde ledger", value: formatMoney(totals.ledger, totals.cur), hint: totals.hint },
                ]}
              />
            </div>
            <ChartCard title="Statuts" subtitle="Page affichée">
              <DonutBreakdown data={statusSlices} centerLabel="portefeuilles" />
            </ChartCard>
          </div>
        )
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Propriétaire, e-mail, nom, portefeuille" />
        <FilterButton open={showFilters} active={!!(statusFilter || ownerTypeFilter || currencyFilter)} onClick={() => setShowFilters(!showFilters)} />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={resetFilters}>
          <Field label="Propriétaire">
            <select
              value={ownerTypeFilter}
              onChange={(e) => {
                setOwnerTypeFilter(e.target.value);
                setPage(0);
              }}
              className={FIELD}
            >
              <option value="">Tous les propriétaires</option>
              {OWNER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className={FIELD}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(WALLET_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Devise">
            <input value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value.toUpperCase())} placeholder="XAF" className={`${FIELD} font-mono`} />
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les portefeuilles." onRetry={() => refetch()} />
      ) : wallets.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="Aucun portefeuille trouvé"
          hint={hasActiveFilters ? "Ajustez ou réinitialisez les filtres." : "Créez-en un depuis l'onglet Recherche et création."}
          action={
            <ActionButton variant="ghost" onClick={hasActiveFilters ? resetFilters : onOpenLookup}>
              {hasActiveFilters ? "Réinitialiser les filtres" : "Rechercher ou créer"}
            </ActionButton>
          }
        />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Portefeuille</span>
            <span>Propriétaire</span>
            <span className="text-right">Disponible</span>
            <span className="text-right">Bloqué</span>
            <span className="text-right">Ledger</span>
            <span>Statut</span>
          </HeadRow>
          <DataCard>
            {wallets.map((w) => {
              const cur = currencyLabel(w.currency);
              return (
                <div
                  key={w.walletNumber}
                  role="link"
                  tabIndex={0}
                  onClick={() => open(w.walletNumber)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") open(w.walletNumber);
                  }}
                  className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS} ${ROW_HOVER}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{w.walletNumber}</p>
                    <p className="text-xs text-gray-400">{w.openedAt ? `Ouvert le ${formatDate(w.openedAt)}` : ""}</p>
                  </div>
                  <div className="max-lg:order-3 max-lg:col-span-2 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{w.ownerCode}</p>
                    <p className="text-xs text-gray-400">{OWNER_TYPE_LABEL[w.ownerType] ?? w.ownerType}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-emerald-700 max-lg:order-4 lg:text-right">
                    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">Disponible</span>
                    {formatMoney(w.availableBalance, cur)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-[color:var(--logo-pink-dark)] max-lg:order-5 lg:text-right">
                    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">Bloqué</span>
                    {formatMoney(w.heldBalance, cur)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900 max-lg:order-6 lg:text-right">
                    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">Ledger</span>
                    {formatMoney(w.ledgerBalance, cur)}
                  </p>
                  <div className="max-lg:order-2 max-lg:justify-self-end">
                    <StatusChip tone={WALLET_STATUS_TONE[w.status] ?? "neutral"}>{WALLET_STATUS_LABEL[w.status] ?? w.status}</StatusChip>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={totalElements} noun="portefeuille" onChange={setPage} />
        </>
      )}
    </div>
  );
};
