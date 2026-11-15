import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { TemplateVariableDefinition } from "../../../services/contract.service";
import { ActionButton, CheckField, ErrorBanner, Field, IconButton, ItemRow, StatusChip, Tag } from "../../subscription/kit";
import { FIELD } from "../../subscription/kitUtils";

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const blank = (): TemplateVariableDefinition => ({ key: "", label: "", description: "", type: "", source: "MANUAL", required: false, defaultValue: "" });

/** Variables d'un template : liste, ajout et modification (AUTO remplie par le système, MANUAL saisie à la génération). */
export const VariablesEditor: React.FC<{
  variables: TemplateVariableDefinition[];
  onChange: (v: TemplateVariableDefinition[]) => void;
  /** Variables {{nom}} présentes dans le contenu mais non déclarées */
  undeclared: string[];
  /** Types et sources proposés par le serveur ; à défaut, saisie libre (type) ou AUTO/MANUAL (source). */
  types?: string[];
  sources?: string[];
}> = ({ variables, onChange, undeclared, types = [], sources = ["AUTO", "MANUAL"] }) => {
  const [form, setForm] = useState<TemplateVariableDefinition>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm(blank());
    setError(null);
  };

  const save = () => {
    const name = form.key.trim();
    if (!NAME_RE.test(name)) return setError("Le nom ne peut contenir que des lettres, chiffres et _ (sans espace), et ne commence pas par un chiffre.");
    if (variables.some((v, i) => v.key === name && i !== editing)) return setError("Une variable porte déjà ce nom.");
    const clean = { ...form, key: name };
    onChange(editing === null ? [...variables, clean] : variables.map((v, i) => (i === editing ? clean : v)));
    close();
  };

  const declare = (name: string) => onChange([...variables, { ...blank(), key: name }]);

  return (
    <div className="space-y-4">
      {undeclared.length > 0 && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Utilisées dans le contenu mais non déclarées</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {undeclared.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => declare(n)}
                className="rounded-full bg-white px-3 py-1 font-mono text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100"
              >
                + {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {variables.length === 0 && !open && <p className="text-sm text-gray-500">Aucune variable déclarée.</p>}

      <div className="space-y-2">
        {variables.map((v, i) => (
          <ItemRow key={`${v.key}-${i}`} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{`{{${v.key}}}`}</span>
                <Tag tone={v.source === "AUTO" ? "pink" : "gray"}>{v.source === "AUTO" ? "Automatique" : v.source === "MANUAL" ? "Manuelle" : v.source}</Tag>
                {v.type && <Tag>{v.type}</Tag>}
                {v.required && <StatusChip tone="warn">Requise</StatusChip>}
              </div>
              {v.label && <p className="mt-1 text-sm text-gray-600">{v.label}</p>}
              {v.defaultValue && <p className="mt-1 text-xs text-gray-400">Défaut : {v.defaultValue}</p>}
            </div>
            <div className="flex shrink-0 gap-0.5">
              <IconButton
                icon={Pencil}
                label="Modifier la variable"
                onClick={() => {
                  setForm({ ...blank(), ...v });
                  setEditing(i);
                  setOpen(true);
                  setError(null);
                }}
              />
              <IconButton icon={Trash2} tone="danger" label="Retirer la variable" onClick={() => onChange(variables.filter((_, k) => k !== i))} />
            </div>
          </ItemRow>
        ))}
      </div>

      {open ? (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)]">
          <h4 className="text-sm font-bold text-gray-950">{editing === null ? "Nouvelle variable" : "Modifier la variable"}</h4>
          <ErrorBanner message={error} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom" required hint="Utilisé dans le contenu : {{nom}}">
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className={`${FIELD} bg-gray-50 font-mono shadow-none`} placeholder="clientName" />
            </Field>
            <Field label="Libellé">
              <input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} placeholder="Nom du client" />
            </Field>
            <Field label="Source">
              <select value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`}>
                {sources.map((o) => (
                  <option key={o} value={o}>{o === "MANUAL" ? "Manuelle : saisie à la génération" : o === "AUTO" ? "Automatique : remplie par le système" : o}</option>
                ))}
                {form.source && !sources.includes(form.source) && <option value={form.source}>{form.source}</option>}
              </select>
            </Field>
            <Field label="Type" hint="Facultatif">
              {types.length > 0 ? (
                <select value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`}>
                  <option value="">Non précisé</option>
                  {types.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  {form.type && !types.includes(form.type) && <option value={form.type}>{form.type}</option>}
                </select>
              ) : (
                <input value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} />
              )}
            </Field>
            <div className="flex items-end">
              <CheckField checked={!!form.required} onChange={(c) => setForm({ ...form, required: c })} label="Variable requise" />
            </div>
            <Field label="Valeur par défaut">
              <input value={form.defaultValue ?? ""} onChange={(e) => setForm({ ...form, defaultValue: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} />
            </Field>
          </div>
          <Field label="Description">
            <input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={close}>Annuler</ActionButton>
            <ActionButton icon={Plus} onClick={save} disabled={!form.key.trim()}>
              {editing === null ? "Ajouter" : "Mettre à jour"}
            </ActionButton>
          </div>
        </div>
      ) : (
        <ActionButton variant="ghost" icon={Plus} onClick={() => setOpen(true)} className="w-full sm:w-auto">
          Ajouter une variable
        </ActionButton>
      )}
    </div>
  );
};
