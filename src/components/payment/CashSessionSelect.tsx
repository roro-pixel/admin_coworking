import React from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../../services/payment.service";
import { Field } from "../subscription/kit";
import { FIELD_SOFT } from "../subscription/kitUtils";

/**
 * Choix de la session de caisse : seules les sessions OPEN sont proposées.
 * Le backend refuse une session fermée ou celle d'une caisse automatique.
 */
export const CashSessionSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ value, onChange, label = "Session de caisse", hint, required = false, placeholder = "Choisir une session ouverte" }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions = data?.content ?? [];
  const none = !isLoading && sessions.length === 0;

  return (
    <Field
      label={label}
      required={required}
      hint={none ? undefined : hint}
      error={none ? "Aucune session de caisse ouverte. Ouvrez une session dans l'onglet Sessions." : undefined}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_SOFT}
        disabled={isLoading}
      >
        <option value="">{required ? placeholder : "Sans session de caisse"}</option>
        {sessions.map((s) => (
          <option key={s.sessionNumber} value={s.sessionNumber}>
            {s.sessionNumber} · {s.registerCode}
          </option>
        ))}
      </select>
    </Field>
  );
};
