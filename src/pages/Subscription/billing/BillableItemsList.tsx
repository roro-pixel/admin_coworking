import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Receipt, FileText } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { BillableItem } from "../../../services/subscription.service";
import { billingService } from "../../../services/billing.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import {
  FIELD_SOFT,
  PINK_SOFT,
  apiMessage,
  formatDate,
  formatMoney,
} from "../../../components/subscription/kitUtils";
import {
  BILLABLE_STATUS,
  SUBSCRIBER_TYPE_LABELS,
  statusOf,
} from "../../../components/subscription/labels";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_7rem_7rem]";

const CHECK = "h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]";

export const BillableItemsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [subscriberTypeFilter, setSubscriberTypeFilter] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    title: "Facture éléments facturables",
    description: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
  });
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ["billable-items", statusFilter, subscriberTypeFilter, sourceTypeFilter, page],
    queryFn: () =>
      subscriptionService.getBillableItems({
        status: statusFilter || undefined,
        subscriberType: subscriberTypeFilter || undefined,
        sourceType: sourceTypeFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const items = itemsData?.content ?? [];
  const totalPages = itemsData?.totalPages ?? 1;
  const totalElements = itemsData?.totalElements ?? 0;

  const needle = debouncedSearch.toLowerCase();
  const filtered = debouncedSearch
    ? items.filter(
        (i) =>
          i.billableNumber.toLowerCase().includes(needle) ||
          i.subscriberCode.toLowerCase().includes(needle) ||
          i.sourceId.toLowerCase().includes(needle),
      )
    : items;

  const pendingOnPage = filtered.filter((i) => i.status === "PENDING");
  const allPendingSelected =
    pendingOnPage.length > 0 && pendingOnPage.every((i) => selected.has(i.billableNumber));

  const toggleSelect = (billableNumber: string) => {
    const next = new Set(selected);
    if (next.has(billableNumber)) next.delete(billableNumber);
    else next.add(billableNumber);
    setSelected(next);
  };

  const toggleSelectAllPending = () => {
    const next = new Set(selected);
    if (allPendingSelected) pendingOnPage.forEach((i) => next.delete(i.billableNumber));
    else pendingOnPage.forEach((i) => next.add(i.billableNumber));
    setSelected(next);
  };

  const selectedTotal = filtered
    .filter((i) => selected.has(i.billableNumber))
    .reduce((sum, i) => sum + i.amount, 0);

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceFromBillableItems({
        title: invoiceForm.title || undefined,
        description: invoiceForm.description || undefined,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate || undefined,
        billableNumbers: Array.from(selected),
      }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["billable-items"] });
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      setIsInvoiceOpen(false);
      setSelected(new Set());
      toast.success("Facture créée");
      navigate(`/billing/documents/${invoice.documentNumber}`);
    },
    onError: (e: unknown) =>
      setInvoiceError(apiMessage(e, "Erreur lors de la création de la facture.")),
  });

  const hasActiveFilters = !!(statusFilter || subscriberTypeFilter || sourceTypeFilter || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("PENDING");
    setSubscriberTypeFilter("");
    setSourceTypeFilter("");
    setPage(0);
  };

  const totalPending = items
    .filter((i) => i.status === "PENDING")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Items facturables"
        subtitle="Sélectionnez des lignes en attente pour générer une facture"
        action={
          <div className="flex flex-wrap items-center gap-3">
            {totalPending > 0 && (
              <div className={`rounded-2xl px-4 py-2 ${PINK_SOFT}`}>
                <p className="text-xs font-semibold text-[color:var(--logo-pink-dark)]">
                  Total en attente (page)
                </p>
                <p className="text-base font-bold text-gray-950">{formatMoney(totalPending, items[0]?.currency)}</p>
              </div>
            )}
            {selected.size > 0 && (
              <ActionButton
                icon={FileText}
                onClick={() => {
                  setInvoiceError(null);
                  setIsInvoiceOpen(true);
                }}
              >
                Facturer ({selected.size})
              </ActionButton>
            )}
          </div>
        }
      />

      {isInvoiceOpen && (
        <PanelForm
          title="Créer une facture"
          onSubmit={(e) => {
            e.preventDefault();
            setInvoiceError(null);
            createInvoiceMutation.mutate();
          }}
          onCancel={() => setIsInvoiceOpen(false)}
          pending={createInvoiceMutation.isPending}
          submitLabel="Générer la facture"
          submitDisabled={selected.size === 0 || !invoiceForm.issueDate}
          error={invoiceError}
        >
          <div className={`flex flex-wrap gap-x-8 gap-y-1 rounded-2xl px-4 py-3 text-sm ${PINK_SOFT}`}>
            <p>
              <span className="text-gray-600">Items sélectionnés : </span>
              <strong className="text-gray-950">{selected.size}</strong>
            </p>
            <p>
              <span className="text-gray-600">Montant estimé : </span>
              <strong className="text-gray-950">{formatMoney(selectedTotal, filtered[0]?.currency)}</strong>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Titre" className="md:col-span-2">
              <input
                type="text"
                value={invoiceForm.title}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, title: e.target.value }))}
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className={`${FIELD_SOFT} resize-none`}
              />
            </Field>
            <Field label="Date d'émission" required>
              <input
                type="date"
                value={invoiceForm.issueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))}
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Date d'échéance">
              <input
                type="date"
                value={invoiceForm.dueDate}
                min={invoiceForm.issueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
                className={FIELD_SOFT}
              />
            </Field>
          </div>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par n°, souscripteur ou source..."
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
              {Object.entries(BILLABLE_STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type souscripteur">
            <select
              value={subscriberTypeFilter}
              onChange={(e) => handleFilterChange(setSubscriberTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous</option>
              {Object.entries(SUBSCRIBER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type source">
            <select
              value={sourceTypeFilter}
              onChange={(e) => handleFilterChange(setSourceTypeFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Toutes</option>
              <option value="SUBSCRIPTION">Souscription</option>
              <option value="OVERAGE">Overage</option>
              <option value="USAGE">Usage</option>
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucun item facturable trouvé" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <input
              type="checkbox"
              checked={allPendingSelected}
              onChange={toggleSelectAllPending}
              disabled={pendingOnPage.length === 0}
              title="Sélectionner tous les items en attente"
              aria-label="Sélectionner tous les items en attente"
              className={CHECK}
            />
            <span>N° billable</span>
            <span>Souscripteur</span>
            <span>Source</span>
            <span className="text-right">Montant</span>
            <span>Date</span>
            <span>Statut</span>
          </HeadRow>

          <div className="space-y-2">
            {filtered.map((item: BillableItem) => {
              const st = statusOf(BILLABLE_STATUS, item.status);
              const isSelected = selected.has(item.billableNumber);
              const subscriberType =
                SUBSCRIBER_TYPE_LABELS[item.subscriberType] ?? item.subscriberType;
              const check =
                item.status === "PENDING" ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.billableNumber)}
                    aria-label={`Sélectionner ${item.billableNumber}`}
                    className={CHECK}
                  />
                ) : (
                  <span className="inline-block w-4" />
                );
              return (
                <div
                  key={item.billableNumber}
                  className={`rounded-2xl p-3 transition ${
                    isSelected ? PINK_SOFT : "bg-gray-50"
                  }`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    {check}
                    <span className="truncate font-mono text-xs font-semibold text-gray-700">
                      {item.billableNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-800">{item.subscriberCode}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{subscriberType}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{item.sourceType}</p>
                      <p className="truncate font-mono text-xs text-gray-700">{item.sourceId}</p>
                    </div>
                    <span className="text-right text-sm font-semibold text-gray-900">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                    <span className="text-sm text-gray-600">{formatDate(item.createdAt)}</span>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="flex items-start gap-3 lg:hidden">
                    <div className="pt-1">{check}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-gray-900">
                          {formatMoney(item.amount, item.currency)}
                        </p>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs font-semibold text-gray-700">
                        {item.billableNumber}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Tag>{subscriberType}</Tag>
                        <span className="font-mono text-xs text-gray-500">{item.subscriberCode}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {item.sourceType} · {item.sourceId} · {formatDate(item.createdAt)}
                      </p>
                    </div>
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
        noun="item"
        onChange={setPage}
      />
    </div>
  );
};
