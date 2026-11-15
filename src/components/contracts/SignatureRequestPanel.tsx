import React, { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { contractService } from "../../services/contract.service";
import type { ContractSigningResponse } from "../../services/contract.service";
import { Field, PanelForm } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../subscription/kitUtils";

/**
 * Demande de signature électronique. Le serveur envoie le lien par courriel au signataire (valable 72 h)
 * et révoque tout lien précédent encore ouvert ; le panneau reste ouvert pour confirmer l'envoi.
 */
export const SignatureRequestPanel: React.FC<{
  contractCode: string;
  onSent: () => void;
  onClose: () => void;
}> = ({ contractCode, onSent, onClose }) => {
  const [form, setForm] = useState({ signerName: "", signerEmail: "" });
  const [result, setResult] = useState<ContractSigningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () =>
      contractService.requestSignature(contractCode, {
        signerName: form.signerName.trim() || undefined,
        signerEmail: form.signerEmail.trim() || undefined,
      }),
    onSuccess: (r) => {
      setResult(r);
      setError(null);
      onSent();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la demande de signature")),
  });

  return (
    <PanelForm
      title="Demande de signature"
      pending={request.isPending}
      submitLabel="Envoyer le lien"
      submitDisabled={!!result}
      error={error}
      onCancel={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        request.mutate();
      }}
    >
      {result && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Lien envoyé à {result.signerName || result.signerEmail}</p>
            <p className="mt-0.5 text-emerald-700">
              {result.signerEmail}
              {result.expiresAt ? ` · valable jusqu'au ${formatDateTime(result.expiresAt)}` : ""}
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Pour un contrat d'organisation, laissez les champs vides : le serveur retient le signataire désigné (représentant légal ou membre autorisé à signer).
        Pour un particulier, un membre ou une entreprise, les deux champs sont obligatoires.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom du signataire">
          <input
            value={form.signerName}
            onChange={(e) => setForm({ ...form, signerName: e.target.value })}
            placeholder="Nom du signataire"
            disabled={!!result}
            className={`${FIELD} bg-gray-50 shadow-none`}
          />
        </Field>
        <Field label="Email du signataire">
          <input
            type="email"
            value={form.signerEmail}
            onChange={(e) => setForm({ ...form, signerEmail: e.target.value })}
            placeholder="Email du signataire"
            disabled={!!result}
            className={`${FIELD} bg-gray-50 shadow-none`}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
