import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  onDone: () => void;
  onCancel: () => void;
}

const notificationTypes = [
  "RENEWAL_UPCOMING",
  "PAYMENT_DUE",
  "SUBSCRIPTION_ACTIVATED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_SUSPENDED",
  "CUSTOM",
];

type Channel = "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "WEBHOOK";

const channels: { value: Channel; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "IN_APP", label: "In-app" },
  { value: "WEBHOOK", label: "Webhook" },
];

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 16);
};

/** Remplace CreateNotificationModal : formulaire déplié dans l'onglet Notifications. */
export const NotificationPanel: React.FC<Props> = ({
  subscriptionNumber,
  ownerType,
  ownerCode,
  onDone,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [notificationType, setNotificationType] = useState("RENEWAL_UPCOMING");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState(tomorrow);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createNotification({
        subscriptionNumber,
        ownerType,
        ownerCode,
        notificationType,
        channel,
        recipient,
        subject: subject || undefined,
        body,
        scheduledAt: `${scheduledAt}:00Z`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-notifications", subscriptionNumber],
      });
      toast.success("Notification planifiée");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de la création de la notification.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setErrorMessage("Le destinataire est requis.");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Le corps est requis.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  return (
    <PanelForm
      title="Planifier une notification"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={createMutation.isPending}
      submitLabel="Planifier"
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Type" required>
          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
            className={FIELD_SOFT}
          >
            {notificationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Canal" required>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className={FIELD_SOFT}
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destinataire" required>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            placeholder={
              channel === "EMAIL"
                ? "client@example.com"
                : channel === "SMS"
                  ? "+237600000000"
                  : "Destinataire"
            }
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Planifiée le" required>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className={FIELD_SOFT}
          />
        </Field>
        {channel === "EMAIL" && (
          <Field label="Sujet" className="md:col-span-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ex: Votre abonnement arrive à renouvellement"
              className={FIELD_SOFT}
            />
          </Field>
        )}
        <Field label="Corps" required className="md:col-span-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            placeholder="Contenu du message..."
            className={`${FIELD_SOFT} resize-none`}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
