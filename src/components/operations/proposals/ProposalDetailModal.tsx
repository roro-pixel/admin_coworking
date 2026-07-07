import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Edit,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { ModalPortal } from "../../ui/ModalPortal";
import { operationsService } from "../../../services/operations.service";
import type {
  ProposalLineResponse,
  ProposalResponse,
} from "../../../services/operations.service";
import { ProposalFormModal } from "./ProposalFormModal";
import { ProposalLineFormModal } from "./ProposalLineFormModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: ProposalResponse | null;
}
const statusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-50 text-blue-700",
  VIEWED: "bg-purple-50 text-purple-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-orange-50 text-orange-700",
  CONVERTED: "bg-gray-950 text-white",
};
const money = (v?: number, c = "XAF") =>
  `${Number(v ?? 0).toLocaleString("fr-FR")} ${c}`;
const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleString("fr-FR") : "—";

export const ProposalDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  proposal,
}) => {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProposalLineResponse | null>(
    null,
  );
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
    onSuccess: invalidate,
  });
  const acceptMutation = useMutation({
    mutationFn: () => operationsService.acceptProposal(current!.id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => {
      const reason = prompt("Motif du rejet ?");
      if (!reason) return Promise.reject(new Error("Motif requis."));
      return operationsService.rejectProposal(current!.id, reason);
    },
    onSuccess: invalidate,
    onError: (e: any) => {
      if (e?.message !== "Motif requis.")
        alert(e?.response?.data?.message || e?.message || "Erreur rejet.");
    },
  });
  const deleteLineMutation = useMutation({
    mutationFn: (lineId: number) =>
      operationsService.deleteProposalLine(current!.id, lineId),
    onSuccess: invalidate,
  });
  if (!isOpen || !current) return null;
  const lines = current.lines || [];
  return (
    <ModalPortal onClose={onClose} size="5xl">
      <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b bg-white/95 px-6 py-4 backdrop-blur">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-gray-950">{current.title}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[current.status] ?? "bg-gray-100"}`}
            >
              {current.status}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-gray-400">
            {current.proposalNumber}
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      {isLoading ? (
        <div className="p-10 text-center">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium"
            >
              <Edit size={16} /> Modifier
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || current.status !== "DRAFT"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Send size={16} /> Envoyer
            </button>
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={
                acceptMutation.isPending ||
                !["SENT", "VIEWED"].includes(String(current.status))
              }
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <CheckCircle2 size={16} /> Accepter
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={
                rejectMutation.isPending ||
                !["SENT", "VIEWED"].includes(String(current.status))
              }
              className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
            >
              <XCircle size={16} /> Rejeter
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Info
              label="Destinataire"
              value={current.recipientName || current.recipientCode || "—"}
            />
            <Info label="Email" value={current.recipientEmail || "—"} />
            <Info label="Valide jusqu'au" value={current.validUntil || "—"} />
            <Info
              label="Assigné à"
              value={current.assignedTo ? String(current.assignedTo) : "—"}
            />
            <Info
              label="Sous-total"
              value={money(current.subtotalAmount, current.currency)}
            />
            <Info
              label="TVA"
              value={money(current.taxAmount, current.currency)}
            />
            <Info
              label="Total"
              value={money(current.totalAmount, current.currency)}
            />
            <Info label="Envoyée" value={fmt(current.sentAt)} />
          </div>
          {(current.notes ||
            current.internalNotes ||
            current.rejectionReason) && (
            <div className="grid gap-3 md:grid-cols-3">
              {current.notes && (
                <Note title="Notes client" text={current.notes} />
              )}{" "}
              {current.internalNotes && (
                <Note title="Notes internes" text={current.internalNotes} />
              )}{" "}
              {current.rejectionReason && (
                <Note title="Motif rejet" text={current.rejectionReason} />
              )}
            </div>
          )}
          <section className="rounded-3xl bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-950">
                  Lignes de proposition
                </h4>
                <p className="text-sm text-gray-500">
                  Les montants sont recalculés par le backend.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingLine(null);
                  setIsLineOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white"
              >
                <Plus size={16} /> Ligne
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-2">Libellé</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2 text-right">Qté</th>
                    <th className="px-3 py-2 text-right">PU</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="bg-white">
                      <td className="rounded-l-2xl px-3 py-3">
                        <p className="font-medium text-gray-900">
                          {line.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {line.description}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {line.serviceType || "—"}
                        <br />
                        <span className="font-mono text-xs text-gray-400">
                          {line.serviceRefCode}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        {line.quantity}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        {money(line.unitPrice, line.currency)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">
                        {money(line.totalAmount, line.currency)}
                      </td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingLine(line);
                              setIsLineOpen(true);
                            }}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => deleteLineMutation.mutate(line.id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lines.length === 0 && (
                <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
                  Aucune ligne.
                </div>
              )}
            </div>
          </section>
          {(current.convertedInvoiceNumber ||
            current.convertedContractCode ||
            current.convertedSubscriptionNumber ||
            current.convertedPassNumber) && (
            <section className="rounded-3xl bg-gray-950 p-5 text-white">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <Mail size={16} /> Conversion tracée
              </h4>
              <div className="grid gap-2 md:grid-cols-4">
                <InfoDark
                  label="Facture"
                  value={current.convertedInvoiceNumber || "—"}
                />
                <InfoDark
                  label="Contrat"
                  value={current.convertedContractCode || "—"}
                />
                <InfoDark
                  label="Abonnement"
                  value={current.convertedSubscriptionNumber || "—"}
                />
                <InfoDark
                  label="Pass"
                  value={current.convertedPassNumber || "—"}
                />
              </div>
            </section>
          )}
        </div>
      )}
      <ProposalFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editingProposal={current}
        onSuccess={() => {
          setIsEditOpen(false);
          invalidate();
        }}
      />
      <ProposalLineFormModal
        isOpen={isLineOpen}
        onClose={() => {
          setIsLineOpen(false);
          setEditingLine(null);
        }}
        proposalId={current.id}
        editingLine={editingLine}
        onSuccess={() => {
          setIsLineOpen(false);
          setEditingLine(null);
          invalidate();
        }}
      />
    </ModalPortal>
  );
};
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
      {value}
    </p>
  </div>
);
const Note: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      {title}
    </p>
    <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
  </div>
);
const InfoDark: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-white/10 p-4">
    <p className="text-xs text-white/50">{label}</p>
    <p className="mt-1 font-mono text-sm text-white">{value}</p>
  </div>
);
