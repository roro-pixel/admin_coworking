import React from "react";
import { Field } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { LEAD_INTERESTS, LEAD_SOURCES } from "./opsLabels";

/** Formulaire de lead partagé par « Nouveau lead » et « Capture site » (mode public : champs réduits). */
export const LeadForm: React.FC<{
  form: any;
  setForm: (fn: any) => void;
  publicMode?: boolean;
}> = ({ form, setForm, publicMode = false }) => {
  const text = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f: any) => ({ ...f, [k]: Number(e.target.value) }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Nom complet" required>
        <input value={form.fullName} onChange={text("fullName")} className={FIELD} />
      </Field>
      <Field label="Société">
        <input value={form.company} onChange={text("company")} className={FIELD} />
      </Field>
      <Field label="Email">
        <input type="email" value={form.email} onChange={text("email")} className={FIELD} />
      </Field>
      <Field label="Téléphone">
        <input type="tel" value={form.phone} onChange={text("phone")} className={FIELD} />
      </Field>
      {!publicMode && (
        <Field label="Source">
          <select value={form.source} onChange={text("source")} className={FIELD}>
            {LEAD_SOURCES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Intérêt">
        <select value={form.interest} onChange={text("interest")} className={FIELD}>
          {LEAD_INTERESTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {!publicMode && (
        <>
          <Field label="Montant estimé (FCFA)">
            <input type="number" value={form.estimatedAmount} onChange={num("estimatedAmount")} className={FIELD} />
          </Field>
          <Field label="Probabilité estimée par l'agent (%)">
            <input type="number" value={form.probability} onChange={num("probability")} className={FIELD} />
          </Field>
          <Field label="Date de clôture prévue">
            <input type="date" value={form.expectedCloseDate} onChange={text("expectedCloseDate")} className={FIELD} />
          </Field>
          <Field label="Agent (identifiant)">
            <input value={form.assignedTo} onChange={text("assignedTo")} className={FIELD} />
          </Field>
        </>
      )}
      <Field label="Note" className="md:col-span-2">
        <textarea value={form.note ?? ""} onChange={text("note")} rows={4} className={`${FIELD} resize-none`} />
      </Field>
    </div>
  );
};
