import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Download, Eye, FileCheck2, FileText, FileX2, History, MessageSquare, Plus, ScanSearch, ShieldCheck, Trash2, Upload, UserCheck, XCircle } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { documentService, kycService } from "../../services/document.service";
import type { KycDocumentResponse, KycRiskLevel } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, CheckField, Detail, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PageHeader, Tabs, Tag, StatusChip } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { DetailsSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { Toaster } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocStatusChip, Fact, KycStatusChip, RiskChip, RowCheck } from "../../components/documents/docKit";
import { KycDocumentReviewPanel } from "../../components/documents/KycDocumentReviewPanel";
import { OWNER_LABEL, RISK_LEVELS, dayOnly, label } from "../../components/documents/docUtils";
import { kycRiskLevelLabels } from "../../services/document.service";

type Tab = "overview" | "documents" | "requirements" | "notes" | "timeline" | "expiry" | "ocr" | "upload";

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">
    <h3 className="text-base font-bold text-gray-950">{title}</h3>
    {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const docName = (d: KycDocumentResponse) => d.documentTypeName || d.documentTypeCode || d.documentType || "Document KYC";
const docCode = (d: KycDocumentResponse) => String(d.documentCode || "");

export const KycCaseDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const reviewerId = Number(admin?.id) || 1;

  const [tab, setTab] = useState<Tab>("overview");
  const [decisionComment, setDecisionComment] = useState("");
  const [assignValue, setAssignValue] = useState("");
  const [assignMode, setAssignMode] = useState<"id" | "email">("id");
  const [riskLevel, setRiskLevel] = useState<string>("MEDIUM");
  const [riskComment, setRiskComment] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [reqForm, setReqForm] = useState({ documentTypeCode: "", documentTypeName: "", required: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [correction, setCorrection] = useState({ documentCode: "", correctionNote: "", deadlineDays: 7 });
  const [ocrCode, setOcrCode] = useState("");
  const [review, setReview] = useState<KycDocumentResponse | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ documentTypeCode: "", side: "FRONT", documentNumber: "", issueDate: "", expiryDate: "" });
  const [detailsCode, setDetailsCode] = useState("");
  const [detailsForm, setDetailsForm] = useState({ documentNumber: "", issueDate: "", expiryDate: "" });

  const caseQuery = useQuery({ queryKey: ["kyc-case-detail", code], queryFn: () => kycService.getKycCase(code!), enabled: !!code });
  const kycCase = caseQuery.data;
  const typesQuery = useQuery({
    queryKey: ["kyc-document-types", kycCase?.ownerType],
    queryFn: () => documentService.getDocumentTypes(String(kycCase!.ownerType), true),
    enabled: !!kycCase?.ownerType,
  });
  const missingQuery = useQuery({ queryKey: ["kyc-case-missing-requirements", code], queryFn: () => kycService.getKycMissingRequirements(code!), enabled: !!code });
  const reqQuery = useQuery({ queryKey: ["kyc-case-requirements", code], queryFn: () => documentService.getKycCaseRequirements(code!), enabled: !!code });
  const queueQuery = useQuery({ queryKey: ["kyc-case-review-queue", code], queryFn: () => documentService.getKycCaseReviewQueue(code!), enabled: !!code });
  const notesQuery = useQuery({ queryKey: ["kyc-case-notes", code], queryFn: () => kycService.getNotes(code!), enabled: !!code });
  const timelineQuery = useQuery({ queryKey: ["kyc-case-timeline", code], queryFn: () => kycService.getTimeline(code!), enabled: !!code });
  const expiryQuery = useQuery({ queryKey: ["kyc-case-expiry", code], queryFn: () => kycService.getExpiryStatus(code!), enabled: !!code });
  const ocrQuery = useQuery({ queryKey: ["kyc-document-ocr", ocrCode], queryFn: () => documentService.getOcrResult(ocrCode), enabled: !!ocrCode });

  const documents = useMemo<KycDocumentResponse[]>(() => {
    const merged = new Map<string, KycDocumentResponse>();
    [...(kycCase?.documents ?? []), ...(queueQuery.data ?? [])].forEach((d) => {
      const c = docCode(d);
      if (c) merged.set(c, d);
    });
    return Array.from(merged.values());
  }, [kycCase?.documents, queueQuery.data]);

  const docTypes = useMemo(
    () => (typesQuery.data ?? []).filter((t) => String(t.category).toUpperCase() === "KYC" || String(t.ownerType ?? "") === String(kycCase?.ownerType ?? "")),
    [typesQuery.data, kycCase?.ownerType],
  );
  const detailsDoc = documents.find((d) => docCode(d) === detailsCode) ?? null;

  const invalidate = () =>
    Promise.all(
      [
        ["kyc-case-detail", code],
        ["kycCases"],
        ["kyc-dashboard"],
        ["kyc-my-queue"],
        ["kyc-case-review-queue", code],
        ["kyc-case-requirements", code],
        ["kyc-case-missing-requirements", code],
        ["kyc-case-notes", code],
        ["kyc-case-timeline", code],
        ["kyc-case-expiry", code],
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  /** Mutation du dossier : rafraîchit les données liées puis confirme par un toast */
  function useCaseMutation<V = void>(fn: (v: V) => Promise<unknown>, ok: string, fail: string, after?: () => void) {
    return useMutation({
      mutationFn: fn,
      onSuccess: async () => {
        await invalidate();
        toast.success(ok);
        after?.();
      },
      onError: (e) => {
        const msg = apiMessage(e, fail);
        setReviewError(msg);
        toast.error(msg);
      },
    });
  }

  const submit = useCaseMutation(() => kycService.submitKycCase(code!), "Dossier soumis pour revue", "Soumission impossible");
  const approveCase = useCaseMutation(() => kycService.approveKycCase(code!, reviewerId, decisionComment || undefined), "Dossier approuvé", "Approbation impossible", () => setDecisionComment(""));
  const rejectCase = useCaseMutation(() => kycService.rejectKycCase(code!, reviewerId, decisionComment.trim()), "Dossier rejeté", "Rejet impossible", () => setDecisionComment(""));
  const assign = useCaseMutation(
    () => kycService.assignKycCase(code!, assignMode === "id" ? { assignedTo: Number(assignValue) } : { email: assignValue.trim() }),
    "Dossier assigné",
    "Assignation impossible",
    () => setAssignValue(""),
  );
  const risk = useCaseMutation(() => kycService.updateRiskLevel(code!, riskLevel as KycRiskLevel, reviewerId, riskComment || undefined), "Niveau de risque mis à jour", "Modification du risque impossible", () => setRiskComment(""));
  const addReq = useCaseMutation(
    () => documentService.addKycCaseRequirement(code!, { documentTypeCode: reqForm.documentTypeCode.trim(), documentTypeName: reqForm.documentTypeName.trim() || undefined, required: reqForm.required }),
    "Exigence ajoutée",
    "Ajout impossible",
    () => setReqForm({ documentTypeCode: "", documentTypeName: "", required: true }),
  );
  const removeReq = useCaseMutation((c: string) => documentService.removeKycCaseRequirement(code!, c), "Exigence retirée", "Retrait impossible");
  const addNote = useCaseMutation(
    () => kycService.addNote(code!, { content: noteContent.trim(), authorId: reviewerId, authorName: admin?.email || "Admin", internal: noteInternal }),
    "Note ajoutée",
    "Ajout de la note impossible",
    () => setNoteContent(""),
  );
  const approveDocs = useCaseMutation(() => documentService.bulkApproveKycCaseDocuments(code!, selected, reviewerId), "Documents approuvés", "Approbation impossible", () => setSelected([]));
  const rejectDocs = useCaseMutation(
    () => documentService.bulkRejectKycCaseDocuments(code!, selected.map((documentCode) => ({ documentCode, reason: rejectReasons[documentCode].trim() })), reviewerId),
    "Documents rejetés",
    "Rejet impossible",
    () => {
      setSelected([]);
      setRejectReasons({});
      setRejecting(false);
    },
  );
  const askCorrection = useCaseMutation(
    () => documentService.requestKycCaseDocumentCorrection(code!, { documentCode: correction.documentCode, reviewedBy: reviewerId, correctionNote: correction.correctionNote.trim(), deadlineDays: correction.deadlineDays }),
    "Demande de correction envoyée",
    "Demande impossible",
    () => setCorrection({ documentCode: "", correctionNote: "", deadlineDays: 7 }),
  );
  const closeReview = () => {
    setReview(null);
    setReviewError(null);
  };
  const reviewApprove = useCaseMutation((c: string) => documentService.bulkApproveKycCaseDocuments(code!, [c], reviewerId), "Document approuvé", "Approbation impossible", closeReview);
  const reviewReject = useCaseMutation((v: { documentCode: string; reason: string }) => documentService.bulkRejectKycCaseDocuments(code!, [v], reviewerId), "Document rejeté", "Rejet impossible", closeReview);
  const reviewCorrect = useCaseMutation(
    (v: { documentCode: string; correctionNote: string; deadlineDays: number }) => documentService.requestKycCaseDocumentCorrection(code!, { ...v, reviewedBy: reviewerId }),
    "Demande de correction envoyée",
    "Demande impossible",
    closeReview,
  );
  const upload = useCaseMutation(
    async () => {
      if (!uploadFile || !kycCase?.ownerCode) throw new Error("Fichier ou code propriétaire manquant.");
      const data = await documentService.uploadKycDocumentAsAdmin({
        ownerType: String(kycCase.ownerType),
        ownerCode: kycCase.ownerCode,
        documentTypeCode: uploadForm.documentTypeCode.trim(),
        side: uploadForm.side,
        documentNumber: uploadForm.documentNumber || undefined,
        issueDate: uploadForm.issueDate || undefined,
        expiryDate: uploadForm.expiryDate || undefined,
        file: uploadFile,
      });
      setDetailsCode(data.documentCode || "");
      return data;
    },
    "Document envoyé pour le propriétaire",
    "Envoi impossible",
    () => setUploadFile(null),
  );
  const updateDetails = useCaseMutation(
    async () => {
      if (!detailsDoc?.id) throw new Error("Le document n'a pas d'identifiant technique.");
      return documentService.updateKycDocumentAdminDetails(detailsDoc.id, {
        documentNumber: detailsForm.documentNumber || undefined,
        issueDate: detailsForm.issueDate || undefined,
        expiryDate: detailsForm.expiryDate || undefined,
      });
    },
    "Informations du document mises à jour",
    "Mise à jour impossible",
  );
  const exportPdf = useMutation({
    mutationFn: async () => saveBlob(await kycService.exportPdf(code!, true), `kyc_${code}.pdf`),
    onError: (e) => toast.error(apiMessage(e, "Export impossible")),
  });

  const shell = (children: React.ReactNode) => (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </div>
    </AdminLayout>
  );

  if (!code) return shell(<EmptyState icon={FileX2} title="Code du dossier manquant" />);
  if (caseQuery.isLoading) return shell(<DetailsSkeleton />);
  if (caseQuery.isError || !kycCase) {
    return shell(<EmptyState icon={FileX2} title="Dossier KYC introuvable" hint="Il a peut-être été supprimé, ou le code est incorrect." action={<ActionButton onClick={() => navigate("/documents")}>Retour aux documents</ActionButton>} />);
  }

  const requirements = reqQuery.data ?? [];
  const missing = missingQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const timeline = timelineQuery.data ?? [];
  const expiry = expiryQuery.data ?? [];
  const busy = submit.isPending || approveCase.isPending || rejectCase.isPending;
  const toggle = (c: string) => setSelected((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const tabs: TabItem<Tab>[] = [
    { id: "overview", label: "Vue générale", icon: ShieldCheck },
    { id: "documents", label: "Documents", icon: FileCheck2, count: documents.length },
    { id: "requirements", label: "Exigences", icon: FileText, count: missing.length || undefined },
    { id: "notes", label: "Notes", icon: MessageSquare, count: notes.length || undefined },
    { id: "timeline", label: "Historique", icon: History },
    { id: "expiry", label: "Expiration", icon: CalendarClock },
    { id: "ocr", label: "OCR", icon: ScanSearch },
    { id: "upload", label: "Envoi admin", icon: Upload },
  ];

  const ocr = ocrQuery.data as (typeof ocrQuery.data & Record<string, unknown>) | undefined;
  const score = ocr?.confidenceScore !== undefined ? Math.round(Number(ocr.confidenceScore) <= 1 ? Number(ocr.confidenceScore) * 100 : Number(ocr.confidenceScore)) : undefined;
  const rawOcr = ocr?.rawOcrJson ? (typeof ocr.rawOcrJson === "string" ? ocr.rawOcrJson : JSON.stringify(ocr.rawOcrJson, null, 2)) : undefined;

  return shell(
    <>
      <PageHeader
        title={kycCase.ownerName || "Dossier KYC"}
        onBack={() => navigate(-1)}
        badge={<KycStatusChip status={String(kycCase.status)} />}
        subtitle={
          <span>
            <span className="font-mono">{kycCase.code}</span> · {label(OWNER_LABEL, String(kycCase.ownerType))} · {kycCase.ownerCode || "Code indisponible"}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={caseQuery.isFetching} onClick={() => caseQuery.refetch()} />
            <ActionButton variant="ghost" icon={Download} pending={exportPdf.isPending} onClick={() => exportPdf.mutate()}>
              Export PDF
            </ActionButton>
            <ActionButton icon={FileCheck2} pending={submit.isPending} disabled={busy} onClick={() => submit.mutate()}>
              Soumettre
            </ActionButton>
          </div>
        }
      />

      <div className="mb-5">
        <Tabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <Card title="Synthèse du dossier">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Propriétaire">{kycCase.ownerName}</Detail>
              <Detail label="Code propriétaire" mono>{kycCase.ownerCode}</Detail>
              <Detail label="Niveau KYC">{kycCase.kycLevel !== undefined ? String(kycCase.kycLevel) : undefined}</Detail>
              <Detail label="Risque">{kycCase.riskLevel ? <RiskChip level={String(kycCase.riskLevel)} /> : "Non évalué"}</Detail>
              <Detail label="Assigné à">{kycCase.assignedToEmail || (kycCase.assignedTo ? `Agent #${kycCase.assignedTo}` : "Non assigné")}</Detail>
              <Detail label="Échéance SLA">{kycCase.slaDeadline ? formatDateTime(kycCase.slaDeadline) : "Aucune"}</Detail>
              <Detail label="Documents">{String(kycCase.documents?.length ?? 0)}</Detail>
              <Detail label="Exigences manquantes">{String(missing.length)}</Detail>
              <Detail label="Décision">{kycCase.decisionComment}</Detail>
            </div>
          </Card>

          <Card title="Décision sur le dossier">
            <Field label="Commentaire ou motif" hint="Le motif est obligatoire pour un rejet.">
              <textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} rows={3} className={`${FIELD_SOFT} resize-none`} />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ActionButton icon={CheckCircle2} pending={approveCase.isPending} disabled={busy} onClick={() => approveCase.mutate()}>
                Approuver
              </ActionButton>
              <ActionButton variant="danger" icon={XCircle} pending={rejectCase.isPending} disabled={busy || !decisionComment.trim()} onClick={() => rejectCase.mutate()}>
                Rejeter
              </ActionButton>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Assignation">
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <select value={assignMode} onChange={(e) => setAssignMode(e.target.value as "id" | "email")} className={FIELD_SOFT} aria-label="Mode d'assignation">
                  <option value="id">ID agent</option>
                  <option value="email">E-mail</option>
                </select>
                <input value={assignValue} onChange={(e) => setAssignValue(e.target.value)} placeholder={assignMode === "id" ? "42" : "agent@exemple.com"} className={FIELD_SOFT} aria-label="Agent" />
              </div>
              <ActionButton variant="ghost" icon={UserCheck} pending={assign.isPending} disabled={!assignValue.trim()} onClick={() => assign.mutate()}>
                Assigner
              </ActionButton>
            </Card>
            <Card title="Niveau de risque">
              <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className={FIELD_SOFT} aria-label="Niveau de risque">
                {RISK_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {kycRiskLevelLabels[l] ?? l}
                  </option>
                ))}
              </select>
              <input value={riskComment} onChange={(e) => setRiskComment(e.target.value)} placeholder="Justification facultative" className={FIELD_SOFT} aria-label="Justification" />
              <ActionButton variant="ghost" icon={ShieldCheck} pending={risk.isPending} onClick={() => risk.mutate()}>
                Mettre à jour
              </ActionButton>
            </Card>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-4">
          {review && (
            <KycDocumentReviewPanel
              document={review}
              onClose={closeReview}
              onApprove={(c) => reviewApprove.mutate(c)}
              onReject={(documentCode, reason) => reviewReject.mutate({ documentCode, reason })}
              onRequestCorrection={(documentCode, correctionNote, deadlineDays) => reviewCorrect.mutate({ documentCode, correctionNote, deadlineDays })}
              isProcessing={reviewApprove.isPending || reviewReject.isPending || reviewCorrect.isPending}
              error={reviewError}
            />
          )}

          <Card
            title="Documents du dossier"
            hint="Cochez des documents pour les approuver ou les rejeter en lot."
          >
            {selected.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <ActionButton
                  icon={CheckCircle2}
                  pending={approveDocs.isPending}
                  onClick={() =>
                    toast.confirm({
                      message: `Approuver ${selected.length} document${selected.length > 1 ? "s" : ""} ?`,
                      confirmLabel: "Approuver",
                      pendingLabel: "Approbation",
                      successMessage: "Documents approuvés",
                      errorMessage: "Approbation impossible",
                      onConfirm: () => approveDocs.mutateAsync(),
                    })
                  }
                >
                  Approuver ({selected.length})
                </ActionButton>
                <ActionButton variant="danger" icon={XCircle} onClick={() => setRejecting(true)}>
                  Rejeter ({selected.length})
                </ActionButton>
              </div>
            )}

            {rejecting && selected.length > 0 && (
              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-bold text-gray-950">Motif de rejet par document</p>
                {selected.map((c) => {
                  const d = documents.find((x) => docCode(x) === c);
                  return (
                    <Field key={c} label={d ? `${docName(d)} (${c})` : c} required>
                      <input value={rejectReasons[c] ?? ""} onChange={(e) => setRejectReasons((p) => ({ ...p, [c]: e.target.value }))} className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--logo-pink)]" />
                    </Field>
                  );
                })}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <ActionButton variant="ghost" onClick={() => setRejecting(false)} disabled={rejectDocs.isPending}>
                    Annuler
                  </ActionButton>
                  <ActionButton variant="danger" pending={rejectDocs.isPending} disabled={selected.some((c) => !(rejectReasons[c] ?? "").trim())} onClick={() => rejectDocs.mutate()}>
                    Confirmer le rejet
                  </ActionButton>
                </div>
              </div>
            )}

            {queueQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun document dans ce dossier.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => {
                  const c = docCode(d);
                  return (
                    <div key={c} className={`flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center ${selected.includes(c) ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_10%,white)]" : "bg-gray-50"}`}>
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <RowCheck checked={selected.includes(c)} onChange={() => toggle(c)} name={`Sélectionner ${c}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{docName(d)}</p>
                            <DocStatusChip status={d.status} />
                          </div>
                          <p className="font-mono text-xs text-gray-400">{c}</p>
                          <p className="truncate text-xs text-gray-500">
                            {d.fileName || "Fichier"} · {d.documentNumber || "Numéro non renseigné"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {d.previewUrl && (
                          <a href={d.previewUrl} target="_blank" rel="noreferrer" aria-label="Aperçu" title="Aperçu" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800">
                            <Eye size={16} />
                          </a>
                        )}
                        {d.downloadUrl && (
                          <a href={d.downloadUrl} target="_blank" rel="noreferrer" aria-label="Télécharger" title="Télécharger" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800">
                            <Download size={16} />
                          </a>
                        )}
                        <IconButton icon={ScanSearch} label="Voir l'OCR" onClick={() => { setOcrCode(c); setTab("ocr"); }} />
                        <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setReviewError(null); setReview(d); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          Revoir
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Demander une correction">
            <Field label="Document" required>
              <select value={correction.documentCode} onChange={(e) => setCorrection((p) => ({ ...p, documentCode: e.target.value }))} className={FIELD_SOFT}>
                <option value="">Choisir un document</option>
                {documents.map((d) => (
                  <option key={docCode(d)} value={docCode(d)}>
                    {docName(d)} ({docCode(d)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Correction demandée" required>
              <textarea value={correction.correctionNote} onChange={(e) => setCorrection((p) => ({ ...p, correctionNote: e.target.value }))} rows={3} className={`${FIELD_SOFT} resize-none`} />
            </Field>
            <Field label="Délai (jours)" required>
              <input type="number" min={1} value={correction.deadlineDays} onChange={(e) => setCorrection((p) => ({ ...p, deadlineDays: Number(e.target.value) }))} className={`${FIELD_SOFT} sm:max-w-[10rem]`} />
            </Field>
            <ActionButton variant="ghost" pending={askCorrection.isPending} disabled={!correction.documentCode || !correction.correctionNote.trim() || correction.deadlineDays < 1} onClick={() => askCorrection.mutate()}>
              Envoyer la demande
            </ActionButton>
          </Card>
        </div>
      )}

      {tab === "requirements" && (
        <div className="space-y-4">
          <Card title="Exigences du dossier">
            {reqQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : reqQuery.isError ? (
              <ErrorBlock message="Impossible de charger les exigences." onRetry={() => reqQuery.refetch()} />
            ) : requirements.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune exigence configurée.</p>
            ) : (
              <div className="space-y-2">
                {requirements.map((r) => (
                  <div key={r.id ?? r.documentTypeCode} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.documentTypeName || r.documentTypeCode}</p>
                      <p className="font-mono text-xs text-gray-400">{r.documentTypeCode}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Tag>{r.required ? "Obligatoire" : "Facultatif"}</Tag>
                      {r.active === false && <Tag>Inactive</Tag>}
                      <IconButton
                        icon={Trash2}
                        label="Retirer l'exigence"
                        tone="danger"
                        pending={removeReq.isPending && removeReq.variables === r.documentTypeCode}
                        onClick={() =>
                          toast.confirm({
                            message: `Retirer l'exigence « ${r.documentTypeName || r.documentTypeCode} » ?`,
                            confirmLabel: "Retirer",
                            pendingLabel: "Retrait",
                            successMessage: "Exigence retirée",
                            errorMessage: "Retrait impossible",
                            onConfirm: () => removeReq.mutateAsync(r.documentTypeCode),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Exigences manquantes">
            {missingQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : missing.length === 0 ? (
              <p className="text-sm text-gray-400">Toutes les exigences sont satisfaites.</p>
            ) : (
              <div className="space-y-2">
                {missing.map((r) => (
                  <div key={r.documentTypeCode} className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">{r.documentTypeName || r.documentTypeCode}</p>
                    <p className="text-xs text-amber-700">
                      {r.status || "En attente"}
                      {r.requiresBackSide ? " · Recto et verso requis" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Ajouter une exigence">
            <Field label="Type de document" required>
              <select
                value={reqForm.documentTypeCode}
                onChange={(e) => {
                  const t = docTypes.find((x) => x.code === e.target.value);
                  setReqForm((p) => ({ ...p, documentTypeCode: e.target.value, documentTypeName: t?.name ?? p.documentTypeName }));
                }}
                className={FIELD_SOFT}
              >
                <option value="">Choisir un type</option>
                {docTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nom affiché">
              <input value={reqForm.documentTypeName} onChange={(e) => setReqForm((p) => ({ ...p, documentTypeName: e.target.value }))} className={FIELD_SOFT} />
            </Field>
            <CheckField checked={reqForm.required} onChange={(v) => setReqForm((p) => ({ ...p, required: v }))} label="Exigence obligatoire" />
            <ActionButton icon={Plus} pending={addReq.isPending} disabled={!reqForm.documentTypeCode.trim()} onClick={() => addReq.mutate()}>
              Ajouter
            </ActionButton>
          </Card>
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-4">
          <Card title="Nouvelle note">
            <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} placeholder="Contenu de la note" aria-label="Contenu de la note" className={`${FIELD_SOFT} resize-none`} />
            <CheckField checked={noteInternal} onChange={setNoteInternal} label="Note interne" />
            <ActionButton icon={Plus} pending={addNote.isPending} disabled={!noteContent.trim()} onClick={() => addNote.mutate()}>
              Ajouter la note
            </ActionButton>
          </Card>
          <Card title="Notes du dossier">
            {notesQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune note pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <ItemRow key={n.id} className="!bg-gray-50 !shadow-none">
                    <p className="text-xs text-gray-400">
                      {n.authorName || `Auteur #${n.authorId}`} · {formatDateTime(n.createdAt)}
                      {n.internal ? " · Interne" : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{n.content}</p>
                  </ItemRow>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "timeline" && (
        <Card title="Historique complet">
          {timelineQuery.isLoading ? (
            <ListSkeleton rows={4} />
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun événement enregistré.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((ev, i) => (
                <li key={ev.id ?? `${ev.timestamp}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--logo-pink)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{ev.action || ev.eventType || "Événement"}</p>
                    <p className="text-sm text-gray-600">{ev.description}</p>
                    <p className="text-xs text-gray-400">
                      {ev.actor || ev.actorName || "Système"} · {formatDateTime(ev.timestamp || ev.occurredAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {tab === "expiry" && (
        <Card title="Expiration par document">
          {expiryQuery.isLoading ? (
            <ListSkeleton rows={3} />
          ) : expiry.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun statut d'expiration disponible.</p>
          ) : (
            <div className="space-y-2">
              {expiry.map((e) => (
                <div key={e.documentCode} className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${e.expired ? "bg-red-50" : e.daysUntilExpiry <= 30 ? "bg-amber-50" : "bg-gray-50"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{e.documentType}</p>
                    <p className="font-mono text-xs text-gray-400">{e.documentCode}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500">Échéance {dayOnly(e.expiryDate)}</p>
                    <StatusChip tone={e.expired ? "danger" : e.daysUntilExpiry <= 30 ? "warn" : "success"}>{e.expired ? "Expiré" : `${e.daysUntilExpiry} jour(s)`}</StatusChip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "ocr" && (
        <div className="space-y-4">
          <Card title="Document à analyser" hint="Choisissez un document pour consulter les données extraites.">
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun document disponible.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <button
                    key={docCode(d)}
                    type="button"
                    onClick={() => setOcrCode(docCode(d))}
                    className={`block w-full rounded-2xl p-3 text-left transition ${ocrCode === docCode(d) ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_10%,white)]" : "bg-gray-50 hover:bg-gray-100"}`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{docName(d)}</p>
                    <p className="font-mono text-xs text-gray-400">{docCode(d)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Résultat OCR">
            {!ocrCode ? (
              <p className="text-sm text-gray-400">Aucun document sélectionné.</p>
            ) : ocrQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : ocrQuery.isError ? (
              <ErrorBlock message="Impossible de récupérer le résultat OCR de ce document." onRetry={() => ocrQuery.refetch()} />
            ) : ocr ? (
              <>
                <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2">
                  {[
                    ["Prénom extrait", ocr.extractedFirstName],
                    ["Nom extrait", ocr.extractedLastName],
                    ["Date de naissance", ocr.extractedDateOfBirth],
                    ["Nationalité", ocr.extractedNationality],
                    ["Numéro du document", ocr.extractedDocumentNumber],
                    ["Date d'expiration", ocr.extractedExpiryDate],
                    ["Score de confiance", score !== undefined ? `${score} %` : undefined],
                    ["Traité le", ocr.processedAt ? formatDateTime(String(ocr.processedAt)) : undefined],
                  ]
                    .filter(([, v]) => v !== undefined && v !== null && v !== "")
                    .map(([k, v]) => (
                      <Fact key={String(k)} title={String(k)}>
                        {String(v)}
                      </Fact>
                    ))}
                </div>
                {rawOcr && (
                  <details className="rounded-2xl bg-gray-50 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">Données brutes</summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-600">{rawOcr}</pre>
                  </details>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">Aucun résultat OCR pour ce document.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "upload" && (
        <div className="space-y-4">
          <Card title="Envoi d'un document par un administrateur">
            {!kycCase.ownerCode && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Ce dossier n'a pas de code propriétaire public : l'envoi est bloqué pour éviter un rattachement incorrect.</p>}
            <Field label="Type de document" required>
              <select value={uploadForm.documentTypeCode} onChange={(e) => setUploadForm((p) => ({ ...p, documentTypeCode: e.target.value }))} disabled={typesQuery.isLoading} className={FIELD_SOFT}>
                <option value="">{typesQuery.isLoading ? "Chargement des types" : "Choisir un type"}</option>
                {docTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Face">
                <select value={uploadForm.side} onChange={(e) => setUploadForm((p) => ({ ...p, side: e.target.value }))} className={FIELD_SOFT}>
                  <option value="FRONT">Recto</option>
                  <option value="BACK">Verso</option>
                </select>
              </Field>
              <Field label="Numéro du document">
                <input value={uploadForm.documentNumber} onChange={(e) => setUploadForm((p) => ({ ...p, documentNumber: e.target.value }))} className={FIELD_SOFT} />
              </Field>
              <Field label="Date d'émission">
                <input type="date" value={uploadForm.issueDate} onChange={(e) => setUploadForm((p) => ({ ...p, issueDate: e.target.value }))} className={FIELD_SOFT} />
              </Field>
              <Field label="Date d'expiration">
                <input type="date" value={uploadForm.expiryDate} onChange={(e) => setUploadForm((p) => ({ ...p, expiryDate: e.target.value }))} className={FIELD_SOFT} />
              </Field>
            </div>
            <Field label="Fichier" required>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className={FIELD_SOFT} />
            </Field>
            <ActionButton icon={Upload} pending={upload.isPending} disabled={!kycCase.ownerCode || !uploadFile || !uploadForm.documentTypeCode.trim()} onClick={() => upload.mutate()}>
              Envoyer
            </ActionButton>
          </Card>

          <Card title="Compléter les informations d'un document" hint="Choisissez un document déjà présent dans ce dossier.">
            <Field label="Document">
              <select
                value={detailsCode}
                onChange={(e) => {
                  setDetailsCode(e.target.value);
                  const d = documents.find((x) => docCode(x) === e.target.value);
                  setDetailsForm({ documentNumber: d?.documentNumber || "", issueDate: d?.issueDate || "", expiryDate: d?.expiryDate || "" });
                }}
                className={FIELD_SOFT}
              >
                <option value="">Choisir un document</option>
                {documents.map((d) => (
                  <option key={docCode(d)} value={docCode(d)} disabled={!d.id}>
                    {docName(d)} ({docCode(d)}){!d.id ? " : identifiant indisponible" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Numéro">
                <input value={detailsForm.documentNumber} onChange={(e) => setDetailsForm((p) => ({ ...p, documentNumber: e.target.value }))} className={FIELD_SOFT} />
              </Field>
              <Field label="Émission">
                <input type="date" value={detailsForm.issueDate} onChange={(e) => setDetailsForm((p) => ({ ...p, issueDate: e.target.value }))} className={FIELD_SOFT} />
              </Field>
              <Field label="Expiration">
                <input type="date" value={detailsForm.expiryDate} onChange={(e) => setDetailsForm((p) => ({ ...p, expiryDate: e.target.value }))} className={FIELD_SOFT} />
              </Field>
            </div>
            <ActionButton variant="ghost" pending={updateDetails.isPending} disabled={!detailsDoc?.id} onClick={() => updateDetails.mutate()}>
              Mettre à jour
            </ActionButton>
          </Card>
        </div>
      )}
    </>,
  );
};
