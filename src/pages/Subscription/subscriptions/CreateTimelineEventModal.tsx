import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

// ─── CreateTimelineEventModal ─────────────────────────────────────────────────

interface CreateTimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string;
  ownerType: string;
  ownerCode: string;
  onSuccess: () => void;
}

const eventTypes = [
  "CONTRACT_BOUND",
  "NOTE_ADDED",
  "STATUS_CHANGED",
  "PAYMENT_RECEIVED",
  "MANUAL_ACTION",
  "CUSTOM",
];

export const CreateTimelineEventModal: React.FC<
  CreateTimelineEventModalProps
> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  ownerType,
  ownerCode,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("MANUAL_ACTION");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEventType("MANUAL_ACTION");
      setTitle("");
      setDescription("");
      setSourceType("");
      setSourceId("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
      setErrorMessage(null);
    }
  }, [isOpen]);

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
      queryClient.invalidateQueries({
        queryKey: ["subscription-timeline", subscriptionNumber],
      });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ??
          "Erreur lors de la création de l'événement.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Ajouter un événement</h3>
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
              Type d'événement *
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'occurrence *
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="ex: Contrat lié"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type source
            </label>
            <input
              type="text"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              placeholder="ex: CONTRACT"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID source
            </label>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="ex: CTR-202604-000001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
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
                <Loader2 size={16} className="animate-spin" /> Création...
              </>
            ) : (
              "Ajouter l'événement"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
