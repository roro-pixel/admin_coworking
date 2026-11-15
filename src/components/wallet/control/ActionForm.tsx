import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WalletAdminActionRequest, WalletAdminActionType } from "../../../services/walletControl.service";
import { walletControlService } from "../../../services/walletControl.service";
import { Field, PanelForm } from "../../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { ACTION_TYPE_OPTIONS, ACTION_WITH_AMOUNT, ACTION_WITH_UNTIL } from "../walletLabels";

/** Demande d'action administrative sur un portefeuille : elle part en attente du second visa. */
export const ActionForm: React.FC<{ walletNumber: string; onClose: () => void }> = ({ walletNumber, onClose }) => {
  const qc = useQueryClient();
  const [type, setType] = useState<WalletAdminActionType>("SUSPEND");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsAmount = ACTION_WITH_AMOUNT.has(type);
  const hasUntil = ACTION_WITH_UNTIL.has(type);
  const amountNumber = Number(amount);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: WalletAdminActionRequest = { type, reason: reason.trim() };
      if (needsAmount) payload.amount = amountNumber;
      if (reference.trim()) payload.reference = reference.trim();
      if (hasUntil && until) payload.until = new Date(until).toISOString();
      return walletControlService.createAction(walletNumber, payload);
    },
    onSuccess: () => {
      toast.success("Action créée, en attente du second visa");
      qc.invalidateQueries({ queryKey: ["wallet-actions"] });
      qc.invalidateQueries({ queryKey: ["wallet-control-dashboard"] });
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Création impossible.")),
  });

  return (
    <PanelForm
      title="Nouvelle action"
      pending={mutation.isPending}
      submitLabel="Demander l'action"
      submitDisabled={!reason.trim() || (needsAmount && !(amountNumber > 0))}
      error={error}
      onCancel={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Type d'action" required>
          <select className={FIELD_SOFT} value={type} onChange={(e) => setType(e.target.value as WalletAdminActionType)}>
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {needsAmount && (
          <Field label="Montant" required>
            <input inputMode="decimal" className={FIELD_SOFT} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
        )}
        {hasUntil && (
          <Field label="Jusqu'au" hint="Facultatif">
            <input type="datetime-local" className={FIELD_SOFT} value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        )}
        <Field label="Référence" hint="Facultatif">
          <input className={`${FIELD_SOFT} font-mono`} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Motif" required className="md:col-span-2">
          <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-gray-500">L'action n'est exécutée qu'après l'approbation d'une autre personne.</p>
    </PanelForm>
  );
};
