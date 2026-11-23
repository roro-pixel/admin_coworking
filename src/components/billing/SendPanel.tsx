import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, ItemRow, Section, StatusChip } from "../subscription/kit";
import { FIELD, FIELD_SOFT, formatDateTime } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { billingError } from "./billingErrors";
import { SENDING_CHANNEL_LABEL } from "./billingLabels";

const split = (v: string): string[] => v.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
const join = (a?: string[]) => (a ?? []).join(", ");

/**
 * Envoi d'un document au client (e-mail et/ou WhatsApp) + historique des envois.
 * Destinataires préremplis depuis les préférences du client (`billing-recipients`).
 */
export const SendPanel: React.FC<{
  documentNumber: string;
  customerType?: string;
  customerCode?: string;
  /** Après un envoi réussi */
  onSent?: () => void;
}> = ({ documentNumber, customerType, customerCode, onSent }) => {
  const qc = useQueryClient();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [message, setMessage] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipients = useQuery({
    queryKey: ["billing-recipients", customerType, customerCode],
    queryFn: () => billingService.getBillingRecipients(customerType!, customerCode!),
    enabled: !!customerType && !!customerCode,
  });
  useEffect(() => {
    const r = recipients.data;
    if (!r) return;
    setTo(join(r.to?.length ? r.to : r.suggestedEmails));
    setCc(join(r.cc));
    setBcc(join(r.bcc));
    setWa(join(r.whatsappNumbers?.length ? r.whatsappNumbers : r.suggestedPhones));
    if (r.channels?.length) {
      setEmail(r.channels.includes("EMAIL"));
      setWhatsapp(r.channels.includes("WHATSAPP"));
    }
  }, [recipients.data]);

  const sendings = useQuery({ queryKey: ["billing-sendings", documentNumber], queryFn: () => billingService.getSendings(documentNumber) });

  const send = useMutation({
    mutationFn: async () => {
      const channels = [email ? "EMAIL" : "", whatsapp ? "WHATSAPP" : ""].filter(Boolean);
      const data = {
        to: email ? split(to) : [],
        cc: email ? split(cc) : [],
        bcc: email ? split(bcc) : [],
        whatsappNumbers: whatsapp ? split(wa) : [],
        channels,
        message: message.trim() || undefined,
      };
      if (saveAsDefault && customerType && customerCode) {
        const { message: _m, ...prefs } = data;
        void _m;
        await billingService.saveBillingRecipients(customerType, customerCode, prefs);
      }
      return billingService.sendToRecipients(documentNumber, data);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["billing-sendings", documentNumber] });
      qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] });
      qc.invalidateQueries({ queryKey: ["billing-recipients", customerType, customerCode] });
      toast.success(r.some((x) => x.duplicate) ? "Envoi enregistré (doublon signalé)." : "Document envoyé.");
      setMessage("");
      setError(null);
      onSent?.();
    },
    onError: (e: unknown) => setError(billingError(e, "Envoi impossible.")),
  });

  const canSend = (email && split(to).length > 0) || (whatsapp && split(wa).length > 0);

  return (
    <div className="space-y-5">
      <Section title="Envoyer au client" icon={Send} description="E-mail avec le PDF, et/ou message WhatsApp">
        {recipients.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); send.mutate(); }}>
            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-5">
              <CheckField checked={email} onChange={setEmail} label="E-mail" />
              <CheckField checked={whatsapp} onChange={setWhatsapp} label="WhatsApp" />
            </div>
            {email && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="À" required hint="Adresses séparées par une virgule"><input className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
                <Field label="Copie (cc)"><input className={FIELD} value={cc} onChange={(e) => setCc(e.target.value)} /></Field>
                <Field label="Copie cachée (cci)"><input className={FIELD} value={bcc} onChange={(e) => setBcc(e.target.value)} /></Field>
              </div>
            )}
            {whatsapp && (
              <Field label="Numéros WhatsApp" required hint="Format international, séparés par une virgule">
                <input className={FIELD} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+242060000000" />
              </Field>
            )}
            <Field label="Message" hint="Facultatif : ajouté au message standard">
              <textarea rows={3} className={`${FIELD_SOFT} resize-none`} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            {customerType && customerCode && <CheckField checked={saveAsDefault} onChange={setSaveAsDefault} label="Garder ces destinataires pour les prochains envois de ce client" />}
            <div className="flex justify-end">
              <ActionButton type="submit" icon={Send} pending={send.isPending} disabled={!canSend}>Envoyer</ActionButton>
            </div>
          </form>
        )}
      </Section>

      <Section title="Historique des envois" icon={Mail}>
        {sendings.isLoading ? <Skeleton className="h-14 w-full rounded-2xl" />
          : sendings.isError ? <ErrorBlock message="Impossible de charger l'historique." onRetry={() => sendings.refetch()} />
          : (sendings.data ?? []).length === 0 ? <EmptyState icon={Mail} title="Aucun envoi" />
          : (
            <div className="space-y-2">
              {(sendings.data ?? []).map((s) => (
                <ItemRow key={s.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{SENDING_CHANNEL_LABEL[s.channel ?? ""] ?? s.channel}{s.duplicate ? " · doublon" : ""}</p>
                      <p className="mt-0.5 break-words text-xs text-gray-500">{(s.to ?? []).join(", ")}{s.cc?.length ? ` · cc ${s.cc.join(", ")}` : ""}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(s.sentAt)}{s.sentByName ? ` · ${s.sentByName}` : ""}{s.seenAt ? ` · vu ${formatDateTime(s.seenAt)}` : ""}</p>
                      {s.error && <p className="mt-1 text-xs text-red-600">{s.error}</p>}
                    </div>
                    <StatusChip tone={s.error ? "danger" : s.seenAt || s.deliveredAt ? "success" : "info"}>{s.error ? "Échec" : s.seenAt ? "Vu" : s.deliveredAt ? "Remis" : s.status ?? "Envoyé"}</StatusChip>
                  </div>
                </ItemRow>
              ))}
            </div>
          )}
      </Section>
    </div>
  );
};
