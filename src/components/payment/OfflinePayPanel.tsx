import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
  OfflineMobileOperator,
  OfflinePaymentMethod,
  PayOfflinePayload,
  PaymentTransaction,
} from "../../services/payment.service";
import { Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../subscription/kitUtils";
import { PillChoice } from "../operations/opsKit";
import { CashSessionSelect } from "./CashSessionSelect";
import { OFFLINE_OPERATORS } from "./paymentLabels";
import { currencyLabel, parseDigits } from "./paymentUtils";

const METHODS: { value: OfflinePaymentMethod; label: string }[] = [
  { value: "CHEQUE", label: "Chèque" },
  { value: "BANK_TRANSFER", label: "Virement" },
  { value: "MOBILE_MONEY_OFFLINE", label: "Mobile money (numéro marchand)" },
];

interface OfflinePayPanelProps {
  /** Reste à payer affiché. */
  due: number;
  currency?: string;
  pay: (payload: PayOfflinePayload) => Promise<PaymentTransaction>;
  onDone: (txn: PaymentTransaction) => void;
  onCancel: () => void;
}

/**
 * Chèque, virement ou mobile money payé hors plateforme (MTN MoMo Pay, Airtel Money) saisi par la caisse.
 * Champs obligatoires selon le moyen : numéro de chèque et banque, référence du virement,
 * identifiant opérateur et opérateur. Une référence déjà encaissée est refusée (409).
 */
export const OfflinePayPanel: React.FC<OfflinePayPanelProps> = ({ due, currency = "XAF", pay, onDone, onCancel }) => {
  const money = (n: number) => formatMoney(n, currencyLabel(currency));

  const [method, setMethod] = useState<OfflinePaymentMethod>("CHEQUE");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [operator, setOperator] = useState<OfflineMobileOperator | "">("");
  const [amount, setAmount] = useState(0);
  const [session, setSession] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isCheque = method === "CHEQUE";
  const isTransfer = method === "BANK_TRANSFER";
  const isMobile = method === "MOBILE_MONEY_OFFLINE";

  const referenceLabel = isCheque ? "Numéro du chèque" : isTransfer ? "Référence du virement" : "Identifiant de la transaction chez l'opérateur";
  const payerLabel = isCheque ? "Tireur" : isTransfer ? "Donneur d'ordre" : "Titulaire du compte";

  const missing =
    !reference.trim() || (isCheque && !bankName.trim()) || (isMobile && !operator) || amount > due;

  const mutation = useMutation({
    mutationFn: () =>
      pay({
        paymentMethod: method,
        amount: amount > 0 ? amount : undefined,
        reference: reference.trim(),
        bankName: isCheque || isTransfer ? bankName.trim() || undefined : undefined,
        payerName: payerName.trim() || undefined,
        payerPhone: isMobile ? payerPhone.trim() || undefined : undefined,
        operator: isMobile && operator ? operator : undefined,
        cashSessionNumber: session || undefined,
      }),
    onSuccess: (txn) => {
      setError(null);
      onDone(txn);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'enregistrement du paiement.")),
  });

  return (
    <PanelForm
      title="Paiement hors plateforme"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing) return;
        setError(null);
        mutation.mutate();
      }}
      onCancel={onCancel}
      pending={mutation.isPending}
      submitLabel={`Enregistrer ${money(amount > 0 ? amount : due)}`}
      submitDisabled={missing || due <= 0}
      error={error}
    >
      <PillChoice<OfflinePaymentMethod>
        label="Moyen de paiement"
        value={method}
        onChange={(m) => {
          setMethod(m);
          setError(null);
        }}
        options={METHODS}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={referenceLabel} required hint="Une même référence ne peut être encaissée qu'une fois">
          <input
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
            className={`${FIELD_SOFT} font-mono`}
            autoFocus
          />
        </Field>

        {isMobile ? (
          <Field label="Opérateur" required>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as OfflineMobileOperator | "")}
              className={FIELD_SOFT}
            >
              <option value="">Choisir</option>
              {OFFLINE_OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={isCheque ? "Banque" : "Banque d'origine"} required={isCheque}>
            <input
              value={bankName}
              maxLength={180}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="BGFI Bank"
              className={FIELD_SOFT}
            />
          </Field>
        )}

        <Field label={payerLabel}>
          <input
            value={payerName}
            maxLength={180}
            onChange={(e) => setPayerName(e.target.value)}
            className={FIELD_SOFT}
          />
        </Field>

        {isMobile && (
          <Field label="Téléphone du payeur" hint="Imprimé masqué sur le reçu">
            <input
              value={payerPhone}
              maxLength={40}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="+242 06 123 45 67"
              className={`${FIELD_SOFT} font-mono`}
            />
          </Field>
        )}

        <Field
          label="Montant"
          hint={`Facultatif : laissez vide pour le reste à payer (${money(due)})`}
          error={amount > due ? `Au plus ${money(due)}` : undefined}
        >
          <input
            type="text"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(parseDigits(e.target.value))}
            placeholder={String(due)}
            className={`${FIELD_SOFT} tabular-nums`}
          />
        </Field>

        <CashSessionSelect
          value={session}
          onChange={setSession}
          label="Guichet (session de caisse)"
          hint="Facultatif. Rattache le paiement au guichet sans l'ajouter aux espèces."
        />
      </div>

      <p className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
        Ce paiement n'entre pas dans le compte des espèces : il apparaîtra à part dans le résumé de la session.
        {isMobile ? " Un remboursement de mobile money hors plateforme se fait à la main." : ""}
      </p>
    </PanelForm>
  );
};
