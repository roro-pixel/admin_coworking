import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";
import { contractService } from "../../services/contract.service";
import type { ContractGenerateRequest } from "../../services/contract.service";
import { documentService } from "../../services/document.service";
import { ActionButton, ErrorBlock, PageHeader, Section } from "../../components/subscription/kit";
import { apiMessage } from "../../components/subscription/kitUtils";
import { Skeleton } from "../../components/ui/Skeleton";
import { HtmlFrame } from "../../components/ui/HtmlFrame";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { ContractShell } from "../../components/contracts/ContractShell";
import { dateOnly } from "../../components/contracts/contractUtils";

/** Aperçu HTML d'un contrat existant et téléchargement du PDF généré par le backend. */
export const ContractPreviewPage: React.FC = () => {
  const { contractCode } = useParams<{ contractCode: string }>();
  const navigate = useNavigate();
  const [pdfPending, setPdfPending] = useState(false);

  const { data: contract, isLoading, isError, refetch } = useQuery({
    queryKey: ["contract", contractCode],
    queryFn: () => contractService.getContract(contractCode!),
    enabled: !!contractCode,
  });

  const payload: ContractGenerateRequest | null = contract
    ? (() => {
        const signatory = contract.parties?.find((p) => p.role === "SIGNATORY");
        return {
          templateCode: contract.templateCode,
          ownerType: contract.ownerType as ContractGenerateRequest["ownerType"],
          ownerCode: contract.ownerCode,
          businessCode: contract.businessCode || undefined,
          title: contract.title,
          description: contract.description || undefined,
          // Le backend peut renvoyer une heure avec la date : il n'accepte que AAAA-MM-JJ en entrée
          effectiveDate: dateOnly(contract.effectiveDate) || undefined,
          startDate: dateOnly(contract.startDate) || undefined,
          endDate: dateOnly(contract.endDate) || undefined,
          signatoryName: signatory?.displayName,
          signatoryRole: "Signataire",
          variables: {},
        };
      })()
    : null;

  const preview = useQuery({
    queryKey: ["contract-preview", contractCode],
    queryFn: () => contractService.previewContract(payload!),
    enabled: !!payload,
    staleTime: 0,
    gcTime: 0,
  });

  /** PDF déjà produit pour ce contrat : le plus avancé (signé, sinon brouillon). Aucune génération ici, car elle envoie un courriel au client. */
  const pdfCode = contract?.signedDocumentCode || contract?.draftDocumentCode || null;

  const downloadPdf = async () => {
    if (!pdfCode) return;
    setPdfPending(true);
    try {
      saveBlob(await documentService.downloadDocument(pdfCode), `${contract!.contractCode}.pdf`);
    } catch (e) {
      toast.error(apiMessage(e, "Téléchargement impossible."));
    } finally {
      setPdfPending(false);
    }
  };

  const back = () => navigate(contract ? `/contracts/${contract.contractCode}` : "/contracts");

  return (
    <ContractShell>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Prévisualisation"
          subtitle={contract ? `${contract.title} · ${contract.contractCode}` : undefined}
          onBack={back}
          backLabel="Retour au contrat"
          actions={
            contract && (
              <>
                <ActionButton variant="ghost" icon={RefreshCw} pending={preview.isFetching} onClick={() => preview.refetch()}>
                  Actualiser
                </ActionButton>
                {pdfCode && (
                  <ActionButton icon={Download} pending={pdfPending} onClick={downloadPdf}>
                    {contract.signedDocumentCode ? "Télécharger le PDF signé" : "Télécharger le PDF"}
                  </ActionButton>
                )}
              </>
            )
          }
        />

        {isLoading ? (
          <Skeleton className="h-[60vh] w-full rounded-[1.75rem]" />
        ) : isError || !contract ? (
          <ErrorBlock message="Contrat introuvable." onRetry={() => refetch()} />
        ) : preview.isLoading ? (
          <Skeleton className="h-[60vh] w-full rounded-[1.75rem]" />
        ) : preview.isError ? (
          <ErrorBlock message={apiMessage(preview.error, "Erreur lors de la génération de l'aperçu.")} onRetry={() => preview.refetch()} />
        ) : (
          <Section title="Aperçu du document" description={`Template ${contract.templateCode}${pdfCode ? "" : " · aucun PDF généré pour le moment"}`} icon={FileText}>
            <HtmlFrame html={preview.data?.html ?? ""} title="Aperçu du contrat" autoHeight height="60vh" className="shadow-sm" />
          </Section>
        )}
      </div>
    </ContractShell>
  );
};
