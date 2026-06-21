import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Plus,
  Search,
  Eye,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  Ban,
  Edit,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { contractService } from "../services/contract.service";
import type { ContractResponse } from "../services/contract.service";
import { ContractFormModal } from "../components/contracts/ContractFormModal";
import { ContractPreviewModal } from "../components/contracts/ContractPreviewModal";
import { AttachSignedDocumentModal } from "../components/contracts/AttachSignedDocumentModal";
import { ModalPortal } from "../components/ui/ModalPortal";
import { useAuth } from "../contexts/AuthContext";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: FileText,
  },
  GENERATED: {
    label: "Généré",
    color: "bg-blue-100 text-blue-700",
    icon: FileText,
  },
  UNDER_REVIEW: {
    label: "En relecture",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  AWAITING_SIGNATURE: {
    label: "Attente signature",
    color: "bg-orange-100 text-orange-700",
    icon: Clock,
  },
  SIGNED: {
    label: "Signé",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  ACTIVE: {
    label: "Actif",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  SUSPENDED: {
    label: "Suspendu",
    color: "bg-red-100 text-red-700",
    icon: Pause,
  },
  TERMINATED: {
    label: "Résilié",
    color: "bg-gray-100 text-gray-700",
    icon: StopCircle,
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-700",
    icon: AlertCircle,
  },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-700", icon: Ban },
};

const PAGE_SIZE = 20;

const formatNullableDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "—";

export const AdminContracts: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Modals (gardés pour la création rapide et les actions)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContract, setPreviewContract] =
    useState<ContractResponse | null>(null);

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachContractCode, setAttachContractCode] = useState<string | null>(
    null,
  );
  const [attachContract, setAttachContract] = useState<ContractResponse | null>(
    null,
  );

  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [contractToTerminate, setContractToTerminate] = useState<string | null>(
    null,
  );

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [contractToSuspend, setContractToSuspend] = useState<string | null>(
    null,
  );

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [contractToCancel, setContractToCancel] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const {
    data: contractsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "contracts",
      page,
      statusFilter,
      ownerTypeFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      contractService.getAllContracts({
        status: statusFilter !== "all" ? statusFilter : undefined,
        ownerType: ownerTypeFilter !== "all" ? ownerTypeFilter : undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const contracts: ContractResponse[] = contractsData?.content || [];
  const totalPages = contractsData?.totalPages ?? 0;
  const totalElements = contractsData?.totalElements ?? 0;

  const filteredContracts = debouncedSearch
    ? contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.contractCode
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (c.ownerCode || "").toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : contracts;

  const activeContracts = filteredContracts.filter((c) => c.status === "ACTIVE").length;
  const awaitingSignatureContracts = filteredContracts.filter(
    (c) => c.status === "AWAITING_SIGNATURE",
  ).length;
  const draftContracts = filteredContracts.filter((c) => c.status === "DRAFT").length;
  const signedContracts = filteredContracts.filter((c) => c.status === "SIGNED").length;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contracts"] });

  const generateDraftMutation = useMutation({
    mutationFn: (contractCode: string) =>
      contractService.generateDraft(contractCode, admin?.id || 1),
    onSuccess: () => invalidate(),
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors de la génération du brouillon.",
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      contractCode,
      status,
    }: {
      contractCode: string;
      status: string;
    }) => contractService.updateContractStatus(contractCode, status),
    onSuccess: invalidate,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors du changement de statut.",
      ),
  });

  const activateMutation = useMutation({
    mutationFn: (contractCode: string) =>
      contractService.activateContract(contractCode),
    onSuccess: invalidate,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de l'activation.",
      ),
  });

  const suspendMutation = useMutation({
    mutationFn: ({
      contractCode,
      reason,
    }: {
      contractCode: string;
      reason?: string;
    }) => contractService.suspendContract(contractCode, reason),
    onSuccess: () => {
      invalidate();
      setShowSuspendModal(false);
      setContractToSuspend(null);
      setSuspendReason("");
    },
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de la suspension.",
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: ({
      contractCode,
      reason,
    }: {
      contractCode: string;
      reason?: string;
    }) => contractService.cancelContract(contractCode, reason),
    onSuccess: () => {
      invalidate();
      setShowCancelModal(false);
      setContractToCancel(null);
      setCancelReason("");
    },
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de l'annulation.",
      ),
  });

  const terminateMutation = useMutation({
    mutationFn: ({
      contractCode,
      reason,
    }: {
      contractCode: string;
      reason?: string;
    }) => contractService.terminateContract(contractCode, reason),
    onSuccess: () => {
      invalidate();
      setShowTerminateModal(false);
      setContractToTerminate(null);
      setTerminateReason("");
    },
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de la résiliation.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (contractCode: string) =>
      contractService.deleteContract(contractCode),
    onSuccess: invalidate,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de la suppression.",
      ),
  });

  const saveContractMutation = useMutation({
    mutationFn: (data: any) =>
      isEditing && selectedContract
        ? contractService.updateContract(selectedContract.contractCode, data)
        : contractService.createContract(data),
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
      setSelectedContract(null);
      setIsEditing(false);
    },
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de la sauvegarde.",
      ),
  });

  const getAvailableActions = (
    status: string,
  ): {
    label: string;
    action: string;
    icon: React.ElementType;
    color: string;
  }[] => {
    const a = [];
    if (status === "DRAFT") {
      a.push({
        label: "Générer brouillon",
        action: "generate",
        icon: FileText,
        color: "text-blue-600 hover:text-blue-800",
      });
      a.push({
        label: "Mettre en relecture",
        action: "under_review",
        icon: Clock,
        color: "text-yellow-600 hover:text-yellow-800",
      });
      a.push({
        label: "Annuler",
        action: "cancel",
        icon: Ban,
        color: "text-gray-500 hover:text-gray-700",
      });
    }
    if (status === "GENERATED") {
      a.push({
        label: "Mettre en relecture",
        action: "under_review",
        icon: Clock,
        color: "text-yellow-600 hover:text-yellow-800",
      });
      a.push({
        label: "Mettre en attente signature",
        action: "awaiting_signature",
        icon: Clock,
        color: "text-orange-600 hover:text-orange-800",
      });
    }
    if (status === "AWAITING_SIGNATURE") {
      a.push({
        label: "Rattacher signé",
        action: "attach_signed",
        icon: Upload,
        color: "text-purple-600 hover:text-purple-800",
      });
    }
    if (status === "SIGNED") {
      a.push({
        label: "Activer",
        action: "activate",
        icon: Play,
        color: "text-green-600 hover:text-green-800",
      });
    }
    if (status === "ACTIVE") {
      a.push({
        label: "Suspendre",
        action: "suspend",
        icon: Pause,
        color: "text-yellow-600 hover:text-yellow-800",
      });
      a.push({
        label: "Résilier",
        action: "terminate",
        icon: StopCircle,
        color: "text-red-600 hover:text-red-800",
      });
    }
    if (
      ["DRAFT", "GENERATED", "UNDER_REVIEW", "AWAITING_SIGNATURE"].includes(
        status,
      )
    ) {
      if (!a.find((x) => x.action === "cancel"))
        a.push({
          label: "Annuler",
          action: "cancel",
          icon: Ban,
          color: "text-gray-500 hover:text-gray-700",
        });
    }
    return a;
  };

  const handleAction = (action: string, contract: ContractResponse) => {
    setActionError(null);
    const cc = contract.contractCode;
    switch (action) {
      case "generate":
        generateDraftMutation.mutate(cc);
        break;
      case "under_review":
        updateStatusMutation.mutate({
          contractCode: cc,
          status: "UNDER_REVIEW",
        });
        break;
      case "awaiting_signature":
        updateStatusMutation.mutate({
          contractCode: cc,
          status: "AWAITING_SIGNATURE",
        });
        break;
      case "activate":
        activateMutation.mutate(cc);
        break;
      case "suspend":
        setContractToSuspend(cc);
        setSuspendReason("");
        setShowSuspendModal(true);
        break;
      case "terminate":
        setContractToTerminate(cc);
        setTerminateReason("");
        setShowTerminateModal(true);
        break;
      case "cancel":
        setContractToCancel(cc);
        setCancelReason("");
        setShowCancelModal(true);
        break;
      case "attach_signed":
        setAttachContractCode(cc);
        setAttachContract(contract);
        setShowAttachModal(true);
        break;
    }
  };

  const handleRowClick = (contractCode: string) => {
    navigate(`/contracts/${contractCode}`);
  };

  const anyPending =
    generateDraftMutation.isPending ||
    updateStatusMutation.isPending ||
    activateMutation.isPending ||
    suspendMutation.isPending ||
    cancelMutation.isPending ||
    terminateMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Contrathèque</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950">Contrats</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Gérez le cycle de vie contractuel, la génération, la signature et les actions de suivi.
              {totalElements > 0 && (
                <span className="ml-2 text-sm">
                  · {totalElements} contrat{totalElements > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/contracts/templates-drafting")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText size={18} />
            Templates & rédaction
          </button>
          {/* Bouton création rapide (modal) */}
          <button
            onClick={() => {
              setSelectedContract(null);
              setIsEditing(false);
              setIsModalOpen(true);
            }}
            className="border border-primary-600 text-primary-600 px-4 py-2 rounded-xl hover:bg-primary-50 flex items-center gap-2"
          >
            <FileText size={18} />
            Création rapide
          </button>
          {/* Bouton création avancée (page dédiée) */}
          <button
            onClick={() => navigate("/contracts/new")}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Création avancée
          </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Actifs", value: activeContracts, helper: "Contrats en cours" },
          { label: "À signer", value: awaitingSignatureContracts, helper: "En attente de signature" },
          { label: "Brouillons", value: draftContracts, helper: "À finaliser" },
          { label: "Signés", value: signedContracts, helper: "Prêts à activer" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.helper}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span className="text-sm">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 text-xs underline ml-4"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher un contrat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 ring-1 ring-gray-100 rounded-xl"
            />
            {isFetching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
              />
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              handleFilterChange(setStatusFilter, e.target.value)
            }
            className="px-4 py-2 ring-1 ring-gray-100 rounded-xl bg-white"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(statusConfig).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <select
            value={ownerTypeFilter}
            onChange={(e) =>
              handleFilterChange(setOwnerTypeFilter, e.target.value)
            }
            className="px-4 py-2 ring-1 ring-gray-100 rounded-xl bg-white"
          >
            <option value="all">Tous les propriétaires</option>
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
          {(statusFilter !== "all" || ownerTypeFilter !== "all" || search) && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setStatusFilter("all");
                setOwnerTypeFilter("all");
                setPage(0);
              }}
              className="px-3 py-2 ring-1 ring-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-1">
            <thead className="bg-gray-50 border-b gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Contrat
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Propriétaire
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Template
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Dates
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Documents
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr+tr]:border-t [&>tr+tr]:border-gray-50">
              {filteredContracts.map((contract) => {
                const sc = statusConfig[contract.status];
                const StatusIcon = sc?.icon || FileText;
                const actions = getAvailableActions(contract.status);

                return (
                  <tr
                    key={contract.contractCode}
                    className="cursor-pointer transition-colors hover:bg-gray-50/80"
                    onClick={() => handleRowClick(contract.contractCode)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {contract.title}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {contract.contractCode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">
                        {contract.ownerCode}
                      </p>
                      <p className="text-xs text-gray-500">
                        {contract.ownerType}
                      </p>
                      {contract.businessCode &&
                        contract.businessCode !== contract.ownerCode && (
                          <p className="text-xs text-gray-400 font-mono">
                            {contract.businessCode}
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {contract.templateCode}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        Début :{" "}
                        {formatNullableDate(contract.startDate)}
                      </p>
                      {contract.endDate && (
                        <p className="text-xs text-gray-400">
                          Fin :{" "}
                          {new Date(contract.endDate).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${sc?.color || "bg-gray-100 text-gray-700"}`}
                      >
                        <StatusIcon size={11} />
                        {sc?.label || contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        {contract.draftDocumentCode ? (
                          <span
                            className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono"
                            title="Brouillon généré"
                          >
                            DRAFT
                          </span>
                        ) : null}
                        {contract.signedDocumentCode ? (
                          <span
                            className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono"
                            title="Document signé"
                          >
                            SIGNÉ
                          </span>
                        ) : null}
                        {["AWAITING_SIGNATURE", "SIGNED"].includes(
                          contract.status,
                        ) &&
                          !contract.signedDocumentCode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttachContractCode(contract.contractCode);
                                setAttachContract(contract);
                                setShowAttachModal(true);
                              }}
                              className="p-1 text-purple-600 hover:text-purple-800"
                              title="Rattacher document signé"
                            >
                              <Upload size={15} />
                            </button>
                          )}
                        {contract.draftDocumentCode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateDraftMutation.mutate(
                                contract.contractCode,
                              );
                            }}
                            disabled={generateDraftMutation.isPending}
                            className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-40"
                            title="Re-générer brouillon"
                          >
                            {generateDraftMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex justify-end gap-1 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Preview */}
                        <button
                          onClick={() =>
                            navigate(
                              `/contracts/preview/${contract.contractCode}`,
                            )
                          }
                          className="p-1 text-primary-600 hover:text-primary-800"
                          title="Prévisualiser"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Edit */}
                        {["DRAFT", "GENERATED", "UNDER_REVIEW"].includes(
                          contract.status,
                        ) && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setIsEditing(true);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {/* Delete */}
                        {contract.status === "DRAFT" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Supprimer le contrat "${contract.title}" ?`,
                                )
                              ) {
                                deleteMutation.mutate(contract.contractCode);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1 text-red-500 hover:text-red-700 disabled:opacity-40"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {/* Workflow actions */}
                        {actions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.action}
                              onClick={() =>
                                handleAction(action.action, contract)
                              }
                              disabled={anyPending}
                              className={`p-1 disabled:opacity-40 ${action.color}`}
                              title={action.label}
                            >
                              <Icon size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredContracts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun contrat trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {totalElements} contrat{totalElements > 1 ? "s" : ""} — Page{" "}
              {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 border rounded-xl disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 border rounded-xl disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals (gardés) */}
      <ContractFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContract(null);
          setIsEditing(false);
        }}
        onSave={(data) => saveContractMutation.mutate(data)}
        initialData={selectedContract}
        isEditing={isEditing}
      />

      {showPreviewModal && previewContract && (
        <ContractPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewContract(null);
          }}
          contractData={previewContract}
          templateCode={previewContract.templateCode}
        />
      )}

      {showAttachModal && attachContractCode && (
        <AttachSignedDocumentModal
          isOpen={showAttachModal}
          onClose={() => {
            setShowAttachModal(false);
            setAttachContractCode(null);
            setAttachContract(null);
          }}
          contractCode={attachContractCode}
          ownerType={attachContract?.ownerType}
          ownerCode={attachContract?.ownerCode}
          onSuccess={() => {
            invalidate();
            setShowAttachModal(false);
            setAttachContractCode(null);
            setAttachContract(null);
          }}
        />
      )}

      {/* Terminate Modal */}
      {showTerminateModal && contractToTerminate && (
        <ModalPortal onClose={() => setShowTerminateModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold text-red-700">
              Résilier le contrat
            </h3>
            <button
              onClick={() => setShowTerminateModal(false)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
              Contrat :{" "}
              <span className="font-mono font-medium">
                {contractToTerminate}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif de résiliation *
              </label>
              <textarea
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={3}
                placeholder="Indiquez le motif de résiliation..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-xl resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                disabled={terminateMutation.isPending}
                className="flex-1 px-4 py-2 ring-1 ring-gray-100 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  terminateMutation.mutate({
                    contractCode: contractToTerminate,
                    reason: terminateReason,
                  })
                }
                disabled={
                  terminateMutation.isPending || !terminateReason.trim()
                }
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {terminateMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Résilier"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && contractToSuspend && (
        <ModalPortal onClose={() => setShowSuspendModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Suspendre le contrat</h3>
            <button
              onClick={() => setShowSuspendModal(false)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-700">
              Contrat :{" "}
              <span className="font-mono font-medium">{contractToSuspend}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif de suspension *
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="Indiquez le motif de suspension..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-xl resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                disabled={suspendMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-xl text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  suspendMutation.mutate({
                    contractCode: contractToSuspend,
                    reason: suspendReason,
                  })
                }
                disabled={suspendMutation.isPending || !suspendReason.trim()}
                className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-xl hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {suspendMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Suspendre"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Modal */}
      {showCancelModal && contractToCancel && (
        <ModalPortal onClose={() => setShowCancelModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Annuler le contrat</h3>
            <button
              onClick={() => setShowCancelModal(false)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 ring-1 ring-gray-100 rounded-xl p-3 text-sm text-gray-700">
              Contrat :{" "}
              <span className="font-mono font-medium">{contractToCancel}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif d'annulation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Motif optionnel..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-xl resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-xl text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  cancelMutation.mutate({
                    contractCode: contractToCancel,
                    reason: cancelReason || undefined,
                  })
                }
                disabled={cancelMutation.isPending}
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Confirmer l'annulation"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
};
