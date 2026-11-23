import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import { CheckField, Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, formatMoney } from "../subscription/kitUtils";
import { billingError } from "./billingErrors";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";

/**
 * Création d'un avoir sur une facture
 */
export const CreditNotePanel: React.FC<{
  invoiceNumber: string;
  balanceDue: number;
  currency: string;
  onCancel: () => void;
  onCreated: (creditNote: BillingDocument) => void;
}> = ({ invoiceNumber, balanceDue, currency, onCancel, onCreated }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [validateImmediately, setValidateImmediately] = useState(false);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      billingService.createCreditNote(invoiceNumber, {
        amount: amount && parseFloat(amount) > 0 ? parseFloat(amount) : null,
        reason: reason.trim(),
        validateImmediately,
        applyImmediately,
      }),
    onSuccess: (creditNote) => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["billing-document", invoiceNumber] });
      toast.success(`Avoir ${creditNote.documentNumber} créé.`);
      onCreated(creditNote);
    },
    onError: (e: unknown) => setError(billingError(e, "Erreur lors de la création de l'avoir.")),
  });

  return (
    <PanelForm
      title="Créer un avoir"
      submitLabel="Créer l'avoir"
      pending={mutation.isPending}
      submitDisabled={!reason.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return setError("Le motif est obligatoire.");
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={`Montant (${currencyLabel(currency)})`} hint={`Vide : solde dû de la facture, soit ${formatMoney(balanceDue, currencyLabel(currency))}`}>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="25000"
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Motif" required>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Annulation de réservation, erreur de facturation"
            className={FIELD_SOFT}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CheckField checked={validateImmediately} onChange={setValidateImmediately} label="Sceller l'avoir immédiatement (SEFC)" />
        <CheckField checked={applyImmediately} onChange={setApplyImmediately} label="Appliquer sur cette facture immédiatement" />
      </div>
    </PanelForm>
  );
};

/** Réapplication d'un avoir scellé sur une autre facture du même client. */
export const ApplyToPanel: React.FC<{
  creditNoteNumber: string;
  onCancel: () => void;
  onApplied: (doc: BillingDocument, target: string) => void;
}> = ({ creditNoteNumber, onCancel, onApplied }) => {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => billingService.applyCreditNoteTo(creditNoteNumber, target.trim()),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["billing-document", creditNoteNumber] });
      toast.success(`Avoir appliqué sur ${target.trim()}.`);
      onApplied(doc, target.trim());
    },
    onError: (e: unknown) => setError(billingError(e, "Erreur lors de la ré-application de l'avoir.")),
  });

  return (
    <PanelForm
      title="Réappliquer l'avoir à une autre facture"
      submitLabel="Appliquer"
      pending={mutation.isPending}
      submitDisabled={!target.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="N° de la facture cible" hint="La facture cible doit appartenir au même client (INV- ou PRF-).">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="INV-2026-0042" className={`${FIELD_SOFT} font-mono`} />
      </Field>
    </PanelForm>
  );
};

/** Annulation d'un document */
export const CancelPanel: React.FC<{
  documentNumber: string;
  locked: boolean;
  onCancel: () => void;
  onCancelled: (doc: BillingDocument) => void;
}> = ({ documentNumber, locked, onCancel, onCancelled }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => billingService.cancelDocument(documentNumber, reason.trim()),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["billing-document", documentNumber] });
      toast.success(doc.locked ? "Facture annulée par un avoir. Elle reste validée (SEFC)." : "Document annulé.");
      onCancelled(doc);
    },
    onError: (e: unknown) => setError(billingError(e, "Erreur lors de l'annulation.")),
  });

  return (
    <PanelForm
      title="Annuler le document"
      submitLabel="Annuler le document"
      pending={mutation.isPending}
      submitDisabled={!reason.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {locked && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce document est scellé (SEFC) : l'annulation génère un avoir du solde dû, le valide et l'applique automatiquement.
        </p>
      )}
      <Field label="Motif de l'annulation" required>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
      </Field>
    </PanelForm>
  );
};
