import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  CheckSquare,
  Square,
  FileText,
  RefreshCw,
} from "lucide-react";
import { documentService } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";

export const KycBulkReviewPage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const adminId = Number(admin?.id) || 1;

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["kyc-documents-review-queue"],
    queryFn: () => documentService.getKycDocumentReviewQueue(),
  });

  const documents = documentsData || [];

  const bulkApproveMutation = useMutation({
    mutationFn: () =>
      documentService.bulkApproveDocuments(selectedDocs, adminId),
    onSuccess: (data) => {
      setBulkResult(data);
      setSelectedDocs([]);
      queryClient.invalidateQueries({ queryKey: ["kyc-documents-review-queue"] });
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur bulk approve."),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (reason: string) =>
      documentService.bulkRejectDocuments(
        selectedDocs.map((id) => ({ documentCode: String(id), reason })),
        adminId,
      ),
    onSuccess: (data) => {
      setBulkResult(data);
      setSelectedDocs([]);
      queryClient.invalidateQueries({ queryKey: ["kyc-documents-review-queue"] });
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur bulk reject."),
  });

  const toggleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map((d: any) => d.documentCode ?? d.code ?? d.id));
    }
  };

  const toggleDoc = (code: string) => {
    setSelectedDocs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const filteredDocs = documents.filter((doc: any) => {
    const haystack = [
      doc.title,
      doc.documentTypeName,
      doc.documentType,
      doc.documentCode,
      doc.code,
      doc.fileName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement des documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Revue en masse
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Approuvez ou rejetez plusieurs documents à la fois
          </p>
        </div>
        <div className="flex gap-3">
          {selectedDocs.length > 0 && (
            <>
              <button
                onClick={() => {
                  const reason = prompt(
                    "Motif de rejet pour tous les documents sélectionnés :",
                  );
                  if (reason) bulkRejectMutation.mutate(reason);
                }}
                disabled={bulkRejectMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {bulkRejectMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Rejeter ({selectedDocs.length})
              </button>
              <button
                onClick={() => {
                  if (confirm(`Approuver ${selectedDocs.length} documents ?`)) {
                    bulkApproveMutation.mutate();
                  }
                }}
                disabled={bulkApproveMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Approuver ({selectedDocs.length})
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {bulkResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800">
            Résultat du traitement en masse
          </p>
          <p className="text-blue-700 mt-1">
            Traités : {bulkResult.processed} · Réussis : {bulkResult.succeeded}{" "}
            · Échecs : {bulkResult.failed}
          </p>
          {bulkResult.results
            ?.filter((r: any) => !r.success)
            .map((r: any) => (
              <p key={r.documentCode} className="text-red-600 text-xs mt-1">
                {r.documentCode} : {r.error}
              </p>
            ))}
          <button
            onClick={() => setBulkResult(null)}
            className="text-xs text-blue-600 underline mt-2"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher un document..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
        />
      </div>

      {/* Liste des documents */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-4 py-3 text-center w-12">
                <button onClick={toggleSelectAll} className="p-1">
                  {selectedDocs.length === documents.length &&
                  documents.length > 0 ? (
                    <CheckSquare size={18} className="text-primary-600" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                </button>
              </th>
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
                Uploadé le
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDocs.map((doc: any) => (
              <tr
                key={doc.documentCode || doc.code || doc.id}
                className={`hover:bg-gray-100 cursor-pointer ${selectedDocs.includes(doc.documentCode || doc.code || doc.id) ? "bg-blue-50" : ""}`}
                onClick={() => toggleDoc(doc.documentCode || doc.code || doc.id)}
              >
                <td className="px-4 py-3 text-center">
                  {selectedDocs.includes(doc.documentCode || doc.code || doc.id) ? (
                    <CheckSquare size={18} className="text-primary-600" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-mono">{doc.documentCode || doc.code || doc.id}</td>
                <td className="px-4 py-3 text-sm font-medium">{doc.title || doc.fileName || "Document KYC"}</td>
                <td className="px-4 py-3 text-sm">{doc.documentTypeName || doc.documentType}</td>
                <td className="px-4 py-3 text-sm">
                  {doc.ownerType}
                  {doc.ownerCode ? ` · ${doc.ownerCode}` : ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun document en attente de revue</p>
          </div>
        )}
      </div>
    </div>
  );
};
