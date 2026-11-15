import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { MobileMoneyDeposit, PaymentIntent } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, Detail, Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { currencyLabel } from "./paymentUtils";

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: PaymentIntent;
  onPaymentSuccess?: (transactionNumber: string) => void;
}

/**
 * Paiement Mobile Money. Même nom et mêmes props qu'avant, mais ce n'est plus une modale :
 * le formulaire s'ouvre en panneau dans la page de l'intention.
 */
export const MobileMoneyModal: React.FC<MobileMoneyModalProps> = ({
  isOpen,
  onClose,
  intent,
  onPaymentSuccess,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [correspondent, setCorrespondent] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MobileMoneyDeposit | null>(null);

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["mobile-money-providers"],
    queryFn: () => paymentService.getMobileMoneyProviders(),
    enabled: isOpen,
  });

  const depositMutation = useMutation({
    mutationFn: () =>
      paymentService.initiateMobileMoneyDeposit({
        intentNumber: intent.intentNumber,
        phoneNumber,
        correspondent,
        amount: amount > 0 ? amount : undefined,
        createdBy: admin?.email || "admin",
      }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      queryClient.invalidateQueries({ queryKey: ["payment-intent", intent.intentNumber] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions", intent.intentNumber] });
      if (data.transactionNumber && onPaymentSuccess) {
        onPaymentSuccess(data.transactionNumber);
      }
    },
    onError: (err: unknown) => setError(apiMessage(err, "Erreur lors de l'initiation du paiement.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      return;
    }
    if (!correspondent) {
      setError("Veuillez sélectionner un fournisseur.");
      return;
    }
    setError(null);
    depositMutation.mutate();
  };

  if (!isOpen) return null;

  if (result) {
    return (
      <div className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-emerald-200 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <h4 className="text-base font-bold text-gray-950">Paiement initié</h4>
            {result.customerMessage && <p className="text-sm text-gray-500">{result.customerMessage}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Statut">{result.status}</Detail>
          <Detail label="Fournisseur">{result.provider}</Detail>
          <Detail label="Montant">{formatMoney(result.amount, currencyLabel(result.currency))}</Detail>
          <Detail label="Transaction" mono>{result.transactionNumber}</Detail>
          <Detail label="Identifiant du dépôt PawaPay" mono wide>{result.depositId}</Detail>
        </dl>
        <div className="mt-5 flex justify-end">
          <ActionButton onClick={onClose}>Fermer</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <PanelForm
      title="Paiement Mobile Money"
      onSubmit={handleSubmit}
      onCancel={onClose}
      pending={depositMutation.isPending}
      submitLabel="Initier le paiement"
      submitDisabled={!phoneNumber.trim() || !correspondent}
      error={error}
    >
      <p className="text-sm text-gray-500">
        Intention <span className="font-mono font-semibold text-gray-800">{intent.intentNumber}</span> ·{" "}
        <b className="text-gray-950">{formatMoney(intent.amount, currencyLabel(intent.currency))}</b>
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Fournisseur" required>
          {providersLoading ? (
            <Skeleton className="h-11 w-full rounded-2xl" />
          ) : (
            <select value={correspondent} onChange={(e) => setCorrespondent(e.target.value)} className={FIELD_SOFT}>
              <option value="">Choisir</option>
              {providers.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.displayName} ({p.countryCode})
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Numéro de téléphone" required hint="Format international sans « + »">
          <input
            type="text"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="242061135836"
            className={`${FIELD_SOFT} font-mono`}
          />
        </Field>
        <Field label="Montant" hint="Laissez vide pour le solde restant de l'intention">
          <input
            type="text"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setAmount(v === "" ? 0 : parseInt(v, 10));
            }}
            placeholder={`Total : ${intent.amount.toLocaleString("fr-FR")}`}
            className={FIELD_SOFT}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
