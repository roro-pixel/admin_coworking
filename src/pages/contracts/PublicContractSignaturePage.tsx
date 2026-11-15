import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, PenLine } from "lucide-react";
import { contractService } from "../../services/contract.service";
import { ActionButton, Detail, ErrorBanner, Section } from "../../components/subscription/kit";
import { apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { Skeleton } from "../../components/ui/Skeleton";
import { brandVars } from "../../components/layout/adminTheme";

const Screen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={brandVars} className="min-h-screen bg-[#F6F3F1] px-4 py-6 sm:px-8 sm:py-10">
    {children}
  </div>
);

const Notice: React.FC<{ icon: React.ElementType; tone: "ok" | "ko"; title: string; text: string }> = ({ icon: Icon, tone, title, text }) => (
  <Screen>
    <div className="mx-auto mt-16 max-w-md rounded-[1.75rem] bg-white p-8 text-center shadow-sm">
      <span
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
      >
        <Icon size={26} />
      </span>
      <h1 className="mt-4 text-xl font-bold text-gray-950">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  </Screen>
);

/** Page publique (sans menu) où le signataire confirme sa signature à partir du lien reçu par courriel. */
export const PublicContractSignaturePage: React.FC = () => {
  const { signatureToken } = useParams<{ signatureToken: string }>();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-contract-signature", signatureToken],
    queryFn: () => contractService.getPublicSignatureDetails(signatureToken!),
    enabled: !!signatureToken,
    retry: false,
  });

  const expired = useMemo(() => !!data?.expiresAt && new Date(data.expiresAt) < new Date(), [data?.expiresAt]);

  /** Texte affiché à côté de la case : le serveur le conserve comme preuve de consentement. */
  const consentText = data ? `J'ai pris connaissance du contrat « ${data.contractTitle} » (${data.contractCode}) et j'accepte de le signer électroniquement.` : "";

  const sign = useMutation({
    mutationFn: () => contractService.signPublicContract(signatureToken!, { accepted, consentText }),
    onSuccess: () => setError(null),
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la signature.")),
  });

  if (isLoading) {
    return (
      <Screen>
        <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="Chargement">
          <Skeleton className="h-32 w-full rounded-[1.75rem]" />
          <Skeleton className="h-48 w-full rounded-[1.75rem]" />
        </div>
      </Screen>
    );
  }
  if (isError || !data) {
    return <Notice icon={AlertCircle} tone="ko" title="Lien introuvable" text="Ce lien de signature n'existe pas. Vérifiez l'adresse reçue par courriel." />;
  }
  if (sign.isSuccess || data.signedAt) {
    return (
      <Notice
        icon={CheckCircle}
        tone="ok"
        title="Contrat signé"
        text={data.signedAt ? `Signé le ${formatDateTime(data.signedAt)}. Vous pouvez fermer cette page.` : "Votre signature a bien été enregistrée. Vous pouvez fermer cette page."}
      />
    );
  }
  if (data.revoked) {
    return <Notice icon={AlertCircle} tone="ko" title="Lien révoqué" text="Un lien plus récent a été envoyé pour ce contrat. Utilisez le dernier courriel reçu." />;
  }
  if (expired) {
    return <Notice icon={AlertCircle} tone="ko" title="Lien expiré" text="Ce lien de signature a expiré. Demandez-en un nouveau à l'espace." />;
  }

  return (
    <Screen>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--logo-pink-dark)]">Signature de contrat</p>
          <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{data.contractTitle}</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">{data.contractCode}</p>
        </div>

        <Section title="Signataire" icon={PenLine}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Nom">{data.signerName}</Detail>
            <Detail label="Email">{data.signerEmail}</Detail>
            <Detail label="Lien valable jusqu'au">{data.expiresAt ? formatDateTime(data.expiresAt) : undefined}</Detail>
          </div>
        </Section>

        <Section title="Confirmer la signature" description="Votre adresse IP, votre navigateur et l'heure sont enregistrés avec votre accord">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              sign.mutate();
            }}
          >
            <ErrorBanner message={error} />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[color:var(--logo-pink-dark)]"
              />
              {consentText}
            </label>
            <ActionButton type="submit" icon={PenLine} pending={sign.isPending} disabled={!accepted} className="w-full sm:w-auto">
              Signer le contrat
            </ActionButton>
          </form>
        </Section>
      </div>
    </Screen>
  );
};
