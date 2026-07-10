import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { documentService, kycService } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";

const ownerTypes = ["MEMBER", "CUSTOMER", "BUSINESS"];
const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "VERY_HIGH"];
const reviewedStatuses = ["APPROVED", "REJECTED"];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Section: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
    </span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";
const buttonSoft =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50";
const buttonDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

export const KycOperationsHub: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const reviewerId = Number(admin?.id) || 1;

  const [caseCode, setCaseCode] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [kycDocumentId, setKycDocumentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [caseCreateForm, setCaseCreateForm] = useState({
    ownerType: "MEMBER",
    ownerCode: "",
    documentTypeCodes: "",
  });
  const [caseSearchForm, setCaseSearchForm] = useState({
    status: "",
    ownerType: "",
    riskLevel: "",
    pendingReviewOnly: false,
    expiringWithinDays: "",
  });
  const [assignTo, setAssignTo] = useState("");
  const [riskForm, setRiskForm] = useState({ riskLevel: "MEDIUM", note: "" });
  const [noteForm, setNoteForm] = useState({ content: "", internal: true });
  const [requirementForm, setRequirementForm] = useState({
    documentTypeCode: "",
    required: true,
  });
  const [caseDocumentCodes, setCaseDocumentCodes] = useState("");
  const [caseRejectReason, setCaseRejectReason] = useState("");
  const [caseCorrectionNote, setCaseCorrectionNote] = useState("");

  const [reviewedStatus, setReviewedStatus] = useState("APPROVED");
  const [bulkDocs, setBulkDocs] = useState("");
  const [bulkReason, setBulkReason] = useState("");

  const [adminUploadForm, setAdminUploadForm] = useState({
    ownerType: "MEMBER",
    ownerCode: "",
    documentTypeCode: "",
    side: "FRONT",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
  });
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminDetailsForm, setAdminDetailsForm] = useState({
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
  });

  const [ruleForm, setRuleForm] = useState({
    id: "",
    documentTypeCode1: "",
    documentTypeCode2: "",
    fieldToCompare: "documentNumber",
    blocking: true,
    active: true,
  });

  const success = (text: string) => {
    setMessage(text);
    setError(null);
  };
  const fail = (e: any, fallback: string) => {
    setError(e?.response?.data?.message || e?.message || fallback);
    setMessage(null);
  };

  const casesQuery = useQuery({
    queryKey: ["kyc-cases-api-hub", caseSearchForm],
    queryFn: () =>
      kycService.getAllKycCases({
        status: caseSearchForm.status || undefined,
        ownerType: caseSearchForm.ownerType || undefined,
        riskLevel: caseSearchForm.riskLevel || undefined,
        pendingReviewOnly: caseSearchForm.pendingReviewOnly || undefined,
        expiringWithinDays: caseSearchForm.expiringWithinDays
          ? Number(caseSearchForm.expiringWithinDays)
          : undefined,
        size: 10,
      } as any),
  });

  const caseDetailQuery = useQuery({
    queryKey: ["kyc-case-detail-api-hub", caseCode],
    queryFn: () => kycService.getKycCase(caseCode),
    enabled: !!caseCode,
  });
  const missingRequirementsQuery = useQuery({
    queryKey: ["kyc-missing-requirements-api-hub", caseCode],
    queryFn: () => kycService.getKycMissingRequirements(caseCode),
    enabled: !!caseCode,
  });
  const requirementsQuery = useQuery({
    queryKey: ["kyc-case-requirements-api-hub", caseCode],
    queryFn: () => documentService.getKycCaseRequirements(caseCode),
    enabled: !!caseCode,
  });
  const reviewQueueQuery = useQuery({
    queryKey: ["kyc-case-review-queue-api-hub", caseCode],
    queryFn: () => documentService.getKycCaseReviewQueue(caseCode),
    enabled: !!caseCode,
  });
  const timelineQuery = useQuery({
    queryKey: ["kyc-case-timeline-api-hub", caseCode],
    queryFn: () => kycService.getTimeline(caseCode),
    enabled: !!caseCode,
  });
  const notesQuery = useQuery({
    queryKey: ["kyc-case-notes-api-hub", caseCode],
    queryFn: () => kycService.getNotes(caseCode),
    enabled: !!caseCode,
  });
  const expiryQuery = useQuery({
    queryKey: ["kyc-case-expiry-api-hub", caseCode],
    queryFn: () => kycService.getExpiryStatus(caseCode),
    enabled: !!caseCode,
  });

  const documentReviewQueueQuery = useQuery({
    queryKey: ["kyc-doc-review-queue-api-hub"],
    queryFn: () => documentService.getKycDocumentReviewQueue(),
  });
  const reviewedDocsQuery = useQuery({
    queryKey: ["kyc-reviewed-docs-api-hub", reviewedStatus],
    queryFn: () =>
      reviewedStatus === "APPROVED"
        ? documentService.getApprovedKycDocuments()
        : reviewedStatus === "REJECTED"
          ? documentService.getRejectedKycDocuments()
          : documentService.getReviewedKycDocuments(),
  });
  const ocrQuery = useQuery({
    queryKey: ["kyc-ocr-api-hub", documentCode],
    queryFn: () => documentService.getOcrResult(documentCode),
    enabled: !!documentCode,
  });
  const rulesQuery = useQuery({
    queryKey: ["kyc-cross-validation-rules-api-hub"],
    queryFn: () => documentService.getKycCrossValidationRules({ activeOnly: false }),
  });

  const createCaseMutation = useMutation({
    mutationFn: () =>
      kycService.createKycCase({
        ownerType: caseCreateForm.ownerType,
        ownerCode: caseCreateForm.ownerCode,
        documentTypeCodes: caseCreateForm.documentTypeCodes
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      } as any),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["kyc-cases-api-hub"] });
      setCaseCode(data.code);
      success(`Dossier ${data.code} créé/récupéré.`);
    },
    onError: (e) => fail(e, "Erreur création dossier KYC."),
  });

  const submitMutation = useMutation({
    mutationFn: () => kycService.submitKycCase(caseCode),
    onSuccess: () => {
      caseDetailQuery.refetch();
      success("Dossier soumis.");
    },
    onError: (e) => fail(e, "Erreur soumission."),
  });
  const approveMutation = useMutation({
    mutationFn: () => kycService.approveKycCase(caseCode, reviewerId, "Approuvé"),
    onSuccess: () => {
      caseDetailQuery.refetch();
      success("Dossier approuvé.");
    },
    onError: (e) => fail(e, "Erreur approbation."),
  });
  const rejectMutation = useMutation({
    mutationFn: () => kycService.rejectKycCase(caseCode, reviewerId, "Rejeté"),
    onSuccess: () => {
      caseDetailQuery.refetch();
      success("Dossier rejeté.");
    },
    onError: (e) => fail(e, "Erreur rejet."),
  });
  const assignMutation = useMutation({
    mutationFn: () => kycService.assignKycCase(caseCode, Number(assignTo)),
    onSuccess: () => {
      caseDetailQuery.refetch();
      success("Dossier assigné.");
    },
    onError: (e) => fail(e, "Erreur assignation."),
  });
  const riskMutation = useMutation({
    mutationFn: () =>
      kycService.updateRiskLevel(caseCode, riskForm.riskLevel, reviewerId, riskForm.note),
    onSuccess: () => {
      caseDetailQuery.refetch();
      success("Risque mis à jour.");
    },
    onError: (e) => fail(e, "Erreur risque."),
  });
  const addNoteMutation = useMutation({
    mutationFn: () =>
      kycService.addNote(caseCode, {
        content: noteForm.content,
        authorId: reviewerId,
        authorName: admin?.email || "Admin",
        internal: noteForm.internal,
      }),
    onSuccess: () => {
      setNoteForm({ content: "", internal: true });
      notesQuery.refetch();
      success("Note ajoutée.");
    },
    onError: (e) => fail(e, "Erreur note."),
  });
  const addRequirementMutation = useMutation({
    mutationFn: () =>
      documentService.addKycCaseRequirement(caseCode, requirementForm),
    onSuccess: () => {
      requirementsQuery.refetch();
      missingRequirementsQuery.refetch();
      success("Exigence ajoutée.");
    },
    onError: (e) => fail(e, "Erreur exigence."),
  });
  const removeRequirementMutation = useMutation({
    mutationFn: (documentTypeCode: string) =>
      documentService.removeKycCaseRequirement(caseCode, documentTypeCode),
    onSuccess: () => {
      requirementsQuery.refetch();
      missingRequirementsQuery.refetch();
      success("Exigence retirée.");
    },
    onError: (e) => fail(e, "Erreur suppression exigence."),
  });
  const exportMutation = useMutation({
    mutationFn: () => kycService.exportPdf(caseCode),
    onSuccess: (blob) => downloadBlob(blob, `${caseCode || "kyc"}.pdf`),
    onError: (e) => fail(e, "Erreur export PDF."),
  });

  const caseDocCodes = useMemo(
    () =>
      caseDocumentCodes
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [caseDocumentCodes],
  );
  const bulkCaseApproveMutation = useMutation({
    mutationFn: () =>
      documentService.bulkApproveKycCaseDocuments(caseCode, caseDocCodes, reviewerId),
    onSuccess: (data) => {
      reviewQueueQuery.refetch();
      success(`Documents approuvés : ${JSON.stringify(data)}`);
    },
    onError: (e) => fail(e, "Erreur bulk approve dossier."),
  });
  const bulkCaseRejectMutation = useMutation({
    mutationFn: () =>
      documentService.bulkRejectKycCaseDocuments(
        caseCode,
        caseDocCodes.map((documentCode) => ({
          documentCode,
          reason: caseRejectReason || "Rejeté",
        })),
        reviewerId,
      ),
    onSuccess: (data) => {
      reviewQueueQuery.refetch();
      success(`Documents rejetés : ${JSON.stringify(data)}`);
    },
    onError: (e) => fail(e, "Erreur bulk reject dossier."),
  });
  const correctionMutation = useMutation({
    mutationFn: () =>
      documentService.requestKycCaseDocumentCorrection(caseCode, {
        documentCode,
        reviewedBy: reviewerId,
        correctionNote: caseCorrectionNote || "Correction demandée",
        deadlineDays: 7,
      }),
    onSuccess: () => {
      reviewQueueQuery.refetch();
      success("Correction demandée.");
    },
    onError: (e) => fail(e, "Erreur correction."),
  });

  const globalDocCodes = useMemo(
    () =>
      bulkDocs
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [bulkDocs],
  );
  const globalApproveMutation = useMutation({
    mutationFn: () => documentService.bulkApproveDocuments(globalDocCodes, reviewerId),
    onSuccess: (data) => {
      documentReviewQueueQuery.refetch();
      success(`Bulk approve global : ${JSON.stringify(data)}`);
    },
    onError: (e) => fail(e, "Erreur bulk approve global."),
  });
  const globalRejectMutation = useMutation({
    mutationFn: () =>
      documentService.bulkRejectDocuments(
        globalDocCodes.map((documentCode) => ({
          documentCode,
          reason: bulkReason || "Rejeté",
        })),
        reviewerId,
      ),
    onSuccess: (data) => {
      documentReviewQueueQuery.refetch();
      success(`Bulk reject global : ${JSON.stringify(data)}`);
    },
    onError: (e) => fail(e, "Erreur bulk reject global."),
  });
  const globalDisapproveMutation = useMutation({
    mutationFn: () =>
      documentService.bulkRejectDocuments(
        globalDocCodes.map((documentCode) => ({
          documentCode,
          reason: bulkReason || "Désapprouvé",
        })),
        reviewerId,
      ),
    onSuccess: (data) => success(`Bulk disapprove : ${JSON.stringify(data)}`),
    onError: (e) => fail(e, "Erreur bulk disapprove."),
  });

  const uploadAdminMutation = useMutation({
    mutationFn: () => {
      if (!adminFile) throw new Error("Sélectionnez un fichier.");
      return documentService.uploadKycDocumentAsAdmin({
        ...adminUploadForm,
        file: adminFile,
      });
    },
    onSuccess: (data) => {
      setKycDocumentId(String((data as any).id || (data as any).documentCode || ""));
      success("Document KYC uploadé.");
    },
    onError: (e) => fail(e, "Erreur upload admin."),
  });
  const updateAdminDetailsMutation = useMutation({
    mutationFn: () =>
      documentService.updateKycDocumentAdminDetails(kycDocumentId, adminDetailsForm),
    onSuccess: () => success("Métadonnées document mises à jour."),
    onError: (e) => fail(e, "Erreur métadonnées document."),
  });

  const createRuleMutation = useMutation({
    mutationFn: () =>
      documentService.createKycCrossValidationRule({
        documentTypeCode1: ruleForm.documentTypeCode1,
        documentTypeCode2: ruleForm.documentTypeCode2,
        fieldToCompare: ruleForm.fieldToCompare,
        blocking: ruleForm.blocking,
        active: ruleForm.active,
      } as any),
    onSuccess: () => {
      rulesQuery.refetch();
      success("Règle créée.");
    },
    onError: (e) => fail(e, "Erreur règle."),
  });
  const updateRuleMutation = useMutation({
    mutationFn: () =>
      documentService.updateKycCrossValidationRule(Number(ruleForm.id), {
        documentTypeCode1: ruleForm.documentTypeCode1,
        documentTypeCode2: ruleForm.documentTypeCode2,
        fieldToCompare: ruleForm.fieldToCompare,
        blocking: ruleForm.blocking,
        active: ruleForm.active,
      } as any),
    onSuccess: () => {
      rulesQuery.refetch();
      success("Règle modifiée.");
    },
    onError: (e) => fail(e, "Erreur modification règle."),
  });
  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => documentService.deleteKycCrossValidationRule(id),
    onSuccess: () => {
      rulesQuery.refetch();
      success("Règle supprimée.");
    },
    onError: (e) => fail(e, "Erreur suppression règle."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Opérations KYC API</h2>
        <p className="mt-1 text-sm text-gray-500">
          Écran technique pour exposer les nouvelles routes KYC : dossiers, documents,
          exigences, OCR, upload admin et validation croisée.
        </p>
      </div>

      {(message || error) && (
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Dossiers KYC"
          description="Créer, rechercher, assigner, soumettre, approuver/rejeter et exporter un dossier."
          icon={ShieldCheck}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Owner type">
              <select
                value={caseCreateForm.ownerType}
                onChange={(e) =>
                  setCaseCreateForm({ ...caseCreateForm, ownerType: e.target.value })
                }
                className={inputClass}
              >
                {ownerTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Owner code">
              <input
                value={caseCreateForm.ownerCode}
                onChange={(e) =>
                  setCaseCreateForm({ ...caseCreateForm, ownerCode: e.target.value })
                }
                className={inputClass}
                placeholder="MBR-000001"
              />
            </Field>
            <Field label="Types requis CSV">
              <input
                value={caseCreateForm.documentTypeCodes}
                onChange={(e) =>
                  setCaseCreateForm({
                    ...caseCreateForm,
                    documentTypeCodes: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="CNI,NIU"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={buttonPrimary}
              disabled={!caseCreateForm.ownerCode || createCaseMutation.isPending}
              onClick={() => createCaseMutation.mutate()}
            >
              <Plus size={16} /> Créer/récupérer
            </button>
            <button className={buttonSoft} onClick={() => casesQuery.refetch()}>
              <RefreshCw size={16} /> Rafraîchir liste
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={caseSearchForm.status}
              onChange={(e) => setCaseSearchForm({ ...caseSearchForm, status: e.target.value })}
              className={inputClass}
              placeholder="Statut"
            />
            <select
              value={caseSearchForm.ownerType}
              onChange={(e) =>
                setCaseSearchForm({ ...caseSearchForm, ownerType: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Owner</option>
              {ownerTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select
              value={caseSearchForm.riskLevel}
              onChange={(e) =>
                setCaseSearchForm({ ...caseSearchForm, riskLevel: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Risque</option>
              {riskLevels.map((risk) => (
                <option key={risk}>{risk}</option>
              ))}
            </select>
            <input
              value={caseSearchForm.expiringWithinDays}
              onChange={(e) =>
                setCaseSearchForm({ ...caseSearchForm, expiringWithinDays: e.target.value })
              }
              className={inputClass}
              placeholder="Expire dans X jours"
            />
            <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={caseSearchForm.pendingReviewOnly}
                onChange={(e) =>
                  setCaseSearchForm({
                    ...caseSearchForm,
                    pendingReviewOnly: e.target.checked,
                  })
                }
              />
              Revue seule
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {(casesQuery.data?.content || []).slice(0, 5).map((item: any) => (
              <button
                key={item.code}
                className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-left text-sm hover:bg-gray-100"
                onClick={() => setCaseCode(item.code)}
              >
                <span>
                  <span className="font-semibold text-gray-900">{item.code}</span>
                  <span className="ml-2 text-gray-500">{item.ownerType} · {item.ownerCode}</span>
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-600">
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Détail & actions dossier"
          description="Toutes les routes de détail : requirements, timeline, notes, expiry, review queue."
          icon={Eye}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Case code">
              <input
                value={caseCode}
                onChange={(e) => setCaseCode(e.target.value)}
                className={inputClass}
                placeholder="KYC-..."
              />
            </Field>
            <Field label="Assigner à user id">
              <input
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className={inputClass}
                placeholder="12"
              />
            </Field>
            <Field label="Risque">
              <select
                value={riskForm.riskLevel}
                onChange={(e) => setRiskForm({ ...riskForm, riskLevel: e.target.value })}
                className={inputClass}
              >
                {riskLevels.map((risk) => (
                  <option key={risk}>{risk}</option>
                ))}
              </select>
            </Field>
          </div>
          <textarea
            value={riskForm.note}
            onChange={(e) => setRiskForm({ ...riskForm, note: e.target.value })}
            className={`${inputClass} mt-3`}
            rows={2}
            placeholder="Commentaire risque"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={buttonSoft} disabled={!caseCode} onClick={() => caseDetailQuery.refetch()}>
              <Search size={16} /> Charger
            </button>
            <button className={buttonSoft} disabled={!caseCode || !assignTo} onClick={() => assignMutation.mutate()}>
              Assigner
            </button>
            <button className={buttonSoft} disabled={!caseCode} onClick={() => submitMutation.mutate()}>
              Soumettre
            </button>
            <button className={buttonPrimary} disabled={!caseCode} onClick={() => approveMutation.mutate()}>
              <CheckCircle size={16} /> Approuver
            </button>
            <button className={buttonDanger} disabled={!caseCode} onClick={() => rejectMutation.mutate()}>
              <XCircle size={16} /> Rejeter
            </button>
            <button className={buttonSoft} disabled={!caseCode} onClick={() => riskMutation.mutate()}>
              Risque
            </button>
            <button className={buttonSoft} disabled={!caseCode || exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              <Download size={16} /> PDF
            </button>
          </div>

          {caseDetailQuery.isFetching && <Loader2 className="mt-4 animate-spin text-gray-400" />}
          {caseDetailQuery.data && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">{caseDetailQuery.data.code}</p>
              <p className="mt-1 text-gray-500">
                {caseDetailQuery.data.ownerType} · {caseDetailQuery.data.ownerCode} · {caseDetailQuery.data.status}
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Exigences manquantes</p>
              <p className="mt-1 text-xs text-gray-500">
                {(missingRequirementsQuery.data || []).join(", ") || "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Documents à revoir</p>
              <p className="mt-1 text-xs text-gray-500">
                {(reviewQueueQuery.data || []).length} document(s)
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Notes & exigences du dossier"
          description="Ajouter une note interne et gérer les exigences propres à un dossier KYC."
          icon={FileText}
        >
          <textarea
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            className={inputClass}
            rows={3}
            placeholder="Note de revue"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={noteForm.internal}
                onChange={(e) => setNoteForm({ ...noteForm, internal: e.target.checked })}
              />
              Interne
            </label>
            <button className={buttonPrimary} disabled={!caseCode || !noteForm.content} onClick={() => addNoteMutation.mutate()}>
              Ajouter note
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={requirementForm.documentTypeCode}
              onChange={(e) => setRequirementForm({ ...requirementForm, documentTypeCode: e.target.value })}
              className={inputClass}
              placeholder="Document type code"
            />
            <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={requirementForm.required}
                onChange={(e) => setRequirementForm({ ...requirementForm, required: e.target.checked })}
              />
              Obligatoire
            </label>
            <button className={buttonSoft} disabled={!caseCode || !requirementForm.documentTypeCode} onClick={() => addRequirementMutation.mutate()}>
              Ajouter
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {(requirementsQuery.data || []).map((req: any) => (
              <div key={req.documentTypeCode} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                <span>{req.documentTypeName || req.documentTypeCode}</span>
                <button className="text-red-600" onClick={() => removeRequirementMutation.mutate(req.documentTypeCode)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-800">Notes</span> : {(notesQuery.data || []).length}
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-800">Timeline</span> : {(timelineQuery.data || []).length}
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-800">Expirations</span> : {(expiryQuery.data || []).length}
            </div>
          </div>
        </Section>

        <Section
          title="Revue globale des documents KYC"
          description="File globale, documents traités, bulk approve/reject/disapprove et OCR."
          icon={CheckCircle}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Documents CSV">
              <input value={bulkDocs} onChange={(e) => setBulkDocs(e.target.value)} className={inputClass} placeholder="DOC-1,DOC-2" />
            </Field>
            <Field label="Motif rejet">
              <input value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} className={inputClass} placeholder="Motif" />
            </Field>
            <Field label="Documents traités">
              <select value={reviewedStatus} onChange={(e) => setReviewedStatus(e.target.value)} className={inputClass}>
                {reviewedStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={buttonPrimary} disabled={!globalDocCodes.length} onClick={() => globalApproveMutation.mutate()}>Bulk approve</button>
            <button className={buttonDanger} disabled={!globalDocCodes.length} onClick={() => globalRejectMutation.mutate()}>Bulk reject</button>
            <button className={buttonDanger} disabled={!globalDocCodes.length} onClick={() => globalDisapproveMutation.mutate()}>Bulk disapprove</button>
            <button className={buttonSoft} onClick={() => documentReviewQueueQuery.refetch()}>File globale</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">À revoir</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{(documentReviewQueueQuery.data || []).length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Traités</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{(reviewedDocsQuery.data || []).length}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input value={documentCode} onChange={(e) => setDocumentCode(e.target.value)} className={inputClass} placeholder="Document code pour OCR/correction" />
            <button className={buttonSoft} disabled={!documentCode} onClick={() => ocrQuery.refetch()}>
              OCR
            </button>
          </div>
          {ocrQuery.data && (
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-gray-950 p-4 text-xs text-white">
              {JSON.stringify(ocrQuery.data, null, 2)}
            </pre>
          )}
        </Section>

        <Section
          title="Revue documents dans un dossier"
          description="Bulk approve/reject par dossier et demande de correction d'un document précis."
          icon={AlertCircle}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input value={caseDocumentCodes} onChange={(e) => setCaseDocumentCodes(e.target.value)} className={inputClass} placeholder="Document codes CSV" />
            <input value={caseRejectReason} onChange={(e) => setCaseRejectReason(e.target.value)} className={inputClass} placeholder="Motif rejet" />
            <input value={caseCorrectionNote} onChange={(e) => setCaseCorrectionNote(e.target.value)} className={inputClass} placeholder="Note correction" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={buttonPrimary} disabled={!caseCode || !caseDocCodes.length} onClick={() => bulkCaseApproveMutation.mutate()}>Approuver docs dossier</button>
            <button className={buttonDanger} disabled={!caseCode || !caseDocCodes.length} onClick={() => bulkCaseRejectMutation.mutate()}>Rejeter docs dossier</button>
            <button className={buttonSoft} disabled={!caseCode || !documentCode} onClick={() => correctionMutation.mutate()}>Demander correction</button>
          </div>
        </Section>

        <Section
          title="Upload admin KYC"
          description="Upload staff pour un propriétaire et correction des métadonnées d'un document existant."
          icon={Upload}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select value={adminUploadForm.ownerType} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, ownerType: e.target.value })} className={inputClass}>
              {ownerTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <input value={adminUploadForm.ownerCode} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, ownerCode: e.target.value })} className={inputClass} placeholder="Owner code" />
            <input value={adminUploadForm.documentTypeCode} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, documentTypeCode: e.target.value })} className={inputClass} placeholder="Type doc" />
            <select value={adminUploadForm.side} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, side: e.target.value })} className={inputClass}>
              <option>FRONT</option>
              <option>BACK</option>
            </select>
            <input value={adminUploadForm.documentNumber} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, documentNumber: e.target.value })} className={inputClass} placeholder="Numéro" />
            <input type="date" value={adminUploadForm.issueDate} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, issueDate: e.target.value })} className={inputClass} />
            <input type="date" value={adminUploadForm.expiryDate} onChange={(e) => setAdminUploadForm({ ...adminUploadForm, expiryDate: e.target.value })} className={inputClass} />
            <input type="file" onChange={(e) => setAdminFile(e.target.files?.[0] || null)} className={inputClass} />
          </div>
          <button className={`${buttonPrimary} mt-3`} disabled={!adminFile || !adminUploadForm.ownerCode || !adminUploadForm.documentTypeCode} onClick={() => uploadAdminMutation.mutate()}>
            Upload admin
          </button>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input value={kycDocumentId} onChange={(e) => setKycDocumentId(e.target.value)} className={inputClass} placeholder="ID document KYC" />
            <input value={adminDetailsForm.documentNumber} onChange={(e) => setAdminDetailsForm({ ...adminDetailsForm, documentNumber: e.target.value })} className={inputClass} placeholder="Nouveau numéro" />
            <input type="date" value={adminDetailsForm.issueDate} onChange={(e) => setAdminDetailsForm({ ...adminDetailsForm, issueDate: e.target.value })} className={inputClass} />
            <input type="date" value={adminDetailsForm.expiryDate} onChange={(e) => setAdminDetailsForm({ ...adminDetailsForm, expiryDate: e.target.value })} className={inputClass} />
          </div>
          <button className={`${buttonSoft} mt-3`} disabled={!kycDocumentId} onClick={() => updateAdminDetailsMutation.mutate()}>
            Mettre à jour les détails
          </button>
        </Section>

        <Section
          title="Validation croisée KYC"
          description="Configuration des règles comparant les champs entre deux types de documents."
          icon={ShieldCheck}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input value={ruleForm.id} onChange={(e) => setRuleForm({ ...ruleForm, id: e.target.value })} className={inputClass} placeholder="ID modification" />
            <input value={ruleForm.documentTypeCode1} onChange={(e) => setRuleForm({ ...ruleForm, documentTypeCode1: e.target.value })} className={inputClass} placeholder="Doc type 1" />
            <input value={ruleForm.documentTypeCode2} onChange={(e) => setRuleForm({ ...ruleForm, documentTypeCode2: e.target.value })} className={inputClass} placeholder="Doc type 2" />
            <input value={ruleForm.fieldToCompare} onChange={(e) => setRuleForm({ ...ruleForm, fieldToCompare: e.target.value })} className={inputClass} placeholder="Champ" />
            <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <input type="checkbox" checked={ruleForm.blocking} onChange={(e) => setRuleForm({ ...ruleForm, blocking: e.target.checked })} />
              Bloquante
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <input type="checkbox" checked={ruleForm.active} onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={buttonPrimary} onClick={() => createRuleMutation.mutate()}>Créer règle</button>
            <button className={buttonSoft} disabled={!ruleForm.id} onClick={() => updateRuleMutation.mutate()}>Modifier règle</button>
            <button className={buttonDanger} disabled={!ruleForm.id} onClick={() => deleteRuleMutation.mutate(Number(ruleForm.id))}>Supprimer règle</button>
          </div>
          <div className="mt-4 space-y-2">
            {(rulesQuery.data || []).map((rule: any) => (
              <button key={rule.id} className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-left text-sm hover:bg-gray-100" onClick={() => setRuleForm({
                id: String(rule.id),
                documentTypeCode1: rule.documentTypeCode1 || "",
                documentTypeCode2: rule.documentTypeCode2 || "",
                fieldToCompare: rule.fieldToCompare || "",
                blocking: Boolean(rule.blocking),
                active: rule.active !== false,
              })}>
                <span>{rule.documentTypeCode1} ↔ {rule.documentTypeCode2}</span>
                <span className="text-xs text-gray-500">{rule.fieldToCompare}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
};
