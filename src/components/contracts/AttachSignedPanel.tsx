import React, { useState } from "react";
import { FileCheck, Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { contractService } from "../../services/contract.service";
import { documentService } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { PanelForm } from "../subscription/kit";
import { FOCUS, PINK_SOFT, apiMessage } from "../subscription/kitUtils";

/**
 * Rattache le PDF signé à un contrat (remplace AttachSignedDocumentModal).
 Envoi du document, puis rattachement au contrat.
 */
export const AttachSignedPanel: React.FC<{
  contractCode: string;
  ownerType?: string;
  ownerCode?: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ contractCode, ownerType = "BUSINESS", ownerCode = "", onSuccess, onCancel }) => {
  const { admin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (pdf: File) => {
      // 1. Envoi du document via le service GED (multipart/form-data)
      const docResponse = await documentService.uploadDocument({
        ownerType,
        ownerCode: ownerCode || contractCode,
        documentTypeCode: "SIGNED_CONTRACT",
        title: `Contrat signé — ${contractCode}`,
        uploadedBy: admin?.email || admin?.id?.toString() || "1",
        file: pdf,
      });
      const documentCode = docResponse.code || (docResponse as any).documentCode;
      if (!documentCode) throw new Error("Code document manquant dans la réponse.");
      // 2. Rattachement au contrat
      await contractService.attachSignedDocument(contractCode, documentCode);
    },
    onSuccess,
    onError: (e: unknown) =>
      setError(apiMessage(e, (e as Error)?.message || "Erreur lors de l'upload ou du rattachement.")),
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setFile(f);
    setError(null);
  };

  return (
    <PanelForm
      title="Rattacher le document signé"
      pending={upload.isPending}
      submitLabel="Rattacher"
      submitDisabled={!file}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) {
          setError("Veuillez sélectionner un fichier PDF.");
          return;
        }
        setError(null);
        upload.mutate(file);
      }}
    >
      <p className="-mt-2 text-sm text-gray-500">
        Contrat <span className="font-mono font-semibold text-gray-700">{contractCode}</span>
      </p>

      <div className="rounded-2xl bg-gray-50 p-6 text-center">
        {file ? (
          <div className="space-y-1">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FileCheck size={22} />
            </span>
            <p className="break-all text-sm font-semibold text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={upload.isPending}
              className={`rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--logo-pink-dark)] hover:underline ${FOCUS}`}
            >
              Changer de fichier
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <span
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
            >
              <Upload size={22} />
            </span>
            <p className="text-sm font-semibold text-gray-900">Téléversez le contrat signé</p>
            <p className="pb-2 text-xs text-gray-400">PDF uniquement · max 10 Mo</p>
            <label
              className={`inline-flex cursor-pointer items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus-within:ring-2 focus-within:ring-[color:var(--logo-pink)]`}
            >
              Sélectionner un fichier
              <input type="file" accept="application/pdf" onChange={onPick} className="sr-only" />
            </label>
          </div>
        )}
      </div>
    </PanelForm>
  );
};
