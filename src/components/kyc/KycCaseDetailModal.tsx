import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  User,
  Building2,
  AlertCircle,
  Upload,
  Loader2,
  FileText,
  Clock,
  RefreshCw,
  MessageSquare,
  History,
  Calendar,
  Scan,
  Shield,
  Plus,
} from "lucide-react";
import { kycService, documentService } from "../../services/document.service";
import {
  kycRiskLevelLabels,
  kycRiskLevelColors,
} from "../../services/document.service";
import type {
  KycCaseResponse,
  DocumentResponse,
  KycRiskLevel,
} from "../../services/document.service";
import { ModalPortal } from "../ui/ModalPortal";
import { useAuth } from "../../contexts/AuthContext";
import { DocumentReviewModal } from "./DocumentReviewModal";

interface KycCaseDetailModalProps {
  kycCase: KycCaseResponse;
  onClose: () => void;
  onRefresh: () => void;
}

const kycStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  NOT_STARTED: {
    label: "Non commencé",
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
  },
  SUBMITTED: {
    label: "Soumis",
    color: "bg-purple-100 text-purple-700",
    icon: FileText,
  },
  UNDER_REVIEW: {
    label: "En revue",
    color: "bg-yellow-100 text-yellow-700",
    icon: Eye,
  },
  PENDING_CORRECTION: {
    label: "Correction requise",
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
  RENEWAL_REQUIRED: {
    label: "Renouvel. requis",
    color: "bg-purple-100 text-purple-700",
    icon: Calendar,
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-500",
    icon: XCircle,
  },
};

const docStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
  },
  APPROVED: { label: "Validé", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500" },
};

type DetailTab = "documents" | "notes" | "timeline" | "expiry" | "ocr";

export const KycCaseDetailModal: React.FC<KycCaseDetailModalProps> = ({
  kycCase,
  onClose,
  onRefresh,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DetailTab>("documents");
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewProcessing, setReviewProcessing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  // Niveau de risque
  const [showRiskEdit, setShowRiskEdit] = useState(false);
  const [editRiskLevel, setEditRiskLevel] = useState<KycRiskLevel>("LOW");
  const [editRiskComment, setEditRiskComment] = useState("");

  // OCR
  const [selectedOcrDoc, setSelectedOcrDoc] = useState<string | null>(null);

  useEffect(() => {
    setComment("");
    setActionError(null);
    setUploadError(null);
    setUploadingDocType(null);
    setActiveTab("documents");
  }, [kycCase.code]);

  const { data: freshCase } = useQuery({
    queryKey: ["kyc-case", kycCase.code],
    queryFn: () => kycService.getKycCase(kycCase.code),
    initialData: kycCase,
  });
  const currentCase = freshCase || kycCase;

  // Notes
  const { data: notes = [] } = useQuery({
    queryKey: ["kyc-notes", currentCase.code],
    queryFn: () => kycService.getNotes(currentCase.code),
    enabled: activeTab === "notes",
  });

  // Timeline
  const { data: timeline = [] } = useQuery({
    queryKey: ["kyc-timeline", currentCase.code],
    queryFn: () => kycService.getTimeline(currentCase.code),
    enabled: activeTab === "timeline",
  });

  // Expiry status
  const { data: expiryStatus = [] } = useQuery({
    queryKey: ["kyc-expiry", currentCase.code],
    queryFn: () => kycService.getExpiryStatus(currentCase.code),
    enabled: activeTab === "expiry",
  });

  // OCR
  const { data: ocrResult, isLoading: ocrLoading } = useQuery({
    queryKey: ["kyc-ocr", selectedOcrDoc],
    queryFn: () => kycService.getOcrResult(selectedOcrDoc!),
    enabled: activeTab === "ocr" && !!selectedOcrDoc,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["kycCases"] });
    queryClient.invalidateQueries({ queryKey: ["kyc-case", kycCase.code] });
    onRefresh();
  };

  const adminId = Number(admin?.id) || 1;

  const submitMutation = useMutation({
    mutationFn: () => kycService.submitKycCase(currentCase.code),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur lors de la soumission.",
      ),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      kycService.approveKycCase(currentCase.code, adminId, comment),
    onSuccess: () => {
      invalidate();
      setComment("");
      setActionError(null);
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur lors de l'approbation.",
      ),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      kycService.rejectKycCase(currentCase.code, adminId, comment),
    onSuccess: () => {
      invalidate();
      setComment("");
      setActionError(null);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur lors du rejet."),
  });

  const assignMutation = useMutation({
    mutationFn: () => kycService.assignKycCase(currentCase.code, adminId),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur lors de l'assignation.",
      ),
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      kycService.addNote(currentCase.code, newNote, adminId, noteInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kyc-notes", currentCase.code],
      });
      setNewNote("");
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur lors de l'ajout de la note.",
      ),
  });

  const riskLevelMutation = useMutation({
    mutationFn: () =>
      kycService.updateRiskLevel(
        currentCase.code,
        editRiskLevel,
        adminId,
        editRiskComment,
      ),
    onSuccess: () => {
      invalidate();
      setShowRiskEdit(false);
      setEditRiskComment("");
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ||
          "Erreur lors de la mise à jour du risque.",
      ),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      documentTypeCode,
      file,
    }: {
      documentTypeCode: string;
      file: File;
    }) => {
      const ownerCode = currentCase.ownerCode || String(currentCase.ownerId);
      return documentService.uploadDocument({
        ownerType: currentCase.ownerType,
        ownerCode,
        documentTypeCode,
        title: `Document ${documentTypeCode}`,
        uploadedBy: admin?.email || adminId,
        file,
      });
    },
    onSuccess: () => {
      invalidate();
      setUploadingDocType(null);
      setUploadError(null);
    },
    onError: (e: any) => {
      setUploadingDocType(null);
      setUploadError(e?.response?.data?.message || "Erreur lors de l'upload.");
    },
  });

  const handleDocApprove = async (comment?: string) => {
    if (!selectedDoc) return;
    setReviewProcessing(true);
    setReviewError(null);
    try {
      await documentService.approveDocument(selectedDoc.code, adminId, comment);
      invalidate();
      setIsReviewOpen(false);
      setSelectedDoc(null);
    } catch (e: any) {
      setReviewError(
        e?.response?.data?.message || "Erreur lors de l'approbation.",
      );
    } finally {
      setReviewProcessing(false);
    }
  };

  const replaceMutation = useMutation({
    mutationFn: async ({ docCode, file }: { docCode: string; file: File }) =>
      documentService.replaceDocument(docCode, adminId, file),
    onSuccess: () => {
      invalidate();
      setUploadError(null);
    },
    onError: (e: any) =>
      setUploadError(
        e?.response?.data?.message || "Erreur lors du remplacement.",
      ),
  });

  const handleDocReject = async (comment: string, reasonCode: string) => {
    if (!selectedDoc) return;
    setReviewProcessing(true);
    setReviewError(null);
    try {
      await documentService.rejectDocument(
        selectedDoc.code,
        adminId,
        comment,
        reasonCode,
      );
      invalidate();
      setIsReviewOpen(false);
      setSelectedDoc(null);
    } catch (e: any) {
      setReviewError(e?.response?.data?.message || "Erreur lors du rejet.");
    } finally {
      setReviewProcessing(false);
    }
  };

  const sc = kycStatusConfig[currentCase.status];
  const StatusIcon = sc?.icon || Clock;

  const canSubmit =
    currentCase.status === "IN_PROGRESS" &&
    (currentCase.missingDocumentTypeCodes?.length ?? 1) === 0;
  const canDecide = ["SUBMITTED", "UNDER_REVIEW"].includes(currentCase.status);
  const canAssign = currentCase.status === "SUBMITTED";
  const hasMissing = (currentCase.missingDocumentTypeCodes?.length ?? 0) > 0;

  const docStats = {
    total: currentCase.documents?.length ?? 0,
    approved:
      currentCase.documents?.filter((d) => d.status === "APPROVED").length ?? 0,
    rejected:
      currentCase.documents?.filter((d) => d.status === "REJECTED").length ?? 0,
    pending:
      currentCase.documents?.filter((d) => d.status === "PENDING_REVIEW")
        .length ?? 0,
  };

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notes", label: "Notes", icon: MessageSquare },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "expiry", label: "Expiration", icon: Calendar },
    { id: "ocr", label: "OCR", icon: Scan },
  ];

  return (
    <ModalPortal onClose={onClose} size="4xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl z-10">
        <div>
          <h3 className="text-xl font-bold">Dossier KYC</h3>
          <p className="text-sm text-gray-500 font-mono">{currentCase.code}</p>
        </div>
        <div className="flex items-center gap-3">
          {sc && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}
            >
              <StatusIcon size={12} />
              {sc.label}
            </span>
          )}
          {currentCase.riskLevel && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${kycRiskLevelColors[currentCase.riskLevel]}`}
            >
              <Shield size={10} className="inline mr-1" />
              {kycRiskLevelLabels[currentCase.riskLevel]}
            </span>
          )}
          {currentCase.kycLevel && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-mono">
              Niv. {currentCase.kycLevel}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Propriétaire + infos */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              {currentCase.ownerType === "BUSINESS" ? (
                <Building2 size={20} className="text-primary-600" />
              ) : (
                <User size={20} className="text-primary-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {currentCase.ownerType}
              </p>
              <p className="text-sm text-gray-500 font-mono">
                {currentCase.ownerCode || `ID: ${currentCase.ownerId}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-500">Commencé</p>
              <p className="font-medium">
                {new Date(currentCase.startedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {currentCase.submittedAt && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Soumis</p>
                <p className="font-medium">
                  {new Date(currentCase.submittedAt).toLocaleDateString(
                    "fr-FR",
                  )}
                </p>
              </div>
            )}
            {currentCase.slaDeadline && (
              <div
                className={`text-center ${new Date(currentCase.slaDeadline) < new Date() ? "text-red-600" : ""}`}
              >
                <p className="text-xs text-gray-500">SLA</p>
                <p className="font-medium">
                  {new Date(currentCase.slaDeadline).toLocaleDateString(
                    "fr-FR",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[60vh] p-6 space-y-5">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="underline text-xs ml-2"
            >
              Fermer
            </button>
          </div>
        )}

        {/* ========== ONGLET DOCUMENTS ========== */}
        {activeTab === "documents" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Total",
                  value: docStats.total,
                  color: "text-gray-700",
                  bg: "bg-gray-50",
                },
                {
                  label: "Validés",
                  value: docStats.approved,
                  color: "text-green-700",
                  bg: "bg-green-50",
                },
                {
                  label: "Rejetés",
                  value: docStats.rejected,
                  color: "text-red-700",
                  bg: "bg-red-50",
                },
                {
                  label: "En cours",
                  value: docStats.pending,
                  color: "text-yellow-700",
                  bg: "bg-yellow-50",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`${s.bg} rounded-xl p-3 text-center`}
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Documents manquants */}
            {hasMissing && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-amber-600" />
                  <h4 className="font-semibold text-amber-800 text-sm">
                    Documents manquants (
                    {currentCase.missingDocumentTypeCodes?.length})
                  </h4>
                </div>
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-2">
                    {uploadError}
                  </div>
                )}
                <div className="space-y-2">
                  {currentCase.missingDocumentTypeCodes?.map((code) => (
                    <div
                      key={code}
                      className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-100"
                    >
                      <span className="text-sm text-amber-800 font-mono">
                        {code}
                      </span>
                      <label className="cursor-pointer bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-primary-700 flex items-center gap-1.5">
                        {uploadingDocType === code &&
                        uploadMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}
                        Uploader
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setUploadingDocType(code);
                              uploadMutation.mutate({
                                documentTypeCode: code,
                                file: e.target.files[0],
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents fournis */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                Documents fournis ({docStats.total})
              </h4>
              {docStats.total === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun document fourni</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentCase.documents?.map((doc) => {
                    const ds = docStatusConfig[doc.status];
                    return (
                      <div
                        key={doc.code}
                        className="border border-gray-200 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium text-sm truncate">
                              {doc.documentTypeName}
                            </p>
                            {ds && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${ds.color}`}
                              >
                                {ds.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {doc.code}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600"
                            title="Voir"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600"
                            title="Télécharger"
                          >
                            <Download size={15} />
                          </button>
                          {doc.status === "PENDING_REVIEW" && (
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setIsReviewOpen(true);
                                setReviewError(null);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-yellow-600 hover:text-yellow-800"
                              title="Revoir"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {doc.status === "REJECTED" && (
                            <label
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 cursor-pointer"
                              title="Remplacer"
                            >
                              {replaceMutation.isPending ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <RefreshCw size={15} />
                              )}
                              <input
                                type="file"
                                className="hidden"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    replaceMutation.mutate({
                                      docCode: doc.code,
                                      file: e.target.files[0],
                                    });
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== ONGLET NOTES ========== */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ajouter une note..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteInternal}
                    onChange={(e) => setNoteInternal(e.target.checked)}
                    className="rounded"
                  />
                  Interne
                </label>
                <button
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 disabled:opacity-50"
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg ${note.internal ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium">
                      {note.authorName || `User #${note.authorId}`}
                    </span>
                    <div className="flex gap-2">
                      {note.internal && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          Interne
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune note
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== ONGLET TIMELINE ========== */}
        {activeTab === "timeline" && (
          <div className="space-y-1">
            {timeline.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">{event.description}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(event.occurredAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {event.eventType}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucun événement
              </div>
            )}
          </div>
        )}

        {/* ========== ONGLET EXPIRATION ========== */}
        {activeTab === "expiry" && (
          <div className="space-y-3">
            {expiryStatus.map((item) => (
              <div
                key={item.documentCode}
                className={`p-3 rounded-lg border ${item.expired ? "border-red-200 bg-red-50" : item.daysUntilExpiry <= 30 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{item.documentType}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {item.documentCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${item.expired ? "text-red-600" : ""}`}
                    >
                      {new Date(item.expiryDate).toLocaleDateString("fr-FR")}
                    </p>
                    <p
                      className={`text-xs ${item.expired ? "text-red-500" : item.daysUntilExpiry <= 30 ? "text-amber-600" : "text-gray-400"}`}
                    >
                      {item.expired
                        ? "Expiré"
                        : `${item.daysUntilExpiry} jours restants`}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${item.status === "VERIFIED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
            {expiryStatus.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucun document avec date d'expiration
              </div>
            )}
          </div>
        )}

        {/* ========== ONGLET OCR ========== */}
        {activeTab === "ocr" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner un document pour voir le résultat OCR
              </label>
              <select
                value={selectedOcrDoc || ""}
                onChange={(e) => setSelectedOcrDoc(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">— Choisir un document —</option>
                {currentCase.documents?.map((doc) => (
                  <option key={doc.code} value={doc.code}>
                    {doc.documentTypeName} — {doc.code}
                  </option>
                ))}
              </select>
            </div>

            {ocrLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-500">Chargement OCR...</p>
              </div>
            ) : ocrResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Score de confiance</p>
                    <p className="text-xl font-bold">
                      {ocrResult.confidenceScore}%
                    </p>
                  </div>
                  {ocrResult.extractedDocumentNumber && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">
                        N° Document extrait
                      </p>
                      <p className="font-mono font-bold">
                        {ocrResult.extractedDocumentNumber}
                      </p>
                    </div>
                  )}
                  {ocrResult.extractedExpiryDate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">
                        Date expiration extraite
                      </p>
                      <p className="font-bold">
                        {ocrResult.extractedExpiryDate}
                      </p>
                    </div>
                  )}
                </div>
                {ocrResult.rawOcrJson?.rawText && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">
                      Texte brut reconnu
                    </p>
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {ocrResult.rawOcrJson.rawText}
                    </pre>
                  </div>
                )}
              </div>
            ) : selectedOcrDoc ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucun résultat OCR disponible
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Sélectionnez un document pour voir le résultat OCR
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t p-4 space-y-3 bg-white rounded-b-2xl">
        {/* Niveau de risque */}
        {showRiskEdit ? (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex gap-2">
              <select
                value={editRiskLevel}
                onChange={(e) =>
                  setEditRiskLevel(e.target.value as KycRiskLevel)
                }
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="LOW">Faible</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HIGH">Élevé</option>
                <option value="VERY_HIGH">Très élevé</option>
              </select>
              <button
                onClick={() => riskLevelMutation.mutate()}
                disabled={riskLevelMutation.isPending}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {riskLevelMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Appliquer"
                )}
              </button>
              <button
                onClick={() => setShowRiskEdit(false)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                Annuler
              </button>
            </div>
            <input
              type="text"
              value={editRiskComment}
              onChange={(e) => setEditRiskComment(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setShowRiskEdit(true);
              setEditRiskLevel(currentCase.riskLevel || "LOW");
              setEditRiskComment("");
            }}
            className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            <Shield size={12} /> Modifier le niveau de risque
          </button>
        )}

        {/* Commentaire décision */}
        {currentCase.decisionComment && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">
              Commentaire de décision
            </p>
            <p className="text-sm text-gray-800">
              {currentCase.decisionComment}
            </p>
          </div>
        )}

        {/* Boutons workflow */}
        <div className="flex gap-2">
          {canAssign && (
            <button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm"
            >
              {assignMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Eye size={15} />
              )}
              Prendre en charge
            </button>
          )}
          {canSubmit && (
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {submitMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              Soumettre le dossier
            </button>
          )}
          {canDecide && (
            <>
              <div className="flex-1 space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Commentaire de décision..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle size={15} />
                    )}
                    Approuver
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending || !comment.trim()}
                    className="flex-1 bg-red-600 text-white py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <XCircle size={15} />
                    )}
                    Rejeter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal revue document individuel */}
      {isReviewOpen && selectedDoc && (
        <DocumentReviewModal
          document={selectedDoc}
          onClose={() => {
            setIsReviewOpen(false);
            setSelectedDoc(null);
          }}
          onApprove={handleDocApprove}
          onReject={handleDocReject}
          isProcessing={reviewProcessing}
          error={reviewError}
        />
      )}
    </ModalPortal>
  );
};
