import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

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

export const BillingCustomerStatement: React.FC = () => {
  const navigate = useNavigate();

  // Type de souscripteur
  const [customerType, setCustomerType] = useState<
    "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY"
  >("MEMBER");

  // Sélection via autocomplete
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);

  // Pagination
  const [page, setPage] = useState(0);

  // Code résolu depuis l'objet sélectionné
  const resolvedCode: string = (() => {
    if (customerType === "MEMBER") return selectedMember?.memberId ?? "";
    if (customerType === "CUSTOMER") return selectedCustomer?.customerId ?? "";
    return selectedCustomer?.customerId ?? "";
  })();

  // Changement de type → reset sélection + page
  const handleTypeChange = (type: typeof customerType) => {
    setCustomerType(type);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setPage(0);
  };

  // Appel API
  const { data: statementData, isLoading } = useQuery({
    queryKey: ["customer-statement", customerType, resolvedCode, page],
    queryFn: () =>
      billingService.getCustomerStatement(customerType, resolvedCode, {
        page,
        size: 20,
        sort: "createdAt,desc",
      }),
    enabled: resolvedCode.length > 0,
  });

  // CORRECTION : extraire les données directement de la réponse
  const documents: BillingDocument[] = statementData?.documents ?? [];
  const totalInvoiced = statementData?.totalInvoiced ?? 0;
  const totalPaid = statementData?.totalPaid ?? 0;
  const totalBalanceDue = statementData?.totalBalanceDue ?? 0;
  const totalElements = documents.length;
  const totalPages = Math.ceil(totalElements / 20);

  const handleViewDetail = (documentNumber: string) => {
    navigate(`/billing/documents/${documentNumber}`);
  };

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

  // Nom affiché dans le résumé
  const selectedLabel = (() => {
    if (customerType === "MEMBER" && selectedMember)
      return (
        `${selectedMember.fullName ?? ""}`.trim() || selectedMember.memberId
      );
    if (selectedCustomer)
      return selectedCustomer.displayName ?? selectedCustomer.customerId;
    return resolvedCode;
  })();

  const hasSelection = resolvedCode.length > 0;

  // Formatage des dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Relevé client
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Historique des factures, devis et avoirs d&apos;un client
      </p>

      {/* Sélecteur de type + autocomplete */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Rechercher un client
        </p>

        {/* Type */}
        <div className="flex gap-3 mb-4">
          {(["MEMBER", "CUSTOMER", "BUSINESS_ENTITY"] as const).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${
                customerType === type
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                checked={customerType === type}
                onChange={() => handleTypeChange(type)}
                className="sr-only"
              />
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  customerType === type
                    ? "border-primary-600"
                    : "border-gray-300"
                }`}
              >
                {customerType === type && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                )}
              </div>
              <span className="text-sm font-medium">
                {type === "MEMBER"
                  ? "Membre"
                  : type === "CUSTOMER"
                    ? "Customer"
                    : "Entreprise"}
              </span>
            </label>
          ))}
        </div>

        {/* Autocomplete selon le type */}
        <div className="relative">
          {customerType === "MEMBER" ? (
            <MemberAutocomplete
              selectedMember={selectedMember}
              onSelect={(m) => {
                setSelectedMember(m);
                setPage(0);
              }}
              placeholder="Rechercher un membre par nom, email..."
            />
          ) : (
            <CustomerAutocomplete
              selectedCustomer={selectedCustomer}
              onSelect={(c) => {
                setSelectedCustomer(c);
                setPage(0);
              }}
              typeFilter={
                customerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined
              }
              placeholder={
                customerType === "BUSINESS_ENTITY"
                  ? "Rechercher une entreprise..."
                  : "Rechercher un customer par nom, email..."
              }
            />
          )}
        </div>

        {/* Résumé du client sélectionné */}
        {hasSelection && (
          <div className="mt-3 flex items-center justify-between p-3 bg-primary-50 border border-primary-100 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-800">
                  {selectedLabel}
                </p>
                <p className="text-xs text-primary-500 font-mono">
                  {customerType} · {resolvedCode}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setSelectedMember(null);
                setPage(0);
              }}
              className="p-1 text-primary-400 hover:text-primary-700 hover:bg-primary-100 rounded-lg"
              title="Effacer la sélection"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Résultats */}
      {hasSelection && isLoading && (
        <div className="text-center py-8 text-gray-400">
          Chargement du relevé...
        </div>
      )}

      {hasSelection && !isLoading && (
        <>
          {/* Résumé financier */}
          {totalInvoiced > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                <p className="text-xs text-gray-500">Total facturé</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalInvoiced.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                <p className="text-xs text-gray-500">Total payé</p>
                <p className="text-xl font-bold text-green-600">
                  {totalPaid.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                <p className="text-xs text-gray-500">Solde restant</p>
                <p
                  className={`text-xl font-bold ${totalBalanceDue > 0 ? "text-red-600" : "text-gray-500"}`}
                >
                  {totalBalanceDue.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            </div>
          )}

          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mb-3">
              {totalElements} document{totalElements > 1 ? "s" : ""} —{" "}
              {selectedLabel}
            </p>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      N° Document
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">
                      Solde dû
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Échéance
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr
                      key={doc.documentNumber}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetail(doc.documentNumber)}
                    >
                      <td className="px-6 py-4 text-sm font-mono">
                        {doc.documentNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {documentTypeLabels[doc.documentType] ??
                          doc.documentType}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {doc.issueDate ? formatDate(doc.issueDate) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-sm">
                        {doc.totalAmount.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {doc.balanceDue > 0 ? (
                          <span className="text-red-600 font-medium">
                            {doc.balanceDue.toLocaleString("fr-FR")} FCFA
                          </span>
                        ) : (
                          <span className="text-green-600">Payé</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${statusConfig[doc.status]?.color ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {statusConfig[doc.status]?.label ?? doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {doc.dueDate ? formatDate(doc.dueDate) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className="flex justify-center gap-2"
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
                            title="Télécharger PDF"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun document pour ce client</p>
              </div>
            )}
          </div>

          {/* Pagination */}
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
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* État initial — rien sélectionné */}
      {!hasSelection && !isLoading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <User size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            Sélectionnez un client pour afficher son relevé
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Recherchez par nom ou email dans le champ ci-dessus
          </p>
        </div>
      )}
    </div>
  );
};
