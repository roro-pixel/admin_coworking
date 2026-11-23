import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { CheckCircle2, FileSignature, XCircle } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { brandVars } from "../../components/layout/adminTheme";
import { ActionButton, ErrorBanner, Field } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDateTime } from "../../components/subscription/kitUtils";
import { billingError } from "../../components/billing/billingErrors";
import { Skeleton } from "../../components/ui/Skeleton";

const toBase64SvgSignature = (name: string): string => {
  const safeName = name.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="220" viewBox="0 0 700 220">
      <rect width="700" height="220" fill="white"/>
      <path d="M40 160 C160 60, 230 210, 350 110 S560 80, 660 150" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
      <text x="50" y="125" font-family="cursive" font-size="54" fill="#111827">${safeName}</text>
      <text x="50" y="190" font-family="Arial" font-size="18" fill="#6b7280">Signature électronique</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

/** Page publique (hors espace d'administration) : le client consulte le devis puis le signe. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={brandVars} className="min-h-screen bg-[#F7F4F2]">
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">{children}</div>
  </div>
);

const Notice: React.FC<{ tone: "ok" | "ko"; title: string; text: string }> = ({ tone, title, text }) => (
  <div className="mx-auto max-w-lg rounded-[1.75rem] bg-white p-10 text-center shadow-sm">
    {tone === "ok" ? <CheckCircle2 className="mx-auto text-emerald-500" size={52} /> : <XCircle className="mx-auto text-red-500" size={48} />}
    <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-950">{title}</h1>
    <p className="mt-2 text-sm text-gray-500">{text}</p>
  </div>
);

export const PublicQuoteSignaturePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: html, isLoading, isError } = useQuery({
    queryKey: ["public-quote-signature", token],
    queryFn: () => billingService.getPublicSignaturePage(token!),
    enabled: !!token,
  });

  const signaturePreview = useMemo(() => (signerName.trim() ? toBase64SvgSignature(signerName.trim()) : ""), [signerName]);

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Jeton de signature manquant.");
      if (!signerName.trim()) throw new Error("Le nom du signataire est obligatoire.");
      if (!accepted) throw new Error("Vous devez accepter les conditions de signature.");
      return billingService.confirmPublicSignature(token, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        signatureImageBase64: signaturePreview,
      });
    },
    onSuccess: () => setError(null),
    onError: (e: unknown) => setError(billingError(e, (e as Error)?.message || "Erreur lors de la signature.")),
  });

  if (!token) {
    return (
      <Shell>
        <Notice tone="ko" title="Lien invalide" text="Le lien de signature ne contient pas de jeton valide." />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-6 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--logo-pink-dark)] text-white">
          <FileSignature size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Signature électronique du devis</h1>
          <p className="text-sm text-gray-500">Consultez le document, puis confirmez votre signature.</p>
        </div>
      </header>

      {confirmMutation.isSuccess ? (
        <Notice
          tone="ok"
          title="Devis signé avec succès"
          text={confirmMutation.data?.quoteNumber ? `Votre signature du devis ${confirmMutation.data.quoteNumber} a bien été enregistrée${confirmMutation.data.signedAt ? ` le ${formatDateTime(confirmMutation.data.signedAt)}` : ""}.` : "Votre signature a bien été enregistrée."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="overflow-hidden rounded-[1.75rem] bg-white p-2 shadow-sm">
            <h2 className="px-4 pb-2 pt-3 text-base font-bold text-gray-950">Document</h2>
            {isLoading ? (
              <Skeleton className="h-[40rem] w-full rounded-2xl" />
            ) : isError ? (
              <div className="flex h-[40rem] items-center justify-center rounded-2xl bg-gray-50 p-6 text-center">
                <div>
                  <XCircle className="mx-auto text-red-500" size={40} />
                  <p className="mt-3 font-semibold text-gray-900">Impossible de charger le document.</p>
                  <p className="mt-1 text-sm text-gray-500">Le lien est peut-être expiré ou invalide.</p>
                </div>
              </div>
            ) : (
              <iframe title="Devis à signer" srcDoc={html || "<p>Document vide.</p>"} className="h-[40rem] w-full rounded-2xl bg-white" />
            )}
          </section>

          <aside className="h-fit rounded-[1.75rem] bg-white p-3 shadow-sm lg:sticky lg:top-6">
            <h2 className="px-3 pb-3 pt-2 text-base font-bold text-gray-950">Signer le devis</h2>
            <div className="space-y-4 rounded-2xl bg-gray-50 p-4">
              <ErrorBanner message={error} />
              <Field label="Nom du signataire" required>
                <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={FIELD_SOFT} placeholder="Nom complet" />
              </Field>
              <Field label="E-mail">
                <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className={FIELD_SOFT} placeholder="nom@exemple.com" />
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">Aperçu de la signature</span>
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-white">
                  {signaturePreview ? <img src={signaturePreview} alt="Signature" className="max-h-24 max-w-full" /> : <span className="text-sm text-gray-400">Votre signature apparaîtra ici</span>}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-600">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                <span>Je confirme avoir lu le document et j'accepte de le signer électroniquement.</span>
              </label>
              <ActionButton className="w-full" icon={FileSignature} pending={confirmMutation.isPending} disabled={isLoading || isError} onClick={() => confirmMutation.mutate()}>
                Confirmer la signature
              </ActionButton>
            </div>
          </aside>
        </div>
      )}
    </Shell>
  );
};
