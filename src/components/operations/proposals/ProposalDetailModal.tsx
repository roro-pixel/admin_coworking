import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Send, Trash2, X, XCircle } from "lucide-react";
import { brandVars } from "../../layout/adminTheme";
import { ModalPortal } from "../../ui/ModalPortal";
import { operationsService } from "../../../services/operations.service";
import type { ProposalLineResponse, ProposalResponse } from "../../../services/operations.service";
import { ActionButton, Detail, IconButton, ItemRow, Section, StatusChip } from "../../subscription/kit";
import { apiMessage, formatDate, formatDateTime, formatMoney } from "../../subscription/kitUtils";
import { statusOf } from "../../subscription/labels";
import { ReasonPanel } from "../../bookings/ReasonPanel";
import { DetailsSkeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { PROPOSAL_SERVICE_TYPES, PROPOSAL_STATUS } from "../opsLabels";
import { ProposalFormModal } from "./ProposalFormModal";
import { ProposalLineFormModal } from "./ProposalLineFormModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: ProposalResponse | null;
}

const serviceLabel = (v?: string | null) => PROPOSAL_SERVICE_TYPES.find((s) => s.value === v)?.label ?? v ?? "";

export const ProposalDetailModal: React.FC<Props> = ({ isOpen, onClose, proposal }) => {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProposalLineResponse | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["crm-proposal", proposal?.id],
    queryFn: () => operationsService.getProposal(proposal!.id),
    enabled: isOpen && !!proposal?.id,
  });
  const current = detail || proposal;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["crm-proposal", current?.id] });
  };
  const sendMutation = useMutation({
    mutationFn: () => operationsService.sendProposal(current!.id),
    onSuccess: () => {
      invalidate();
      toast.success("Proposition envoyée");
    },
    onError: (e) => toast.error(apiMessage(e, "Envoi impossible.")),
  });
  const acceptMutation = useMutation({
    mutationFn: () => operationsService.acceptProposal(current!.id),
    onSuccess: () => {
      invalidate();
      toast.success("Proposition acceptée");
    },
    onError: (e) => toast.error(apiMessage(e, "Acceptation impossible.")),
  });
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => operationsService.rejectProposal(current!.id, reason),
    onSuccess: () => {
      invalidate();
      setIsRejectOpen(false);
      toast.success("Proposition rejetée");
    },
    onError: (e) => toast.error(apiMessage(e, "Rejet impossible.")),
  });
  const deleteLineMutation = useMutation({
    mutationFn: (lineId: number) => operationsService.deleteProposalLine(current!.id, lineId),
    onSuccess: invalidate,
  });

  if (!isOpen || !current) return null;
  const lines = current.lines || [];
  const st = statusOf(PROPOSAL_STATUS, String(current.status));
  const awaitingAnswer = ["SENT", "VIEWED"].includes(String(current.status));
  const converted =
    current.convertedInvoiceNumber ||
    current.convertedContractCode ||
    current.convertedSubscriptionNumber ||
    current.convertedPassNumber;

  const closeLinePanel = () => {
    setIsLineOpen(false);
    setEditingLine(null);
  };

  return (
    <ModalPortal onClose={onClose} size="4xl">
      <div style={brandVars}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold tracking-tight text-gray-950">{current.title}</h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{current.proposalNumber}</p>
          </div>
          <IconButton icon={X} label="Fermer" tone="neutral" onClick={onClose} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
        </div>

        {isLoading ? (
          <div className="mt-5">
            <DetailsSkeleton />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={Pencil} onClick={() => setIsEditOpen(true)}>Modifier</ActionButton>
              <ActionButton icon={Send} pending={sendMutation.isPending} disabled={current.status !== "DRAFT"} onClick={() => sendMutation.mutate()}>
                Envoyer
              </ActionButton>
              <ActionButton icon={CheckCircle2} pending={acceptMutation.isPending} disabled={!awaitingAnswer} onClick={() => acceptMutation.mutate()}>
                Accepter
              </ActionButton>
              <ActionButton variant="ghost" icon={XCircle} disabled={!awaitingAnswer} onClick={() => setIsRejectOpen(true)}>
                Rejeter
              </ActionButton>
            </div>

            {isRejectOpen && (
              <div className="mt-4">
                <ReasonPanel
                  title="Rejeter la proposition"
                  subtitle="Indiquez le motif du refus."
                  required
                  submitLabel="Rejeter"
                  pending={rejectMutation.isPending}
                  onSubmit={(reason) => rejectMutation.mutate(reason)}
                  onCancel={() => setIsRejectOpen(false)}
                />
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Destinataire">{current.recipientName || current.recipientCode}</Detail>
              <Detail label="Email">{current.recipientEmail}</Detail>
              <Detail label="Valide jusqu'au">{current.validUntil ? formatDate(current.validUntil) : ""}</Detail>
              <Detail label="Assignée à">{current.assignedTo ? String(current.assignedTo) : ""}</Detail>
              <Detail label="Sous-total">{formatMoney(current.subtotalAmount, current.currency)}</Detail>
              <Detail label="TVA">{formatMoney(current.taxAmount, current.currency)}</Detail>
              <Detail label="Total">{formatMoney(current.totalAmount, current.currency)}</Detail>
              <Detail label="Envoyée le">{current.sentAt ? formatDateTime(current.sentAt) : ""}</Detail>
            </div>

            {(current.notes || current.internalNotes || current.rejectionReason) && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {current.notes && <Note title="Notes client" text={current.notes} />}
                {current.internalNotes && <Note title="Notes internes" text={current.internalNotes} />}
                {current.rejectionReason && <Note title="Motif du rejet" text={current.rejectionReason} />}
              </div>
            )}

            <Section
              className="mt-5"
              title="Lignes de la proposition"
              description="Les montants sont recalculés par le serveur."
              action={
                <ActionButton
                  icon={Plus}
                  onClick={() => {
                    setEditingLine(null);
                    setIsLineOpen(true);
                  }}
                  className="px-4 py-2"
                >
                  Ligne
                </ActionButton>
              }
            >
              <ProposalLineFormModal
                isOpen={isLineOpen}
                onClose={closeLinePanel}
                proposalId={current.id}
                editingLine={editingLine}
                onSuccess={closeLinePanel}
              />
              {lines.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Aucune ligne pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line) => (
                    <ItemRow key={line.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-950">{line.label}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {[serviceLabel(line.serviceType), line.serviceRefCode, line.description].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {line.quantity} × {formatMoney(line.unitPrice, line.currency)}
                          {line.discountPercent ? ` · remise ${line.discountPercent} %` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-gray-950">{formatMoney(line.totalAmount, line.currency)}</p>
                      <div className="flex shrink-0">
                        <IconButton
                          icon={Pencil}
                          label="Modifier la ligne"
                          onClick={() => {
                            setEditingLine(line);
                            setIsLineOpen(true);
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          label="Supprimer la ligne"
                          tone="danger"
                          pending={deleteLineMutation.isPending && deleteLineMutation.variables === line.id}
                          onClick={() =>
                            toast.confirm({
                              message: "Supprimer cette ligne ?",
                              detail: line.label,
                              confirmLabel: "Supprimer",
                              successMessage: "Ligne supprimée",
                              errorMessage: "Suppression impossible.",
                              onConfirm: () => deleteLineMutation.mutateAsync(line.id),
                            })
                          }
                        />
                      </div>
                    </ItemRow>
                  ))}
                </div>
              )}
            </Section>

            {converted && (
              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Facture" mono>{current.convertedInvoiceNumber}</Detail>
                <Detail label="Contrat" mono>{current.convertedContractCode}</Detail>
                <Detail label="Abonnement" mono>{current.convertedSubscriptionNumber}</Detail>
                <Detail label="Pass" mono>{current.convertedPassNumber}</Detail>
              </div>
            )}
          </>
        )}
      </div>

      <ProposalFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editingProposal={current}
        onSuccess={() => {
          setIsEditOpen(false);
          invalidate();
        }}
      />
    </div>
    </ModalPortal>
  );
};

const Note: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <p className="mt-1.5 text-sm leading-6 text-gray-700">{text}</p>
  </div>
);
