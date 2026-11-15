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

const eventTypes = [
  "CONTRACT_BOUND",
  "NOTE_ADDED",
  "STATUS_CHANGED",
  "PAYMENT_RECEIVED",
  "MANUAL_ACTION",
  "CUSTOM",
];

/** Remplace CreateTimelineEventModal : formulaire déplié dans l'onglet Timeline. */
export const TimelineEventPanel: React.FC<Props> = ({
  subscriptionNumber,
  ownerType,
  ownerCode,
  onDone,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("MANUAL_ACTION");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createTimelineEvent({
        subscriptionNumber,
        ownerType,
        ownerCode,
        eventType,
        title,
        description: description || undefined,
        sourceType: sourceType || undefined,
        sourceId: sourceId || undefined,
        occurredAt: `${occurredAt}:00Z`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-timeline", subscriptionNumber] });
      toast.success("Événement ajouté");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de la création de l'événement.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Le titre est requis.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  return (
    <PanelForm
      title="Ajouter un événement"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={createMutation.isPending}
      submitLabel="Ajouter l'événement"
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Type d'événement" required>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={FIELD_SOFT}>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date d'occurrence" required>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Titre" required className="md:col-span-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="ex: Contrat lié"
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${FIELD_SOFT} resize-none`}
          />
        </Field>
        <Field label="Type source">
          <input
            type="text"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            placeholder="ex: CONTRACT"
            className={FIELD_SOFT}
          />
        </Field>
        <Field label="ID source">
          <input
            type="text"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="ex: CTR-202604-000001"
            className={FIELD_SOFT}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
