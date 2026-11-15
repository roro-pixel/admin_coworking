import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronRight, Copy, FileArchive, FolderPlus, FolderTree, GitBranch, KeyRound, Link2, Lock, LockOpen, Share2, Trash2, UploadCloud, X, XCircle } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentFolderTreeResponse, DocumentPermissionGranteeType, DocumentPermissionResponse, DocumentPermissionTargetType, DocumentShareResponse, DocumentWorkflowResponse } from "../../services/document.service";
import { ActionButton, CheckField, Field, IconButton, ListHeader, StatusChip, Tabs, Tag } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { OWNER_LABEL, OWNER_TYPES, SPACES, SPACE_LABEL, bulkSummary, label, numericOrText } from "../../components/documents/docUtils";

type Tab = "folders" | "import" | "workflows" | "shares" | "permissions" | "locks";

const PERMISSIONS = ["READ", "WRITE", "DELETE", "SHARE", "REVIEW"];
const PERMISSION_LABEL: Record<string, string> = { READ: "Lecture", WRITE: "Écriture", DELETE: "Suppression", SHARE: "Partage", REVIEW: "Revue" };
const GRANTEE_LABEL: Record<string, string> = { USER: "Utilisateur", ROLE: "Rôle", TEAM: "Équipe" };

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">
    <h3 className="text-base font-bold text-gray-950">{title}</h3>
    {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const FolderNode: React.FC<{ node: DocumentFolderTreeResponse; level?: number; current: string; onPick: (code: string) => void }> = ({ node, level = 0, current, onPick }) => (
  <div>
    <button
      type="button"
      onClick={() => onPick(node.code)}
      style={{ paddingLeft: 12 + level * 18 }}
      className={`flex w-full items-center gap-2 rounded-xl py-2 pr-3 text-left text-sm transition ${current === node.code ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_12%,white)] font-semibold text-[color:var(--logo-pink-dark)]" : "text-gray-700 hover:bg-gray-100"}`}
    >
      {level > 0 && <ChevronRight size={12} className="shrink-0 text-gray-300" />}
      <FolderTree size={15} className="shrink-0" />
      <span className="truncate">{node.name}</span>
      <span className="ml-auto shrink-0 font-mono text-xs text-gray-400">{node.code}</span>
    </button>
    {(node.children ?? []).map((c) => (
      <FolderNode key={c.code} node={c} level={level + 1} current={current} onPick={onPick} />
    ))}
  </div>
);

export const DocumentOperationsHub: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("folders");
  const [space, setSpace] = useState("KYC_SPACE");

  const [folderForm, setFolderForm] = useState({ name: "", parentCode: "", description: "" });
  const [move, setMove] = useState({ documentCode: "", folderCode: "" });
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState({ ownerType: "MEMBER", ownerCode: "", documentTypeCode: "", folderCode: "", titlePrefix: "" });
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [wf, setWf] = useState({ name: "", description: "", step1: "Validation documentaire", approver1: "DOCUMENT_REVIEWER", step2: "Validation conformité", approver2: "COMPLIANCE" });
  const [wfStart, setWfStart] = useState({ documentCode: "", workflowCode: "" });
  const [wfDoc, setWfDoc] = useState("");
  const [share, setShare] = useState({ targetType: "DOCUMENT", targetCode: "", expiresInHours: 72, allowDownload: true, password: "" });
  const [lastShare, setLastShare] = useState<DocumentShareResponse | null>(null);
  const [perm, setPerm] = useState({ targetType: "DOCUMENT" as DocumentPermissionTargetType, targetCode: "", granteeType: "USER" as DocumentPermissionGranteeType, granteeId: "", permission: "READ" });
  const [lock, setLock] = useState({ documentCode: "", reason: "" });

  const foldersQuery = useQuery({ queryKey: ["document-folders-roots", space], queryFn: () => documentService.getRootFolders({ space }) });
  const workflowsQuery = useQuery({ queryKey: ["document-workflows", space], queryFn: () => documentService.getWorkflows({ activeOnly: false }) });
  const pendingQuery = useQuery({ queryKey: ["document-workflow-pending"], queryFn: () => documentService.getMyPendingWorkflowApprovals(), enabled: tab === "workflows" });
  const permsQuery = useQuery({
    queryKey: ["document-permissions", perm.targetType, perm.targetCode],
    queryFn: () => documentService.getDocumentPermissions({ targetType: perm.targetType, targetCode: perm.targetCode }),
    enabled: !!perm.targetCode,
  });
  const statusQuery = useQuery({ queryKey: ["document-workflow-status", wfDoc], queryFn: () => documentService.getDocumentWorkflowStatus(wfDoc), enabled: !!wfDoc });
  const sharesQuery = useQuery({
    queryKey: ["document-shares", share.targetCode, share.targetType],
    queryFn: () => documentService.getDocumentShares(share.targetCode),
    enabled: share.targetType === "DOCUMENT" && !!share.targetCode,
  });

  const folders = foldersQuery.data ?? [];
  const workflows = workflowsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const onError = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const createFolder = useMutation({
    mutationFn: () => documentService.createFolder({ name: folderForm.name.trim(), space, parentCode: folderForm.parentCode || undefined, description: folderForm.description || undefined }),
    onSuccess: () => {
      toast.success("Dossier créé");
      queryClient.invalidateQueries({ queryKey: ["document-folders-roots"] });
      setFolderForm({ name: "", parentCode: "", description: "" });
    },
    onError: onError("Création du dossier impossible"),
  });
  const moveDoc = useMutation({
    mutationFn: () => documentService.moveDocumentToFolder(move.documentCode.trim(), move.folderCode || undefined),
    onSuccess: () => {
      toast.success("Document déplacé");
      setMove({ documentCode: "", folderCode: "" });
    },
    onError: onError("Déplacement impossible"),
  });
  const uploadBatch = useMutation({
    mutationFn: () =>
      documentService.uploadBatch(batchFiles, {
        ownerType: batch.ownerType,
        ownerCode: batch.ownerCode.trim(),
        documentTypeCode: batch.documentTypeCode || undefined,
        folderCode: batch.folderCode || undefined,
        titlePrefix: batch.titlePrefix || undefined,
      }),
    onSuccess: (r) => {
      toast.success("Envoi multiple terminé");
      setImportResult(bulkSummary(r));
      setBatchFiles([]);
    },
    onError: onError("Envoi multiple impossible"),
  });
  const importZip = useMutation({
    mutationFn: () => documentService.importZip(zipFile!, { space, folderCode: batch.folderCode || undefined }),
    onSuccess: () => {
      toast.success("Import ZIP envoyé");
      setZipFile(null);
    },
    onError: onError("Import ZIP impossible"),
  });
  const createWorkflow = useMutation({
    mutationFn: () =>
      documentService.createWorkflow({
        name: wf.name.trim(),
        description: wf.description || undefined,
        workflowType: "SEQUENTIAL",
        space,
        steps: [
          { stepName: wf.step1, approverValue: wf.approver1 },
          { stepName: wf.step2, approverValue: wf.approver2 },
        ]
          .filter((s) => s.stepName.trim())
          .map((s) => ({ stepName: s.stepName.trim(), approverType: "ROLE", approverValue: s.approverValue.trim(), required: true })),
      }),
    onSuccess: () => {
      toast.success("Workflow créé");
      queryClient.invalidateQueries({ queryKey: ["document-workflows"] });
      setWf({ ...wf, name: "", description: "" });
    },
    onError: onError("Création du workflow impossible"),
  });
  const startWorkflow = useMutation({
    mutationFn: () => documentService.startDocumentWorkflow(wfStart.documentCode.trim(), wfStart.workflowCode),
    onSuccess: () => {
      toast.success("Workflow démarré");
      queryClient.invalidateQueries({ queryKey: ["document-workflow-status"] });
    },
    onError: onError("Démarrage impossible"),
  });
  const decide = useMutation({
    mutationFn: (v: { code: string; approve: boolean }) => (v.approve ? documentService.approveWorkflowStep(v.code, "Validé depuis l'admin") : documentService.rejectWorkflowStep(v.code, "Rejeté depuis l'admin")),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "Étape approuvée" : "Étape rejetée");
      queryClient.invalidateQueries({ queryKey: ["document-workflow-pending"] });
    },
    onError: onError("Décision impossible"),
  });
  const createShare = useMutation({
    mutationFn: () => {
      const body = { expiresInHours: share.expiresInHours, allowDownload: share.allowDownload, password: share.password || undefined };
      return share.targetType === "DOCUMENT" ? documentService.shareDocument(share.targetCode.trim(), body) : documentService.shareFolder(share.targetCode.trim(), body);
    },
    onSuccess: (r) => {
      toast.success("Lien de partage créé");
      setLastShare(r);
      queryClient.invalidateQueries({ queryKey: ["document-shares"] });
    },
    onError: onError("Création du partage impossible"),
  });
  const revokeShare = useMutation({
    mutationFn: (token: string) => documentService.revokeShare(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document-shares"] }),
  });
  const grant = useMutation({
    mutationFn: () => documentService.grantDocumentPermission({ targetType: perm.targetType, targetCode: perm.targetCode.trim(), granteeType: perm.granteeType, granteeId: numericOrText(perm.granteeId), permission: perm.permission }),
    onSuccess: () => {
      toast.success("Droit accordé");
      queryClient.invalidateQueries({ queryKey: ["document-permissions"] });
      setPerm({ ...perm, granteeId: "" });
    },
    onError: onError("Attribution impossible"),
  });
  const revokePerm = useMutation({
    mutationFn: (p: DocumentPermissionResponse) => documentService.revokeDocumentPermission({ targetType: p.targetType, targetCode: p.targetCode, granteeType: p.granteeType, granteeId: p.granteeId, permission: p.permission }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document-permissions"] }),
  });
  const lockDoc = useMutation({
    mutationFn: () => documentService.lockDocument(lock.documentCode.trim(), lock.reason || undefined),
    onSuccess: () => toast.success("Document verrouillé"),
    onError: onError("Verrouillage impossible"),
  });
  const unlockDoc = useMutation({
    mutationFn: () => documentService.unlockDocument(lock.documentCode.trim()),
    onSuccess: () => toast.success("Document déverrouillé"),
    onError: onError("Déverrouillage impossible"),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };
  const shareLink = (s: DocumentShareResponse) => s.shareUrl || s.publicUrl || s.token;

  const tabs: TabItem<Tab>[] = [
    { id: "folders", label: "Dossiers", icon: FolderTree },
    { id: "import", label: "Import", icon: UploadCloud },
    { id: "workflows", label: "Workflows", icon: GitBranch },
    { id: "shares", label: "Partages", icon: Share2 },
    { id: "permissions", label: "Droits", icon: KeyRound },
    { id: "locks", label: "Verrous", icon: Lock },
  ];

  const text = (value: string, onChange: (v: string) => void, placeholder?: string) => <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD_SOFT} />;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Opérations GED"
        subtitle="Arborescence, import, workflows, partages, droits et verrous"
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Espace">
              <select value={space} onChange={(e) => setSpace(e.target.value)} className={`${FIELD_SOFT} min-w-[12rem] !bg-gray-100`}>
                {SPACES.map((s) => (
                  <option key={s} value={s}>
                    {label(SPACE_LABEL, s)}
                  </option>
                ))}
              </select>
            </Field>
            <RefreshButton
              fetching={foldersQuery.isFetching || workflowsQuery.isFetching}
              onClick={() => {
                foldersQuery.refetch();
                workflowsQuery.refetch();
              }}
            />
          </div>
        }
      />
      <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />

      {tab === "folders" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Nouveau dossier" hint={`Créé dans l'espace ${label(SPACE_LABEL, space).toLowerCase()}.`}>
            <Field label="Nom" required>{text(folderForm.name, (v) => setFolderForm({ ...folderForm, name: v }), "Contrats signés")}</Field>
            <Field label="Code du dossier parent" hint="Facultatif. Cliquez un dossier dans l'arbre pour le choisir ci-dessous.">{text(folderForm.parentCode, (v) => setFolderForm({ ...folderForm, parentCode: v }))}</Field>
            <Field label="Description">
              <textarea value={folderForm.description} onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })} rows={2} className={`${FIELD_SOFT} resize-none`} />
            </Field>
            <ActionButton icon={FolderPlus} pending={createFolder.isPending} disabled={!folderForm.name.trim()} onClick={() => createFolder.mutate()}>
              Créer le dossier
            </ActionButton>
          </Card>
          <Card title="Arborescence" hint="Cliquez un dossier pour le choisir comme cible d'un déplacement.">
            {foldersQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : folders.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun dossier racine dans cet espace.</p>
            ) : (
              <div className="max-h-72 overflow-auto">
                {folders.map((f) => (
                  <FolderNode key={f.code} node={f} current={move.folderCode} onPick={(c) => setMove({ ...move, folderCode: c })} />
                ))}
              </div>
            )}
          </Card>
          <div className="lg:col-span-2">
            <Card title="Déplacer un document">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Code du document">{text(move.documentCode, (v) => setMove({ ...move, documentCode: v }))}</Field>
                <Field label="Code du dossier cible">{text(move.folderCode, (v) => setMove({ ...move, folderCode: v }))}</Field>
                <ActionButton variant="ghost" pending={moveDoc.isPending} disabled={!move.documentCode.trim()} onClick={() => moveDoc.mutate()}>
                  Déplacer
                </ActionButton>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Envoi multiple" hint="Plusieurs fichiers pour un même propriétaire.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Propriétaire">
                <select value={batch.ownerType} onChange={(e) => setBatch({ ...batch, ownerType: e.target.value })} className={FIELD_SOFT}>
                  {OWNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {label(OWNER_LABEL, t)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Code propriétaire" required>{text(batch.ownerCode, (v) => setBatch({ ...batch, ownerCode: v }))}</Field>
              <Field label="Type de document">{text(batch.documentTypeCode, (v) => setBatch({ ...batch, documentTypeCode: v }))}</Field>
              <Field label="Code du dossier">{text(batch.folderCode, (v) => setBatch({ ...batch, folderCode: v }))}</Field>
            </div>
            <Field label="Préfixe de titre">{text(batch.titlePrefix, (v) => setBatch({ ...batch, titlePrefix: v }))}</Field>
            <Field label="Fichiers" required>
              <input type="file" multiple onChange={(e) => setBatchFiles(Array.from(e.target.files ?? []))} className={FIELD_SOFT} />
            </Field>
            <ActionButton icon={UploadCloud} pending={uploadBatch.isPending} disabled={batchFiles.length === 0 || !batch.ownerCode.trim()} onClick={() => uploadBatch.mutate()}>
              Envoyer {batchFiles.length > 0 ? `(${batchFiles.length})` : ""}
            </ActionButton>
            {importResult && <p className="text-sm text-gray-600">{importResult}</p>}
          </Card>
          <Card title="Import d'une archive ZIP" hint={`Importée dans l'espace ${label(SPACE_LABEL, space).toLowerCase()}, dans le dossier indiqué à gauche s'il y en a un.`}>
            <Field label="Archive" required>
              <input type="file" accept=".zip,application/zip" onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} className={FIELD_SOFT} />
            </Field>
            <ActionButton variant="ghost" icon={FileArchive} pending={importZip.isPending} disabled={!zipFile} onClick={() => importZip.mutate()}>
              Importer
            </ActionButton>
          </Card>
        </div>
      )}

      {tab === "workflows" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Nouveau workflow" hint="Validation séquentielle, une étape après l'autre.">
              <Field label="Nom" required>{text(wf.name, (v) => setWf({ ...wf, name: v }))}</Field>
              <Field label="Description">{text(wf.description, (v) => setWf({ ...wf, description: v }))}</Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Étape 1">{text(wf.step1, (v) => setWf({ ...wf, step1: v }))}</Field>
                <Field label="Rôle approbateur 1">{text(wf.approver1, (v) => setWf({ ...wf, approver1: v }))}</Field>
                <Field label="Étape 2">{text(wf.step2, (v) => setWf({ ...wf, step2: v }))}</Field>
                <Field label="Rôle approbateur 2">{text(wf.approver2, (v) => setWf({ ...wf, approver2: v }))}</Field>
              </div>
              <ActionButton pending={createWorkflow.isPending} disabled={!wf.name.trim()} onClick={() => createWorkflow.mutate()}>
                Créer le workflow
              </ActionButton>
            </Card>
            <Card title="Démarrer sur un document">
              <Field label="Code du document">{text(wfStart.documentCode, (v) => setWfStart({ ...wfStart, documentCode: v }))}</Field>
              <Field label="Workflow">
                <select value={wfStart.workflowCode} onChange={(e) => setWfStart({ ...wfStart, workflowCode: e.target.value })} className={FIELD_SOFT}>
                  <option value="">Choisir un workflow</option>
                  {workflows.map((w: DocumentWorkflowResponse) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
              <ActionButton variant="ghost" pending={startWorkflow.isPending} disabled={!wfStart.documentCode.trim() || !wfStart.workflowCode} onClick={() => startWorkflow.mutate()}>
                Démarrer
              </ActionButton>
              <div className="pt-2">
                <Field label="Statut du workflow d'un document">{text(wfDoc, setWfDoc, "Code du document")}</Field>
                {statusQuery.data && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
                    <StatusChip tone="pink">{statusQuery.data.status}</StatusChip>
                    {statusQuery.data.currentStep && <span>Étape en cours : {statusQuery.data.currentStep}</span>}
                  </div>
                )}
              </div>
            </Card>
          </div>
          <Card title="Mes approbations en attente">
            {pendingQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : pending.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune approbation en attente.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((d) => {
                  const code = String(d.documentCode ?? d.code ?? "");
                  return (
                    <div key={code} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{String(d.title ?? d.currentStep ?? "Document")}</p>
                        <p className="font-mono text-xs text-gray-400">{code}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <IconButton icon={CheckCircle2} label="Approuver l'étape" tone="success" pending={decide.isPending && decide.variables?.code === code && decide.variables.approve} onClick={() => decide.mutate({ code, approve: true })} />
                        <IconButton icon={XCircle} label="Rejeter l'étape" tone="danger" pending={decide.isPending && decide.variables?.code === code && !decide.variables.approve} onClick={() => decide.mutate({ code, approve: false })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "shares" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Nouveau lien de partage">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cible">
                <select value={share.targetType} onChange={(e) => setShare({ ...share, targetType: e.target.value })} className={FIELD_SOFT}>
                  <option value="DOCUMENT">Document</option>
                  <option value="FOLDER">Dossier</option>
                </select>
              </Field>
              <Field label="Code de la cible" required>{text(share.targetCode, (v) => setShare({ ...share, targetCode: v }))}</Field>
              <Field label="Validité (heures)">
                <input type="number" min={1} value={share.expiresInHours} onChange={(e) => setShare({ ...share, expiresInHours: Number(e.target.value) || 1 })} className={FIELD_SOFT} />
              </Field>
              <Field label="Mot de passe" hint="Facultatif.">{text(share.password, (v) => setShare({ ...share, password: v }))}</Field>
            </div>
            <CheckField checked={share.allowDownload} onChange={(v) => setShare({ ...share, allowDownload: v })} label="Autoriser le téléchargement" />
            <ActionButton icon={Link2} pending={createShare.isPending} disabled={!share.targetCode.trim()} onClick={() => createShare.mutate()}>
              Créer le lien
            </ActionButton>
            {lastShare && (
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-400">Lien créé</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 break-all font-mono text-xs text-gray-800">{shareLink(lastShare)}</p>
                  <IconButton icon={Copy} label="Copier le lien" onClick={() => copy(shareLink(lastShare))} />
                </div>
              </div>
            )}
          </Card>
          <Card title="Liens du document" hint={share.targetType === "FOLDER" ? "La liste des liens n'est disponible que pour un document." : undefined}>
            {share.targetType !== "DOCUMENT" || !share.targetCode ? (
              <p className="text-sm text-gray-400">Indiquez un code de document pour voir ses liens.</p>
            ) : sharesQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : (sharesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun lien de partage.</p>
            ) : (
              <div className="space-y-2">
                {(sharesQuery.data ?? []).map((s) => (
                  <div key={s.token} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-700">{s.token}</p>
                      <p className="text-xs text-gray-400">
                        {s.accessCount ?? 0} accès{s.expiresAt ? ` · expire le ${new Date(s.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.revoked || s.active === false ? <Tag>Révoqué</Tag> : <StatusChip tone="success">Actif</StatusChip>}
                      <IconButton
                        icon={X}
                        label="Révoquer le lien"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: "Révoquer ce lien de partage ?",
                            detail: "Le lien cessera de fonctionner immédiatement.",
                            confirmLabel: "Révoquer",
                            pendingLabel: "Révocation",
                            successMessage: "Lien révoqué",
                            errorMessage: "Révocation impossible",
                            onConfirm: () => revokeShare.mutateAsync(s.token),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "permissions" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Accorder un droit">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cible">
                <select value={perm.targetType} onChange={(e) => setPerm({ ...perm, targetType: e.target.value })} className={FIELD_SOFT}>
                  <option value="DOCUMENT">Document</option>
                  <option value="FOLDER">Dossier</option>
                </select>
              </Field>
              <Field label="Code de la cible" required>{text(perm.targetCode, (v) => setPerm({ ...perm, targetCode: v }))}</Field>
              <Field label="Bénéficiaire">
                <select value={perm.granteeType} onChange={(e) => setPerm({ ...perm, granteeType: e.target.value })} className={FIELD_SOFT}>
                  {Object.entries(GRANTEE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Identifiant du bénéficiaire" required hint="Numéro pour un utilisateur, code pour un rôle ou une équipe.">{text(perm.granteeId, (v) => setPerm({ ...perm, granteeId: v }))}</Field>
              <Field label="Droit">
                <select value={perm.permission} onChange={(e) => setPerm({ ...perm, permission: e.target.value })} className={FIELD_SOFT}>
                  {PERMISSIONS.map((p) => (
                    <option key={p} value={p}>
                      {PERMISSION_LABEL[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <ActionButton icon={Check} pending={grant.isPending} disabled={!perm.targetCode.trim() || !perm.granteeId.trim()} onClick={() => grant.mutate()}>
              Accorder
            </ActionButton>
          </Card>
          <Card title="Droits sur la cible">
            {!perm.targetCode ? (
              <p className="text-sm text-gray-400">Indiquez un code de cible pour voir ses droits.</p>
            ) : permsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : (permsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun droit accordé.</p>
            ) : (
              <div className="space-y-2">
                {(permsQuery.data ?? []).map((p, i) => (
                  <div key={p.id ?? i} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                    <p className="min-w-0 truncate text-sm text-gray-800">
                      <span className="font-semibold">{GRANTEE_LABEL[p.granteeType] ?? p.granteeType}</span> {p.granteeEmail ?? String(p.granteeId)}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Tag tone="pink">{PERMISSION_LABEL[p.permission] ?? p.permission}</Tag>
                      <IconButton
                        icon={Trash2}
                        label="Retirer le droit"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: "Retirer ce droit ?",
                            confirmLabel: "Retirer",
                            pendingLabel: "Retrait",
                            successMessage: "Droit retiré",
                            errorMessage: "Retrait impossible",
                            onConfirm: () => revokePerm.mutateAsync(p),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "locks" && (
        <div className="max-w-2xl">
          <Card title="Verrouiller ou déverrouiller un document" hint="Un document verrouillé ne peut plus être modifié.">
            <Field label="Code du document" required>{text(lock.documentCode, (v) => setLock({ ...lock, documentCode: v }))}</Field>
            <Field label="Motif" hint="Facultatif, utilisé pour le verrouillage.">{text(lock.reason, (v) => setLock({ ...lock, reason: v }))}</Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ActionButton icon={Lock} pending={lockDoc.isPending} disabled={!lock.documentCode.trim()} onClick={() => lockDoc.mutate()}>
                Verrouiller
              </ActionButton>
              <ActionButton variant="ghost" icon={LockOpen} pending={unlockDoc.isPending} disabled={!lock.documentCode.trim()} onClick={() => unlockDoc.mutate()}>
                Déverrouiller
              </ActionButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
