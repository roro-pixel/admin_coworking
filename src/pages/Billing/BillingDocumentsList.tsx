import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  FileText,
  Download,
  Send,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import { CreateCreditNoteModal } from "./CreateCreditNoteModal";

const documentTypeLabels: Record<string, string> = {
  QUOTE: "Devis",
  PROFORMA_INVOICE: "Proforma",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  DEBIT_NOTE: "Note de débit",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  ISSUED: { label: "Émis(e)", color: "bg-blue-100 text-blue-700" },
  SENT: { label: "Envoyé(e)", color: "bg-purple-100 text-purple-700" },
  ACCEPTED: { label: "Accepté(e)", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté(e)", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré(e)", color: "bg-gray-100 text-gray-500" },
  CONVERTED: { label: "Converti(e)", color: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: {
    label: "Partiellement payé(e)",
    color: "bg-yellow-100 text-yellow-700",
  },
  PAID: { label: "Payé(e)", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "En retard", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulé(e)", color: "bg-gray-100 text-gray-500" },
  VOIDED: { label: "Annulé(e)", color: "bg-gray-100 text-gray-500" },
  REFUNDED: { label: "Remboursé(e)", color: "bg-orange-100 text-orange-700" },
  WRITTEN_OFF: {
    label: "Passé(e) en perte",
    color: "bg-gray-100 text-gray-500",
  },
  VIEWED: { label: "Vu", color: "bg-teal-100 text-teal-700" },
  NEGOTIATION: { label: "Négociation", color: "bg-amber-100 text-amber-700" },
  DEPOSIT_REQUESTED: {
    label: "Acompte demandé",
    color: "bg-violet-100 text-violet-700",
  },
  DEPOSIT_PAID: { label: "Acompte reçu", color: "bg-green-100 text-green-600" },
};

const PAGE_SIZE = 20;

export const BillingDocumentsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");

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

  const {
    data: documentsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "billing-documents",
      fromDate,
      toDate,
      page,
      typeFilter,
      statusFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      billingService.getDocuments({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const documents: BillingDocument[] = documentsData?.content ?? [];
  const totalElements = documentsData?.totalElements ?? 0;
  const totalPages = documentsData?.totalPages ?? 1;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });

  const issueMutation = useMutation({
    mutationFn: (documentNumber: string) =>
      billingService.issueDocument(documentNumber),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de l'émission du document."),
  });

  const sendMutation = useMutation({
    mutationFn: (documentNumber: string) =>
      billingService.sendDocument(documentNumber),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de l'envoi du document."),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (documentNumber: string) =>
      billingService.sendEmail(documentNumber),
    onError: () => alert("Erreur lors de l'envoi de l'email."),
  });

  const anyPending =
    issueMutation.isPending ||
    sendMutation.isPending ||
    sendEmailMutation.isPending;

  const handleDownloadPdf = async (
    doc: BillingDocument,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const blob = await billingService.getPdf(doc.documentNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.documentType}_${doc.documentNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors du téléchargement du PDF.");
    }
  };

  const handleViewDetail = (documentNumber: string) => {
    navigate(`/billing/documents/${documentNumber}`);
  };

  const handleCreateCreditNote = (
    invoiceNumber: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setSelectedInvoiceNumber(invoiceNumber);
    setIsCreditNoteOpen(true);
  };

  const handleIssue = (documentNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    issueMutation.mutate(documentNumber);
  };

  const handleSend = (documentNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendMutation.mutate(documentNumber);
  };

  const handleSendEmail = (documentNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendEmailMutation.mutate(documentNumber);
  };

  const hasActiveFilters =
    typeFilter || statusFilter || fromDate || toDate || search;

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Documents de facturation
          </h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements} document{totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/billing/invoices/create")}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={15} /> Nouvelle facture
          </button>
          <button
            onClick={() => navigate("/billing/quotes/create")}
            className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Nouveau devis
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher par numéro, client, titre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {isFetching && debouncedSearch && (
            <Loader2
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
            />
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-sm ${
            showFilters || hasActiveFilters
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <Filter size={15} /> Filtres
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) =>
                handleFilterChange(setTypeFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="">Tous les types</option>
              {Object.entries(documentTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              <Calendar size={11} className="inline mr-1" />
              Du
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              <Calendar size={11} className="inline mr-1" />
              Au
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {hasActiveFilters && (
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={handleReset}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Réinitialiser tous les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  N° Document
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Client
                </th>
                <th className="px-5 py-3 text-right text-sm font-semibold">
                  Total
                </th>
                <th className="px-5 py-3 text-right text-sm font-semibold">
                  Solde dû
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Statut
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Échéance
                </th>
                <th className="px-5 py-3 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => {
                const isOverdue = doc.status === "OVERDUE";
                const hasBalance = doc.balanceDue > 0;
                return (
                  <tr
                    key={doc.documentNumber}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isOverdue ? "bg-red-50/20" : ""}`}
                    onClick={() => handleViewDetail(doc.documentNumber)}
                  >
                    <td className="px-5 py-4 text-sm font-mono">
                      {doc.documentNumber}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {documentTypeLabels[doc.documentType] ?? doc.documentType}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium truncate max-w-[140px]">
                        {doc.customerName ?? doc.customerCode ?? "—"}
                      </p>
                      {doc.customerEmail && (
                        <p className="text-xs text-gray-500 truncate max-w-[140px]">
                          {doc.customerEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-sm">
                      {doc.totalAmount.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-5 py-4 text-right text-sm">
                      {hasBalance ? (
                        <span
                          className={`font-medium ${isOverdue ? "text-red-600" : "text-red-500"}`}
                        >
                          {doc.balanceDue.toLocaleString("fr-FR")} FCFA
                        </span>
                      ) : (
                        <span className="text-green-600">Payé</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusConfig[doc.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {statusConfig[doc.status]?.label ?? doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {doc.dueDate
                        ? new Date(doc.dueDate).toLocaleDateString("fr-FR")
                        : "—"}
                      {isOverdue && (
                        <AlertCircle
                          size={10}
                          className="ml-1 text-red-500 inline"
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div
                        className="flex justify-center gap-1 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleViewDetail(doc.documentNumber)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Voir détail"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDownloadPdf(doc, e)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="PDF"
                        >
                          <Download size={15} />
                        </button>
                        {doc.documentType === "INVOICE" &&
                          ["PAID", "PARTIALLY_PAID"].includes(doc.status) && (
                            <button
                              onClick={(e) =>
                                handleCreateCreditNote(doc.documentNumber, e)
                              }
                              className="p-1 text-orange-600 hover:text-orange-800"
                              title="Créer un avoir"
                            >
                              <FileText size={15} />
                            </button>
                          )}
                        {doc.status === "DRAFT" && (
                          <button
                            onClick={(e) => handleIssue(doc.documentNumber, e)}
                            disabled={anyPending}
                            className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-40"
                            title="Émettre"
                          >
                            {issueMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={15} />
                            )}
                          </button>
                        )}
                        {doc.status === "ISSUED" && (
                          <>
                            <button
                              onClick={(e) => handleSend(doc.documentNumber, e)}
                              disabled={anyPending}
                              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-40"
                              title="Marquer envoyé"
                            >
                              <Send size={15} />
                            </button>
                            <button
                              onClick={(e) =>
                                handleSendEmail(doc.documentNumber, e)
                              }
                              disabled={anyPending}
                              className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-40"
                              title="Envoyer par email"
                            >
                              {sendEmailMutation.isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <FileText size={15} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {documents.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun document trouvé</p>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="mt-2 text-primary-600 hover:underline text-sm"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} document{totalElements > 1 ? "s" : ""} — Page{" "}
            {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal création avoir */}
      <CreateCreditNoteModal
        isOpen={isCreditNoteOpen}
        onClose={() => setIsCreditNoteOpen(false)}
        invoiceNumber={selectedInvoiceNumber}
        onSuccess={() => {
          invalidate();
          setIsCreditNoteOpen(false);
          setSelectedInvoiceNumber("");
        }}
      />
    </div>
  );
};
