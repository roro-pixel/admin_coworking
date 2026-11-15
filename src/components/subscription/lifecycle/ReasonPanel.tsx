import React, { useState } from "react";
import { Field, PanelForm } from "../kit";
import { FIELD_SOFT } from "../kitUtils";

/** Formulaire en ligne qui demande un motif obligatoire (retrait, refus, dispense, révocation). */
export const ReasonPanel: React.FC<{
  title: string;
  description?: string;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}> = ({ title, description, submitLabel, pending, onSubmit, onCancel }) => {
  const [reason, setReason] = useState("");
  return (
    <PanelForm
      title={title}
      pending={!!pending}
      submitLabel={submitLabel}
      submitDisabled={!reason.trim()}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim());
      }}
    >
      {description && <p className="-mt-2 text-sm text-gray-500">{description}</p>}
      <Field label="Motif" required>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD_SOFT} resize-none`} autoFocus />
      </Field>
    </PanelForm>
  );
};
