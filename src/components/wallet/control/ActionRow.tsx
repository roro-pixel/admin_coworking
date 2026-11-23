import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import type { AdminActionView } from "../../../services/walletControl.service";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, Field, ItemRow, StatusChip } from "../../subscription/kit";
import { FIELD_SOFT, formatDateTime, formatMoney } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { currencyLabel } from "../../payment/paymentUtils";
import { ACTION_STATUS, ACTION_TYPE_LABEL } from "../walletLabels";
import { OpenFields } from "./OpenFields";
import { extraEntries } from "./controlUtils";

const KNOWN = ["actionNumber", "walletNumber", "type", "status", "amount", "currency", "reference", "reason", "requestedBy", "approvedBy", "approvedAt", "rejectedBy", "rejectionReason", "executedAt", "resultReference", "createdAt"];

/** Une action administrative à deux visas, avec approbation et rejet quand elle attend le second visa. */
export const ActionRow: React.FC<{ action: AdminActionView; currency?: string; showWallet?: boolean }> = ({ action, currency = "XAF", showWallet = true }) => {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wallet-actions"] });
    qc.invalidateQueries({ queryKey: ["wallet-control-dashboard"] });
    qc.invalidateQueries({ queryKey: ["wallets"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => walletControlService.approveAction(action.actionNumber),
    onSuccess: refresh,
  });
  const rejectMutation = useMutation({
    mutationFn: () => walletControlService.rejectAction(action.actionNumber, reason.trim()),
    onSuccess: () => {
      setRejecting(false);
      setReason("");
      refresh();
    },
  });

  const askApprove = () =>
    toast.confirm({
      message: `Approuver ${ACTION_TYPE_LABEL[action.type] ?? action.type} sur ${action.walletNumber} ?`,
      detail: "L'action sera exécutée immédiatement. Le second visa doit venir d'une autre personne que le demandeur.",
      confirmLabel: "Approuver",
      pendingLabel: "Approbation",
      successMessage: "Action approuvée et exécutée",
      errorMessage: "Approbation refusée : le second visa doit venir d'une autre personne",
      onConfirm: () => approveMutation.mutateAsync(),
    });
  const askReject = () =>
    toast.confirm({
      message: `Rejeter ${action.actionNumber} ?`,
      detail: `Motif : ${reason.trim()}`,
      confirmLabel: "Rejeter",
      pendingLabel: "Rejet",
      successMessage: "Action rejetée",
      errorMessage: "Rejet impossible",
      tone: "danger",
      onConfirm: () => rejectMutation.mutateAsync(),
    });

  const st = ACTION_STATUS[action.status] ?? { label: action.status, tone: "neutral" as const };
  const pending = action.status === "PENDING_APPROVAL";

  return (
    <ItemRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-950">{ACTION_TYPE_LABEL[action.type] ?? action.type}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {showWallet && (
              <Link to={`/wallets/${action.walletNumber}`} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                {action.walletNumber}
              </Link>
            )}
            {showWallet && " · "}
            {action.actionNumber}
            {action.createdAt ? ` · ${formatDateTime(action.createdAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {typeof action.amount === "number" && <p className="text-sm font-bold tabular-nums text-[color:var(--logo-pink-dark)]">{formatMoney(action.amount, action.currency ? currencyLabel(action.currency) : currency)}</p>}
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
        </div>
      </div>
      {action.reason && <p className="mt-2 text-sm text-gray-600">{action.reason}</p>}
      <p className="mt-1 text-xs text-gray-400">
        {action.requestedBy ? `Demandée par ${action.requestedBy}` : ""}
        {action.approvedBy ? ` · approuvée par ${action.approvedBy}` : ""}
        {action.rejectedBy ? ` · rejetée par ${action.rejectedBy}${action.rejectionReason ? ` (${action.rejectionReason})` : ""}` : ""}
        {action.executedAt ? ` · exécutée le ${formatDateTime(action.executedAt)}` : ""}
        {action.resultReference ? ` · réf. ${action.resultReference}` : ""}
      </p>
      <OpenFields entries={extraEntries(action, KNOWN)} className="mt-2" />
      {pending && !rejecting && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton icon={Check} className="!px-4 !py-2" onClick={askApprove}>
            Approuver
          </ActionButton>
          <ActionButton variant="ghost" icon={X} className="!px-4 !py-2" onClick={() => setRejecting(true)}>
            Rejeter
          </ActionButton>
        </div>
      )}
      {pending && rejecting && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto]">
          <Field label="Motif du rejet" required>
            <input className={`${FIELD_SOFT} !bg-white`} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex items-end gap-2">
            <ActionButton variant="ghost" onClick={() => setRejecting(false)}>
              Annuler
            </ActionButton>
            <ActionButton variant="danger" disabled={!reason.trim()} onClick={askReject}>
              Rejeter
            </ActionButton>
          </div>
        </div>
      )}
    </ItemRow>
  );
};
