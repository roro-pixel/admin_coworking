import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  onSuccess: () => void;
}

const notificationTypes = [
  "RENEWAL_UPCOMING",
  "PAYMENT_DUE",
  "SUBSCRIPTION_ACTIVATED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_SUSPENDED",
  "CUSTOM",
];

const channels = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "IN_APP", label: "In-app" },
  { value: "WEBHOOK", label: "Webhook" },
];

export const CreateNotificationModal: React.FC<
  CreateNotificationModalProps
> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  ownerType,
  ownerCode,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [notificationType, setNotificationType] = useState("RENEWAL_UPCOMING");
  const [channel, setChannel] = useState<
    "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "WEBHOOK"
  >("EMAIL");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotificationType("RENEWAL_UPCOMING");
      setChannel("EMAIL");
      setRecipient("");
      setSubject("");
      setBody("");
      setScheduledAt(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
      });
      setErrorMessage(null);
    }
  }, [isOpen]);

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
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ??
          "Erreur lors de la création de la notification.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Planifier une notification</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {notificationTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canal *
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {channels.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destinataire *
          </label>
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        {channel === "EMAIL" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ex: Votre abonnement arrive à renouvellement"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Corps *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            placeholder="Contenu du message..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planifiée le *
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Planification...
              </>
            ) : (
              "Planifier"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
