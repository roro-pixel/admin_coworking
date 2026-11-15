import React, { useState } from "react";
import { PanelForm, Field } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { REASON_COPY } from "./contractLabels";
import type { ContractActionKey } from "./contractLabels";

/** Motif demandé avant suspension, résiliation ou annulation . */
export const ReasonPanel: React.FC<{
  action: "suspend" | "terminate" | "cancel" | "approve_review" | "reject_review";
  contractCode: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}> = ({ action, contractCode, pending, error, onSubmit, onCancel }) => {
  const copy = REASON_COPY[action as ContractActionKey]!;
  const [reason, setReason] = useState("");
  return (
    <PanelForm
      title={copy.title}
      pending={pending}
      submitLabel={copy.submit}
      submitDisabled={copy.required && !reason.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim());
      }}
    >
      <p className="-mt-2 text-sm text-gray-500">
        Contrat <span className="font-mono font-semibold text-gray-700">{contractCode}</span>
      </p>
      <Field label={action === "approve_review" ? "Commentaire" : "Motif"} required={copy.required} hint={copy.required ? undefined : "Facultatif"}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className={`${FIELD} resize-none bg-gray-50 shadow-none`}
        />
      </Field>
    </PanelForm>
  );
};
