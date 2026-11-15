import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Plus } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { UsageRecord, EntitlementDefinition } from "../../../services/subscription.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import {
  ActionButton,
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
  Tag,
} from "../../../components/subscription/kit";
import {
  FIELD_SOFT,
  formatDateTime,
  formatMoney,
} from "../../../components/subscription/kitUtils";
import {
  SUBSCRIBER_TYPE_LABELS,
  USAGE_STATUS,
  statusOf,
} from "../../../components/subscription/labels";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_6rem_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_7rem]";

export const UsageRecordsList: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [entitlementFilter, setEntitlementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  const { data: usageData, isLoading } = useQuery({
    queryKey: ["usage-records", ownerTypeFilter, entitlementFilter, statusFilter, page],
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
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const records = usageData?.content ?? [];
  const totalPages = usageData?.totalPages ?? 1;
  const totalElements = usageData?.totalElements ?? 0;

  // Filtre local sur ownerCode / usageNumber / referenceId
  const needle = debouncedSearch.toLowerCase();
  const filtered = debouncedSearch
    ? records.filter(
        (r) =>
          r.ownerCode.toLowerCase().includes(needle) ||
          r.usageNumber.toLowerCase().includes(needle) ||
          (r.referenceId && r.referenceId.toLowerCase().includes(needle)),
      )
    : records;

  const hasActiveFilters = !!(ownerTypeFilter || entitlementFilter || statusFilter || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setOwnerTypeFilter("");
    setEntitlementFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const getEntName = (code: string) => entDefs.find((d) => d.code === code)?.name ?? code;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Enregistrements d'usage"
        action={
          <ActionButton
            icon={Plus}
            className="w-full sm:w-auto"
            onClick={() => navigate("/subscriptions/usage/create")}
          >
            Enregistrer un usage
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par n°, propriétaire ou référence..."
        />
        <FilterButton
          open={showFilters}
          active={hasActiveFilters}
          onClick={() => setShowFilters(!showFilters)}
        />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleReset}>
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
          <Field label="Droit">
            <select
              value={entitlementFilter}
              onChange={(e) => handleFilterChange(setEntitlementFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les droits</option>
              {entDefs.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous</option>
              {Object.entries(USAGE_STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucun usage enregistré"
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
            <span>N° usage</span>
            <span>Propriétaire</span>
            <span>Droit</span>
            <span>Quantité</span>
            <span>Référence</span>
            <span>Date</span>
            <span>Facturable</span>
            <span>Statut</span>
          </HeadRow>

          <div className="space-y-2">
            {filtered.map((r: UsageRecord) => {
              const st = statusOf(USAGE_STATUS, r.status);
              const ownerType = SUBSCRIBER_TYPE_LABELS[r.ownerType] ?? r.ownerType;
              const amount = r.billable ? formatMoney(r.billableAmount, r.currency || "XAF") : "";
              return (
                <div key={r.usageNumber} className="rounded-2xl bg-gray-50 p-3">
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="truncate font-mono text-xs font-semibold text-gray-700">
                      {r.usageNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-800">{r.ownerCode}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{ownerType}</p>
                    </div>
                    <span className="truncate text-sm text-gray-800">{getEntName(r.entitlementCode)}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {r.quantity} {r.unit}
                    </span>
                    <div className="min-w-0">
                      {r.referenceType && <p className="text-xs text-gray-400">{r.referenceType}</p>}
                      {r.referenceId && (
                        <p className="truncate font-mono text-xs text-gray-700">{r.referenceId}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{formatDateTime(r.occurredAt)}</span>
                    <span className="text-sm font-semibold text-emerald-600">{amount}</span>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {getEntName(r.entitlementCode)}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {r.quantity} {r.unit}
                          {amount && <span className="font-semibold text-emerald-600"> · {amount}</span>}
                        </p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-700">{r.usageNumber}</span>
                      <Tag>{ownerType}</Tag>
                      <span className="font-mono text-xs text-gray-500">{r.ownerCode}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDateTime(r.occurredAt)}
                      {r.referenceId && ` · ${r.referenceType ?? "Réf."} ${r.referenceId}`}
                    </p>
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
        noun="enregistrement"
        onChange={setPage}
      />
    </div>
  );
};
