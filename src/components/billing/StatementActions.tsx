import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Send } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { saveBlob } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";

const split = (v: string) => v.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

/** Relevé d'un client : PDF (période optionnelle), CSV, envoi par e-mail. */
export const StatementActions: React.FC<{ customerType: string; customerCode: string; defaultEmail?: string }> = ({ customerType, customerCode, defaultEmail }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState(defaultEmail ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const base = `releve-${customerCode}`;

  const pdf = useMutation({
    mutationFn: async () => saveBlob(await billingService.getStatementPdf(customerType, customerCode, { from: from || undefined, to: to || undefined }), `${base}.pdf`),
    onError: (e: unknown) => toast.error(billingError(e, "Relevé PDF indisponible.")),
  });
  const csv = useMutation({
    mutationFn: async () => saveBlob(await billingService.getStatementCsv(customerType, customerCode), `${base}.csv`),
    onError: (e: unknown) => toast.error(billingError(e, "Relevé CSV indisponible.")),
  });
  const send = useMutation({
    mutationFn: () => billingService.sendStatement(customerType, customerCode, { to: split(recipients), from: from || undefined, until: to || undefined, message: message.trim() || undefined }),
    onSuccess: () => { toast.success("Relevé envoyé."); setSending(false); },
    onError: (e: unknown) => setError(billingError(e, "Envoi impossible.")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Du"><input type="date" className={FIELD_SOFT} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><input type="date" className={FIELD_SOFT} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <ActionButton variant="ghost" icon={Download} pending={pdf.isPending} onClick={() => pdf.mutate()}>PDF</ActionButton>
        <ActionButton variant="ghost" icon={FileSpreadsheet} pending={csv.isPending} onClick={() => csv.mutate()}>CSV</ActionButton>
        {!sending && <ActionButton variant="ghost" icon={Send} onClick={() => setSending(true)}>Envoyer</ActionButton>}
      </div>
      {sending && (
        <PanelForm title="Envoyer le relevé" submitLabel="Envoyer" pending={send.isPending} submitDisabled={split(recipients).length === 0} error={error} onCancel={() => { setSending(false); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); send.mutate(); }}>
          <Field label="Destinataires" required hint="Adresses séparées par une virgule"><input className={FIELD_SOFT} value={recipients} onChange={(e) => setRecipients(e.target.value)} /></Field>
          <Field label="Message"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        </PanelForm>
      )}
    </div>
  );
};
