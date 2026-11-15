import React, { useState } from "react";
import { Field, PanelForm } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";

/**
 * Panneau de saisie d'un motif.
 * Motif obligatoire pour rejeter ou annuler, facultatif pour confirmer ou approuver.
 */
export const ReasonPanel: React.FC<{
  title: string;
  subtitle?: string;
  required: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}> = ({ title, subtitle, required, submitLabel, pending, onSubmit, onCancel }) => {
  const [reason, setReason] = useState("");
  const clean = reason.trim();

  return (
    <PanelForm
      title={title}
      pending={pending}
      submitLabel={submitLabel}
      submitDisabled={required && !clean}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(clean);
      }}
    >
      {subtitle && <p className="-mt-2 text-sm text-gray-500">{subtitle}</p>}
      <Field label={required ? "Motif" : "Motif (facultatif)"} required={required}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          className={`${FIELD} resize-none bg-gray-50 shadow-none`}
          placeholder="Expliquez en une phrase"
        />
      </Field>
    </PanelForm>
  );
};
