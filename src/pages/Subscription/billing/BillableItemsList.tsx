import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { BillableItem } from "../../../services/subscription.service";
import { billingService } from "../../../services/billing.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  INVOICED: { label: "Facturé", color: "bg-green-100 text-green-700" },
  VOID: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
};

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
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
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
    queryKey: [
      "billable-items",
      statusFilter,
      subscriberTypeFilter,
      sourceTypeFilter,
      page,
    ],
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

  const filtered = debouncedSearch
    ? items.filter(
        (i) =>
          i.billableNumber
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          i.subscriberCode
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          i.sourceId.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : items;

  const pendingOnPage = filtered.filter((i) => i.status === "PENDING");
  const allPendingSelected =
    pendingOnPage.length > 0 &&
    pendingOnPage.every((i) => selected.has(i.billableNumber));

  const toggleSelect = (billableNumber: string) => {
    const next = new Set(selected);
    if (next.has(billableNumber)) next.delete(billableNumber);
    else next.add(billableNumber);
    setSelected(next);
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      const next = new Set(selected);
      pendingOnPage.forEach((i) => next.delete(i.billableNumber));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pendingOnPage.forEach((i) => next.add(i.billableNumber));
      setSelected(next);
    }
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
      setIsInvoiceModalOpen(false);
      setSelected(new Set());
      navigate(`/billing/documents/${invoice.documentNumber}`);
    },
    onError: (e: any) => {
      setInvoiceError(
        e?.response?.data?.message ??
          "Erreur lors de la création de la facture.",
      );
    },
  });

  const hasActiveFilters =
    statusFilter || subscriberTypeFilter || sourceTypeFilter || search;

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

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Items facturables
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Sélectionnez des lignes en attente pour générer une facture
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalPending > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-right">
              <p className="text-xs text-yellow-600">Total en attente (page)</p>
              <p className="font-bold text-yellow-800 text-lg">
                {totalPending.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          )}
          {selected.size > 0 && (
            <button
              onClick={() => {
                setInvoiceError(null);
                setIsInvoiceModalOpen(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
            >
              <FileText size={15} />
              Facturer ({selected.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher par n°, souscripteur ou source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
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
        <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="INVOICED">Facturé</option>
              <option value="VOID">Annulé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type souscripteur
            </label>
            <select
              value={subscriberTypeFilter}
              onChange={(e) =>
                handleFilterChange(setSubscriberTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous</option>
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Customer</option>
              <option value="BUSINESS_ENTITY">Entreprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type source
            </label>
            <select
              value={sourceTypeFilter}
              onChange={(e) =>
                handleFilterChange(setSourceTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Toutes</option>
              <option value="SUBSCRIPTION">Souscription</option>
              <option value="OVERAGE">Overage</option>
              <option value="USAGE">Usage</option>
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAllPending}
                  disabled={pendingOnPage.length === 0}
                  title="Sélectionner tous les items en attente"
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                N° Billable
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Souscripteur
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Source
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Date
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((item: BillableItem) => (
              <tr
                key={item.billableNumber}
                className={`hover:bg-gray-50 ${selected.has(item.billableNumber) ? "bg-primary-50/30" : ""}`}
              >
                <td className="px-4 py-4">
                  {item.status === "PENDING" ? (
                    <input
                      type="checkbox"
                      checked={selected.has(item.billableNumber)}
                      onChange={() => toggleSelect(item.billableNumber)}
                      className="rounded"
                    />
                  ) : (
                    <span className="w-4 inline-block" />
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-mono">
                  {item.billableNumber}
                </td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-mono">{item.subscriberCode}</p>
                  <p className="text-xs text-gray-400">{item.subscriberType}</p>
                </td>
                <td className="px-6 py-4 text-sm">
                  <p className="text-xs text-gray-500">{item.sourceType}</p>
                  <p className="font-mono text-xs">{item.sourceId}</p>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-sm">
                  {item.amount.toLocaleString("fr-FR")} {item.currency}
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${statusConfig[item.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusConfig[item.status]?.label ?? item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun item facturable trouvé</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} items au total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {isInvoiceModalOpen && (
        <ModalPortal onClose={() => setIsInvoiceModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Créer une facture</h3>
            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {invoiceError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {invoiceError}
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>
                <span className="text-gray-500">Items sélectionnés :</span>{" "}
                <strong>{selected.size}</strong>
              </p>
              <p>
                <span className="text-gray-500">Montant estimé :</span>{" "}
                <strong>{selectedTotal.toLocaleString("fr-FR")} FCFA</strong>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={invoiceForm.title}
                onChange={(e) =>
                  setInvoiceForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={invoiceForm.description}
                onChange={(e) =>
                  setInvoiceForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'émission *
                </label>
                <input
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  min={invoiceForm.issueDate}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                disabled={createInvoiceMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={
                  createInvoiceMutation.isPending ||
                  selected.size === 0 ||
                  !invoiceForm.issueDate
                }
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createInvoiceMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                Générer la facture
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
