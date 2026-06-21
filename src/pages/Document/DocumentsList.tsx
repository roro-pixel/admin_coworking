import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Eye,
  Download,
  FileText,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { DocumentDetailModal } from "./DocumentDetail";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING_REVIEW: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Approuvé",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejeté",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-500",
    icon: AlertCircle,
  },
  NEEDS_CORRECTION: {
    label: "Correction",
    color: "bg-orange-100 text-orange-700",
    icon: AlertCircle,
  },
  UPLOADED: {
    label: "Uploadé",
    color: "bg-blue-100 text-blue-700",
    icon: FileText,
  },
  SIGNED: {
    label: "Signé",
    color: "bg-purple-100 text-purple-700",
    icon: CheckCircle,
  },
  ARCHIVED: {
    label: "Archivé",
    color: "bg-gray-100 text-gray-500",
    icon: AlertCircle,
  },
  SUPERSEDED: {
    label: "Remplacé",
    color: "bg-gray-100 text-gray-500",
    icon: AlertCircle,
  },
};

export const DocumentsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(0);

  const {
    data: documentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "allDocuments",
      ownerTypeFilter,
      statusFilter,
      categoryFilter,
      page,
    ],
    queryFn: () =>
      documentService.getAllDocuments({
        ownerType: ownerTypeFilter !== "all" ? ownerTypeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        page,
        size: 50,
      }),
  });

  const documents = documentsData?.content || [];
  const totalElements = documentsData?.totalElements ?? 0;
  const totalPages = documentsData?.totalPages ?? 1;

  const filteredDocuments = documents.filter(
    (doc: DocumentResponse) =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.documentTypeName.toLowerCase().includes(search.toLowerCase()) ||
      doc.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleViewDetail = (doc: DocumentResponse) => {
    setSelectedDocument(doc);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 "></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        Erreur lors du chargement des documents
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Tous les documents
          </h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements} document{totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={ownerTypeFilter}
            onChange={(e) => {
              setOwnerTypeFilter(e.target.value);
              setPage(0);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="all">Tous les propriétaires</option>
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="PENDING_REVIEW">En attente</option>
            <option value="APPROVED">Approuvés</option>
            <option value="REJECTED">Rejetés</option>
            <option value="EXPIRED">Expirés</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(0);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="all">Toutes les catégories</option>
            <option value="KYC">KYC</option>
            <option value="LEGAL">Légal</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Titre
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Propriétaire
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Catégorie
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Uploadé le
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Expiration
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => {
                const sc = statusConfig[doc.status];
                const StatusIcon = sc?.icon;
                const isExpired =
                  doc.expiryDate && new Date(doc.expiryDate) < new Date();
                return (
                  <tr key={doc.code} className="hover:bg-gray-100">
                    <td className="px-4 py-3 text-sm font-mono">{doc.code}</td>
                    <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {doc.documentTypeName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {doc.ownerType}
                      {doc.ownerCode ? ` · ${doc.ownerCode}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${doc.category === "KYC" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sc && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${sc.color}`}
                        >
                          {StatusIcon && <StatusIcon size={11} />}
                          {sc.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      {doc.expiryDate ? (
                        <span
                          className={`text-sm ${isExpired ? "text-red-600 font-medium" : "text-gray-500"}`}
                        >
                          {isExpired && (
                            <AlertCircle size={10} className="inline mr-1" />
                          )}
                          {new Date(doc.expiryDate).toLocaleDateString("fr-FR")}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(doc)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg"
                          title="Voir détail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg"
                          title="Télécharger"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun document trouvé</p>
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
              className="p-1.5 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selectedDocument && (
        <DocumentDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}
    </div>
  );
};
