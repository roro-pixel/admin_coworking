import React, { useState } from "react";
import { CheckField, Field, PanelForm } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "bool" | "textarea" | "list";
  required?: boolean;
  hint?: string;
  def?: string | boolean;
}

export type FormValues = Record<string, string | number | boolean | string[] | undefined>;

/** Formulaire généré à partir d'une liste de champs : nombres convertis, listes séparées par des virgules, champs vides omis. */
export const ActionForm: React.FC<{
  title: string;
  fields: FieldDef[];
  submitLabel?: string;
  onSubmit: (v: FormValues) => Promise<unknown>;
  onClose: () => void;
}> = ({ title, fields, submitLabel = "Enregistrer", onSubmit, onClose }) => {
  const [v, setV] = useState<Record<string, string | boolean>>(() => Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "bool" ? false : "")])));
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const build = (): FormValues => {
    const out: FormValues = {};
    for (const f of fields) {
      const x = v[f.key];
      if (f.type === "bool") { out[f.key] = !!x; continue; }
      const s = String(x ?? "").trim();
      if (!s) continue;
      out[f.key] = f.type === "number" ? Number(s.replace(",", ".")) : f.type === "list" ? s.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean) : s;
    }
    return out;
  };
  const missing = fields.some((f) => f.required && f.type !== "bool" && !String(v[f.key] ?? "").trim());

  return (
    <PanelForm
      title={title}
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        try { await onSubmit(build()); onClose(); } catch (x) { setErr(apiMessage(x, "Action impossible.")); } finally { setPending(false); }
      }}
      onCancel={onClose}
      pending={pending}
      submitLabel={submitLabel}
      submitDisabled={missing}
      error={err}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.filter((f) => f.type !== "bool").map((f) => (
          <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
            {f.type === "textarea" ? (
              <textarea className={FIELD} rows={2} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            ) : (
              <input className={FIELD} type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
      </div>
      {fields.filter((f) => f.type === "bool").map((f) => (
        <CheckField key={f.key} checked={!!v[f.key]} onChange={(c) => setV({ ...v, [f.key]: c })} label={f.label} />
      ))}
    </PanelForm>
  );
};
