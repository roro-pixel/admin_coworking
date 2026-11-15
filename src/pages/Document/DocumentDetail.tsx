import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Database, Download, Eye, FileText, PenLine, RotateCcw, Tag as TagIcon, Trash2, X } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { ActionButton, Detail, Field, IconButton, PageHeader, StatusChip, Tabs, Tag } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocStatusChip } from "../../components/documents/docKit";
import { CATEGORY_LABEL, OWNER_LABEL, SPACE_LABEL, dateTime, dayOnly, formatBytes, isPast, label } from "../../components/documents/docUtils";
import { DocumentAccessLogsPanel } from "./DocumentAccessLogsPanel";

type Tab = "info" | "versions" | "tags" | "metadata" | "signatures" | "logs";

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">{children}</section>;

/**
 * Détail d'un document, affiché à la place de la liste (donc dans la mise en page avec menu et en-tête).
 * Remplace l'ancienne fenêtre modale DocumentDetailModal.
 */
export const DocumentDetailView: React.FC<{ document: DocumentResponse; onBack: () => void }> = ({ document, onBack }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("info");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [newTag, setNewTag] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaValue, setMetaValue] = useState("");
  const [signature, setSignature] = useState({ signerName: "", signerEmail: "", expiresAt: "" });

  const { data: fresh } = useQuery({
    queryKey: ["document-detail", document.code],
    queryFn: () => documentService.getDocument(document.code),
    initialData: document,
  });
  const doc = fresh ?? document;

  const { data: versions = [], isLoading: versionsLoading } = useQuery({ queryKey: ["document-versions", doc.code], queryFn: () => documentService.getDocumentVersions(doc.code), enabled: tab === "versions" });
  const { data: allTags = [] } = useQuery({ queryKey: ["document-tags"], queryFn: () => documentService.getDocumentTags(), enabled: tab === "tags" });
  const { data: metadata = {} } = useQuery({ queryKey: ["document-metadata", doc.code], queryFn: () => documentService.getDocumentMetadata(doc.code), enabled: tab === "metadata" });
  const { data: signatures = [] } = useQuery({ queryKey: ["document-signatures", doc.code], queryFn: () => documentService.getDocumentSignatures(doc.code), enabled: tab === "signatures" });

  const invalidate = () => {
    ["document-detail", "document-versions", "document-metadata", "document-signatures"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k, doc.code] }));
    queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    queryClient.invalidateQueries({ queryKey: ["document-advanced-search"] });
  };
  const onError = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const archive = useMutation({
    mutationFn: () => documentService.archiveDocument(doc.code, archiveReason.trim() || undefined),
    onSuccess: () => {
      toast.success("Document archivé");
      setArchiving(false);
      setArchiveReason("");
      invalidate();
    },
    onError: onError("Archivage impossible"),
  });
  const restore = useMutation({
    mutationFn: (version: number) => documentService.restoreDocumentVersion(doc.code, version),
    onSuccess: invalidate,
  });
  const addTag = useMutation({
    mutationFn: (tag: string) => documentService.addTagToDocument(doc.code, tag),
    onSuccess: () => {
      toast.success("Tag ajouté");
      setNewTag("");
      invalidate();
    },
    onError: onError("Ajout du tag impossible"),
  });
  const removeTag = useMutation({
    mutationFn: (tag: string) => documentService.removeTagFromDocument(doc.code, tag),
    onSuccess: invalidate,
    onError: onError("Retrait du tag impossible"),
  });
  const saveMeta = useMutation({
    mutationFn: () => documentService.updateDocumentMetadata(doc.code, { ...metadata, [metaKey.trim()]: metaValue }),
    onSuccess: () => {
      toast.success("Métadonnée enregistrée");
      setMetaKey("");
      setMetaValue("");
      invalidate();
    },
    onError: onError("Enregistrement impossible"),
  });
  const deleteMeta = useMutation({
    mutationFn: (key: string) => documentService.deleteDocumentMetadataKey(doc.code, key),
    onSuccess: invalidate,
  });
  const createSignature = useMutation({
    mutationFn: () =>
      documentService.createDocumentSignature(doc.code, {
        signerName: signature.signerName.trim(),
        signerEmail: signature.signerEmail || undefined,
        expiresAt: signature.expiresAt || undefined,
      }),
    onSuccess: () => {
      toast.success("Demande de signature créée");
      setSignature({ signerName: "", signerEmail: "", expiresAt: "" });
      invalidate();
    },
    onError: onError("Création de la signature impossible"),
  });

  const download = useMutation({
    mutationFn: async () => saveBlob(await documentService.downloadDocument(doc.code), doc.fileName || doc.code),
    onError: onError("Téléchargement impossible"),
  });
  const preview = useMutation({
    mutationFn: async () => URL.createObjectURL(await documentService.previewDocument(doc.code)),
    onSuccess: setPreviewUrl,
    onError: onError("Aperçu impossible"),
  });
  const togglePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } else preview.mutate();
  };

  const tabs: TabItem<Tab>[] = [
    { id: "info", label: "Informations" },
    { id: "versions", label: "Versions" },
    { id: "tags", label: "Tags", count: doc.tags?.length || undefined },
    { id: "metadata", label: "Métadonnées" },
    { id: "signatures", label: "Signatures" },
    { id: "logs", label: "Accès" },
  ];
  const expired = isPast(doc.expiryDate);
  const metaEntries = Object.entries(metadata ?? {});

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={doc.title}
        subtitle={`${doc.documentTypeName} · ${doc.code}`}
        onBack={onBack}
        backLabel="Retour à la liste"
        badge={<DocStatusChip status={doc.status} />}
      />
      <div className="mb-5">
        <Tabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "info" && (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Propriétaire">{label(OWNER_LABEL, doc.ownerType)}</Detail>
              <Detail label="Code propriétaire" mono>{doc.ownerCode || (doc.ownerId !== undefined ? String(doc.ownerId) : undefined)}</Detail>
              <Detail label="Espace">{doc.space ? label(SPACE_LABEL, doc.space) : undefined}</Detail>
              <Detail label="Catégorie">{doc.category ? label(CATEGORY_LABEL, doc.category) : undefined}</Detail>
              <Detail label="Taille">{doc.fileSize ? formatBytes(doc.fileSize) : undefined}</Detail>
              <Detail label="Type de fichier">{doc.mimeType}</Detail>
              <Detail label="Émission">{doc.issueDate ? dayOnly(doc.issueDate) : undefined}</Detail>
              <Detail label="Expiration">
                {doc.expiryDate ? (
                  <span className="inline-flex items-center gap-2">
                    {dayOnly(doc.expiryDate)}
                    {expired && <StatusChip tone="danger">Expiré</StatusChip>}
                  </span>
                ) : undefined}
              </Detail>
              <Detail label="Version courante">{String(doc.currentVersionNumber ?? "")}</Detail>
              <Detail label="Envoyé le">{doc.uploadedAt ? dateTime(doc.uploadedAt) : undefined}</Detail>
              <Detail label="Description" wide>{doc.description || undefined}</Detail>
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <ActionButton variant="ghost" icon={Eye} pending={preview.isPending} onClick={togglePreview}>
              {previewUrl ? "Masquer l'aperçu" : "Aperçu"}
            </ActionButton>
            <ActionButton variant="ghost" icon={Download} pending={download.isPending} onClick={() => download.mutate()}>
              Télécharger
            </ActionButton>
            <ActionButton variant="ghost" icon={Archive} onClick={() => setArchiving(true)}>
              Archiver
            </ActionButton>
          </div>

          {archiving && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                archive.mutate();
              }}
              className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-5"
            >
              <h4 className="mb-4 text-base font-bold text-gray-950">Archiver ce document</h4>
              <Field label="Motif" hint="Facultatif.">
                <input value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} className={FIELD_SOFT} />
              </Field>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <ActionButton variant="ghost" onClick={() => setArchiving(false)} disabled={archive.isPending}>
                  Annuler
                </ActionButton>
                <ActionButton type="submit" pending={archive.isPending}>
                  Archiver
                </ActionButton>
              </div>
            </form>
          )}

          {previewUrl && <iframe title="Aperçu du document" src={previewUrl} className="h-[70vh] w-full rounded-[1.5rem] bg-white shadow-sm" />}
        </div>
      )}

      {tab === "versions" && (
        <Card>
          {versionsLoading ? (
            <ListSkeleton rows={3} />
          ) : versions.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune version enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.versionNumber} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <FileText size={16} /> Version {v.versionNumber}
                      {v.current && <Tag tone="pink">Courante</Tag>}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {v.fileName || v.originalFileName || "Fichier"} · {dateTime(v.uploadedAt)}
                    </p>
                  </div>
                  <ActionButton
                    variant="ghost"
                    icon={RotateCcw}
                    disabled={v.current}
                    pending={restore.isPending && restore.variables === v.versionNumber}
                    onClick={() =>
                      toast.confirm({
                        message: `Restaurer la version ${v.versionNumber} ?`,
                        detail: "Elle deviendra la version courante du document.",
                        confirmLabel: "Restaurer",
                        pendingLabel: "Restauration",
                        successMessage: "Version restaurée",
                        errorMessage: "Restauration impossible",
                        onConfirm: () => restore.mutateAsync(v.versionNumber),
                      })
                    }
                  >
                    Restaurer
                  </ActionButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "tags" && (
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={newTag} onChange={(e) => setNewTag(e.target.value)} aria-label="Tag" className={FIELD_SOFT}>
              <option value="">Choisir un tag</option>
              {allTags.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} · {t.code}
                </option>
              ))}
            </select>
            <ActionButton icon={TagIcon} pending={addTag.isPending} disabled={!newTag} onClick={() => addTag.mutate(newTag)}>
              Ajouter
            </ActionButton>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(doc.tags ?? []).length === 0 && <p className="text-sm text-gray-400">Aucun tag sur ce document.</p>}
            {(doc.tags ?? []).map((t) => (
              <span key={t.code} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-xs font-semibold text-gray-700">
                {t.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />}
                {t.name || t.code}
                <button type="button" aria-label={`Retirer ${t.name || t.code}`} onClick={() => removeTag.mutate(t.code)} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </Card>
      )}

      {tab === "metadata" && (
        <Card>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={metaKey} onChange={(e) => setMetaKey(e.target.value)} placeholder="Clé" aria-label="Clé" className={FIELD_SOFT} />
            <input value={metaValue} onChange={(e) => setMetaValue(e.target.value)} placeholder="Valeur" aria-label="Valeur" className={FIELD_SOFT} />
            <ActionButton icon={Database} pending={saveMeta.isPending} disabled={!metaKey.trim()} onClick={() => saveMeta.mutate()}>
              Enregistrer
            </ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {metaEntries.length === 0 && <p className="text-sm text-gray-400">Aucune métadonnée.</p>}
            {metaEntries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                <p className="min-w-0 break-words text-sm text-gray-800">
                  <span className="font-semibold">{k}</span> : {String(v)}
                </p>
                <IconButton
                  icon={Trash2}
                  label="Supprimer la métadonnée"
                  tone="danger"
                  pending={deleteMeta.isPending && deleteMeta.variables === k}
                  onClick={() =>
                    toast.confirm({
                      message: `Supprimer la métadonnée « ${k} » ?`,
                      confirmLabel: "Supprimer",
                      pendingLabel: "Suppression",
                      successMessage: "Métadonnée supprimée",
                      errorMessage: "Suppression impossible",
                      onConfirm: () => deleteMeta.mutateAsync(k),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "signatures" && (
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={signature.signerName} onChange={(e) => setSignature({ ...signature, signerName: e.target.value })} placeholder="Nom du signataire" aria-label="Nom du signataire" className={FIELD_SOFT} />
            <input value={signature.signerEmail} onChange={(e) => setSignature({ ...signature, signerEmail: e.target.value })} placeholder="E-mail" aria-label="E-mail" className={FIELD_SOFT} />
            <input type="datetime-local" value={signature.expiresAt} onChange={(e) => setSignature({ ...signature, expiresAt: e.target.value })} aria-label="Expire le" className={FIELD_SOFT} />
            <ActionButton icon={PenLine} pending={createSignature.isPending} disabled={!signature.signerName.trim()} onClick={() => createSignature.mutate()}>
              Créer la demande
            </ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {signatures.length === 0 && <p className="text-sm text-gray-400">Aucune signature demandée.</p>}
            {signatures.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                <p className="min-w-0 truncate text-sm text-gray-800">
                  <span className="font-semibold">{s.signerName}</span> {s.signerEmail ? `· ${s.signerEmail}` : ""}
                </p>
                <StatusChip tone={s.status === "SIGNED" ? "success" : s.status === "EXPIRED" ? "neutral" : "warn"}>{s.status === "SIGNED" ? "Signé" : s.status === "EXPIRED" ? "Expiré" : s.status === "PENDING" ? "En attente" : s.status}</StatusChip>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "logs" && (
        <Card>
          <DocumentAccessLogsPanel documentCode={doc.code} />
        </Card>
      )}
    </div>
  );
};
