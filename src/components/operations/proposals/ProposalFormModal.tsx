import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { ModalPortal } from "../..//ui/ModalPortal";
import { operationsService } from "../../../services/operations.service";
import type {
  ProposalRecipientType,
  ProposalResponse,
} from "../../../services/operations.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingProposal: ProposalResponse | null;
  onSuccess: (proposal: ProposalResponse) => void;
  leadId?: number | null;
}
const recipientTypes: { value: ProposalRecipientType; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "MEMBER", label: "Membre" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];
const buildForm = (p: ProposalResponse | null, leadId?: number | null) => ({
  title: p?.title || "",
  opportunityId: p?.opportunityId?.toString() || "",
  leadId: p?.leadId?.toString() || (leadId ? String(leadId) : ""),
  recipientType: (p?.recipientType || "CUSTOMER") as ProposalRecipientType,
  recipientCode: p?.recipientCode || "",
  recipientName: p?.recipientName || "",
  recipientEmail: p?.recipientEmail || "",
  validUntil: p?.validUntil || "",
  currency: p?.currency || "XAF",
  notes: p?.notes || "",
  internalNotes: p?.internalNotes || "",
  assignedTo: p?.assignedTo?.toString() || "",
});
export const ProposalFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingProposal,
  onSuccess,
  leadId,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(editingProposal, leadId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      setForm(buildForm(editingProposal, leadId));
      setErrorMessage(null);
    }
  }, [editingProposal, isOpen, leadId]);
  const payload = () => ({
    title: form.title,
    opportunityId: form.opportunityId ? Number(form.opportunityId) : null,
    leadId: form.leadId ? Number(form.leadId) : null,
    recipientType: form.recipientType || null,
    recipientCode: form.recipientCode || null,
    recipientName: form.recipientName || null,
    recipientEmail: form.recipientEmail || null,
    validUntil: form.validUntil || null,
    currency: form.currency || "XAF",
    notes: form.notes || null,
    internalNotes: form.internalNotes || null,
    assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
  });
  const createMutation = useMutation({
    mutationFn: () => operationsService.createProposal(payload()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-proposals"] });
      onSuccess(data);
    },
    onError: (e: any) =>
      setErrorMessage(
        e?.response?.data?.message || "Erreur création proposition.",
      ),
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      operationsService.updateProposal(editingProposal!.id, payload()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-proposals"] });
      queryClient.invalidateQueries({
        queryKey: ["crm-proposal", editingProposal?.id],
      });
      onSuccess(data);
    },
    onError: (e: any) =>
      setErrorMessage(
        e?.response?.data?.message || "Erreur modification proposition.",
      ),
  });
  if (!isOpen) return null;
  const isPending = createMutation.isPending || updateMutation.isPending;
  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 z-10 flex justify-between rounded-t-2xl border-b bg-white px-6 py-4">
        <div>
          <h3 className="text-xl font-bold">
            {editingProposal
              ? "Modifier la proposition"
              : "Nouvelle proposition"}
          </h3>
          <p className="text-sm text-gray-500">
            Informations destinataire et validité commerciale.
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMessage(null);
          editingProposal ? updateMutation.mutate() : createMutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        {errorMessage && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Titre *
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Lead ID
            </span>
            <input
              value={form.leadId}
              onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Opportunité ID
            </span>
            <input
              value={form.opportunityId}
              onChange={(e) =>
                setForm({ ...form, opportunityId: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Type destinataire
            </span>
            <select
              value={form.recipientType}
              onChange={(e) =>
                setForm({ ...form, recipientType: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            >
              {recipientTypes.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Code destinataire
            </span>
            <input
              value={form.recipientCode}
              onChange={(e) =>
                setForm({ ...form, recipientCode: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Nom destinataire
            </span>
            <input
              value={form.recipientName}
              onChange={(e) =>
                setForm({ ...form, recipientName: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Email destinataire
            </span>
            <input
              value={form.recipientEmail}
              onChange={(e) =>
                setForm({ ...form, recipientEmail: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Valide jusqu'au
            </span>
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Devise
            </span>
            <input
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value.toUpperCase() })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Assigné à
            </span>
            <input
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes client
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes internes
            </span>
            <textarea
              rows={3}
              value={form.internalNotes}
              onChange={(e) =>
                setForm({ ...form, internalNotes: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2.5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-white"
          >
            {isPending ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : editingProposal ? (
              "Mettre à jour"
            ) : (
              "Créer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
