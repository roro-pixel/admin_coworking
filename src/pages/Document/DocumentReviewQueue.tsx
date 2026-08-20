import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { kycService } from "../../services/document.service";
import {
  kycRiskLevelLabels,
  kycRiskLevelColors,
} from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { CreateKycCaseModal } from "./CreateKycCaseModal";

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
    color: "bg-gray-100 text-gray-700",
    icon: Calendar,
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Évite un appel réseau à chaque frappe dans le champ de recherche. */
function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const DocumentReviewQueue: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [showMyQueue, setShowMyQueue] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination (page est en base 0, comme Spring Data)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Bulk review
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const adminId = Number(admin?.id) || 1;
  const debouncedSearch = useDebouncedValue(search, 350);

  // Toute modification de filtre doit ramener à la première page,
  // sinon on peut se retrouver sur une page 5 qui n'existe plus.
  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    statusFilter,
    ownerTypeFilter,
    riskLevelFilter,
    showMyQueue,
    pageSize,
  ]);

  // Dashboard KPI
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["kyc-dashboard"],
    queryFn: () => kycService.getKycDashboard(),
  });

  // Liste principale : recherche, filtres ET pagination sont délégués au backend.
  const {
    data: kycData,
    isLoading: kycLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "kycCases",
      {
        status: statusFilter,
        ownerType: ownerTypeFilter,
        riskLevel: riskLevelFilter,
        myQueue: showMyQueue,
        search: debouncedSearch,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      kycService.getAllKycCases({
        status: statusFilter !== "all" ? statusFilter : undefined,
        ownerType: ownerTypeFilter !== "all" ? ownerTypeFilter : undefined,
        riskLevel: riskLevelFilter !== "all" ? riskLevelFilter : undefined,
        // « Mes dossiers » passe par assignedTo pour bénéficier de la même
        // recherche + pagination que la liste globale.
        assignedTo: showMyQueue ? adminId : undefined,
        searchText: debouncedSearch.trim() || undefined,
        page,
        size: pageSize,
        sort: "submittedAt,desc",
      }),
    // Garde la page précédente affichée pendant le chargement de la suivante
    placeholderData: keepPreviousData,
  });

  const kycCases = kycData?.content ?? [];
  const totalElements = kycData?.totalElements ?? kycCases.length;
  const totalPages = Math.max(kycData?.totalPages ?? 1, 1);
  const rangeStart = totalElements === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(totalElements, page * pageSize + kycCases.length);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    statusFilter !== "all" ||
    ownerTypeFilter !== "all" ||
    riskLevelFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOwnerTypeFilter("all");
    setRiskLevelFilter("all");
  };

  // Mutations

  const bulkApproveMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        selectedCases.map((code) =>
          kycService.approveKycCase(code, adminId, "Approuvé en masse"),
        ),
      ).then((results) => ({ succeeded: results.length, failed: 0 })),
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

  const allOnPageSelected =
    kycCases.length > 0 &&
    kycCases.every((kycCase) => selectedCases.includes(kycCase.code));

  const toggleSelectAllOnPage = () => {
    const codesOnPage = kycCases.map((kycCase) => kycCase.code);
    setSelectedCases((prev) =>
      allOnPageSelected
        ? prev.filter((code) => !codesOnPage.includes(code))
        : Array.from(new Set([...prev, ...codesOnPage])),
    );
  };

  // Extraire les données du dashboard
  const totalCases = dashboard?.summary?.totalCases ?? 0;
  const pendingCount =
    dashboard?.summary?.PENDING_REVIEW ?? dashboard?.summary?.SUBMITTED ?? 0;
  const reviewCount =
    dashboard?.summary?.IN_REVIEW ?? dashboard?.summary?.UNDER_REVIEW ?? 0;
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
              placeholder="Rechercher par nom, code dossier ou code client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
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
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="all">Tous les types</option>
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="all">Tous les risques</option>
            <option value="LOW">Faible</option>
            <option value="MEDIUM">Moyen</option>
            <option value="HIGH">Élevé</option>
            <option value="CRITICAL">Critique</option>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
          <span>
            {totalElements} dossier{totalElements > 1 ? "s" : ""}
            {hasActiveFilters ? " correspondant aux filtres" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:underline"
            >
              Réinitialiser
            </button>
          )}
          {isFetching && (
            <Loader2 size={14} className="animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div
          className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
        >
          <table className="w-full">
            <thead className="bg-gray-50/70">
              <tr>
                {bulkMode && (
                  <th className="px-4 py-3 text-center text-sm font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded"
                      title="Tout sélectionner sur cette page"
                    />
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
            <tbody className="divide-y divide-gray-100">
              {kycCases.map((kycCase) => {
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
                  <tr key={kycCase.code} className="hover:bg-gray-100">
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
                      <div className="flex items-start gap-2">
                        {kycCase.ownerType === "BUSINESS" ? (
                          <Building2
                            size={16}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />
                        ) : (
                          <Users
                            size={16}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {kycCase.ownerName || "Propriétaire non renseigné"}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {kycCase.ownerType}
                            {kycCase.ownerCode ? ` · ${kycCase.ownerCode}` : ""}
                          </p>
                        </div>
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
                      {kycCase.assignedTo ? `Agent #${kycCase.assignedTo}` : "—"}
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
                          onClick={() =>
                            navigate(`/documents/kyc/cases/${kycCase.code}`)
                          }
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

        {kycCases.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? "Aucun dossier ne correspond à cette recherche."
                : showMyQueue
                  ? "Aucun dossier ne vous est assigné."
                  : "Aucun dossier KYC pour le moment."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>
                {rangeStart}–{rangeEnd} sur {totalElements}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
                title="Dossiers par page"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
              {bulkMode && selectedCases.length > 0 && (
                <span className="text-primary-600">
                  {selectedCases.length} sélectionné(s) au total
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                title="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>

              {buildPageWindow(page, totalPages).map((item, index) =>
                item === "…" ? (
                  <span key={`gap-${index}`} className="px-2 text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    disabled={isFetching}
                    className={`min-w-9 px-3 py-1.5 rounded-lg text-sm ${
                      item === page
                        ? "bg-primary-600 text-white"
                        : "border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {(item as number) + 1}
                  </button>
                ),
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isFetching}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                title="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateKycCaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

/** Fenêtre glissante de numéros de page : 1 … 4 5 6 … 20 */
function buildPageWindow(
  current: number,
  totalPages: number,
): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages = new Set<number>([
    0,
    totalPages - 1,
    current,
    current - 1,
    current + 1,
  ]);

  const sorted = Array.from(pages)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);

  const result: Array<number | "…"> = [];
  let previous: number | null = null;
  for (const p of sorted) {
    if (previous !== null && p - previous > 1) result.push("…");
    result.push(p);
    previous = p;
  }
  return result;
}