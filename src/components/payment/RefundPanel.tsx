import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentTransaction } from "../../services/payment.service";
import { ActionButton, Field } from "../subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../subscription/kitUtils";
import { CashSessionSelect } from "./CashSessionSelect";
import { currencyLabel, parseDigits } from "./paymentUtils";

export type RefundMode = "refund" | "reverse";

/**
 * Remboursement (PAYMENT:REFUND) ou extourne (PAYMENT:PROCESS) d'une transaction réussie.
 * Deux temps : saisie, puis confirmation explicite des effets automatiques.
 * Pour un paiement en espèces, la session d'où sortent les espèces est obligatoire.
 */
export const RefundPanel: React.FC<{
  txn: PaymentTransaction;
  mode: RefundMode;
  /** Reste remboursable (montant d'origine - remboursements déjà faits). */
  remaining: number;
  currency?: string;
  onClose: () => void;
  onDone: (result: PaymentTransaction) => void;
}> = ({ txn, mode, remaining, currency = "XAF", onClose, onDone }) => {
  const refund = mode === "refund";
  const max = remaining;
  const method = txn.paymentMethod ?? txn.method;
  const isCash = method === "CASH";
  const isMobile = method === "MOBILE_MONEY";
  const money = (n: number) => formatMoney(n, currencyLabel(currency));

  const [amount, setAmount] = useState(max);
  const [reason, setReason] = useState("");
  const [session, setSession] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = amount >= max;
  const needSession = refund && isCash;
  const invalid = amount <= 0 || amount > max || !reason.trim() || (needSession && !session);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount,
        reason: reason.trim(),
        cashSessionNumber: session || undefined,
      };
      return refund
        ? paymentService.refundTransaction(txn.transactionNumber, payload)
        : paymentService.reverseTransaction(txn.transactionNumber, payload);
    },
    onSuccess: (r) => {
      setError(null);
      onDone(r);
    },
    onError: (e: unknown) => {
      setConfirming(false);
      setError(apiMessage(e, refund ? "Remboursement refusé." : "Extourne refusée."));
    },
  });

  const verb = refund ? "Rembourser" : "Extourner";

  return (
    <div className="mt-3 rounded-2xl bg-gray-50 p-4">
      <p className={`mb-3 text-sm font-bold ${refund ? "text-gray-950" : "text-red-700"}`}>
        {refund ? "Remboursement" : "Extourne"}
      </p>

      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {!confirming ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Montant" hint={`Maximum ${money(max)}`}>
              <input
                type="text"
                inputMode="numeric"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Math.min(parseDigits(e.target.value), max))}
                className={`${FIELD} tabular-nums`}
              />
            </Field>
            <Field label="Motif" required>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
            </Field>
            {isCash && (
              <div className="sm:col-span-2">
                <CashSessionSelect
                  value={session}
                  onChange={setSession}
                  required={needSession}
                  label="Session d'où sortent les espèces"
                  hint={
                    needSession
                      ? "Une sortie « Remboursement » est écrite dans cette session."
                      : "Facultatif pour une extourne."
                  }
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={onClose}>
              Annuler
            </ActionButton>
            <ActionButton variant={refund ? "primary" : "danger"} disabled={invalid} onClick={() => setConfirming(true)}>
              Continuer
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="font-bold">
                {verb} {money(amount)} sur {txn.transactionNumber} ?
              </p>
              <p>L'opération est définitive.</p>
              {full ? (
                <p>
                  Le remboursement couvre tout le reste remboursable : les factures liées seront annulées et archivées, et l'abonnement, le pass ou la
                  réservation d'origine sera annulé.
                </p>
              ) : (
                <p>Remboursement partiel : la facture redevient due du montant remboursé.</p>
              )}
              {isMobile && (
                <p>Mobile money : la demande part chez l'opérateur et sera confirmée plus tard (la facture n'est rouverte qu'à la confirmation).</p>
              )}
              {isCash && refund && <p>Une sortie d'espèces « Remboursement » est écrite dans la session {session}.</p>}
              {isCash && !refund && !session && <p>Aucune sortie de caisse n'est écrite : saisissez-la à part dans la caisse.</p>}
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" disabled={mutation.isPending} onClick={() => setConfirming(false)}>
              Retour
            </ActionButton>
            <ActionButton variant={refund ? "primary" : "danger"} pending={mutation.isPending} onClick={() => mutation.mutate()}>
              {verb}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
};
