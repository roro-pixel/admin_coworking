import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Loader2, PenLine } from "lucide-react";
import { contractService } from "../../services/contract.service";

export const PublicContractSignaturePage: React.FC = () => {
  const { signatureToken } = useParams<{ signatureToken: string }>();
  const [signerName, setSignerName] = useState("");
  const [signatureImageBase64, setSignatureImageBase64] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-contract-signature", signatureToken],
    queryFn: () => contractService.getPublicSignatureDetails(signatureToken!),
    enabled: !!signatureToken,
  });

  React.useEffect(() => {
    if (data?.signerName) setSignerName(data.signerName);
  }, [data?.signerName]);

  const isExpired = useMemo(() => {
    if (!data?.expiresAt) return false;
    return new Date(data.expiresAt) < new Date();
  }, [data?.expiresAt]);

  const signMutation = useMutation({
    mutationFn: () =>
      contractService.signPublicContract(signatureToken!, {
        signerName,
        signatureImageBase64: signatureImageBase64 || undefined,
        acceptedTerms,
      }),
    onSuccess: () => setErrorMessage(null),
    onError: (err: any) =>
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Erreur lors de la signature.",
      ),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (isError || !data || isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <AlertCircle size={44} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold text-gray-900">Lien indisponible</h1>
          <p className="mt-2 text-sm text-gray-500">
            Le lien de signature est invalide, expiré ou déjà clôturé.
          </p>
        </div>
      </div>
    );
  }

  if (signMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Contrat signé</h1>
          <p className="mt-2 text-sm text-gray-500">
            Votre signature a bien été enregistrée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
            Signature contractuelle
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">{data.title}</h1>
          <p className="mt-1 font-mono text-sm text-gray-400">{data.contractCode}</p>
          {data.expiresAt && (
            <p className="mt-2 text-sm text-gray-500">
              Expire le {new Date(data.expiresAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Document</h2>
            {data.html ? (
              <div
                className="prose max-w-none rounded-2xl border border-gray-100 bg-white p-5"
                dangerouslySetInnerHTML={{ __html: data.html }}
              />
            ) : (
              <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                Aperçu du contrat indisponible.
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-fit">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                <PenLine size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Signer</h2>
                <p className="text-sm text-gray-500">Confirmez votre identité.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom du signataire</label>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Signature base64 ou data URL
                </label>
                <textarea
                  value={signatureImageBase64}
                  onChange={(e) => setSignatureImageBase64(e.target.value)}
                  rows={4}
                  placeholder="data:image/png;base64,..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Champ optionnel si ton backend accepte une signature textuelle.
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 rounded"
                />
                J'ai lu le contrat et j'accepte de le signer électroniquement.
              </label>
              <button
                onClick={() => signMutation.mutate()}
                disabled={!signerName.trim() || !acceptedTerms || signMutation.isPending}
                className="w-full rounded-xl bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                Signer le contrat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
