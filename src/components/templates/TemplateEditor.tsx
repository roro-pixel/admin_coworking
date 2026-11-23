import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AddedField, PageFormat, TemplateCatalog, TemplateContent, TemplateFamily } from "../../services/documentTemplate.service";
import { ActionButton, Field, IconButton, ItemRow, Section } from "../subscription/kit";
import { FIELD, FIELD_SOFT } from "../subscription/kitUtils";
import { BlockListEditor } from "./BlockEditors";
import { PAGE_FORMAT_LABEL } from "./templateLabels";

const FIELD_TYPES: { value: AddedField["type"]; label: string }[] = [
  { value: "TEXT", label: "Texte" },
  { value: "NUMBER", label: "Nombre" },
  { value: "AMOUNT", label: "Montant" },
  { value: "DATE", label: "Date" },
  { value: "LIST", label: "Liste" },
  { value: "CHECKBOX", label: "Case à cocher" },
];

const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

const AddedFieldsEditor: React.FC<{ fields: AddedField[]; onChange: (f: AddedField[]) => void }> = ({ fields, onChange }) => {
  const set = (i: number, p: Partial<AddedField>) => onChange(fields.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  return (
    <Section
      title="Champs ajoutés"
      description="Zone à remplir à la main sur le papier, ou valeur saisie dans l'application avant l'impression (20 au plus)."
      action={
        <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" disabled={fields.length >= 20} onClick={() => onChange([...fields, { key: "", label: "", type: "TEXT", mode: "PRINTED_BLANK" }])}>
          Ajouter
        </ActionButton>
      }
    >
      {fields.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-gray-500">Aucun champ ajouté.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((f, i) => (
            <ItemRow key={i}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Clé" hint={f.key && !KEY_RE.test(f.key) ? "Minuscules, chiffres et souligné, commence par une lettre." : "Citée dans un bloc : champ.<clé>"} error={f.key && !KEY_RE.test(f.key) ? "Clé non valide" : undefined}>
                  <input className={`${FIELD_SOFT} font-mono`} maxLength={40} value={f.key} onChange={(e) => set(i, { key: e.target.value })} />
                </Field>
                <Field label="Libellé">
                  <input className={FIELD_SOFT} maxLength={80} value={f.label} onChange={(e) => set(i, { label: e.target.value })} />
                </Field>
                <Field label="Type">
                  <select className={FIELD_SOFT} value={f.type} onChange={(e) => set(i, { type: e.target.value as AddedField["type"] })}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Mode">
                  <select className={FIELD_SOFT} value={f.mode} onChange={(e) => set(i, { mode: e.target.value as AddedField["mode"], required: e.target.value === "CAPTURED" ? f.required : false })}>
                    <option value="PRINTED_BLANK">Zone vide imprimée</option>
                    <option value="CAPTURED">Saisi dans l'application</option>
                  </select>
                </Field>
                {f.type === "LIST" && (
                  <Field label="Valeurs de la liste (séparées par une virgule, 30 au plus)" className="sm:col-span-2">
                    <input className={FIELD_SOFT} value={(f.options ?? []).join(", ")} onChange={(e) => set(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30) })} />
                  </Field>
                )}
                <Field label="Aide à la saisie" className="sm:col-span-2">
                  <input className={FIELD_SOFT} maxLength={200} value={f.help ?? ""} onChange={(e) => set(i, { help: e.target.value || undefined })} />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {f.mode === "CAPTURED" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={!!f.required} onChange={(e) => set(i, { required: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                    Obligatoire : l'impression est refusée tant qu'il n'est pas saisi
                  </label>
                ) : (
                  <span />
                )}
                <IconButton icon={Trash2} tone="danger" label="Retirer le champ" onClick={() => onChange(fields.filter((_, idx) => idx !== i))} />
              </div>
            </ItemRow>
          ))}
        </div>
      )}
    </Section>
  );
};

export const TemplateEditor: React.FC<{
  family: TemplateFamily;
  content: TemplateContent;
  onChange: (c: TemplateContent) => void;
  catalog: TemplateCatalog | undefined;
}> = ({ family, content, onChange, catalog }) => {
  const set = (p: Partial<TemplateContent>) => onChange({ ...content, ...p });
  const copies = content.copies ?? [];
  const formats = (catalog?.pageFormats?.length ? catalog.pageFormats : Object.keys(PAGE_FORMAT_LABEL)) as string[];

  return (
    <div className="space-y-5">
      {family === "PDF" && (
        <Section title="Page" icon={undefined}>
          <div className="grid gap-4 px-3 pb-3 sm:grid-cols-2">
            <Field label="Format">
              <select className={FIELD} value={content.pageFormat ?? "A4"} onChange={(e) => set({ pageFormat: e.target.value as PageFormat })}>
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {PAGE_FORMAT_LABEL[f] ?? f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Couleur des filets et titres">
              <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white" value={content.style?.accent ?? "#c9a84c"} onChange={(e) => set({ style: { accent: e.target.value } })} />
                <input className={`${FIELD} font-mono`} placeholder="#RRGGBB" value={content.style?.accent ?? ""} onChange={(e) => set({ style: { accent: e.target.value || null } })} />
              </div>
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">Exemplaires (4 au plus)</span>
              <div className="space-y-2">
                {copies.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className={FIELD} maxLength={120} placeholder="Original · à conserver" value={c.label} onChange={(e) => set({ copies: copies.map((x, idx) => (idx === i ? { label: e.target.value } : x)) })} />
                    <IconButton icon={Trash2} tone="danger" label="Retirer l'exemplaire" onClick={() => set({ copies: copies.filter((_, idx) => idx !== i) })} />
                  </div>
                ))}
                {copies.length < 4 && (
                  <ActionButton variant="ghost" icon={Plus} onClick={() => set({ copies: [...copies, { label: "" }] })}>
                    Ajouter un exemplaire
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Blocs" description={family === "PDF" ? "Dans l'ordre d'impression (1 à 40)." : "Un seul bloc Objet par courriel. Le cadre commun (en-tête, logo, pied) reste celui de la plateforme."}>
        <div className="px-1 pb-1">
          <BlockListEditor blocks={content.blocks} onChange={(blocks) => set({ blocks })} family={family} catalog={catalog} />
        </div>
      </Section>

      {family === "PDF" && <AddedFieldsEditor fields={content.fields ?? []} onChange={(fields) => set({ fields })} />}

      <Section title="Note de version">
        <div className="px-3 pb-3">
          <textarea className={`${FIELD} resize-none`} rows={2} maxLength={500} placeholder="Ce qui change dans cette version (facultatif)" value={content.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
        </div>
      </Section>
    </div>
  );
};
