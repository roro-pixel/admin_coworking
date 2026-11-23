import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2 } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentIntent, PaymentLink } from "../../services/payment.service";
import { ActionButton, Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { copyText, parseDigits } from "./paymentUtils";

/**
 * Lien de paiement envoyé au client (page publique servie par le serveur, sans compte).
 * L'URL n'est renvoyée qu'à la création : un nouveau lien remplace l'ancien pour cette intention.
 */
export const PaymentLinkPanel: React.FC<{
  intent: PaymentIntent;
  onClose: () => void;
}> = ({ intent, onClose }) => {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(0);
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => paymentService.createPaymentLink(intent.intentNumber, minutes >= 5 ? minutes : undefined),
    onSuccess: (data) => {
      setLink(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["payment-intent", intent.intentNumber] });
    },
    onError: (e: unknown) => setError(apiMessage(e, "Impossible de créer le lien de paiement.")),
  });

  const copy = async () => {
    if (!link) return;
    const ok = await copyText(link.checkoutUrl);
    setCopied(ok);
    if (!ok) toast.error("Copie impossible : sélectionnez le lien à la main.");
    else setTimeout(() => setCopied(false), 2000);
  };

  if (link) {
    return (
      <div className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-emerald-200 sm:p-5">
        <h4 className="text-base font-bold text-gray-950">Lien de paiement prêt</h4>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link.checkoutUrl} onFocus={(e) => e.currentTarget.select()} className={`${FIELD_SOFT} font-mono text-xs`} />
          <ActionButton icon={copied ? Check : Copy} onClick={copy}>
            {copied ? "Copié" : "Copier"}
          </ActionButton>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {link.expiresAt ? `Valable jusqu'au ${formatDateTime(link.expiresAt)}. ` : ""}
          {link.emailedTo ? `Envoyé par e-mail à ${link.emailedTo}.` : "Aucun e-mail envoyé : transmettez le lien au client."}
        </p>
        <div className="mt-4 flex justify-end">
          <ActionButton variant="ghost" onClick={onClose}>
            Fermer
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <PanelForm
      title="Lien de paiement"
      onSubmit={(e) => {
        e.preventDefault();
        if (minutes !== 0 && minutes < 5) {
          setError("La durée minimale est de 5 minutes.");
          return;
        }
        setError(null);
        mutation.mutate();
      }}
      onCancel={onClose}
      pending={mutation.isPending}
      submitLabel={intent.paymentLinkToken ? "Générer un nouveau lien" : "Générer le lien"}
      error={error}
    >
      {intent.paymentLinkToken && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Un lien existe déjà{intent.paymentLinkExpiresAt ? ` (jusqu'au ${formatDateTime(intent.paymentLinkExpiresAt)})` : ""}. Son adresse
          n'est plus consultable : en générer un nouveau le remplace.
        </p>
      )}
      <Field label="Durée de validité (minutes)" hint="Facultatif, 5 minutes au minimum. Le lien prolonge l'échéance de l'intention.">
        <div className="relative">
          <Link2 size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            inputMode="numeric"
            value={minutes === 0 ? "" : minutes}
            onChange={(e) => setMinutes(parseDigits(e.target.value))}
            placeholder="Durée par défaut (24 h)"
            className={`${FIELD_SOFT} pl-10 tabular-nums`}
          />
        </div>
      </Field>
    </PanelForm>
  );
};
