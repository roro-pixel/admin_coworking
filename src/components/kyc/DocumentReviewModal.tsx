import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Download,
  Eye,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { ModalPortal } from "../ui/ModalPortal";
import type { KycDocumentResponse } from "../../services/document.service";

interface DocumentReviewModalProps {
  document: KycDocumentResponse | null;
  onClose: () => void;
  onApprove: (documentCode: string) => void;
  onReject: (documentCode: string, reason: string) => void;
  onRequestCorrection: (
    documentCode: string,
    correctionNote: string,
    deadlineDays: number,
  ) => void;
  isProcessing?: boolean;
  error?: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
  },
  VERIFIED: {
    label: "Vérifié",
    color: "bg-green-100 text-green-700",
  },
  REJECTED: {
    label: "Rejeté",
    color: "bg-red-100 text-red-700",
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-600",
  },
};

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  onClose,
  onApprove,
  onReject,
  onRequestCorrection,
  isProcessing = false,
  error,
}) => {
  const [reason, setReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(7);

  useEffect(() => {
    setReason("");
    setCorrectionNote("");
    setDeadlineDays(7);
  }, [document?.documentCode]);

  if (!document) return null;

  const status = statusConfig[String(document.status)];
  const previewUrl = document.previewUrl;
  const downloadUrl = document.downloadUrl;
  const isPdf = document.mimeType?.includes("pdf");
  const isImage = document.mimeType?.startsWith("image/");

  return (
    <ModalPortal onClose={onClose} size="3xl">
      <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Revue du document
            </h2>
            <p className="mt-1 font-mono text-xs text-gray-500">
              {document.documentCode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {status && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}
              >
                {status.label}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
            <section className="overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {document.documentTypeName ||
                      document.documentTypeCode ||
                      document.documentType ||
                      "Document KYC"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.fileName || "Fichier sans nom"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs text-gray-700 ring-1 ring-gray-200"
                    >
                      <Eye size={14} /> Ouvrir
                    </a>
                  )}
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs text-gray-700 ring-1 ring-gray-200"
                    >
                      <Download size={14} /> Télécharger
                    </a>
                  )}
                </div>
              </div>

              <div className="min-h-80 p-3">
                {previewUrl && isPdf ? (
                  <iframe
                    src={previewUrl}
                    title={document.fileName || document.documentCode}
                    className="h-[520px] w-full rounded-xl bg-white"
                  />
                ) : previewUrl && isImage ? (
                  <img
                    src={previewUrl}
                    alt={document.fileName || document.documentCode}
                    className="mx-auto max-h-[520px] rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex min-h-80 items-center justify-center text-center text-sm text-gray-500">
                    Aucun aperçu intégré disponible.
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <h3 className="font-semibold text-gray-900">Informations</h3>
                <div className="mt-4 space-y-3">
                  <Info
                    label="Type"
                    value={
                      document.documentTypeName ||
                      document.documentTypeCode ||
                      document.documentType ||
                      "—"
                    }
                  />
                  <Info
                    label="Numéro"
                    value={document.documentNumber || "Non renseigné"}
                  />
                  <Info
                    label="Date d’émission"
                    value={document.issueDate || "Non renseignée"}
                  />
                  <Info
                    label="Date d’expiration"
                    value={document.expiryDate || "Non renseignée"}
                  />
                  <Info
                    label="Uploadé par"
                    value={
                      document.uploadedByEmail ||
                      String(document.uploadedBy || "—")
                    }
                  />
                  <Info
                    label="Uploadé le"
                    value={document.uploadedAt || "—"}
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                <h3 className="font-semibold text-gray-900">Décision</h3>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Motif de rejet"
                  className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(document.documentCode)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Approuver
                  </button>

                  <button
                    type="button"
                    onClick={() => onReject(document.documentCode, reason)}
                    disabled={isProcessing || !reason.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Rejeter
                  </button>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                <h3 className="font-semibold text-gray-900">
                  Demander une correction
                </h3>

                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  rows={3}
                  placeholder="Expliquez la correction attendue"
                  className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />

                <input
                  type="number"
                  min={1}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  placeholder="Délai en jours"
                />

                <button
                  type="button"
                  onClick={() =>
                    onRequestCorrection(
                      document.documentCode,
                      correctionNote,
                      deadlineDays,
                    )
                  }
                  disabled={isProcessing || !correctionNote.trim()}
                  className="mt-3 w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Demander la correction
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-gray-900">
      {value}
    </p>
  </div>
);
