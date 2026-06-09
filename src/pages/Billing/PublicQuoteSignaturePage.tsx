import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { CheckCircle, FileSignature, Loader2, XCircle } from "lucide-react";
import { billingService } from "../../services/billing.service";

const toBase64SvgSignature = (name: string): string => {
  const safeName = name.replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c,
  );
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="220" viewBox="0 0 700 220">
      <rect width="700" height="220" fill="white"/>
      <path d="M40 160 C160 60, 230 210, 350 110 S560 80, 660 150" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
      <text x="50" y="125" font-family="cursive" font-size="54" fill="#111827">${safeName}</text>
      <text x="50" y="190" font-family="Arial" font-size="18" fill="#6b7280">Signature électronique</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export const PublicQuoteSignaturePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: html,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-quote-signature", token],
    queryFn: () => billingService.getPublicQuoteSignaturePage(token!),
    enabled: !!token,
  });

  const signaturePreview = useMemo(
    () => (signerName.trim() ? toBase64SvgSignature(signerName.trim()) : ""),
    [signerName],
  );

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Token de signature manquant.");
      if (!signerName.trim())
        throw new Error("Le nom du signataire est obligatoire.");
      if (!accepted)
        throw new Error("Vous devez accepter les conditions de signature.");

      return billingService.confirmPublicQuoteSignature(token, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        signatureImageBase64: signaturePreview,
      });
    },
    onSuccess: () => setError(null),
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la signature.",
      ),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg text-center">
          <XCircle className="mx-auto text-red-500 mb-4" size={44} />
          <h1 className="text-xl font-bold text-gray-900">Lien invalide</h1>
          <p className="text-gray-500 mt-2">
            Le lien de signature ne contient pas de jeton valide.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3">
          <FileSignature className="text-primary-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Signature électronique du devis
            </h1>
            <p className="text-sm text-gray-500">
              Consultez le document puis confirmez votre signature.
            </p>
          </div>
        </div>

        {confirmMutation.isSuccess ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={54} />
            <h2 className="text-2xl font-bold text-gray-900">
              Devis signé avec succès
            </h2>
            <p className="text-gray-500 mt-2">
              Votre signature a bien été enregistrée.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-900">Document</h2>
              </div>
              {isLoading ? (
                <div className="h-[650px] flex items-center justify-center">
                  <Loader2
                    className="animate-spin text-primary-600"
                    size={32}
                  />
                </div>
              ) : isError ? (
                <div className="h-[650px] flex items-center justify-center text-center p-6">
                  <div>
                    <XCircle className="mx-auto text-red-500 mb-3" size={40} />
                    <p className="font-medium text-gray-900">
                      Impossible de charger le document.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Le lien est peut-être expiré ou invalide.
                    </p>
                  </div>
                </div>
              ) : (
                <iframe
                  title="Devis à signer"
                  srcDoc={html || "<p>Document vide.</p>"}
                  className="w-full h-[650px] bg-white"
                />
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit sticky top-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Signer le devis
              </h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du signataire *
                  </label>
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Nom complet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aperçu signature
                  </label>
                  <div className="border border-gray-200 rounded-lg h-28 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {signaturePreview ? (
                      <img
                        src={signaturePreview}
                        alt="Signature"
                        className="max-h-24 max-w-full"
                      />
                    ) : (
                      <span className="text-sm text-gray-400">
                        Votre signature apparaîtra ici
                      </span>
                    )}
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Je confirme avoir lu le document et j’accepte de le signer
                    électroniquement.
                  </span>
                </label>

                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || isLoading || isError}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirmMutation.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <FileSignature size={16} />
                  )}
                  Confirmer la signature
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
