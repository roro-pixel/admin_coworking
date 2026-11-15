import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Send, X } from "lucide-react";
import { passAccessService } from "../../../services/passAccess.service";
import type { PassTransferResult } from "../../../services/passAccess.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, Field, ItemRow, PanelForm, StatusChip } from "../kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../kitUtils";
import { toast } from "../../ui/toastStore";
import { SubscriberPicker } from "../promotions/SubscriberPicker";
import type { SubscriberRef } from "../promotions/SubscriberPicker";
import { TRANSFER_STATUS } from "./passAccessLabels";

/** Résultat d'une demande ou d'une décision de transfert, avec accepter, rejeter et annuler. */
export const TransferCard: React.FC<{ transfer: PassTransferResult; onChange: (t: PassTransferResult | null) => void }> = ({ transfer, onChange }) => {
  const { admin } = useAuth();
  const actor = admin?.email || String(admin?.id || "admin");
  const [mode, setMode] = useState<null | "reject" | "cancel">(null);
  const [reason, setReason] = useState("");

  const accept = useMutation({
    mutationFn: () => passAccessService.acceptTransfer(transfer.transferNumber, actor),
    onSuccess: (t) => onChange(t),
  });
  const reject = useMutation({
    mutationFn: () => passAccessService.rejectTransfer(transfer.transferNumber, reason.trim()),
    onSuccess: (t) => {
      setMode(null);
      setReason("");
      onChange(t);
    },
  });
  const cancel = useMutation({
    mutationFn: () => passAccessService.cancelTransfer(transfer.transferNumber, reason.trim() || undefined),
    onSuccess: () => {
      setMode(null);
      setReason("");
      onChange({ ...transfer, status: "CANCELLED" });
    },
  });

  const askAccept = () =>
    toast.confirm({
      message: `Accepter le transfert ${transfer.transferNumber} ?`,
      detail: "Le pass change de propriétaire.",
      confirmLabel: "Accepter",
      pendingLabel: "Acceptation",
      successMessage: "Transfert accepté",
      errorMessage: "Acceptation refusée ou impossible",
      onConfirm: () => accept.mutateAsync(),
    });
  const askReject = () =>
    toast.confirm({
      message: `Rejeter le transfert ${transfer.transferNumber} ?`,
      detail: `Motif : ${reason.trim()}`,
      confirmLabel: "Rejeter",
      pendingLabel: "Rejet",
      successMessage: "Transfert rejeté",
      errorMessage: "Rejet impossible",
      tone: "danger",
      onConfirm: () => reject.mutateAsync(),
    });
  const askCancel = () =>
    toast.confirm({
      message: `Annuler le transfert ${transfer.transferNumber} ?`,
      detail: reason.trim() ? `Motif : ${reason.trim()}` : "Le pass reste à son propriétaire actuel.",
      confirmLabel: "Annuler le transfert",
      pendingLabel: "Annulation",
      successMessage: "Transfert annulé",
      errorMessage: "Annulation impossible",
      tone: "danger",
      onConfirm: () => cancel.mutateAsync(),
    });

  const st = TRANSFER_STATUS[transfer.status] ?? { label: transfer.status, tone: "neutral" as const };
  const pending = transfer.status === "PENDING_ACCEPTANCE";

  return (
    <ItemRow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm font-bold text-gray-950">{transfer.transferNumber}</p>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
      </div>
      {pending && !mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton icon={Check} className="!px-4 !py-2" onClick={askAccept}>
            Accepter
          </ActionButton>
          <ActionButton variant="ghost" icon={X} className="!px-4 !py-2" onClick={() => setMode("reject")}>
            Rejeter
          </ActionButton>
          <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => setMode("cancel")}>
            Annuler le transfert
          </ActionButton>
        </div>
      )}
      {pending && mode && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto]">
          <Field label={mode === "reject" ? "Motif du rejet" : "Motif de l'annulation"} required={mode === "reject"}>
            <input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex items-end gap-2">
            <ActionButton variant="ghost" onClick={() => setMode(null)}>
              Retour
            </ActionButton>
            <ActionButton variant="danger" disabled={mode === "reject" && !reason.trim()} onClick={mode === "reject" ? askReject : askCancel}>
              {mode === "reject" ? "Rejeter" : "Annuler"}
            </ActionButton>
          </div>
        </div>
      )}
    </ItemRow>
  );
};

/** Demande de transfert d'un pass vers un autre propriétaire. */
export const TransferRequestForm: React.FC<{ passNumber: string; onCreated: (t: PassTransferResult) => void; onCancel?: () => void }> = ({ passNumber, onCreated, onCancel }) => {
  const { admin } = useAuth();
  const requestedBy = admin?.email || String(admin?.id || "admin");
  const [to, setTo] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      passAccessService.requestTransfer(
        passNumber,
        { toOwnerType: to.type, toOwnerCode: to.code, reason: reason.trim() || undefined, transferFee: fee ? Number(fee) : undefined },
        requestedBy,
      ),
    onSuccess: (t) => {
      toast.success("Transfert demandé");
      setTo({ type: to.type, code: "" });
      setReason("");
      setFee("");
      setError(null);
      onCreated(t);
    },
    onError: (e) => setError(apiMessage(e, "Demande impossible.")),
  });

  return (
    <PanelForm
      title="Transférer ce pass"
      pending={mutation.isPending}
      submitLabel="Demander le transfert"
      submitDisabled={!to.code}
      error={error}
      onCancel={onCancel ?? (() => undefined)}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <SubscriberPicker value={to} onChange={setTo} label="Nouveau propriétaire" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Motif">
          <input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Frais de transfert" hint="Facultatif">
          <input inputMode="decimal" className={FIELD_SOFT} value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
      </div>
    </PanelForm>
  );
};

/** Raccourci d'icône pour le bouton d'ouverture du formulaire. */
export const TransferOpenButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <ActionButton icon={Send} onClick={onClick}>
    Transférer ce pass
  </ActionButton>
);
