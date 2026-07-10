import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Copy,
  FileArchive,
  FolderTree,
  GitBranch,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Share2,
  Shield,
  Trash2,
  Unlock,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { documentService } from "../../services/document.service";
import type {
  DocumentFolderTreeResponse,
  DocumentPermission,
  DocumentPermissionGranteeType,
  DocumentPermissionTargetType,
  DocumentSpace,
  DocumentWorkflowResponse,
} from "../../services/document.service";

const spaces: DocumentSpace[] = [
  "KYC_SPACE",
  "CONTRACT_SPACE",
  "FINANCIAL_SPACE",
  "ASSET_SPACE",
  "ADMINISTRATIVE",
  "GENERIC",
];

const permissions: DocumentPermission[] = [
  "READ",
  "WRITE",
  "DELETE",
  "SHARE",
  "REVIEW",
];
const granteeTypes: DocumentPermissionGranteeType[] = ["USER", "ROLE", "TEAM"];
const targetTypes: DocumentPermissionTargetType[] = ["DOCUMENT", "FOLDER"];

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

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
    </span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";

const buttonSoft =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

const FolderNode: React.FC<{
  node: DocumentFolderTreeResponse;
  level?: number;
  onPick: (code: string) => void;
}> = ({ node, level = 0, onPick }) => (
  <div>
    <button
      type="button"
      onClick={() => onPick(node.code)}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-50"
      style={{ paddingLeft: 12 + level * 18 }}
    >
      <span className="font-medium text-gray-800">{node.name}</span>
      <span className="font-mono text-xs text-gray-400">{node.code}</span>
    </button>
    {(node.children || []).map((child) => (
      <FolderNode
        key={child.code}
        node={child}
        level={level + 1}
        onPick={onPick}
      />
    ))}
  </div>
);

export const DocumentOperationsHub: React.FC = () => {
  const queryClient = useQueryClient();
  const [space, setSpace] = useState<DocumentSpace>("KYC_SPACE");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [folderForm, setFolderForm] = useState({
    name: "",
    parentCode: "",
    description: "",
  });
  const [documentMove, setDocumentMove] = useState({
    documentCode: "",
    folderCode: "",
  });

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchForm, setBatchForm] = useState({
    ownerType: "MEMBER",
    ownerCode: "",
    documentTypeCode: "",
    folderCode: "",
    titlePrefix: "",
  });
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [workflowForm, setWorkflowForm] = useState({
    name: "",
    description: "",
    step1: "Validation documentaire",
    step2: "Validation conformité",
  });
  const [workflowStart, setWorkflowStart] = useState({
    documentCode: "",
    workflowCode: "",
  });
  const [workflowDocCode, setWorkflowDocCode] = useState("");

  const [shareForm, setShareForm] = useState({
    targetType: "DOCUMENT" as "DOCUMENT" | "FOLDER",
    targetCode: "",
    expiresAt: "",
    allowDownload: true,
    password: "",
    note: "",
  });

  const [permissionForm, setPermissionForm] = useState({
    targetType: "DOCUMENT" as DocumentPermissionTargetType,
    targetCode: "",
    granteeType: "USER" as DocumentPermissionGranteeType,
    granteeId: "",
    permission: "READ" as DocumentPermission,
  });
  const [lockForm, setLockForm] = useState({ documentCode: "", reason: "" });

  const foldersQuery = useQuery({
    queryKey: ["document-folders-roots", space],
    queryFn: () => documentService.getRootFolders({ space }),
  });

  const workflowsQuery = useQuery({
    queryKey: ["document-workflows", space],
    queryFn: () => documentService.getWorkflows({ activeOnly: false }),
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ["document-workflow-pending"],
    queryFn: () => documentService.getMyPendingWorkflowApprovals(),
  });

  const permissionsQuery = useQuery({
    queryKey: [
      "document-permissions",
      permissionForm.targetType,
      permissionForm.targetCode,
    ],
    queryFn: () =>
      documentService.getDocumentPermissions({
        targetType: permissionForm.targetType,
        targetCode: permissionForm.targetCode,
      }),
    enabled: !!permissionForm.targetCode,
  });

  const workflowStatusQuery = useQuery({
    queryKey: ["document-workflow-status", workflowDocCode],
    queryFn: () => documentService.getDocumentWorkflowStatus(workflowDocCode),
    enabled: !!workflowDocCode,
  });

  const sharesQuery = useQuery({
    queryKey: ["document-shares", shareForm.targetCode, shareForm.targetType],
    queryFn: () => documentService.getDocumentShares(shareForm.targetCode),
    enabled: shareForm.targetType === "DOCUMENT" && !!shareForm.targetCode,
  });

  const folders = foldersQuery.data || [];
  const workflows = workflowsQuery.data || [];
  const pendingApprovals = pendingApprovalsQuery.data || [];

  const selectedWorkflow = useMemo(
    () =>
      workflows.find(
        (workflow) => workflow.code === workflowStart.workflowCode,
      ),
    [workflowStart.workflowCode, workflows],
  );

  const success = (text: string) => {
    setMessage(text);
    setError(null);
  };

  const fail = (e: any, fallback: string) => {
    setError(e?.response?.data?.message || e?.message || fallback);
    setMessage(null);
  };

  const createFolderMutation = useMutation({
    mutationFn: () =>
      documentService.createFolder({
        name: folderForm.name,
        space,
        parentCode: folderForm.parentCode || undefined,
        description: folderForm.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-folders-roots"] });
      setFolderForm({ name: "", parentCode: "", description: "" });
      success("Dossier créé avec succès.");
    },
    onError: (e) => fail(e, "Erreur création dossier."),
  });

  const moveDocumentMutation = useMutation({
    mutationFn: () =>
      documentService.moveDocumentToFolder(
        documentMove.documentCode,
        documentMove.folderCode || undefined,
      ),
    onSuccess: () => {
      setDocumentMove({ documentCode: "", folderCode: "" });
      success("Document déplacé.");
    },
    onError: (e) => fail(e, "Erreur déplacement document."),
  });

  const batchUploadMutation = useMutation({
    mutationFn: () =>
      documentService.uploadBatch(batchFiles, {
        ownerType: batchForm.ownerType,
        ownerCode: batchForm.ownerCode,
        documentTypeCode: batchForm.documentTypeCode || undefined,
        folderCode: batchForm.folderCode || undefined,
        titlePrefix: batchForm.titlePrefix || undefined,
      }),
    onSuccess: () => {
      setBatchFiles([]);
      success("Upload multiple terminé.");
    },
    onError: (e) => fail(e, "Erreur upload multiple."),
  });

  const zipMutation = useMutation({
    mutationFn: () => {
      if (!zipFile) throw new Error("Aucun fichier ZIP sélectionné.");
      return documentService.importZip(zipFile, {
        space,
        folderCode: batchForm.folderCode || undefined,
      });
    },
    onSuccess: () => {
      setZipFile(null);
      success("Import ZIP envoyé.");
    },
    onError: (e) => fail(e, "Erreur import ZIP."),
  });

  const createWorkflowMutation = useMutation({
    mutationFn: () =>
      documentService.createWorkflow({
        name: workflowForm.name,
        description: workflowForm.description || undefined,
        workflowType: "SEQUENTIAL",
        space,
        steps: [workflowForm.step1, workflowForm.step2]
          .filter(Boolean)
          .map((stepName, index) => ({
            stepName,
            approverType: "ROLE",
            approverValue: index === 0 ? "DOCUMENT_REVIEWER" : "COMPLIANCE",
            required: true,
          })),
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-workflows"] });
      setWorkflowForm({
        name: "",
        description: "",
        step1: "Validation documentaire",
        step2: "Validation conformité",
      });
      success("Workflow créé.");
    },
    onError: (e) => fail(e, "Erreur création workflow."),
  });

  const startWorkflowMutation = useMutation({
    mutationFn: () =>
      documentService.startDocumentWorkflow(
        workflowStart.documentCode,
        workflowStart.workflowCode,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-workflow-status"] });
      success("Workflow démarré sur le document.");
    },
    onError: (e) => fail(e, "Erreur démarrage workflow."),
  });

  const approveWorkflowMutation = useMutation({
    mutationFn: (documentCode: string) =>
      documentService.approveWorkflowStep(
        documentCode,
        "Validé depuis l'admin",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-workflow-pending"],
      });
      success("Étape workflow approuvée.");
    },
    onError: (e) => fail(e, "Erreur approbation workflow."),
  });

  const rejectWorkflowMutation = useMutation({
    mutationFn: (documentCode: string) =>
      documentService.rejectWorkflowStep(documentCode, "Rejeté depuis l'admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-workflow-pending"],
      });
      success("Étape workflow rejetée.");
    },
    onError: (e) => fail(e, "Erreur rejet workflow."),
  });

  const shareMutation = useMutation({
    mutationFn: () => {
      const payload = {
        expiresInHours: shareForm.expiresAt ? Number(shareForm.expiresAt) : 72,
        allowDownload: shareForm.allowDownload,
        password: shareForm.password || undefined,
      } as any;
      return shareForm.targetType === "DOCUMENT"
        ? documentService.shareDocument(shareForm.targetCode, payload)
        : documentService.shareFolder(shareForm.targetCode, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-shares"] });
      success("Lien de partage créé.");
    },
    onError: (e) => fail(e, "Erreur création partage."),
  });

  const revokeShareMutation = useMutation({
    mutationFn: (token: string) => documentService.revokeShare(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-shares"] });
      success("Partage révoqué.");
    },
    onError: (e) => fail(e, "Erreur révocation partage."),
  });

  const grantPermissionMutation = useMutation({
    mutationFn: () =>
      documentService.grantDocumentPermission({
        targetType: permissionForm.targetType,
        targetCode: permissionForm.targetCode,
        granteeType: permissionForm.granteeType,
        granteeId: Number(permissionForm.granteeId),
        permission: permissionForm.permission,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-permissions"] });
      success("Permission accordée.");
    },
    onError: (e) => fail(e, "Erreur permission."),
  });

  const revokePermissionMutation = useMutation({
    mutationFn: (permission: any) =>
      documentService.revokeDocumentPermission({
        targetType: permission.targetType,
        targetCode: permission.targetCode,
        granteeType: permission.granteeType,
        granteeId: permission.granteeId,
        permission: permission.permission,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-permissions"] });
      success("Permission retirée.");
    },
    onError: (e) => fail(e, "Erreur retrait permission."),
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      documentService.lockDocument(
        lockForm.documentCode,
        lockForm.reason || undefined,
      ),
    onSuccess: () => success("Document verrouillé."),
    onError: (e) => fail(e, "Erreur verrouillage."),
  });

  const unlockMutation = useMutation({
    mutationFn: () => documentService.unlockDocument(lockForm.documentCode),
    onSuccess: () => success("Document déverrouillé."),
    onError: (e) => fail(e, "Erreur déverrouillage."),
  });

  const pending =
    createFolderMutation.isPending ||
    moveDocumentMutation.isPending ||
    batchUploadMutation.isPending ||
    zipMutation.isPending ||
    createWorkflowMutation.isPending ||
    startWorkflowMutation.isPending ||
    shareMutation.isPending ||
    grantPermissionMutation.isPending ||
    lockMutation.isPending ||
    unlockMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Opérations GED avancées
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Workflows, arborescence, import multiple, partage, permissions et
            verrouillage documentaire.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
          <select
            value={space}
            onChange={(e) => setSpace(e.target.value as DocumentSpace)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {spaces.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              foldersQuery.refetch();
              workflowsQuery.refetch();
            }}
            className={buttonSoft}
          >
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-green-50 text-green-700 ring-1 ring-green-100"}`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Dossiers et arborescence"
          description="Créer des dossiers, parcourir l'arbre et déplacer un document."
          icon={FolderTree}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Field label="Nom du dossier">
                <input
                  className={inputClass}
                  value={folderForm.name}
                  onChange={(e) =>
                    setFolderForm({ ...folderForm, name: e.target.value })
                  }
                  placeholder="Contrats signés"
                />
              </Field>
              <Field label="Dossier parent">
                <input
                  className={inputClass}
                  value={folderForm.parentCode}
                  onChange={(e) =>
                    setFolderForm({ ...folderForm, parentCode: e.target.value })
                  }
                  placeholder="Optionnel"
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={folderForm.description}
                  onChange={(e) =>
                    setFolderForm({
                      ...folderForm,
                      description: e.target.value,
                    })
                  }
                />
              </Field>
              <button
                className={buttonPrimary}
                disabled={!folderForm.name || createFolderMutation.isPending}
                onClick={() => createFolderMutation.mutate()}
              >
                {createFolderMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}{" "}
                Créer dossier
              </button>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
              {foldersQuery.isLoading ? (
                <p className="p-4 text-sm text-gray-500">Chargement...</p>
              ) : folders.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  Aucun dossier racine.
                </p>
              ) : (
                folders.map((folder) => (
                  <FolderNode
                    key={folder.code}
                    node={folder}
                    onPick={(code) =>
                      setDocumentMove((prev) => ({ ...prev, folderCode: code }))
                    }
                  />
                ))
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              className={inputClass}
              value={documentMove.documentCode}
              onChange={(e) =>
                setDocumentMove({
                  ...documentMove,
                  documentCode: e.target.value,
                })
              }
              placeholder="Code document à déplacer"
            />
            <input
              className={inputClass}
              value={documentMove.folderCode}
              onChange={(e) =>
                setDocumentMove({ ...documentMove, folderCode: e.target.value })
              }
              placeholder="Code dossier cible"
            />
            <button
              className={buttonSoft}
              disabled={
                !documentMove.documentCode || moveDocumentMutation.isPending
              }
              onClick={() => moveDocumentMutation.mutate()}
            >
              Déplacer
            </button>
          </div>
        </Section>

        <Section
          title="Upload multiple et import ZIP"
          description="Envoyer plusieurs documents ou importer une archive complète."
          icon={UploadCloud}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Propriétaire">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <select
                  className={inputClass}
                  value={batchForm.ownerType}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, ownerType: e.target.value })
                  }
                >
                  <option>MEMBER</option>
                  <option>CUSTOMER</option>
                  <option>BUSINESS</option>
                  <option>CONTRACT</option>
                  <option>ASSET</option>
                </select>
                <input
                  className={inputClass}
                  value={batchForm.ownerCode}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, ownerCode: e.target.value })
                  }
                  placeholder="Code propriétaire"
                />
              </div>
            </Field>
            <Field label="Type / dossier">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  value={batchForm.documentTypeCode}
                  onChange={(e) =>
                    setBatchForm({
                      ...batchForm,
                      documentTypeCode: e.target.value,
                    })
                  }
                  placeholder="Type"
                />
                <input
                  className={inputClass}
                  value={batchForm.folderCode}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, folderCode: e.target.value })
                  }
                  placeholder="Dossier"
                />
              </div>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="file"
              multiple
              className={inputClass}
              onChange={(e) => setBatchFiles(Array.from(e.target.files || []))}
            />
            <button
              className={buttonPrimary}
              disabled={
                !batchFiles.length ||
                !batchForm.ownerCode ||
                batchUploadMutation.isPending
              }
              onClick={() => batchUploadMutation.mutate()}
            >
              Upload multiple
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept=".zip,application/zip"
              className={inputClass}
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            />
            <button
              className={buttonSoft}
              disabled={!zipFile || zipMutation.isPending}
              onClick={() => zipMutation.mutate()}
            >
              <FileArchive size={16} /> Import ZIP
            </button>
          </div>
        </Section>

        <Section
          title="Workflows documentaires"
          description="Créer un workflow, démarrer une validation et traiter les approbations."
          icon={GitBranch}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className={inputClass}
              value={workflowForm.name}
              onChange={(e) =>
                setWorkflowForm({ ...workflowForm, name: e.target.value })
              }
              placeholder="Nom workflow"
            />
            <input
              className={inputClass}
              value={workflowForm.description}
              onChange={(e) =>
                setWorkflowForm({
                  ...workflowForm,
                  description: e.target.value,
                })
              }
              placeholder="Description"
            />
            <input
              className={inputClass}
              value={workflowForm.step1}
              onChange={(e) =>
                setWorkflowForm({ ...workflowForm, step1: e.target.value })
              }
              placeholder="Étape 1"
            />
            <input
              className={inputClass}
              value={workflowForm.step2}
              onChange={(e) =>
                setWorkflowForm({ ...workflowForm, step2: e.target.value })
              }
              placeholder="Étape 2"
            />
          </div>
          <button
            className={`${buttonPrimary} mt-3`}
            disabled={!workflowForm.name || createWorkflowMutation.isPending}
            onClick={() => createWorkflowMutation.mutate()}
          >
            Créer workflow
          </button>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              className={inputClass}
              value={workflowStart.documentCode}
              onChange={(e) =>
                setWorkflowStart({
                  ...workflowStart,
                  documentCode: e.target.value,
                })
              }
              placeholder="Code document"
            />
            <select
              className={inputClass}
              value={workflowStart.workflowCode}
              onChange={(e) =>
                setWorkflowStart({
                  ...workflowStart,
                  workflowCode: e.target.value,
                })
              }
            >
              <option value="">Workflow...</option>
              {workflows.map((workflow: DocumentWorkflowResponse) => (
                <option key={workflow.code} value={workflow.code}>
                  {workflow.name}
                </option>
              ))}
            </select>
            <button
              className={buttonSoft}
              disabled={
                !workflowStart.documentCode ||
                !workflowStart.workflowCode ||
                startWorkflowMutation.isPending
              }
              onClick={() => startWorkflowMutation.mutate()}
            >
              Démarrer
            </button>
          </div>
          {selectedWorkflow && (
            <p className="mt-2 text-xs text-gray-400">
              Workflow sélectionné : {selectedWorkflow.code}
            </p>
          )}

          <div className="mt-5 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                Mes approbations en attente
              </p>
              <button
                className="text-xs text-primary-600"
                onClick={() => pendingApprovalsQuery.refetch()}
              >
                Rafraîchir
              </button>
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune approbation en attente.
              </p>
            ) : (
              pendingApprovals.map((doc: any) => (
                <div
                  key={doc.code}
                  className="mb-2 flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {doc.title}
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      {doc.code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-green-50 p-2 text-green-700"
                      onClick={() => approveWorkflowMutation.mutate(doc.code)}
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      className="rounded-lg bg-red-50 p-2 text-red-700"
                      onClick={() => rejectWorkflowMutation.mutate(doc.code)}
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
            <input
              className={inputClass}
              value={workflowDocCode}
              onChange={(e) => setWorkflowDocCode(e.target.value)}
              placeholder="Voir statut workflow d'un document"
            />
            <button
              className={buttonSoft}
              onClick={() => workflowStatusQuery.refetch()}
              disabled={!workflowDocCode}
            >
              Statut
            </button>
          </div>
          {workflowStatusQuery.data && (
            <pre className="mt-3 max-h-52 overflow-auto rounded-2xl bg-gray-950 p-3 text-xs text-gray-100">
              {JSON.stringify(workflowStatusQuery.data, null, 2)}
            </pre>
          )}
        </Section>

        <Section
          title="Partage et permissions"
          description="Créer des liens publics, révoquer et gérer les droits granulaires."
          icon={Share2}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Cible de partage">
              <div className="grid grid-cols-[130px_1fr] gap-2">
                <select
                  className={inputClass}
                  value={shareForm.targetType}
                  onChange={(e) =>
                    setShareForm({
                      ...shareForm,
                      targetType: e.target.value as any,
                    })
                  }
                >
                  <option value="DOCUMENT">Document</option>
                  <option value="FOLDER">Dossier</option>
                </select>
                <input
                  className={inputClass}
                  value={shareForm.targetCode}
                  onChange={(e) =>
                    setShareForm({ ...shareForm, targetCode: e.target.value })
                  }
                  placeholder="Code cible"
                />
              </div>
            </Field>
            <Field label="Expiration / mot de passe">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={shareForm.expiresAt}
                  onChange={(e) =>
                    setShareForm({ ...shareForm, expiresAt: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  type="password"
                  value={shareForm.password}
                  onChange={(e) =>
                    setShareForm({ ...shareForm, password: e.target.value })
                  }
                  placeholder="Optionnel"
                />
              </div>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={shareForm.allowDownload}
                onChange={(e) =>
                  setShareForm({
                    ...shareForm,
                    allowDownload: e.target.checked,
                  })
                }
              />{" "}
              Autoriser téléchargement
            </label>
            <button
              className={buttonPrimary}
              disabled={!shareForm.targetCode || shareMutation.isPending}
              onClick={() => shareMutation.mutate()}
            >
              <Share2 size={16} /> Créer partage
            </button>
          </div>
          {(sharesQuery.data || []).length > 0 && (
            <div className="mt-4 space-y-2">
              {(sharesQuery.data || []).map((share) => (
                <div
                  key={share.token}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-gray-500">
                      {share.publicUrl || share.token}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expire : {share.expiresAt || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg p-2 text-gray-500 hover:bg-white"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          share.publicUrl || share.token,
                        )
                      }
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      onClick={() => revokeShareMutation.mutate(share.token)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-100 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Shield size={16} /> Permissions granulaires
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                className={inputClass}
                value={permissionForm.targetType}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    targetType: e.target.value as any,
                  })
                }
              >
                {targetTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input
                className={inputClass}
                value={permissionForm.targetCode}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    targetCode: e.target.value,
                  })
                }
                placeholder="Code cible"
              />
              <select
                className={inputClass}
                value={permissionForm.granteeType}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    granteeType: e.target.value as any,
                  })
                }
              >
                {granteeTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input
                className={inputClass}
                value={permissionForm.granteeId}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    granteeId: e.target.value,
                  })
                }
                placeholder="ID"
              />
              <select
                className={inputClass}
                value={permissionForm.permission}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    permission: e.target.value as any,
                  })
                }
              >
                {permissions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              className={`${buttonSoft} mt-3`}
              disabled={
                !permissionForm.targetCode ||
                !permissionForm.granteeId ||
                grantPermissionMutation.isPending
              }
              onClick={() => grantPermissionMutation.mutate()}
            >
              <KeyRound size={16} /> Accorder
            </button>
            {(permissionsQuery.data || []).length > 0 && (
              <div className="mt-3 divide-y divide-gray-100 rounded-xl bg-gray-50">
                {(permissionsQuery.data || []).map((p: any, index) => (
                  <div
                    key={p.id || index}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <span>
                      {p.permission} · {p.granteeType} #{p.granteeId}{" "}
                      {p.granteeEmail ? `· ${p.granteeEmail}` : ""}
                    </span>
                    <button
                      className="text-red-600"
                      onClick={() => revokePermissionMutation.mutate(p)}
                    >
                      Révoquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Verrouillage documentaire"
          description="Empêcher les modifications concurrentes ou sensibles sur un document."
          icon={Lock}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              className={inputClass}
              value={lockForm.documentCode}
              onChange={(e) =>
                setLockForm({ ...lockForm, documentCode: e.target.value })
              }
              placeholder="Code document"
            />
            <input
              className={inputClass}
              value={lockForm.reason}
              onChange={(e) =>
                setLockForm({ ...lockForm, reason: e.target.value })
              }
              placeholder="Motif"
            />
            <button
              className={buttonPrimary}
              disabled={!lockForm.documentCode || lockMutation.isPending}
              onClick={() => lockMutation.mutate()}
            >
              <Lock size={16} /> Verrouiller
            </button>
            <button
              className={buttonSoft}
              disabled={!lockForm.documentCode || unlockMutation.isPending}
              onClick={() => unlockMutation.mutate()}
            >
              <Unlock size={16} /> Déverrouiller
            </button>
          </div>
        </Section>
      </div>

      {pending && (
        <div className="fixed bottom-5 right-5 rounded-2xl bg-gray-950 px-4 py-3 text-sm text-white shadow-xl">
          Traitement en cours...
        </div>
      )}
    </div>
  );
};
