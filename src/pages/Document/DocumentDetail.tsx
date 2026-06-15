import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Eye,
  Download,
  FileText,
  AlertCircle,
  Archive,
  RotateCcw,
  Tag,
  PenLine,
  Database,
} from "lucide-react";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { DocumentAccessLogsPanel } from "./DocumentAccessLogsPanel";

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentResponse;
}

type Tab = "info" | "versions" | "tags" | "metadata" | "signatures" | "logs";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaValue, setMetaValue] = useState("");
  const [signatureForm, setSignatureForm] = useState({
    signerName: "",
    signerEmail: "",
    expiresAt: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: freshDoc } = useQuery({
    queryKey: ["document-detail", document.code],
    queryFn: () => documentService.getDocument(document.code),
    initialData: document,
    enabled: isOpen,
  });
  const doc = freshDoc || document;
  const { data: versions = [] } = useQuery({
    queryKey: ["document-versions", doc.code],
    queryFn: () => documentService.getDocumentVersions(doc.code),
    enabled: isOpen && activeTab === "versions",
  });
  const { data: allTags = [] } = useQuery({
    queryKey: ["document-tags"],
    queryFn: () => documentService.getDocumentTags(),
    enabled: isOpen && activeTab === "tags",
  });
  const { data: metadata = {} } = useQuery({
    queryKey: ["document-metadata", doc.code],
    queryFn: () => documentService.getDocumentMetadata(doc.code),
    enabled: isOpen && activeTab === "metadata",
  });
  const { data: signatures = [] } = useQuery({
    queryKey: ["document-signatures", doc.code],
    queryFn: () => documentService.getDocumentSignatures(doc.code),
    enabled: isOpen && activeTab === "signatures",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["document-detail", doc.code] });
    queryClient.invalidateQueries({
      queryKey: ["document-versions", doc.code],
    });
    queryClient.invalidateQueries({
      queryKey: ["document-metadata", doc.code],
    });
    queryClient.invalidateQueries({
      queryKey: ["document-signatures", doc.code],
    });
    queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    queryClient.invalidateQueries({ queryKey: ["document-advanced-search"] });
  };

  const archiveMutation = useMutation({
    mutationFn: (reason?: string) =>
      documentService.archiveDocument(doc.code, reason),
    onSuccess: invalidate,
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur archivage"),
  });
  const restoreMutation = useMutation({
    mutationFn: (version: number) =>
      documentService.restoreDocumentVersion(doc.code, version),
    onSuccess: invalidate,
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur restauration"),
  });
  const addTagMutation = useMutation({
    mutationFn: (tag: string) =>
      documentService.addTagToDocument(doc.code, tag),
    onSuccess: () => {
      setNewTag("");
      invalidate();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur ajout tag"),
  });
  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      documentService.removeTagFromDocument(doc.code, tag),
    onSuccess: invalidate,
  });
  const metadataMutation = useMutation({
    mutationFn: () =>
      documentService.updateDocumentMetadata(doc.code, {
        ...metadata,
        [metaKey]: metaValue,
      }),
    onSuccess: () => {
      setMetaKey("");
      setMetaValue("");
      invalidate();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur métadonnée"),
  });
  const deleteMetadataMutation = useMutation({
    mutationFn: (key: string) =>
      documentService.deleteDocumentMetadataKey(doc.code, key),
    onSuccess: invalidate,
  });
  const createSignatureMutation = useMutation({
    mutationFn: () =>
      documentService.createDocumentSignature(doc.code, {
        signerName: signatureForm.signerName,
        signerEmail: signatureForm.signerEmail || undefined,
        expiresAt: signatureForm.expiresAt || undefined,
      }),
    onSuccess: () => {
      setSignatureForm({ signerName: "", signerEmail: "", expiresAt: "" });
      invalidate();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur signature"),
  });

  if (!isOpen) return null;

  const download = async () =>
    downloadBlob(
      await documentService.downloadDocument(doc.code),
      doc.fileName || `${doc.code}`,
    );
  const preview = async () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const blob = await documentService.previewDocument(doc.code);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Informations" },
    { id: "versions", label: "Versions" },
    { id: "tags", label: "Tags" },
    { id: "metadata", label: "Métadonnées" },
    { id: "signatures", label: "Signatures" },
    { id: "logs", label: "Accès" },
  ];

  return (
    <ModalPortal onClose={onClose} size="5xl">
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl z-10">
        <div>
          <h3 className="text-2xl font-bold">Détail du document</h3>
          <p className="text-sm text-gray-500 font-mono">{doc.code}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={24} />
        </button>
      </div>
      <div className="p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === t.id ? "bg-gray-950 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "info" && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                {doc.title}
              </h4>
              <p className="text-base text-gray-500 mt-1">
                {doc.documentTypeName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100">
                {doc.status}
              </span>
              {doc.expiryDate && new Date(doc.expiryDate) < new Date() && (
                <span className="text-sm px-3 py-1.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Expiré
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-xl">
              <Info label="Propriétaire" value={`${doc.ownerType}`} />
              <Info
                label="Code propriétaire"
                value={`${doc.ownerCode || doc.ownerId || "—"}`}
              />
              <Info label="Espace" value={`${doc.space || "—"}`} />
              <Info label="Catégorie" value={`${doc.category || "—"}`} />
              <Info
                label="Taille"
                value={
                  doc.fileSize
                    ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} Mo`
                    : "—"
                }
              />
              <Info label="MIME" value={doc.mimeType || "—"} />
              <Info label="Émission" value={doc.issueDate || "—"} />
              <Info label="Expiration" value={doc.expiryDate || "—"} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={preview}
                className="px-4 py-2 border border-gray-200 rounded-xl flex items-center gap-2"
              >
                <Eye size={16} /> {previewUrl ? "Masquer aperçu" : "Aperçu API"}
              </button>
              <button
                onClick={download}
                className="px-4 py-2 border border-gray-200 rounded-xl flex items-center gap-2"
              >
                <Download size={16} /> Télécharger API
              </button>
              <button
                onClick={() =>
                  archiveMutation.mutate(
                    prompt("Motif d'archivage") || undefined,
                  )
                }
                className="px-4 py-2 border border-orange-200 text-orange-700 rounded-lg flex items-center gap-2"
              >
                <Archive size={16} /> Archiver
              </button>
            </div>
            {previewUrl && (
              <iframe
                title="Aperçu document"
                src={previewUrl}
                className="w-full h-[60vh] border rounded-xl bg-gray-50"
              />
            )}
          </div>
        )}

        {activeTab === "versions" && (
          <div className="divide-y border rounded-xl">
            {versions.map((v) => (
              <div
                key={v.versionNumber}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <FileText size={16} /> Version {v.versionNumber}{" "}
                    {v.current ? "(courante)" : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {v.fileName || v.originalFileName || "—"} · {v.uploadedAt}
                  </p>
                </div>
                <button
                  disabled={v.current}
                  onClick={() => restoreMutation.mutate(v.versionNumber)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm disabled:opacity-40 flex items-center gap-1"
                >
                  <RotateCcw size={14} /> Restaurer
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-white"
              >
                <option value="">Choisir un tag</option>
                {allTags.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} · {t.code}
                  </option>
                ))}
              </select>
              <button
                disabled={!newTag}
                onClick={() => addTagMutation.mutate(newTag)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(doc.tags || []).map((t) => (
                <span
                  key={t.code}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2"
                >
                  <Tag size={13} /> {t.name || t.code}
                  <button
                    onClick={() => removeTagMutation.mutate(t.code)}
                    className="text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "metadata" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={metaKey}
                onChange={(e) => setMetaKey(e.target.value)}
                placeholder="Clé"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <input
                value={metaValue}
                onChange={(e) => setMetaValue(e.target.value)}
                placeholder="Valeur"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <button
                disabled={!metaKey}
                onClick={() => metadataMutation.mutate()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Database size={16} /> Enregistrer
              </button>
            </div>
            <div className="divide-y border rounded-xl">
              {Object.entries(metadata || {}).map(([k, v]) => (
                <div key={k} className="p-3 flex justify-between text-sm">
                  <span>
                    <strong>{k}</strong> : {String(v)}
                  </span>
                  <button
                    onClick={() => deleteMetadataMutation.mutate(k)}
                    className="text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "signatures" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={signatureForm.signerName}
                onChange={(e) =>
                  setSignatureForm({
                    ...signatureForm,
                    signerName: e.target.value,
                  })
                }
                placeholder="Nom signataire"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <input
                value={signatureForm.signerEmail}
                onChange={(e) =>
                  setSignatureForm({
                    ...signatureForm,
                    signerEmail: e.target.value,
                  })
                }
                placeholder="Email"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <input
                type="datetime-local"
                value={signatureForm.expiresAt}
                onChange={(e) =>
                  setSignatureForm({
                    ...signatureForm,
                    expiresAt: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <button
                disabled={!signatureForm.signerName}
                onClick={() => createSignatureMutation.mutate()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <PenLine size={16} /> Créer
              </button>
            </div>
            <div className="divide-y border rounded-xl">
              {signatures.map((s) => (
                <div key={s.id} className="p-3 flex justify-between text-sm">
                  <span>
                    {s.signerName} · {s.signerEmail || "—"}
                  </span>
                  <strong>{s.status}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "logs" && (
          <DocumentAccessLogsPanel documentCode={doc.code} />
        )}
      </div>
    </ModalPortal>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-sm break-words">{value}</p>
  </div>
);
