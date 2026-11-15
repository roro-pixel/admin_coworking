import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { brandVars } from "../../layout/adminTheme";
import { ModalPortal } from "../../ui/ModalPortal";
import { operationsService } from "../../../services/operations.service";
import type { ProposalRecipientType, ProposalResponse } from "../../../services/operations.service";
import { ActionButton, Field, IconButton } from "../../subscription/kit";
import { FIELD, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { PillChoice } from "../opsKit";
import { PROPOSAL_RECIPIENT_TYPES } from "../opsLabels";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingProposal: ProposalResponse | null;
  onSuccess: (proposal: ProposalResponse) => void;
  leadId?: number | null;
}

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

export const ProposalFormModal: React.FC<Props> = ({ isOpen, onClose, editingProposal, onSuccess, leadId }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(editingProposal, leadId));

  useEffect(() => {
    if (isOpen) setForm(buildForm(editingProposal, leadId));
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
      toast.success("Proposition créée");
      onSuccess(data);
    },
    onError: (e) => toast.error(apiMessage(e, "Création de la proposition impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: () => operationsService.updateProposal(editingProposal!.id, payload()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["crm-proposal", editingProposal?.id] });
      toast.success("Proposition mise à jour");
      onSuccess(data);
    },
    onError: (e) => toast.error(apiMessage(e, "Modification de la proposition impossible.")),
  });

  if (!isOpen) return null;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div style={brandVars}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (editingProposal) updateMutation.mutate();
          else createMutation.mutate();
        }}
        className="p-5 sm:p-7"
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold tracking-tight text-gray-950">
              {editingProposal ? "Modifier la proposition" : "Nouvelle proposition"}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">Destinataire et validité commerciale</p>
          </div>
          <IconButton icon={X} label="Fermer" tone="neutral" onClick={onClose} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-4 sm:p-5 md:grid-cols-2">
          <Field label="Titre" required className="md:col-span-2">
            <input required value={form.title} onChange={set("title")} className={FIELD} />
          </Field>
          <div className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Type de destinataire</span>
            <PillChoice
              label="Type de destinataire"
              options={PROPOSAL_RECIPIENT_TYPES}
              value={form.recipientType}
              onChange={(v) => setForm((f) => ({ ...f, recipientType: v }))}
            />
          </div>
          <Field label="Code destinataire">
            <input value={form.recipientCode} onChange={set("recipientCode")} className={FIELD} />
          </Field>
          <Field label="Nom destinataire">
            <input value={form.recipientName} onChange={set("recipientName")} className={FIELD} />
          </Field>
          <Field label="Email destinataire">
            <input type="email" value={form.recipientEmail} onChange={set("recipientEmail")} className={FIELD} />
          </Field>
          <Field label="Valide jusqu'au">
            <input type="date" value={form.validUntil} onChange={set("validUntil")} className={FIELD} />
          </Field>
          <Field label="Lead (ID)">
            <input value={form.leadId} onChange={set("leadId")} className={FIELD} />
          </Field>
          <Field label="Opportunité (ID)">
            <input value={form.opportunityId} onChange={set("opportunityId")} className={FIELD} />
          </Field>
          <Field label="Devise">
            <input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} className={FIELD} />
          </Field>
          <Field label="Assignée à">
            <input value={form.assignedTo} onChange={set("assignedTo")} className={FIELD} />
          </Field>
          <Field label="Notes client" className="md:col-span-2">
            <textarea rows={3} value={form.notes} onChange={set("notes")} className={FIELD} />
          </Field>
          <Field label="Notes internes" className="md:col-span-2">
            <textarea rows={3} value={form.internalNotes} onChange={set("internalNotes")} className={FIELD} />
          </Field>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={onClose} disabled={isPending}>Annuler</ActionButton>
          <ActionButton type="submit" pending={isPending}>{editingProposal ? "Mettre à jour" : "Créer"}</ActionButton>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
};
