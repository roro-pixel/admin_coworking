import React, { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { TemplateBlock, TemplateCatalog, TemplateFamily } from "../../services/documentTemplate.service";
import { ActionButton, Field, IconButton, ItemRow } from "../subscription/kit";
import { FIELD_SOFT } from "../subscription/kitUtils";
import { blockLabels, newBlock } from "./templateLabels";

type Patch = (p: Record<string, unknown>) => void;
interface FormProps {
  block: TemplateBlock;
  patch: Patch;
  catalog: TemplateCatalog | undefined;
  family: TemplateFamily;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true;
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
    {label}
  </label>
);

const TextIn: React.FC<{ label: string; value: unknown; onChange: (v: string) => void; max?: number; placeholder?: string; className?: string }> = ({
  label,
  value,
  onChange,
  max,
  placeholder,
  className,
}) => (
  <Field label={label} className={className}>
    <input className={FIELD_SOFT} maxLength={max} placeholder={placeholder} value={str(value)} onChange={(e) => onChange(e.target.value)} />
  </Field>
);

const Area: React.FC<{ label: string; value: unknown; onChange: (v: string) => void; max?: number; rows?: number; className?: string }> = ({
  label,
  value,
  onChange,
  max,
  rows = 3,
  className,
}) => (
  <Field label={label} className={className} hint={max ? `${str(value).length} / ${max}` : undefined}>
    <textarea className={`${FIELD_SOFT} resize-y`} rows={rows} maxLength={max} value={str(value)} onChange={(e) => onChange(e.target.value)} />
  </Field>
);

/** Choix multiple dans une liste du catalogue (clés de champs, de colonnes...). */
const MultiPick: React.FC<{ label: string; options: { key: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; empty: string }> = ({
  label,
  options,
  value,
  onChange,
  empty,
}) => (
  <div className="sm:col-span-2">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
    {options.length === 0 ? (
      <p className="text-xs text-gray-400">{empty}</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              title={o.key}
              onClick={() => onChange(on ? value.filter((k) => k !== o.key) : [...value, o.key])}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${on ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

const Cols: React.FC<{ value: unknown; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <Field label="Colonnes">
    <select className={FIELD_SOFT} value={num(value, 2)} onChange={(e) => onChange(Number(e.target.value))}>
      {[1, 2, 3, 4].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  </Field>
);

/* ── Blocs PDF ── */

const FieldsForm: React.FC<FormProps> = ({ block, patch, catalog }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <TextIn label="Titre" value={block.title} onChange={(v) => patch({ title: v })} max={150} />
    <Cols value={block.columns} onChange={(v) => patch({ columns: v })} />
    <MultiPick
      label="Champs imprimés"
      options={(catalog?.fields ?? []).map((f) => ({ key: f.key, label: f.label }))}
      value={strList(block.fields)}
      onChange={(v) => patch({ fields: v })}
      empty="Le catalogue ne propose aucun champ pour ce modèle."
    />
    <TextIn label="Champ ajouté (champ.clé)" value="" onChange={(v) => v && patch({ fields: [...strList(block.fields), v.startsWith("champ.") ? v : `champ.${v}`] })} placeholder="Tapez une clé puis quittez le champ" />
    {strList(block.fields).filter((k) => k.startsWith("champ.")).length > 0 && (
      <p className="text-xs text-gray-500 sm:col-span-2">Champs ajoutés : {strList(block.fields).filter((k) => k.startsWith("champ.")).join(", ")}</p>
    )}
  </div>
);

const LinesForm: React.FC<FormProps> = ({ block, patch, catalog }) => {
  const table = catalog?.tables?.find((t) => t.key === block.table);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextIn label="Titre" value={block.title} onChange={(v) => patch({ title: v })} max={150} />
      <Field label="Tableau">
        <select className={FIELD_SOFT} value={str(block.table)} onChange={(e) => patch({ table: e.target.value, columns: undefined })}>
          <option value="">Choisir…</option>
          {(catalog?.tables ?? []).map((t) => (
            <option key={t.key} value={t.key}>
              {t.title}
            </option>
          ))}
        </select>
      </Field>
      {table && (
        <MultiPick
          label="Colonnes gardées (toutes par défaut)"
          options={table.columns.map((c) => ({ key: c.key, label: c.label }))}
          value={strList(block.columns)}
          onChange={(v) => patch({ columns: v.length ? v : undefined })}
          empty=""
        />
      )}
    </div>
  );
};

const SignaturesForm: React.FC<FormProps> = ({ block, patch, catalog }) => {
  const boxes = Array.isArray(block.boxes) ? (block.boxes as Record<string, unknown>[]) : null;
  const setBox = (i: number, p: Record<string, unknown>) => patch({ boxes: (boxes ?? []).map((b, idx) => (idx === i ? { ...b, ...p } : b)) });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-end pb-2.5">
          <Check label="Ajouter les signataires de la pièce" checked={bool(block.fromData)} onChange={(v) => patch({ fromData: v })} />
        </div>
        <Field label="Largeur (80 à 260 px)">
          <input type="number" min={80} max={260} className={FIELD_SOFT} value={block.width === undefined ? "" : num(block.width, 0)} onChange={(e) => patch({ width: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label="Hauteur (60 à 260 px)">
          <input type="number" min={60} max={260} className={FIELD_SOFT} value={block.height === undefined ? "" : num(block.height, 0)} onChange={(e) => patch({ height: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
      </div>
      {boxes ? (
        <>
          {boxes.map((b, i) => (
            <ItemRow key={i}>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
                <TextIn label="Libellé" value={b.label} max={150} onChange={(v) => setBox(i, { label: v })} />
                <Field label="Signataire">
                  <select className={FIELD_SOFT} value={str(b.signer)} onChange={(e) => setBox(i, { signer: e.target.value || undefined })}>
                    <option value="">Aucun</option>
                    {(catalog?.signers ?? []).map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.role}
                      </option>
                    ))}
                  </select>
                </Field>
                <TextIn label="Mention" value={b.note} max={150} onChange={(v) => setBox(i, { note: v || undefined })} />
                <div className="pb-2.5">
                  <Check label="Cachet" checked={bool(b.stamp)} onChange={(v) => setBox(i, { stamp: v })} />
                </div>
                <IconButton icon={Trash2} tone="danger" label="Retirer la case" disabled={boxes.length <= 1} onClick={() => patch({ boxes: boxes.filter((_, idx) => idx !== i) })} />
              </div>
            </ItemRow>
          ))}
          {boxes.length < 6 && (
            <ActionButton variant="ghost" icon={Plus} onClick={() => patch({ boxes: [...boxes, { label: "" }] })}>
              Ajouter une case
            </ActionButton>
          )}
        </>
      ) : (
        <Field label="Nombre de cases (1 à 6)">
          <input type="number" min={1} max={6} className={FIELD_SOFT} value={num(block.boxes, 1)} onChange={(e) => patch({ boxes: Number(e.target.value) || 1 })} />
        </Field>
      )}
    </div>
  );
};

/* ── Blocs courriel ── */

const DetailsForm: React.FC<FormProps> = ({ block, patch }) => {
  const rows = Array.isArray(block.rows) ? (block.rows as { label?: string; value?: string }[]) : [];
  const setRow = (i: number, p: Record<string, string>) => patch({ rows: rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  return (
    <div className="space-y-3">
      <TextIn label="Titre" value={block.title} onChange={(v) => patch({ title: v })} />
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
          <TextIn label="Libellé" value={r.label} onChange={(v) => setRow(i, { label: v })} />
          <TextIn label="Valeur" value={r.value} onChange={(v) => setRow(i, { value: v })} placeholder="{{documentNumber}}" />
          <IconButton icon={Trash2} tone="danger" label="Retirer la ligne" onClick={() => patch({ rows: rows.filter((_, idx) => idx !== i) })} />
        </div>
      ))}
      <ActionButton variant="ghost" icon={Plus} onClick={() => patch({ rows: [...rows, { label: "", value: "" }] })}>
        Ajouter une ligne
      </ActionButton>
    </div>
  );
};

const BlockForm: React.FC<FormProps> = (props) => {
  const { block, patch, family } = props;
  const t = block.type;
  if (family === "PDF") {
    switch (t) {
      case "HEADER":
        return <Check label="QR de vérification de la pièce enregistrée" checked={bool(block.qr)} onChange={(v) => patch({ qr: v })} />;
      case "TITLE":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextIn label="Titre de la pièce" value={block.title} max={150} onChange={(v) => patch({ title: v })} />
            <div className="flex items-end pb-2.5">
              <Check label="Imprimer la mention d'exemplaire" checked={bool(block.copyLabel)} onChange={(v) => patch({ copyLabel: v })} />
            </div>
          </div>
        );
      case "FIELDS":
        return <FieldsForm {...props} />;
      case "LINES":
        return <LinesForm {...props} />;
      case "TOTALS":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextIn label="Libellé" value={block.label} max={150} onChange={(v) => patch({ label: v })} />
            <div className="flex items-end pb-2.5">
              <Check label="Montant en lettres" checked={bool(block.words)} onChange={(v) => patch({ words: v })} />
            </div>
            {bool(block.words) && <TextIn label="Libellé du montant en lettres" value={block.wordsLabel} max={150} onChange={(v) => patch({ wordsLabel: v || undefined })} />}
          </div>
        );
      case "TEXT":
        return (
          <div className="grid gap-3">
            <TextIn label="Titre" value={block.title} max={150} onChange={(v) => patch({ title: v || undefined })} />
            <Area label="Texte (jetons {{clé}} permis)" value={block.text} max={2000} onChange={(v) => patch({ text: v })} />
            <Check label="Encadré" checked={bool(block.boxed)} onChange={(v) => patch({ boxed: v })} />
          </div>
        );
      case "SIGNATURES":
        return <SignaturesForm {...props} />;
      case "SECTIONS":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Cols value={block.columns} onChange={(v) => patch({ columns: v })} />
            <TextIn label="Sections ou champs à retirer (séparés par une virgule)" value={strList(block.exclude).join(", ")} onChange={(v) => patch({ exclude: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
        );
      case "FOOTER":
        return <Area label="Texte du pied de page" rows={2} value={block.text} onChange={(v) => patch({ text: v })} />;
    }
  } else {
    switch (t) {
      case "SUBJECT":
      case "PREHEADER":
      case "TITLE":
      case "GREETING":
      case "ATTACHMENT_NOTE":
        return <TextIn label="Texte (jetons {{variable}} permis)" value={block.text} onChange={(v) => patch({ text: v })} />;
      case "TEXT":
      case "SIGNATURE":
        return <Area label="Texte (les sauts de ligne sont gardés)" value={block.text} onChange={(v) => patch({ text: v })} />;
      case "DETAILS":
        return <DetailsForm {...props} />;
      case "AMOUNT":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextIn label="Libellé" value={block.label} onChange={(v) => patch({ label: v })} />
            <TextIn label="Valeur" value={block.value} placeholder="{{totalAmount}}" onChange={(v) => patch({ value: v })} />
          </div>
        );
      case "BUTTON":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextIn label="Libellé du bouton" value={block.label} onChange={(v) => patch({ label: v })} />
            <TextIn label="Adresse (https://, mailto: ou jeton)" value={block.url} placeholder="https://… ou {{signingUrl}}" onChange={(v) => patch({ url: v })} />
          </div>
        );
      case "LEGAL":
        return <p className="text-sm text-gray-500">Les mentions légales de l'exploitant s'impriment ici.</p>;
    }
  }
  return <p className="text-sm text-gray-500">Bloc « {t} » : aucune option modifiable ici.</p>;
};

export const BlockListEditor: React.FC<{
  blocks: TemplateBlock[];
  onChange: (b: TemplateBlock[]) => void;
  family: TemplateFamily;
  catalog: TemplateCatalog | undefined;
}> = ({ blocks, onChange, family, catalog }) => {
  const labels = blockLabels(family);
  const types = catalog?.blockTypes?.length ? catalog.blockTypes : Object.keys(labels);
  const [toAdd, setToAdd] = useState(types[0] ?? "TEXT");
  const max = family === "PDF" ? 40 : 40;

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const arr = [...blocks];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <ItemRow key={i}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-gray-900">
              <span className="mr-2 font-mono text-xs text-gray-400">#{i + 1}</span>
              {labels[b.type] ?? b.type}
            </span>
            <div className="flex items-center gap-1">
              <IconButton icon={ArrowUp} label="Monter" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label="Descendre" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon={Trash2} tone="danger" label="Supprimer le bloc" disabled={blocks.length === 1} onClick={() => onChange(blocks.filter((_, idx) => idx !== i))} />
            </div>
          </div>
          <BlockForm
            block={b}
            family={family}
            catalog={catalog}
            patch={(p) => onChange(blocks.map((x, idx) => (idx === i ? { ...x, ...p } : x)))}
          />
        </ItemRow>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${FIELD_SOFT} !w-auto`} value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label="Type de bloc">
          {types.map((t) => (
            <option key={t} value={t}>
              {labels[t] ?? t}
            </option>
          ))}
        </select>
        <ActionButton variant="ghost" icon={Plus} disabled={blocks.length >= max} onClick={() => onChange([...blocks, newBlock(toAdd)])}>
          Ajouter un bloc
        </ActionButton>
        {blocks.length >= max && <span className="text-xs text-gray-500">40 blocs au plus.</span>}
      </div>
    </div>
  );
};
