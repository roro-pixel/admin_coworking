import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsService } from "../../../services/operations.service";
import type { ProposalLineResponse, ProposalServiceType } from "../../../services/operations.service";
import { CheckField, Field, PanelForm } from "../../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { PROPOSAL_SERVICE_TYPES } from "../opsLabels";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposalId: number;
  editingLine: ProposalLineResponse | null;
  onSuccess: () => void;
}

const buildForm = (l: ProposalLineResponse | null) => ({
  label: l?.label || "",
  description: l?.description || "",
  serviceType: (l?.serviceType || "CUSTOM") as ProposalServiceType,
  serviceRefCode: l?.serviceRefCode || "",
  quantity: l?.quantity ?? 1,
  unitPrice: l?.unitPrice ?? 0,
  discountPercent: l?.discountPercent ?? 0,
  taxRate: l?.taxRate ?? 0.19,
  taxIncluded: l?.taxIncluded ?? false,
  sortOrder: l?.sortOrder ?? 0,
  currency: l?.currency || "XAF",
});

/** Panneau en ligne (ex-modale) : s'affiche dans le détail de la proposition. */
export const ProposalLineFormModal: React.FC<Props> = ({ isOpen, onClose, proposalId, editingLine, onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(editingLine));

  useEffect(() => {
    if (isOpen) setForm(buildForm(editingLine));
  }, [editingLine, isOpen]);

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["crm-proposal", proposalId] });
    toast.success(message);
    onSuccess();
  };
  const addMutation = useMutation({
    mutationFn: () => operationsService.addProposalLine(proposalId, form),
    onSuccess: () => done("Ligne ajoutée"),
    onError: (e) => toast.error(apiMessage(e, "Ajout de la ligne impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: () => operationsService.updateProposalLine(proposalId, editingLine!.id, form),
    onSuccess: () => done("Ligne mise à jour"),
    onError: (e) => toast.error(apiMessage(e, "Modification de la ligne impossible.")),
  });

  if (!isOpen) return null;
  const pending = addMutation.isPending || updateMutation.isPending;
  const num = (k: "quantity" | "unitPrice" | "discountPercent" | "taxRate" | "sortOrder", fallback: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: Number(e.target.value) || fallback }));

  return (
    <PanelForm
      title={editingLine ? "Modifier la ligne" : "Ajouter une ligne"}
      pending={pending}
      submitLabel="Enregistrer"
      submitDisabled={!form.label.trim()}
      onCancel={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (editingLine) updateMutation.mutate();
        else addMutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Libellé" required className="md:col-span-2">
          <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label="Service">
          <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className={FIELD_SOFT}>
            {PROPOSAL_SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Référence">
          <input value={form.serviceRefCode || ""} onChange={(e) => setForm({ ...form, serviceRefCode: e.target.value })} className={FIELD_SOFT} />
        </Field>
        <Field label="Quantité">
          <input type="number" value={form.quantity} onChange={num("quantity", 1)} className={FIELD_SOFT} />
        </Field>
        <Field label="Prix unitaire">
          <input type="number" value={form.unitPrice} onChange={num("unitPrice", 0)} className={FIELD_SOFT} />
        </Field>
        <Field label="Remise (%)">
          <input type="number" value={form.discountPercent} onChange={num("discountPercent", 0)} className={FIELD_SOFT} />
        </Field>
        <Field label="TVA (taux)">
          <input type="number" step="0.01" value={form.taxRate} onChange={num("taxRate", 0)} className={FIELD_SOFT} />
        </Field>
        <Field label="Devise">
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className={FIELD_SOFT} />
        </Field>
        <Field label="Ordre">
          <input type="number" value={form.sortOrder} onChange={num("sortOrder", 0)} className={FIELD_SOFT} />
        </Field>
        <div className="md:col-span-2">
          <CheckField label="Prix TTC" checked={form.taxIncluded} onChange={(v) => setForm({ ...form, taxIncluded: v })} />
        </div>
        <Field label="Description" className="md:col-span-2">
          <textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={FIELD_SOFT} />
        </Field>
      </div>
    </PanelForm>
  );
};
