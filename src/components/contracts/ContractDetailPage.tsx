import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Pause,
  StopCircle,
  Ban,
  Upload,
  Loader2,
  Trash2,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { contractService } from "../../services/contract.service";
import { AttachSignedDocumentModal } from "../../components/contracts/AttachSignedDocumentModal";
import { ContractPreviewModal } from "../../components/contracts/ContractPreviewModal";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { useAuth } from "../../contexts/AuthContext";

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

const renewalTypeLabels: Record<string, string> = {
  FIXED_TERM: "Durée déterminée",
  AUTO_RENEW: "Renouvellement automatique",
  INDEFINITE: "Durée indéterminée",
};

export const ContractDetailPage: React.FC = () => {
  const { contractCode } = useParams<{ contractCode: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", contractCode],
    queryFn: () => contractService.getContract(contractCode!),
    enabled: !!contractCode,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contract", contractCode] });
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
  };

  const generateDraftMutation = useMutation({
    mutationFn: () =>
      contractService.generateDraft(contractCode!, admin?.id || 1),
    onSuccess: invalidate,
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de la génération",
      ),
  });

  const activateMutation = useMutation({
    mutationFn: () => contractService.activateContract(contractCode!),
    onSuccess: invalidate,
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de l'activation",
      ),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      contractService.suspendContract(contractCode!, suspendReason),
    onSuccess: () => {
      invalidate();
      setShowSuspendModal(false);
      setSuspendReason("");
    },
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de la suspension",
      ),
  });

  const terminateMutation = useMutation({
    mutationFn: () =>
      contractService.terminateContract(contractCode!, terminateReason),
    onSuccess: () => {
      invalidate();
      setShowTerminateModal(false);
      setTerminateReason("");
    },
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de la résiliation",
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      contractService.cancelContract(contractCode!, cancelReason),
    onSuccess: () => {
      invalidate();
      setShowCancelModal(false);
      setCancelReason("");
    },
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de l'annulation",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => contractService.deleteContract(contractCode!),
    onSuccess: () => navigate("/contracts"),
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors de la suppression",
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      contractService.updateContractStatus(contractCode!, status),
    onSuccess: invalidate,
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Erreur lors du changement de statut",
      ),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-12 w-12 text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!contract) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Contrat non trouvé</p>
          <button
            onClick={() => navigate("/contracts")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[contract.status];
  const StatusIcon = status?.icon || FileText;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/contracts")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={18} />
            Retour aux contrats
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contract.title}
              </h1>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {contract.contractCode}
              </p>
            </div>
            <div className="flex gap-3">
              {contract.status === "DRAFT" && (
                <>
                  <button
                    onClick={() => generateDraftMutation.mutate()}
                    disabled={generateDraftMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    {generateDraftMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <FileText size={16} />
                    )}
                    Générer brouillon
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate("UNDER_REVIEW")}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                  >
                    <Clock size={16} />
                    Mettre en relecture
                  </button>
                </>
              )}
              {contract.status === "GENERATED" && (
                <>
                  <button
                    onClick={() => updateStatusMutation.mutate("UNDER_REVIEW")}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                  >
                    <Clock size={16} />
                    Mettre en relecture
                  </button>
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate("AWAITING_SIGNATURE")
                    }
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Attente signature
                  </button>
                </>
              )}
              {contract.status === "AWAITING_SIGNATURE" && (
                <button
                  onClick={() => setShowAttachModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Rattacher signé
                </button>
              )}
              {contract.status === "SIGNED" && (
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  {activateMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Activer
                </button>
              )}
              {contract.status === "ACTIVE" && (
                <>
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                  >
                    <Pause size={16} />
                    Suspendre
                  </button>
                  <button
                    onClick={() => setShowTerminateModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <StopCircle size={16} />
                    Résilier
                  </button>
                </>
              )}
              {[
                "DRAFT",
                "GENERATED",
                "UNDER_REVIEW",
                "AWAITING_SIGNATURE",
              ].includes(contract.status) && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Ban size={16} />
                  Annuler
                </button>
              )}
              {contract.status === "DRAFT" && (
                <button
                  onClick={() => {
                    if (confirm("Supprimer ce contrat ?"))
                      deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle size={18} />
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-sm underline"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="col-span-2 space-y-6">
            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Statut</h2>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${status?.color}`}
                >
                  <StatusIcon size={14} />
                  {status?.label || contract.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Créé le</p>
                  <p className="font-medium">
                    {new Date(contract.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {contract.signedAt && (
                  <div>
                    <p className="text-gray-500">Signé le</p>
                    <p className="font-medium">
                      {new Date(contract.signedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}
                {contract.activatedAt && (
                  <div>
                    <p className="text-gray-500">Activé le</p>
                    <p className="font-medium">
                      {new Date(contract.activatedAt).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary-600" />
                Période du contrat
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date d'effet</p>
                  <p className="font-medium">
                    {new Date(contract.effectiveDate).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de début</p>
                  <p className="font-medium">
                    {new Date(contract.startDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {contract.endDate && (
                  <div>
                    <p className="text-sm text-gray-500">Date de fin</p>
                    <p className="font-medium">
                      {new Date(contract.endDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Renouvellement</p>
                  <p className="font-medium">
                    {renewalTypeLabels[contract.renewalType] ||
                      contract.renewalType}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {contract.description && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Description
                </h2>
                <p className="text-gray-600">{contract.description}</p>
              </div>
            )}
          </div>

          {/* Right column - Parties and documents */}
          <div className="space-y-6">
            {/* Parties */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User size={18} className="text-primary-600" />
                Parties prenantes
              </h2>
              <div className="space-y-3">
                {contract.parties?.map((party, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          party.role === "SIGNATORY"
                            ? "bg-green-100 text-green-700"
                            : party.role === "BENEFICIARY"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100"
                        }`}
                      >
                        {party.role === "SIGNATORY"
                          ? "Signataire"
                          : party.role === "BENEFICIARY"
                            ? "Bénéficiaire"
                            : "Témoin"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {party.partyType}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">
                      {party.displayName}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {party.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} />
                          {party.email}
                        </span>
                      )}
                      {party.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          {party.phone}
                        </span>
                      )}
                    </div>
                    {party.signedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Signé le{" "}
                        {new Date(party.signedAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                Documents
              </h2>
              <div className="space-y-3">
                {contract.draftDocumentCode && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Brouillon</p>
                      <p className="text-xs text-blue-600 font-mono">
                        {contract.draftDocumentCode}
                      </p>
                    </div>
                    <button
                      onClick={() => generateDraftMutation.mutate()}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {contract.signedDocumentCode && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">
                        Document signé
                      </p>
                      <p className="text-xs text-green-600 font-mono">
                        {contract.signedDocumentCode}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        window.open(
                          `/sni/api/v1/documents/${contract.signedDocumentCode}/download`,
                          "_blank",
                        )
                      }
                      className="p-1 text-green-600 hover:text-green-800"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {!contract.draftDocumentCode && contract.status === "DRAFT" && (
                  <button
                    onClick={() => generateDraftMutation.mutate()}
                    className="w-full py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    Générer le brouillon
                  </button>
                )}
                {contract.status === "AWAITING_SIGNATURE" &&
                  !contract.signedDocumentCode && (
                    <button
                      onClick={() => setShowAttachModal(true)}
                      className="w-full py-2 border border-dashed border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-2"
                    >
                      <Upload size={16} />
                      Rattacher le document signé
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAttachModal && (
        <AttachSignedDocumentModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          contractCode={contract.contractCode}
          ownerType={contract.ownerType}
          ownerCode={contract.ownerCode}
          onSuccess={() => {
            invalidate();
            setShowAttachModal(false);
          }}
        />
      )}

      {showPreviewModal && (
        <ContractPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          contractData={contract}
          templateCode={contract.templateCode}
        />
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <ModalPortal onClose={() => setShowSuspendModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Suspendre le contrat</h3>
            <button
              onClick={() => setShowSuspendModal(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Contrat:{" "}
              <span className="font-mono font-medium">
                {contract.contractCode}
              </span>
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Motif de la suspension *"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => suspendMutation.mutate()}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="flex-1 bg-yellow-600 text-white rounded-lg py-2 disabled:opacity-50"
              >
                {suspendMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Suspendre"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && (
        <ModalPortal onClose={() => setShowTerminateModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold text-red-700">
              Résilier le contrat
            </h3>
            <button
              onClick={() => setShowTerminateModal(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Contrat:{" "}
              <span className="font-mono font-medium">
                {contract.contractCode}
              </span>
            </p>
            <textarea
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              placeholder="Motif de la résiliation *"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => terminateMutation.mutate()}
                disabled={
                  !terminateReason.trim() || terminateMutation.isPending
                }
                className="flex-1 bg-red-600 text-white rounded-lg py-2 disabled:opacity-50"
              >
                {terminateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Résilier"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <ModalPortal onClose={() => setShowCancelModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Annuler le contrat</h3>
            <button
              onClick={() => setShowCancelModal(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Contrat:{" "}
              <span className="font-mono font-medium">
                {contract.contractCode}
              </span>
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motif de l'annulation (optionnel)"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-gray-700 text-white rounded-lg py-2"
              >
                {cancelMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
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
