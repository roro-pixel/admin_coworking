import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { documentService, kycService } from "../../services/document.service";
import type {
  KycCaseRequirementResponse,
  KycDocumentResponse,
  KycRiskLevel,
} from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { DocumentReviewModal } from "../../components/kyc/DocumentReviewModal";

type Tab =
  | "overview"
  | "documents"
  | "requirements"
  | "notes"
  | "timeline"
  | "expiry"
  | "ocr"
  | "upload";

const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Vue générale", icon: ShieldCheck },
  { id: "documents", label: "Documents", icon: FileCheck2 },
  { id: "requirements", label: "Exigences", icon: FileText },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "timeline", label: "Historique", icon: History },
  { id: "expiry", label: "Expiration", icon: CalendarClock },
  { id: "ocr", label: "OCR", icon: ScanSearch },
  { id: "upload", label: "Upload admin", icon: Upload },
];

const riskLevels: KycRiskLevel[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "VERY_HIGH",
];

const statusLabel: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  PENDING_CORRECTION: "Correction demandée",
  RENEWAL_REQUIRED: "Renouvellement requis",
  EXPIRED: "Expiré",
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de revue",
  IN_REVIEW: "En revue",
};

const statusColor: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-600",
  PENDING_CORRECTION: "bg-orange-100 text-orange-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  PENDING: "bg-yellow-100 text-yellow-700",
};

const panelClass = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const softButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const getDocumentCode = (document: KycDocumentResponse): string =>
  String(document.documentCode || "");

export const KycCaseDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const reviewerId = Number(admin?.id) || 1;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [assignValue, setAssignValue] = useState("");
  const [assignMode, setAssignMode] = useState<"id" | "email">("id");
  const [riskLevel, setRiskLevel] = useState<KycRiskLevel>("MEDIUM");
  const [riskComment, setRiskComment] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [requirementForm, setRequirementForm] = useState({
    documentTypeCode: "",
    documentTypeName: "",
    required: true,
  });
  const [selectedDocumentCodes, setSelectedDocumentCodes] = useState<string[]>(
    [],
  );
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [correction, setCorrection] = useState({
    documentCode: "",
    correctionNote: "",
    deadlineDays: 7,
  });
  const [ocrDocumentCode, setOcrDocumentCode] = useState("");
  const [reviewDocument, setReviewDocument] = useState<KycDocumentResponse | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentTypeCode: "",
    side: "FRONT",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
  });
  const [selectedDetailsDocumentCode, setSelectedDetailsDocumentCode] =
    useState("");
  const [detailsForm, setDetailsForm] = useState({
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
  });

  const fail = (e: any, fallback: string) => {
    setError(e?.response?.data?.message || e?.message || fallback);
    setMessage(null);
  };
  const success = (text: string) => {
    setMessage(text);
    setError(null);
  };

  const caseQuery = useQuery({
    queryKey: ["kyc-case-detail", code],
    queryFn: () => kycService.getKycCase(code!),
    enabled: !!code,
  });

  const documentTypesQuery = useQuery({
    queryKey: ["kyc-document-types", caseQuery.data?.ownerType],
    queryFn: () =>
      documentService.getDocumentTypes(
        String(caseQuery.data!.ownerType),
        true,
      ),
    enabled: !!caseQuery.data?.ownerType,
  });

  const missingQuery = useQuery({
    queryKey: ["kyc-case-missing-requirements", code],
    queryFn: () => kycService.getKycMissingRequirements(code!),
    enabled: !!code,
  });

  const requirementsQuery = useQuery({
    queryKey: ["kyc-case-requirements", code],
    queryFn: () => documentService.getKycCaseRequirements(code!),
    enabled: !!code,
  });

  const reviewQueueQuery = useQuery({
    queryKey: ["kyc-case-review-queue", code],
    queryFn: () => documentService.getKycCaseReviewQueue(code!),
    enabled: !!code,
  });

  const notesQuery = useQuery({
    queryKey: ["kyc-case-notes", code],
    queryFn: () => kycService.getNotes(code!),
    enabled: !!code,
  });

  const timelineQuery = useQuery({
    queryKey: ["kyc-case-timeline", code],
    queryFn: () => kycService.getTimeline(code!),
    enabled: !!code,
  });

  const expiryQuery = useQuery({
    queryKey: ["kyc-case-expiry", code],
    queryFn: () => kycService.getExpiryStatus(code!),
    enabled: !!code,
  });

  const ocrQuery = useQuery({
    queryKey: ["kyc-document-ocr", ocrDocumentCode],
    queryFn: () => documentService.getOcrResult(ocrDocumentCode),
    enabled: !!ocrDocumentCode,
  });

  const kycCase = caseQuery.data;
  const documents = useMemo<KycDocumentResponse[]>(() => {
    const detailDocuments = kycCase?.documents || [];
    const queuedDocuments = reviewQueueQuery.data || [];
    const merged = new Map<string, KycDocumentResponse>();
    [...detailDocuments, ...queuedDocuments].forEach((document) => {
      const documentCode = getDocumentCode(document);
      if (documentCode) merged.set(documentCode, document);
    });
    return Array.from(merged.values());
  }, [kycCase?.documents, reviewQueueQuery.data]);

  const availableDocumentTypes = useMemo(
    () =>
      (documentTypesQuery.data || []).filter(
        (type) =>
          String(type.category).toUpperCase() === "KYC" ||
          String(type.ownerType || "") === String(kycCase?.ownerType || ""),
      ),
    [documentTypesQuery.data, kycCase?.ownerType],
  );

  const selectedDetailsDocument = useMemo(
    () =>
      documents.find(
        (document) =>
          getDocumentCode(document) === selectedDetailsDocumentCode,
      ) || null,
    [documents, selectedDetailsDocumentCode],
  );

  const invalidateCase = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["kyc-case-detail", code] }),
      queryClient.invalidateQueries({ queryKey: ["kycCases"] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-my-queue"] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-case-review-queue", code] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-case-requirements", code] }),
      queryClient.invalidateQueries({
        queryKey: ["kyc-case-missing-requirements", code],
      }),
      queryClient.invalidateQueries({ queryKey: ["kyc-case-notes", code] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-case-timeline", code] }),
      queryClient.invalidateQueries({ queryKey: ["kyc-case-expiry", code] }),
    ]);
  };

  const submitMutation = useMutation({
    mutationFn: () => kycService.submitKycCase(code!),
    onSuccess: async () => {
      await invalidateCase();
      success("Dossier soumis pour revue.");
    },
    onError: (e) => fail(e, "Impossible de soumettre le dossier."),
  });

  const approveCaseMutation = useMutation({
    mutationFn: () =>
      kycService.approveKycCase(code!, reviewerId, decisionComment || undefined),
    onSuccess: async () => {
      await invalidateCase();
      setDecisionComment("");
      success("Dossier approuvé.");
    },
    onError: (e) => fail(e, "Impossible d'approuver le dossier."),
  });

  const rejectCaseMutation = useMutation({
    mutationFn: () =>
      kycService.rejectKycCase(code!, reviewerId, decisionComment.trim()),
    onSuccess: async () => {
      await invalidateCase();
      setDecisionComment("");
      success("Dossier rejeté.");
    },
    onError: (e) => fail(e, "Impossible de rejeter le dossier."),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      kycService.assignKycCase(
        code!,
        assignMode === "id"
          ? { assignedTo: Number(assignValue) }
          : { email: assignValue.trim() },
      ),
    onSuccess: async () => {
      await invalidateCase();
      setAssignValue("");
      success("Dossier assigné.");
    },
    onError: (e) => fail(e, "Impossible d'assigner le dossier."),
  });

  const riskMutation = useMutation({
    mutationFn: () =>
      kycService.updateRiskLevel(
        code!,
        riskLevel,
        reviewerId,
        riskComment || undefined,
      ),
    onSuccess: async () => {
      await invalidateCase();
      setRiskComment("");
      success("Niveau de risque mis à jour.");
    },
    onError: (e) => fail(e, "Impossible de modifier le risque."),
  });

  const addRequirementMutation = useMutation({
    mutationFn: () =>
      documentService.addKycCaseRequirement(code!, {
        documentTypeCode: requirementForm.documentTypeCode.trim(),
        documentTypeName: requirementForm.documentTypeName.trim() || undefined,
        required: requirementForm.required,
      }),
    onSuccess: async () => {
      await invalidateCase();
      setRequirementForm({
        documentTypeCode: "",
        documentTypeName: "",
        required: true,
      });
      success("Exigence ajoutée.");
    },
    onError: (e) => fail(e, "Impossible d'ajouter l'exigence."),
  });

  const removeRequirementMutation = useMutation({
    mutationFn: (documentTypeCode: string) =>
      documentService.removeKycCaseRequirement(code!, documentTypeCode),
    onSuccess: async () => {
      await invalidateCase();
      success("Exigence retirée.");
    },
    onError: (e) => fail(e, "Impossible de retirer l'exigence."),
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      kycService.addNote(code!, {
        content: noteContent.trim(),
        authorId: reviewerId,
        authorName: admin?.email || "Admin",
        internal: noteInternal,
      }),
    onSuccess: async () => {
      await invalidateCase();
      setNoteContent("");
      success("Note ajoutée.");
    },
    onError: (e) => fail(e, "Impossible d'ajouter la note."),
  });

  const approveDocumentsMutation = useMutation({
    mutationFn: () =>
      documentService.bulkApproveKycCaseDocuments(
        code!,
        selectedDocumentCodes,
        reviewerId,
      ),
    onSuccess: async () => {
      await invalidateCase();
      setSelectedDocumentCodes([]);
      success("Documents approuvés.");
    },
    onError: (e) => fail(e, "Impossible d'approuver les documents."),
  });

  const rejectDocumentsMutation = useMutation({
    mutationFn: () =>
      documentService.bulkRejectKycCaseDocuments(
        code!,
        selectedDocumentCodes.map((documentCode) => ({
          documentCode,
          reason:
            rejectReasons[documentCode]?.trim() || "Document non conforme",
        })),
        reviewerId,
      ),
    onSuccess: async () => {
      await invalidateCase();
      setSelectedDocumentCodes([]);
      setRejectReasons({});
      success("Documents rejetés.");
    },
    onError: (e) => fail(e, "Impossible de rejeter les documents."),
  });

  const correctionMutation = useMutation({
    mutationFn: () =>
      documentService.requestKycCaseDocumentCorrection(code!, {
        documentCode: correction.documentCode,
        reviewedBy: reviewerId,
        correctionNote: correction.correctionNote.trim(),
        deadlineDays: correction.deadlineDays,
      }),
    onSuccess: async () => {
      await invalidateCase();
      setCorrection({
        documentCode: "",
        correctionNote: "",
        deadlineDays: 7,
      });
      success("Demande de correction envoyée.");
    },
    onError: (e) => fail(e, "Impossible de demander la correction."),
  });


  const approveSingleDocumentMutation = useMutation({
    mutationFn: (documentCode: string) =>
      documentService.bulkApproveKycCaseDocuments(
        code!,
        [documentCode],
        reviewerId,
      ),
    onSuccess: async () => {
      await invalidateCase();
      setReviewDocument(null);
      success("Document approuvé.");
    },
    onError: (e) => fail(e, "Impossible d'approuver le document."),
  });

  const rejectSingleDocumentMutation = useMutation({
    mutationFn: ({
      documentCode,
      reason,
    }: {
      documentCode: string;
      reason: string;
    }) =>
      documentService.bulkRejectKycCaseDocuments(
        code!,
        [{ documentCode, reason }],
        reviewerId,
      ),
    onSuccess: async () => {
      await invalidateCase();
      setReviewDocument(null);
      success("Document rejeté.");
    },
    onError: (e) => fail(e, "Impossible de rejeter le document."),
  });

  const correctSingleDocumentMutation = useMutation({
    mutationFn: ({
      documentCode,
      correctionNote,
      deadlineDays,
    }: {
      documentCode: string;
      correctionNote: string;
      deadlineDays: number;
    }) =>
      documentService.requestKycCaseDocumentCorrection(code!, {
        documentCode,
        reviewedBy: reviewerId,
        correctionNote,
        deadlineDays,
      }),
    onSuccess: async () => {
      await invalidateCase();
      setReviewDocument(null);
      success("Demande de correction envoyée.");
    },
    onError: (e) => fail(e, "Impossible de demander la correction."),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile || !kycCase?.ownerCode) {
        throw new Error("Fichier ou code propriétaire manquant.");
      }
      return documentService.uploadKycDocumentAsAdmin({
        ownerType: String(kycCase.ownerType),
        ownerCode: kycCase.ownerCode,
        documentTypeCode: uploadForm.documentTypeCode.trim(),
        side: uploadForm.side,
        documentNumber: uploadForm.documentNumber || undefined,
        issueDate: uploadForm.issueDate || undefined,
        expiryDate: uploadForm.expiryDate || undefined,
        file: uploadFile,
      });
    },
    onSuccess: async (data) => {
      await invalidateCase();
      setUploadFile(null);
      setSelectedDetailsDocumentCode(data.documentCode || "");
      success("Document uploadé pour le propriétaire.");
    },
    onError: (e) => fail(e, "Impossible d'uploader le document."),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: () => {
      if (!selectedDetailsDocument?.id) {
        throw new Error(
          "Le document sélectionné ne contient pas son identifiant technique.",
        );
      }

      return documentService.updateKycDocumentAdminDetails(
        selectedDetailsDocument.id,
        {
          documentNumber: detailsForm.documentNumber || undefined,
          issueDate: detailsForm.issueDate || undefined,
          expiryDate: detailsForm.expiryDate || undefined,
        },
      );
    },
    onSuccess: async () => {
      await invalidateCase();
      success("Métadonnées du document mises à jour.");
    },
    onError: (e) => fail(e, "Impossible de mettre à jour les métadonnées."),
  });

  const exportPdf = async () => {
    try {
      const blob = await kycService.exportPdf(code!, true);
      downloadBlob(blob, `kyc_${code}.pdf`);
    } catch (e) {
      fail(e, "Impossible d'exporter le dossier.");
    }
  };

  const toggleDocument = (documentCode: string) => {
    setSelectedDocumentCodes((current) =>
      current.includes(documentCode)
        ? current.filter((item) => item !== documentCode)
        : [...current, documentCode],
    );
  };

  if (!code) {
    return (
      <AdminLayout>
        <div className={panelClass}>Code du dossier manquant.</div>
      </AdminLayout>
    );
  }

  if (caseQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 animate-spin" />
          Chargement du dossier KYC…
        </div>
      </AdminLayout>
    );
  }

  if (!kycCase) {
    return (
      <AdminLayout>
        <div className={panelClass}>Dossier KYC introuvable.</div>
      </AdminLayout>
    );
  }

  const requirements = requirementsQuery.data || [];
  const missingRequirements = missingQuery.data || [];
  const isBusy =
    submitMutation.isPending ||
    approveCaseMutation.isPending ||
    rejectCaseMutation.isPending ||
    assignMutation.isPending ||
    riskMutation.isPending;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={17} /> Retour
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-950">
                {kycCase.ownerName || "Dossier KYC"}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusColor[String(kycCase.status)] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {statusLabel[String(kycCase.status)] || kycCase.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">
              {kycCase.code}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {kycCase.ownerType} · {kycCase.ownerCode || "Code indisponible"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className={softButton} onClick={() => caseQuery.refetch()}>
              <RefreshCw size={16} /> Actualiser
            </button>
            <button className={softButton} onClick={exportPdf}>
              <Download size={16} /> Export PDF
            </button>
            <button
              className={primaryButton}
              onClick={() => submitMutation.mutate()}
              disabled={isBusy}
            >
              <FileCheck2 size={16} /> Soumettre
            </button>
          </div>
        </div>

        {(error || message) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
              error
                ? "bg-red-50 text-red-700 ring-red-100"
                : "bg-green-50 text-green-700 ring-green-100"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  activeTab === id
                    ? "bg-gray-950 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className={panelClass}>
              <h2 className="text-lg font-semibold text-gray-900">
                Synthèse du dossier
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Propriétaire" value={kycCase.ownerName || "—"} />
                <Info label="Code propriétaire" value={kycCase.ownerCode || "—"} />
                <Info label="Niveau KYC" value={String(kycCase.kycLevel ?? "—")} />
                <Info label="Risque" value={String(kycCase.riskLevel || "—")} />
                <Info
                  label="Assigné à"
                  value={
                    kycCase.assignedToEmail ||
                    (kycCase.assignedTo
                      ? `Agent #${kycCase.assignedTo}`
                      : "Non assigné")
                  }
                />
                <Info label="Échéance SLA" value={kycCase.slaDeadline || "—"} />
                <Info
                  label="Documents"
                  value={String(kycCase.documents?.length || 0)}
                />
                <Info
                  label="Exigences manquantes"
                  value={String(missingRequirements.length)}
                />
              </div>
            </section>

            <div className="space-y-6">
              <section className={panelClass}>
                <h2 className="font-semibold text-gray-900">
                  Décision sur le dossier
                </h2>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  rows={3}
                  placeholder="Commentaire ou motif de décision"
                  className={`${inputClass} mt-4 resize-none`}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => approveCaseMutation.mutate()}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Approuver
                  </button>
                  <button
                    onClick={() => rejectCaseMutation.mutate()}
                    disabled={isBusy || !decisionComment.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle size={16} /> Rejeter
                  </button>
                </div>
              </section>

              <section className={panelClass}>
                <h2 className="font-semibold text-gray-900">Assignation</h2>
                <div className="mt-4 grid grid-cols-[120px_1fr] gap-2">
                  <select
                    value={assignMode}
                    onChange={(e) =>
                      setAssignMode(e.target.value as "id" | "email")
                    }
                    className={inputClass}
                  >
                    <option value="id">ID agent</option>
                    <option value="email">Email</option>
                  </select>
                  <input
                    value={assignValue}
                    onChange={(e) => setAssignValue(e.target.value)}
                    className={inputClass}
                    placeholder={
                      assignMode === "id" ? "42" : "agent@elleaose.com"
                    }
                  />
                </div>
                <button
                  className={`${softButton} mt-3 w-full`}
                  disabled={!assignValue.trim() || assignMutation.isPending}
                  onClick={() => assignMutation.mutate()}
                >
                  <UserCheck size={16} /> Assigner
                </button>
              </section>

              <section className={panelClass}>
                <h2 className="font-semibold text-gray-900">Niveau de risque</h2>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as KycRiskLevel)}
                  className={`${inputClass} mt-4`}
                >
                  {riskLevels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
                <input
                  value={riskComment}
                  onChange={(e) => setRiskComment(e.target.value)}
                  className={`${inputClass} mt-2`}
                  placeholder="Justification facultative"
                />
                <button
                  className={`${softButton} mt-3 w-full`}
                  onClick={() => riskMutation.mutate()}
                  disabled={riskMutation.isPending}
                >
                  <ShieldCheck size={16} /> Mettre à jour
                </button>
              </section>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <section className={panelClass}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Documents du dossier
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Sélectionnez les documents puis approuvez ou rejetez le lot.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={
                      selectedDocumentCodes.length === 0 ||
                      approveDocumentsMutation.isPending
                    }
                    onClick={() => approveDocumentsMutation.mutate()}
                  >
                    <CheckCircle2 size={16} /> Approuver la sélection
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={
                      selectedDocumentCodes.length === 0 ||
                      rejectDocumentsMutation.isPending
                    }
                    onClick={() => rejectDocumentsMutation.mutate()}
                  >
                    <XCircle size={16} /> Rejeter la sélection
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {documents.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                    Aucun document dans ce dossier.
                  </div>
                ) : (
                  documents.map((document) => {
                    const documentCode = getDocumentCode(document);
                    const selected = selectedDocumentCodes.includes(documentCode);
                    return (
                      <div
                        key={documentCode}
                        className={`rounded-2xl p-4 ring-1 ${
                          selected
                            ? "bg-primary-50 ring-primary-200"
                            : "bg-gray-50 ring-gray-100"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleDocument(documentCode)}
                              className="mt-1"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900">
                                  {document.documentTypeName ||
                                    document.documentTypeCode ||
                                    document.documentType ||
                                    "Document KYC"}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    statusColor[String(document.status)] ||
                                    "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {document.status}
                                </span>
                              </div>
                              <p className="mt-1 break-all font-mono text-xs text-gray-500">
                                {documentCode}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {document.fileName || "Fichier"} ·{" "}
                                {document.documentNumber || "Numéro non renseigné"}
                              </p>
                            </div>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            {document.previewUrl && (
                              <a
                                href={document.previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={softButton}
                              >
                                <Eye size={15} /> Aperçu
                              </a>
                            )}
                            {document.downloadUrl && (
                              <a
                                href={document.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={softButton}
                              >
                                <Download size={15} /> Télécharger
                              </a>
                            )}
                            <button
                              className={softButton}
                              onClick={() => setReviewDocument(document)}
                            >
                              Revoir
                            </button>
                            <button
                              className={softButton}
                              onClick={() => {
                                setOcrDocumentCode(documentCode);
                                setActiveTab("ocr");
                              }}
                            >
                              <ScanSearch size={15} /> OCR
                            </button>
                          </div>
                        </div>

                        {selected && (
                          <input
                            value={rejectReasons[documentCode] || ""}
                            onChange={(e) =>
                              setRejectReasons((current) => ({
                                ...current,
                                [documentCode]: e.target.value,
                              }))
                            }
                            className={`${inputClass} mt-3`}
                            placeholder="Motif de rejet pour ce document"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="font-semibold text-gray-900">
                Demander une correction
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={correction.documentCode}
                  onChange={(e) =>
                    setCorrection((current) => ({
                      ...current,
                      documentCode: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Document</option>
                  {documents.map((document) => {
                    const documentCode = getDocumentCode(document);
                    return (
                      <option key={documentCode} value={documentCode}>
                        {document.documentTypeName ||
                          document.documentTypeCode ||
                          documentCode}
                      </option>
                    );
                  })}
                </select>
                <input
                  value={correction.correctionNote}
                  onChange={(e) =>
                    setCorrection((current) => ({
                      ...current,
                      correctionNote: e.target.value,
                    }))
                  }
                  className="md:col-span-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  placeholder="Correction demandée"
                />
                <input
                  type="number"
                  min={1}
                  value={correction.deadlineDays}
                  onChange={(e) =>
                    setCorrection((current) => ({
                      ...current,
                      deadlineDays: Number(e.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <button
                className={`${softButton} mt-3`}
                disabled={
                  !correction.documentCode ||
                  !correction.correctionNote.trim() ||
                  correctionMutation.isPending
                }
                onClick={() => correctionMutation.mutate()}
              >
                <AlertCircle size={16} /> Envoyer la demande
              </button>
            </section>
          </div>
        )}

        {activeTab === "requirements" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <section className={panelClass}>
              <h2 className="text-lg font-semibold text-gray-900">
                Toutes les exigences configurées
              </h2>
              <div className="mt-4 space-y-3">
                {requirements.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Aucune exigence configurée.
                  </p>
                ) : (
                  requirements.map((requirement: KycCaseRequirementResponse) => (
                    <div
                      key={requirement.id || requirement.documentTypeCode}
                      className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {requirement.documentTypeName ||
                            requirement.documentTypeCode}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          {requirement.documentTypeCode}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {requirement.required ? "Obligatoire" : "Facultatif"} ·{" "}
                          {requirement.active === false ? "Inactive" : "Active"}
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        onClick={() =>
                          removeRequirementMutation.mutate(
                            requirement.documentTypeCode,
                          )
                        }
                      >
                        <Trash2 size={15} /> Retirer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className={panelClass}>
                <h2 className="font-semibold text-gray-900">
                  Exigences documentaires manquantes
                </h2>
                <div className="mt-4 space-y-2">
                  {missingRequirements.length === 0 ? (
                    <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                      Toutes les exigences sont satisfaites.
                    </div>
                  ) : (
                    missingRequirements.map((requirement) => (
                      <div
                        key={requirement.documentTypeCode}
                        className="rounded-xl bg-orange-50 p-3"
                      >
                        <p className="font-medium text-orange-800">
                          {requirement.documentTypeName ||
                            requirement.documentTypeCode}
                        </p>
                        <p className="mt-1 text-xs text-orange-700">
                          {requirement.status || "PENDING"}
                          {requirement.requiresBackSide
                            ? " · Recto et verso requis"
                            : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className={panelClass}>
                <h2 className="font-semibold text-gray-900">
                  Ajouter une exigence
                </h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={requirementForm.documentTypeCode}
                    onChange={(e) =>
                      setRequirementForm((current) => ({
                        ...current,
                        documentTypeCode: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Code du type, ex. PASSEPORT"
                  />
                  <input
                    value={requirementForm.documentTypeName}
                    onChange={(e) =>
                      setRequirementForm((current) => ({
                        ...current,
                        documentTypeName: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Nom affiché"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={requirementForm.required}
                      onChange={(e) =>
                        setRequirementForm((current) => ({
                          ...current,
                          required: e.target.checked,
                        }))
                      }
                    />
                    Exigence obligatoire
                  </label>
                  <button
                    className={`${primaryButton} w-full`}
                    disabled={
                      !requirementForm.documentTypeCode.trim() ||
                      addRequirementMutation.isPending
                    }
                    onClick={() => addRequirementMutation.mutate()}
                  >
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.5fr]">
            <section className={panelClass}>
              <h2 className="font-semibold text-gray-900">Ajouter une note</h2>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
                className={`${inputClass} mt-4 resize-none`}
                placeholder="Contenu de la note"
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={noteInternal}
                  onChange={(e) => setNoteInternal(e.target.checked)}
                />
                Note interne
              </label>
              <button
                className={`${primaryButton} mt-4 w-full`}
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
              >
                <Plus size={16} /> Ajouter la note
              </button>
            </section>

            <section className={panelClass}>
              <h2 className="font-semibold text-gray-900">Notes du dossier</h2>
              <div className="mt-4 space-y-3">
                {(notesQuery.data || []).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune note.</p>
                ) : (
                  (notesQuery.data || []).map((note) => (
                    <div key={note.id} className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-800">{note.content}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {note.authorName || `Auteur #${note.authorId}`} ·{" "}
                        {note.createdAt}
                        {note.internal ? " · Interne" : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "timeline" && (
          <section className={panelClass}>
            <h2 className="text-lg font-semibold text-gray-900">
              Historique complet
            </h2>
            <div className="mt-5 space-y-4">
              {(timelineQuery.data || []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun événement.</p>
              ) : (
                (timelineQuery.data || []).map((event, index) => (
                  <div
                    key={event.id || `${event.timestamp}-${index}`}
                    className="flex gap-3"
                  >
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.action || event.eventType || "Événement"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {event.actor || event.actorName || "Système"} ·{" "}
                        {event.timestamp || event.occurredAt || "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "expiry" && (
          <section className={panelClass}>
            <h2 className="text-lg font-semibold text-gray-900">
              Statut d'expiration par document
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {(expiryQuery.data || []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun statut d'expiration disponible.
                </p>
              ) : (
                (expiryQuery.data || []).map((item) => (
                  <div
                    key={item.documentCode}
                    className={`rounded-2xl p-4 ring-1 ${
                      item.expired
                        ? "bg-red-50 ring-red-100"
                        : item.daysUntilExpiry <= 30
                          ? "bg-orange-50 ring-orange-100"
                          : "bg-gray-50 ring-gray-100"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      {item.documentType}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {item.documentCode}
                    </p>
                    <p className="mt-3 text-sm text-gray-700">
                      Échéance : {item.expiryDate}
                    </p>
                    <p className="text-sm text-gray-700">
                      {item.expired
                        ? "Document expiré"
                        : `${item.daysUntilExpiry} jour(s) restant(s)`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}


        {activeTab === "ocr" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <section className={panelClass}>
              <div className="flex items-center gap-2">
                <ScanSearch size={19} className="text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Documents disponibles
                </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Sélectionnez un document pour consulter les données extraites.
              </p>

              <div className="mt-5 space-y-2">
                {documents.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                    Aucun document disponible.
                  </div>
                ) : (
                  documents.map((document) => {
                    const documentCode = getDocumentCode(document);
                    const selected = ocrDocumentCode === documentCode;
                    return (
                      <button
                        key={documentCode}
                        type="button"
                        onClick={() => setOcrDocumentCode(documentCode)}
                        className={`w-full rounded-xl p-3 text-left ring-1 transition ${
                          selected
                            ? "bg-primary-50 ring-primary-200"
                            : "bg-gray-50 ring-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        <p className="font-medium text-gray-900">
                          {document.documentTypeName ||
                            document.documentTypeCode ||
                            document.documentType ||
                            "Document KYC"}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-gray-500">
                          {documentCode}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {document.fileName || "Fichier sans nom"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Résultat OCR
                  </h2>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {ocrDocumentCode || "Aucun document sélectionné"}
                  </p>
                </div>
                {ocrDocumentCode && (
                  <button
                    type="button"
                    onClick={() => ocrQuery.refetch()}
                    className={softButton}
                  >
                    <RefreshCw
                      size={15}
                      className={ocrQuery.isFetching ? "animate-spin" : ""}
                    />
                    Actualiser
                  </button>
                )}
              </div>

              {!ocrDocumentCode ? (
                <div className="mt-6 flex min-h-72 items-center justify-center rounded-2xl bg-gray-50 text-center">
                  <div>
                    <ScanSearch
                      size={42}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <p className="text-sm text-gray-500">
                      Choisissez un document pour afficher son OCR.
                    </p>
                  </div>
                </div>
              ) : ocrQuery.isLoading ? (
                <div className="mt-6 flex min-h-72 items-center justify-center">
                  <Loader2 className="animate-spin text-primary-600" />
                </div>
              ) : ocrQuery.isError ? (
                <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-700 ring-1 ring-red-100">
                  Impossible de récupérer le résultat OCR de ce document.
                </div>
              ) : ocrQuery.data ? (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <OcrField
                      label="Prénom extrait"
                      value={(ocrQuery.data as any).extractedFirstName}
                    />
                    <OcrField
                      label="Nom extrait"
                      value={(ocrQuery.data as any).extractedLastName}
                    />
                    <OcrField
                      label="Date de naissance"
                      value={(ocrQuery.data as any).extractedDateOfBirth}
                    />
                    <OcrField
                      label="Nationalité"
                      value={(ocrQuery.data as any).extractedNationality}
                    />
                    <OcrField
                      label="Numéro du document"
                      value={ocrQuery.data.extractedDocumentNumber}
                    />
                    <OcrField
                      label="Date d’expiration"
                      value={ocrQuery.data.extractedExpiryDate}
                    />
                    <OcrField
                      label="Score de confiance"
                      value={
                        ocrQuery.data.confidenceScore !== undefined
                          ? `${Math.round(
                              Number(ocrQuery.data.confidenceScore) <= 1
                                ? Number(ocrQuery.data.confidenceScore) * 100
                                : Number(ocrQuery.data.confidenceScore),
                            )} %`
                          : undefined
                      }
                    />
                    <OcrField
                      label="Traité le"
                      value={(ocrQuery.data as any).processedAt}
                    />
                  </div>

                  {(ocrQuery.data as any).rawOcrJson && (
                    <div className="rounded-2xl bg-gray-950 p-4 text-xs text-gray-100">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold">Données OCR brutes</p>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono">
                        {typeof (ocrQuery.data as any).rawOcrJson === "string"
                          ? (ocrQuery.data as any).rawOcrJson
                          : JSON.stringify(
                              (ocrQuery.data as any).rawOcrJson,
                              null,
                              2,
                            )}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Aucun résultat OCR disponible pour ce document.
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className={panelClass}>
              <h2 className="text-lg font-semibold text-gray-900">
                Upload KYC par un administrateur
              </h2>
              {!kycCase.ownerCode && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Le dossier ne contient pas de code propriétaire public.
                  L'upload est bloqué pour éviter un ownerCode incorrect.
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={uploadForm.documentTypeCode}
                  onChange={(e) =>
                    setUploadForm((current) => ({
                      ...current,
                      documentTypeCode: e.target.value,
                    }))
                  }
                  className={inputClass}
                  disabled={documentTypesQuery.isLoading}
                >
                  <option value="">
                    {documentTypesQuery.isLoading
                      ? "Chargement des types…"
                      : "Sélectionner un type de document"}
                  </option>
                  {availableDocumentTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name} — {type.code}
                    </option>
                  ))}
                </select>
                <select
                  value={uploadForm.side}
                  onChange={(e) =>
                    setUploadForm((current) => ({
                      ...current,
                      side: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="FRONT">Recto</option>
                  <option value="BACK">Verso</option>
                </select>
                <input
                  value={uploadForm.documentNumber}
                  onChange={(e) =>
                    setUploadForm((current) => ({
                      ...current,
                      documentNumber: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Numéro du document"
                />
                <input
                  type="date"
                  value={uploadForm.issueDate}
                  onChange={(e) =>
                    setUploadForm((current) => ({
                      ...current,
                      issueDate: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <input
                  type="date"
                  value={uploadForm.expiryDate}
                  onChange={(e) =>
                    setUploadForm((current) => ({
                      ...current,
                      expiryDate: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className={inputClass}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                />
              </div>
              <button
                className={`${primaryButton} mt-4`}
                disabled={
                  !kycCase.ownerCode ||
                  !uploadFile ||
                  !uploadForm.documentTypeCode.trim() ||
                  uploadMutation.isPending
                }
                onClick={() => uploadMutation.mutate()}
              >
                <Upload size={16} /> Uploader
              </button>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold text-gray-900">
                Compléter les métadonnées
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Sélectionnez un document déjà présent dans ce dossier. Son
                identifiant technique est transmis automatiquement au backend.
              </p>
              <div className="mt-4 space-y-3">
                <select
                  value={selectedDetailsDocumentCode}
                  onChange={(e) => {
                    const documentCode = e.target.value;
                    setSelectedDetailsDocumentCode(documentCode);

                    const selected = documents.find(
                      (document) =>
                        getDocumentCode(document) === documentCode,
                    );

                    setDetailsForm({
                      documentNumber: selected?.documentNumber || "",
                      issueDate: selected?.issueDate || "",
                      expiryDate: selected?.expiryDate || "",
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">Sélectionner un document du dossier</option>
                  {documents.map((document) => {
                    const documentCode = getDocumentCode(document);
                    return (
                      <option
                        key={documentCode}
                        value={documentCode}
                        disabled={!document.id}
                      >
                        {document.documentTypeName ||
                          document.documentTypeCode ||
                          document.documentType ||
                          "Document KYC"}{" "}
                        — {documentCode}
                        {!document.id ? " (ID indisponible)" : ""}
                      </option>
                    );
                  })}
                </select>
                {selectedDetailsDocument && (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm ring-1 ring-gray-100">
                    <p className="font-medium text-gray-900">
                      {selectedDetailsDocument.documentTypeName ||
                        selectedDetailsDocument.documentTypeCode ||
                        selectedDetailsDocument.documentType ||
                        "Document KYC"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {selectedDetailsDocument.documentCode}
                    </p>
                  </div>
                )}

                <input
                  value={detailsForm.documentNumber}
                  onChange={(e) =>
                    setDetailsForm((current) => ({
                      ...current,
                      documentNumber: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Numéro du document"
                />
                <input
                  type="date"
                  value={detailsForm.issueDate}
                  onChange={(e) =>
                    setDetailsForm((current) => ({
                      ...current,
                      issueDate: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <input
                  type="date"
                  value={detailsForm.expiryDate}
                  onChange={(e) =>
                    setDetailsForm((current) => ({
                      ...current,
                      expiryDate: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <button
                  className={`${softButton} w-full`}
                  disabled={
                    !selectedDetailsDocument?.id ||
                    updateDetailsMutation.isPending
                  }
                  onClick={() => updateDetailsMutation.mutate()}
                >
                  Mettre à jour
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

        {reviewDocument && (
          <DocumentReviewModal
            document={reviewDocument}
            onClose={() => setReviewDocument(null)}
            onApprove={(documentCode) =>
              approveSingleDocumentMutation.mutate(documentCode)
            }
            onReject={(documentCode, reason) =>
              rejectSingleDocumentMutation.mutate({ documentCode, reason })
            }
            onRequestCorrection={(
              documentCode,
              correctionNote,
              deadlineDays,
            ) =>
              correctSingleDocumentMutation.mutate({
                documentCode,
                correctionNote,
                deadlineDays,
              })
            }
            isProcessing={
              approveSingleDocumentMutation.isPending ||
              rejectSingleDocumentMutation.isPending ||
              correctSingleDocumentMutation.isPending
            }
            error={error}
          />
        )}
    </AdminLayout>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
      {value}
    </p>
  </div>
);


const OcrField: React.FC<{
  label: string;
  value?: string | number | null;
}> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-2 break-words text-sm font-semibold text-gray-900">
      {value === undefined || value === null || value === "" ? "Non détecté" : value}
    </p>
  </div>
);
