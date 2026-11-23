import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletControlService } from "../../../services/walletControl.service";
import { Field, PanelForm } from "../../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";

/** Paie une facture avec le solde du portefeuille. Montant facultatif : sans lui, le reste dû est réglé. */
export const PayInvoiceForm: React.FC<{ walletNumber: string; onClose: () => void }> = ({ walletNumber, onClose }) => {
  const qc = useQueryClient();
  const [documentNumber, setDocumentNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      walletControlService.payInvoice(walletNumber, {
        documentNumber: documentNumber.trim(),
        amount: amount ? Number(amount) : undefined,
      }),
    onSuccess: () => {
      toast.success("Facture payée avec le portefeuille.");
      ["wallet", "wallet-ledger", "wallets", "payment-intents"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Paiement refusé.")),
  });

  return (
    <PanelForm
      title="Payer une facture avec ce portefeuille"
      pending={mutation.isPending}
      submitLabel="Payer"
      submitDisabled={!documentNumber.trim() || (amount !== "" && !(Number(amount) > 0))}
      error={error}
      onCancel={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="N° du document" required>
          <input className={`${FIELD_SOFT} font-mono`} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
        </Field>
        <Field label="Montant" hint="Facultatif : laissez vide pour le reste dû">
          <input inputMode="decimal" className={FIELD_SOFT} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
      </div>
      <p className="text-xs text-gray-500">Le solde disponible est débité immédiatement, sans second visa.</p>
    </PanelForm>
  );
};
