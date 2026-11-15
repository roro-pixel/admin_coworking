import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Eye, FileText, GitBranch, Mail, Phone, Send, Trash2, Upload, Users } from "lucide-react";
import { contractService } from "../../services/contract.service";
import { documentService } from "../../services/document.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, ItemRow, PageHeader, Section, StatusChip, Tag } from "../../components/subscription/kit";
import { apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { ContractShell } from "../../components/contracts/ContractShell";
import { AttachSignedPanel } from "../../components/contracts/AttachSignedPanel";
import { SignatureRequestPanel } from "../../components/contracts/SignatureRequestPanel";
import { ReasonPanel } from "../../components/contracts/ReasonPanel";
import { useContractActions } from "../../components/contracts/useContractActions";
import type { RunnableAction } from "../../components/contracts/useContractActions";
import { AMENDMENT_STATUS, CONTRACT_STATUS, OWNER_TYPE_LABELS, PARTY_ROLES, RENEWAL_LABELS, VERSION_KIND, actionsFor, canDelete, statusOf } from "../../components/contracts/contractLabels";
import type { ContractActionKey } from "../../components/contracts/contractLabels";
import { useQueryClient } from "@tanstack/react-query";

const REASON_ACTIONS = ["suspend", "terminate", "cancel", "approve_review", "reject_review"] as const;
type ReasonAction = (typeof REASON_ACTIONS)[number];
type Panel = { kind: "attach" } | { kind: "signature" } | { kind: "reason"; action: ReasonAction } | null;

export const ContractDetailPage: React.FC = () => {
  const { contractCode } = useParams<{ contractCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: contract, isLoading, isError, refetch } = useQuery({
    queryKey: ["contract", contractCode],
    queryFn: () => contractService.getContract(contractCode!),
    enabled: !!contractCode,
  });

  const versions = useQuery({
    queryKey: ["contract-versions", contractCode],
    queryFn: () => contractService.getContractVersions(contractCode!),
    enabled: !!contractCode,
  });
  const amendments = useQuery({
    queryKey: ["contract-amendments", contractCode],
    queryFn: () => contractService.getContractAmendments(contractCode!),
    enabled: !!contractCode,
  });

  const actions = useContractActions(() => setPanel(null));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contract", contractCode] });
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["contract-versions", contractCode] });
    queryClient.invalidateQueries({ queryKey: ["contract-amendments", contractCode] });
  };

  const download = async (code: string) => {
    setDownloading(code);
    try {
      saveBlob(await documentService.downloadDocument(code), `${code}.pdf`);
    } catch (e) {
      toast.error(apiMessage(e, "Téléchargement impossible."));
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <ContractShell>
        <div className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </ContractShell>
    );
  }
  if (isError || !contract) {
    return (
      <ContractShell>
        <div className="mx-auto w-full max-w-4xl">
          <PageHeader title="Contrat introuvable" onBack={() => navigate("/contracts")} backLabel="Retour aux contrats" />
          <ErrorBlock message="Ce contrat n'existe pas ou n'a pas pu être chargé." onRetry={() => refetch()} />
        </div>
      </ContractShell>
    );
  }

  const code = contract.contractCode;
  const st = statusOf(CONTRACT_STATUS, contract.status);
  const flow = actionsFor(contract.status);

  const onAction = (action: ContractActionKey) => {
    if (action === "attach_signed") return setPanel({ kind: "attach" });
    if ((REASON_ACTIONS as readonly string[]).includes(action)) return setPanel({ kind: "reason", action: action as ReasonAction });
    actions.run({ action: action as RunnableAction, code });
  };

  const confirmDelete = () =>
    toast.confirm({
      message: `Supprimer le contrat « ${contract.title} » ?`,
      detail: code,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Contrat supprimé",
      errorMessage: "Suppression impossible",
      onConfirm: async () => {
        await actions.remove.mutateAsync(code);
        navigate("/contracts");
      },
    });

  return (
    <ContractShell>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={contract.title}
          subtitle={<span className="font-mono text-xs">{code}</span>}
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          onBack={() => navigate("/contracts")}
          backLabel="Retour aux contrats"
          actions={
            <>
              <ActionButton variant="ghost" icon={Eye} onClick={() => navigate(`/contracts/preview/${code}`)}>
                Prévisualiser
              </ActionButton>
              {contract.status === "AWAITING_SIGNATURE" && (
                <ActionButton variant="ghost" icon={Send} onClick={() => setPanel({ kind: "signature" })}>
                  Demander la signature
                </ActionButton>
              )}
              {canDelete(contract.status) && (
                <ActionButton variant="ghost" icon={Trash2} onClick={confirmDelete}>
                  Supprimer
                </ActionButton>
              )}
            </>
          }
        />

        {flow.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {flow.map((a, i) => (
              <ActionButton
                key={a.action}
                icon={a.icon}
                variant={a.tone === "danger" ? "danger" : i === 0 ? "primary" : "ghost"}
                pending={a.action !== "attach_signed" && actions.isRunning(code, a.action as RunnableAction)}
                disabled={actions.pending}
                onClick={() => onAction(a.action)}
              >
                {a.label}
              </ActionButton>
            ))}
          </div>
        )}

        {panel?.kind === "attach" && (
          <AttachSignedPanel
            contractCode={code}
            ownerType={contract.ownerType}
            ownerCode={contract.ownerCode}
            onSuccess={() => {
              toast.success("Document signé rattaché");
              refresh();
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        )}
        {panel?.kind === "signature" && <SignatureRequestPanel contractCode={code} onSent={refresh} onClose={() => setPanel(null)} />}
        {panel?.kind === "reason" && (
          <ReasonPanel
            action={panel.action}
            contractCode={code}
            pending={actions.pending}
            onSubmit={(reason) => actions.run({ action: panel.action, code, reason })}
            onCancel={() => setPanel(null)}
          />
        )}

        <div className="space-y-4">
          <Section title="Informations" icon={Calendar}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Propriétaire">
                {contract.ownerCode} · {OWNER_TYPE_LABELS[contract.ownerType] ?? contract.ownerType}
              </Detail>
              <Detail label="Business" mono>{contract.businessCode}</Detail>
              <Detail label="Template" mono>{contract.templateCode}</Detail>
              <Detail label="Date d'effet">{formatDate(contract.effectiveDate)}</Detail>
              <Detail label="Date de début">{formatDate(contract.startDate)}</Detail>
              <Detail label="Date de fin">{contract.endDate ? formatDate(contract.endDate) : "Durée indéterminée"}</Detail>
              <Detail label="Renouvellement">
                {contract.renewalType ? (RENEWAL_LABELS[contract.renewalType] ?? contract.renewalType) : undefined}
              </Detail>
              <Detail label="Créé le">{formatDate(contract.createdAt)}</Detail>
              <Detail label="Signé le">{formatDate(contract.signedAt)}</Detail>
              <Detail label="Activé le">{formatDate(contract.activatedAt)}</Detail>
              <Detail label="Résilié le">{formatDate(contract.terminatedAt)}</Detail>
              <Detail label="Motif de résiliation" wide>{contract.terminationReason}</Detail>
              <Detail label="Description" wide>{contract.description}</Detail>
            </div>
          </Section>

          <Section title="Parties prenantes" description="Signataires et bénéficiaires du contrat" icon={Users}>
            {contract.parties && contract.parties.length > 0 ? (
              <div className="space-y-2">
                {contract.parties.map((p, i) => {
                  const role = PARTY_ROLES[p.role];
                  return (
                    <ItemRow key={`${p.partyCode}-${i}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip tone={role?.tone ?? "neutral"}>{role?.label ?? p.role}</StatusChip>
                        <Tag>{OWNER_TYPE_LABELS[p.partyType] ?? p.partyType}</Tag>
                        <span className="font-mono text-xs text-gray-400">{p.partyCode}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{p.displayName}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {p.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={12} /> {p.email}
                          </span>
                        )}
                        {p.phone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={12} /> {p.phone}
                          </span>
                        )}
                      </div>
                    </ItemRow>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Users} title="Aucune partie prenante" />
            )}
          </Section>

          <Section title="Documents" icon={FileText}>
            <div className="space-y-2">
              {contract.draftDocumentCode && (
                <ItemRow className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Brouillon généré</p>
                    <p className="font-mono text-xs text-gray-400">{contract.draftDocumentCode}</p>
                  </div>
                  <ActionButton
                    variant="ghost"
                    icon={Download}
                    pending={downloading === contract.draftDocumentCode}
                    onClick={() => download(contract.draftDocumentCode!)}
                  >
                    Télécharger
                  </ActionButton>
                </ItemRow>
              )}
              {contract.signedDocumentCode && (
                <ItemRow className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Document signé</p>
                    <p className="font-mono text-xs text-gray-400">{contract.signedDocumentCode}</p>
                  </div>
                  <ActionButton
                    variant="ghost"
                    icon={Download}
                    pending={downloading === contract.signedDocumentCode}
                    onClick={() => download(contract.signedDocumentCode!)}
                  >
                    Télécharger
                  </ActionButton>
                </ItemRow>
              )}
              {!contract.draftDocumentCode && !contract.signedDocumentCode && (
                <p className="px-1 text-sm text-gray-500">Aucun document pour le moment.</p>
              )}
              {["GENERATED", "UNDER_REVIEW", "AWAITING_SIGNATURE"].includes(contract.status) && !contract.signedDocumentCode && (
                <ActionButton variant="ghost" icon={Upload} onClick={() => setPanel({ kind: "attach" })}>
                  Joindre la copie signée
                </ActionButton>
              )}
            </div>
          </Section>

          {(versions.data?.length ?? 0) > 1 || (amendments.data?.length ?? 0) > 0 ? (
            <Section title="Versions et avenants" description="L'original, chaque avenant appliqué et chaque prolongation de date" icon={GitBranch}>
              <div className="space-y-2">
                {(versions.data ?? []).map((v) => (
                  <ItemRow key={`${v.version}-${v.kind}`} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">v{v.version} · {VERSION_KIND[v.kind] ?? v.kind}</span>
                        {v.amendmentCode && <span className="font-mono text-xs text-gray-400">{v.amendmentCode}</span>}
                      </div>
                      {v.description && <p className="mt-1 text-sm text-gray-600">{v.description}</p>}
                      {v.endDate && (
                        <p className="mt-1 text-xs text-gray-400">
                          {v.previousEndDate ? `Fin ${formatDate(v.previousEndDate)} → ${formatDate(v.endDate)}` : `Fin ${formatDate(v.endDate)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      <span className="text-xs text-gray-400">{formatDate(v.effectiveDate ?? v.at)}</span>
                      {v.documentCode && (
                        <ActionButton variant="ghost" icon={Download} pending={downloading === v.documentCode} onClick={() => download(v.documentCode!)}>
                          PDF
                        </ActionButton>
                      )}
                    </div>
                  </ItemRow>
                ))}
                {(amendments.data ?? []).map((a) => {
                  const ast = statusOf(AMENDMENT_STATUS, a.status);
                  return (
                    <ItemRow key={a.code} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-700">{a.code}</span>
                          <StatusChip tone={ast.tone}>{ast.label}</StatusChip>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{a.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{formatDate(a.proposedAt)}</span>
                    </ItemRow>
                  );
                })}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </ContractShell>
  );
};
