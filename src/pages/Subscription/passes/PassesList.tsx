import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpRight, Ticket } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Pass } from "../../../services/subscription.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
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
import { FIELD_SOFT, ROW_HOVER, formatDate } from "../../../components/subscription/kitUtils";
import {
  PASS_STATUS,
  PASS_TYPE_LABELS,
  SUBSCRIBER_TYPE_LABELS,
  statusOf,
} from "../../../components/subscription/labels";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_9rem_3rem]";

// Statuts proposés par le filtre (comme avant)
const FILTER_STATUSES = ["ACTIVE", "CANCELLED", "EXPIRED"];

export const PassesList: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [passTypeFilter, setPassTypeFilter] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [expiringBefore, setExpiringBefore] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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

  const { data: passesData, isLoading } = useQuery({
    queryKey: ["passes", statusFilter, passTypeFilter, ownerTypeFilter, expiringBefore, page],
    queryFn: () =>
      subscriptionService.getPasses({
        status: statusFilter || undefined,
        passType: passTypeFilter || undefined,
        ownerType: ownerTypeFilter || undefined,
        expiringBefore: expiringBefore || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const passes = passesData?.content ?? [];
  const totalPages = passesData?.totalPages ?? 1;
  const totalElements = passesData?.totalElements ?? 0;

  // Filtre local sur n°, propriétaire et nom
  const needle = debouncedSearch.toLowerCase();
  const filtered = debouncedSearch
    ? passes.filter(
        (p) =>
          p.passNumber.toLowerCase().includes(needle) ||
          p.ownerCode.toLowerCase().includes(needle) ||
          p.name.toLowerCase().includes(needle),
      )
    : passes;

  const hasActiveFilters = !!(statusFilter || passTypeFilter || ownerTypeFilter || expiringBefore || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPassTypeFilter("");
    setOwnerTypeFilter("");
    setExpiringBefore("");
    setPage(0);
  };

  const openPass = (pass: Pass) => navigate(`/subscriptions/passes/${pass.passNumber}`);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Pass"
        action={
          <ActionButton
            icon={Plus}
            className="w-full sm:w-auto"
            onClick={() => navigate("/subscriptions/passes/create")}
          >
            Nouveau pass
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par n°, propriétaire ou nom..."
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
              <option value="">Tous</option>
              {FILTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PASS_STATUS[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={passTypeFilter}
              onChange={(e) => handleFilterChange(setPassTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les types</option>
              {Object.entries(PASS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type propriétaire">
            <select
              value={ownerTypeFilter}
              onChange={(e) => handleFilterChange(setOwnerTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous</option>
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </Field>
          <Field label="Expire avant">
            <input
              type="date"
              value={expiringBefore}
              onChange={(e) => handleFilterChange(setExpiringBefore, e.target.value)}
              className={FIELD_SOFT}
            />
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Aucun pass trouvé"
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
            <span>N° pass</span>
            <span>Nom</span>
            <span>Type</span>
            <span>Propriétaire</span>
            <span>Validité</span>
            <span>Statut</span>
            <span />
          </HeadRow>

          <div className="space-y-2">
            {filtered.map((pass) => {
              const st = statusOf(PASS_STATUS, pass.status);
              const typeLabel = PASS_TYPE_LABELS[pass.passType] ?? pass.passType;
              const ownerType = SUBSCRIBER_TYPE_LABELS[pass.ownerType] ?? pass.ownerType;
              return (
                <div
                  key={pass.passNumber}
                  onClick={() => openPass(pass)}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="truncate font-mono text-xs font-semibold text-gray-700">
                      {pass.passNumber}
                    </span>
                    <span className="truncate font-semibold text-gray-900">{pass.name}</span>
                    <span className="truncate text-sm text-gray-700">{typeLabel}</span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-800">{pass.ownerCode}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{ownerType}</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>{formatDate(pass.validFrom)}</p>
                      {pass.validUntil && <p className="text-xs text-gray-400">→ {formatDate(pass.validUntil)}</p>}
                    </div>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon={ArrowUpRight} label="Voir le pass" onClick={() => openPass(pass)} />
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{pass.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{pass.passNumber}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{typeLabel}</Tag>
                      <Tag>{ownerType}</Tag>
                      <span className="font-mono text-xs text-gray-500">{pass.ownerCode}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(pass.validFrom)}
                      {pass.validUntil && ` → ${formatDate(pass.validUntil)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination page={page} totalPages={totalPages} total={totalElements} noun="pass" onChange={setPage} />
    </div>
  );
};
