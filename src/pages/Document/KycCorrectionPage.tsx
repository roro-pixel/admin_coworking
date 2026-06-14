import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Upload,
  Eye,
  XCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  FileText,
  User,
  Building2,
} from "lucide-react";
import { kycService, documentService } from "../../services/document.service";
import { KycCaseDetailModal } from "../../components/kyc/KycCaseDetailModal";
import { useAuth } from "../../contexts/AuthContext";
import type { KycCaseResponse } from "../../services/document.service";

export const KycCorrectionPage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<KycCaseResponse | null>(
    null,
  );
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const adminId = Number(admin?.id) || 1;

  // Récupérer les dossiers en correction
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["kyc-cases-pending-correction"],
    queryFn: () =>
      kycService.getAllKycCases({
        status: "PENDING_CORRECTION", // compat legacy; correction documentaire canonique = document status NEEDS_CORRECTION
        page: 0,
        size: 50,
      }),
  });

  const cases = data?.content || [];

  // Upload de document
  const uploadMutation = useMutation({
    mutationFn: async ({
      documentTypeCode,
      file,
      ownerType,
      ownerCode,
    }: {
      documentTypeCode: string;
      file: File;
      ownerType: string;
      ownerCode: string;
    }) => {
      return documentService.uploadDocument({
        ownerType,
        ownerCode,
        documentTypeCode,
        title: `Document ${documentTypeCode}`,
        uploadedBy: admin?.email || adminId,
        file,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kyc-cases-pending-correction"],
      });
      setUploadingDocType(null);
      setUploadError(null);
    },
    onError: (e: any) => {
      setUploadingDocType(null);
      setUploadError(e?.response?.data?.message || "Erreur lors de l'upload.");
    },
  });

  // Re-soumettre après correction
  const resubmitMutation = useMutation({
    mutationFn: (code: string) => kycService.submitKycCase(code),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kyc-cases-pending-correction"],
      });
      alert("Dossier re-soumis avec succès");
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || "Erreur lors de la re-soumission"),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement des corrections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Corrections demandées
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Dossiers nécessitant des corrections avant validation
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          title="Actualiser"
        >
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
          <p className="text-gray-500">
            Aucun dossier en attente de correction
          </p>
          <p className="text-sm text-gray-400">
            Tous les dossiers sont en règle
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((kycCase) => {
            const rejectedDocs =
              kycCase.documents?.filter((d) => d.status === "REJECTED") || [];
            const pendingDocs =
              kycCase.documents?.filter((d) => d.status === "PENDING_REVIEW") ||
              [];

            return (
              <div
                key={kycCase.code}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                {/* En-tête du dossier */}
                <div className="p-5 border-b bg-orange-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <AlertCircle size={20} className="text-orange-500" />
                        <span className="font-mono font-bold text-lg">
                          {kycCase.code}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          Correction demandée
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {kycCase.ownerType === "BUSINESS" ? (
                          <Building2 size={14} />
                        ) : (
                          <User size={14} />
                        )}
                        <span>{kycCase.ownerType}</span>
                        <span className="text-gray-400">·</span>
                        <span className="font-mono">
                          {kycCase.ownerCode || `ID: ${kycCase.ownerId}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCase(kycCase)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Eye size={14} /> Voir détails
                      </button>
                      {kycCase.complete &&
                        kycCase.status === "PENDING_CORRECTION" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Toutes les corrections ont-elles été apportées ? Re-soumettre le dossier ?",
                                )
                              ) {
                                resubmitMutation.mutate(kycCase.code);
                              }
                            }}
                            disabled={resubmitMutation.isPending}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            {resubmitMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Re-soumettre
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                {/* Documents rejetés à corriger */}
                {rejectedDocs.length > 0 && (
                  <div className="p-5 border-b">
                    <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <XCircle size={16} />
                      Documents à corriger ({rejectedDocs.length})
                    </h4>
                    <div className="space-y-3">
                      {rejectedDocs.map((doc) => (
                        <div
                          key={doc.code}
                          className="bg-red-50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {doc.documentTypeName}
                              </p>
                              <p className="text-sm text-red-600 mt-1">
                                {doc.status === "REJECTED" &&
                                  "Motif: Document rejeté"}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                            <label className="cursor-pointer bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 flex items-center gap-1.5">
                              {uploadingDocType === doc.documentTypeCode &&
                              uploadMutation.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Upload size={12} />
                              )}
                              Remplacer
                              <input
                                type="file"
                                className="hidden"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    setUploadingDocType(doc.documentTypeCode);
                                    uploadMutation.mutate({
                                      documentTypeCode: doc.documentTypeCode,
                                      file: e.target.files[0],
                                      ownerType: kycCase.ownerType,
                                      ownerCode:
                                        kycCase.ownerCode ||
                                        String(kycCase.ownerId),
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents en attente de revue */}
                {pendingDocs.length > 0 && (
                  <div className="p-5 border-b bg-yellow-50">
                    <h4 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      Documents en attente de revue ({pendingDocs.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pendingDocs.map((doc) => (
                        <span
                          key={doc.code}
                          className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded"
                        >
                          {doc.documentTypeName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents déjà approuvés */}
                {kycCase.documents?.filter((d) => d.status === "APPROVED")
                  .length > 0 && (
                  <div className="p-5 bg-gray-50">
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle size={16} />
                      Documents validés
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {kycCase.documents
                        ?.filter((d) => d.status === "APPROVED")
                        .map((doc) => (
                          <span
                            key={doc.code}
                            className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded"
                          >
                            {doc.documentTypeName}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détail */}
      {selectedCase && (
        <KycCaseDetailModal
          kycCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({
              queryKey: ["kyc-cases-pending-correction"],
            });
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
};
