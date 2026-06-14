import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Building2,
  FileText,
  Plus,
  Calendar,
  Download,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { kycService, documentService } from "../../services/document.service";
import {
  kycRiskLevelLabels,
  kycRiskLevelColors,
} from "../../services/document.service";
import { DocumentReviewModal } from "../../components/kyc/DocumentReviewModal";
import { KycCaseDetailModal } from "../../components/kyc/KycCaseDetailModal";
import { useAuth } from "../../contexts/AuthContext";
import { CreateKycCaseModal } from "./CreateKycCaseModal";
import type { KycCaseResponse } from "../../services/document.service";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
  },
  PENDING_REVIEW: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  IN_REVIEW: {
    label: "En revue",
    color: "bg-orange-100 text-orange-700",
    icon: AlertCircle,
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
    icon: XCircle,
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-gray-100 text-gray-500",
    icon: XCircle,
  },
  NOT_STARTED: {
    label: "Non commencé",
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  SUBMITTED: {
    label: "Soumis",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "En revue",
    color: "bg-orange-100 text-orange-700",
    icon: AlertCircle,
  },
  PENDING_CORRECTION: {
    label: "Correction demandée",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  RENEWAL_REQUIRED: {
    label: "Renouvellement requis",
    color: "bg-purple-100 text-purple-700",
    icon: Calendar,
  },
};

export const DocumentReviewQueue: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [showMyQueue, setShowMyQueue] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedKycCase, setSelectedKycCase] =
    useState<KycCaseResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Bulk review
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const adminId = Number(admin?.id) || 1;

  // Dashboard KPI
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["kyc-dashboard"],
    queryFn: () => kycService.getKycDashboard(),
  });

  // Liste principale (ou file reviewer)
  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: [
      "kycCases",
      statusFilter,
      ownerTypeFilter,
      riskLevelFilter,
      showMyQueue,
    ],
    queryFn: () =>
      showMyQueue
        ? kycService.getMyQueue(adminId)
        : kycService.getAllKycCases({
            status: statusFilter !== "all" ? statusFilter : undefined,
            ownerType: ownerTypeFilter !== "all" ? ownerTypeFilter : undefined,
            riskLevel: riskLevelFilter !== "all" ? riskLevelFilter : undefined,
          }),
  });

  const kycCases = kycData?.content || [];

  // Mutations
  const approveDocumentMutation = useMutation({
    mutationFn: ({ code, comment }: { code: string; comment?: string }) =>
      documentService.approveDocument(code, adminId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycCases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
      setSelectedDocument(null);
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || "Erreur lors de l'approbation."),
  });

  const rejectDocumentMutation = useMutation({
    mutationFn: ({ code, comment }: { code: string; comment: string }) =>
      documentService.rejectDocument(code, adminId, comment, "OTHER"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycCases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
      setSelectedDocument(null);
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || "Erreur lors du rejet."),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: () =>
      documentService.bulkApproveDocuments(selectedCases, adminId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["kycCases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
      setBulkMode(false);
      setSelectedCases([]);
      alert(`${data.succeeded} approuvé(s), ${data.failed} échec(s)`);
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || "Erreur bulk approve."),
  });

  const handleExportPdf = async (code: string) => {
    try {
      const blob = await kycService.exportPdf(code);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kyc_${code}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export PDF.");
    }
  };

  const toggleCaseSelection = (code: string) => {
    setSelectedCases((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const filteredCases = kycCases.filter((kycCase) => {
    if (search && !kycCase.code.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (ownerTypeFilter !== "all" && kycCase.ownerType !== ownerTypeFilter)
      return false;
    return true;
  });

  // Extraire les données du dashboard avec la nouvelle structure
  const totalCases = dashboard?.summary?.totalCases ?? 0;
  const pendingCount =
    dashboard?.summary?.PENDING_REVIEW ??
    dashboard?.summary?.PENDING_REVIEW ??
    0;
  const reviewCount =
    dashboard?.summary?.IN_REVIEW ?? dashboard?.summary?.IN_REVIEW ?? 0;
  const approvedCount = dashboard?.summary?.APPROVED ?? 0;
  const overdueSla = dashboard?.sla?.casesExceeding48h ?? 0;

  const isLoading =
    (dashboardLoading && !dashboard) || (kycLoading && !kycData);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revue KYC</h2>
          <p className="text-gray-600 mt-1">
            Validez ou rejetez les documents des membres
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMyQueue(!showMyQueue)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
              showMyQueue
                ? "bg-primary-600 text-white"
                : "border border-primary-600 text-primary-600"
            }`}
          >
            <Eye size={16} />
            {showMyQueue ? "Tous les dossiers" : "Mes dossiers"}
          </button>
          {!bulkMode ? (
            <button
              onClick={() => setBulkMode(true)}
              className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm"
            >
              <CheckSquare size={16} />
              Mode bulk
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBulkMode(false);
                  setSelectedCases([]);
                }}
                className="border border-gray-200 px-3 py-2 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedCases.length === 0) return;
                  if (confirm(`Approuver ${selectedCases.length} dossiers ?`)) {
                    bulkApproveMutation.mutate();
                  }
                }}
                disabled={
                  selectedCases.length === 0 || bulkApproveMutation.isPending
                }
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Approuver ({selectedCases.length})
              </button>
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            Créer un dossier KYC
          </button>
        </div>
      </div>

      {/* KPIs Dashboard */}
      {dashboardLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm animate-pulse"
            >
              <div className="h-8 w-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-20 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total dossiers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCases}
                  </p>
                </div>
                <FileText size={24} className="text-gray-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Soumis</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendingCount}
                  </p>
                </div>
                <Clock size={24} className="text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">En revue</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {reviewCount}
                  </p>
                </div>
                <Eye size={24} className="text-orange-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">
                    {approvedCount}
                  </p>
                </div>
                <CheckCircle size={24} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">SLA dépassé</p>
                  <p
                    className={`text-2xl font-bold ${overdueSla > 0 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {overdueSla}
                  </p>
                </div>
                <AlertCircle
                  size={24}
                  className={overdueSla > 0 ? "text-red-500" : "text-gray-400"}
                />
              </div>
            </div>
          </div>
        )
      )}

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
              placeholder="Rechercher un dossier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {!showMyQueue && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="PENDING_REVIEW">En attente</option>
                <option value="IN_REVIEW">En revue</option>
                <option value="APPROVED">Approuvé</option>
                <option value="REJECTED">Rejeté</option>
                <option value="EXPIRED">Expiré</option>
              </select>
              <select
                value={ownerTypeFilter}
                onChange={(e) => setOwnerTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="MEMBER">Membres</option>
                <option value="CUSTOMER">Customers</option>
                <option value="BUSINESS">Business</option>
              </select>
              <select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">Tous les risques</option>
                <option value="LOW">Faible</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HIGH">Élevé</option>
                <option value="CRITICAL">Critique</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {bulkMode && (
                  <th className="px-4 py-3 text-center text-sm font-semibold w-10">
                    #
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Dossier
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Propriétaire
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Risque
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Niveau
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  SLA
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Assigné à
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Soumis le
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCases.map((kycCase) => {
                const statusKey = kycCase.status as keyof typeof statusConfig;
                const StatusIcon = statusConfig[statusKey]?.icon || Clock;
                const statusClass =
                  statusConfig[statusKey]?.color || "bg-gray-100 text-gray-700";
                const statusLabel =
                  statusConfig[statusKey]?.label || kycCase.status;

                const isSlaOverdue =
                  kycCase.slaDeadline &&
                  new Date(kycCase.slaDeadline) < new Date();

                return (
                  <tr key={kycCase.code} className="hover:bg-gray-50">
                    {bulkMode && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCases.includes(kycCase.code)}
                          onChange={() => toggleCaseSelection(kycCase.code)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="font-medium font-mono text-sm">
                          {kycCase.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {kycCase.ownerType === "BUSINESS" ? (
                          <Building2 size={16} className="text-gray-400" />
                        ) : (
                          <Users size={16} className="text-gray-400" />
                        )}
                        <span className="text-sm">{kycCase.ownerType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusClass}`}
                      >
                        <StatusIcon size={12} className="mr-1" />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {kycCase.riskLevel && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${kycRiskLevelColors[kycCase.riskLevel] || "bg-gray-100 text-gray-700"}`}
                        >
                          {kycRiskLevelLabels[kycCase.riskLevel] ||
                            kycCase.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {kycCase.kycLevel && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-mono">
                          Niv. {kycCase.kycLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {kycCase.slaDeadline && (
                        <span
                          className={`text-xs ${isSlaOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}
                        >
                          {isSlaOverdue && (
                            <AlertCircle size={10} className="inline mr-1" />
                          )}
                          {new Date(kycCase.slaDeadline).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {kycCase.assignedTo
                        ? `Agent #${kycCase.assignedTo}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {kycCase.submittedAt
                        ? new Date(kycCase.submittedAt).toLocaleDateString(
                            "fr-FR",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => setSelectedKycCase(kycCase)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Voir détail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleExportPdf(kycCase.code)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                          title="Export PDF"
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

        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {showMyQueue
                ? "Aucun dossier dans votre file"
                : "Aucun dossier KYC trouvé"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedDocument && (
        <DocumentReviewModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onApprove={(comment) => {
            if (selectedDocument) {
              approveDocumentMutation.mutate({
                code: selectedDocument.code,
                comment,
              });
            }
          }}
          onReject={(comment, _reasonCode) => {
            if (selectedDocument) {
              rejectDocumentMutation.mutate({
                code: selectedDocument.code,
                comment,
              });
            }
          }}
          isProcessing={
            approveDocumentMutation.isPending ||
            rejectDocumentMutation.isPending
          }
        />
      )}

      {selectedKycCase && (
        <KycCaseDetailModal
          kycCase={selectedKycCase}
          onClose={() => setSelectedKycCase(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ["kycCases"] });
            queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
            setSelectedKycCase(null);
          }}
        />
      )}

      {showCreateModal && (
        <CreateKycCaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};
