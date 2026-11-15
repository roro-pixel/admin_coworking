import React, { useState } from "react";
import { CheckCircle2, Download, Eye, FileWarning, XCircle } from "lucide-react";
import type { KycDocumentResponse } from "../../services/document.service";
import { ActionButton, ErrorBanner, Field, Tabs } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { Fact } from "./docKit";
import { dayOnly, formatBytes } from "./docUtils";

interface Props {
  document: KycDocumentResponse;
  onClose: () => void;
  onApprove: (documentCode: string) => void;
  onReject: (documentCode: string, reason: string) => void;
  onRequestCorrection: (documentCode: string, note: string, deadlineDays: number) => void;
  isProcessing?: boolean;
  error?: string | null;
}

type Mode = "approve" | "reject" | "correction";

/** Revue d'un document KYC, affichée dans la page */
export const KycDocumentReviewPanel: React.FC<Props> = ({ document: doc, onClose, onApprove, onReject, onRequestCorrection, isProcessing = false, error }) => {
  const [mode, setMode] = useState<Mode>("approve");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const code = doc.documentCode;

  const canSubmit = mode === "approve" || (mode === "reject" && reason.trim() !== "") || (mode === "correction" && note.trim() !== "" && days >= 1);
  const submit = () => {
    if (mode === "approve") onApprove(code);
    else if (mode === "reject") onReject(code, reason.trim());
    else onRequestCorrection(code, note.trim(), days);
  };

  return (
    <section className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-gray-950">{doc.documentTypeName ?? doc.documentTypeCode ?? doc.documentType ?? "Document KYC"}</h4>
          <p className="font-mono text-xs text-gray-400">{code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.previewUrl && (
            <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              <Eye size={16} /> Aperçu
            </a>
          )}
          {doc.downloadUrl && (
            <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              <Download size={16} /> Télécharger
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <Fact title="Fichier">{doc.fileName ?? "Non précisé"}</Fact>
        <Fact title="Taille">{doc.fileSize ? formatBytes(doc.fileSize) : "Non précisée"}</Fact>
        <Fact title="Numéro">{doc.documentNumber ?? "Non renseigné"}</Fact>
        <Fact title="Émission">{doc.issueDate ? dayOnly(doc.issueDate) : "Non renseignée"}</Fact>
        <Fact title="Expiration">{doc.expiryDate ? dayOnly(doc.expiryDate) : "Non renseignée"}</Fact>
        <Fact title="Envoyé le">{doc.uploadedAt ? dayOnly(doc.uploadedAt) : "Inconnu"}</Fact>
      </div>

      <div className="mt-4">
        <Tabs
          variant="soft"
          active={mode}
          onChange={setMode}
          items={[
            { id: "approve", label: "Approuver", icon: CheckCircle2 },
            { id: "reject", label: "Rejeter", icon: XCircle },
            { id: "correction", label: "Demander une correction", icon: FileWarning },
          ]}
        />
      </div>

      <div className="mt-4 space-y-4">
        <ErrorBanner message={error ?? null} />
        {mode === "reject" && (
          <Field label="Motif du rejet" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD} resize-none`} />
          </Field>
        )}
        {mode === "correction" && (
          <>
            <Field label="Correction demandée" required>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${FIELD} resize-none`} />
            </Field>
            <Field label="Délai (jours)" required>
              <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${FIELD} sm:max-w-[10rem]`} />
            </Field>
          </>
        )}
        {mode === "approve" && <p className="text-sm text-gray-600">Le document sera marqué comme validé.</p>}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" onClick={onClose} disabled={isProcessing}>
          Fermer
        </ActionButton>
        <ActionButton variant={mode === "reject" ? "danger" : "primary"} pending={isProcessing} disabled={!canSubmit} onClick={submit}>
          {mode === "approve" ? "Approuver" : mode === "reject" ? "Rejeter" : "Envoyer la demande"}
        </ActionButton>
      </div>
    </section>
  );
};
