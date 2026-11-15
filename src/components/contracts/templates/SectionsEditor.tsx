import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { contractService } from "../../../services/contract.service";
import type { ContractSectionType, ContractTemplateSectionRequest, ContractTemplateSectionResponse } from "../../../services/contract.service";
import { ActionButton, CheckField, ErrorBanner, Field, IconButton, ItemRow, StatusChip, Tag } from "../../subscription/kit";
import { FIELD, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { SECTION_TYPE_LABELS } from "../contractLabels";

interface Form {
  title: string;
  content: string;
  sectionType: ContractSectionType;
  sectionOrder: number;
  active: boolean;
}

/** Sections d'un modèle ou d'une rédaction */
type Kind = "draft" | "template";
const api = {
  draft: { add: contractService.addDraftSection, update: contractService.updateDraftSection, remove: contractService.deleteDraftSection, key: "contract-draft" },
  template: { add: contractService.addTemplateSection, update: contractService.updateTemplateSection, remove: contractService.deleteTemplateSection, key: "contract-template" },
} as const;
const toRequest = (f: Form, fallbackOrder: number): ContractTemplateSectionRequest => ({
  title: f.title.trim() || undefined,
  content: f.content,
  sectionType: f.sectionType,
  sectionOrder: f.sectionOrder || fallbackOrder,
  active: f.active,
});
const TYPES = Object.keys(SECTION_TYPE_LABELS) as ContractSectionType[];

const SectionForm: React.FC<{
  initial: Form;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (f: Form) => void;
  onCancel?: () => void;
}> = ({ initial, submitLabel, pending, error, onSubmit, onCancel }) => {
  const [f, setF] = useState<Form>(initial);
  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)]">
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem_6rem]">
        <Field label="Titre" hint="Facultatif">
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} />
        </Field>
        <Field label="Type">
          <select value={f.sectionType} onChange={(e) => setF({ ...f, sectionType: e.target.value as ContractSectionType })} className={`${FIELD} bg-gray-50 shadow-none`}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{SECTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Ordre">
          <input type="number" min={1} value={f.sectionOrder} onChange={(e) => setF({ ...f, sectionOrder: Number(e.target.value) })} className={`${FIELD} bg-gray-50 shadow-none`} />
        </Field>
      </div>
      <Field label="Contenu" required>
        <textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} rows={5} className={`${FIELD} resize-y bg-gray-50 font-mono text-xs shadow-none`} />
      </Field>
      <CheckField checked={f.active} onChange={(c) => setF({ ...f, active: c })} label="Section active" />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && <ActionButton variant="ghost" onClick={onCancel} disabled={pending}>Annuler</ActionButton>}
        <ActionButton icon={Plus} pending={pending} disabled={!f.content.trim()} onClick={() => onSubmit(f)}>
          {submitLabel}
        </ActionButton>
      </div>
    </div>
  );
};

/** Sections : ajout, modification, suppression. */
export const SectionsEditor: React.FC<{ kind: Kind; code: string; sections: ContractTemplateSectionResponse[] }> = ({ kind, code, sections }) => {
  const qc = useQueryClient();
  const fns = api[kind];
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...sections].sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0));
  const nextOrder = sorted.reduce((m, s) => Math.max(m, s.sectionOrder ?? 0), 0) + 1;
  const refresh = () => qc.invalidateQueries({ queryKey: [fns.key, code] });

  const add = useMutation({
    mutationFn: (f: Form) => fns.add(code, toRequest(f, nextOrder)),
    onSuccess: () => {
      refresh();
      setAdding(false);
      setError(null);
      toast.success("Section ajoutée");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'ajout de la section.")),
  });
  const update = useMutation({
    mutationFn: ({ id, f }: { id: number; f: Form }) => fns.update(code, id, toRequest(f, 1)),
    onSuccess: () => {
      refresh();
      setEditingId(null);
      setError(null);
      toast.success("Section mise à jour");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la modification de la section.")),
  });
  const remove = useMutation({
    mutationFn: (id: number) => fns.remove(code, id),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-3">
      {sorted.length === 0 && !adding && <p className="text-sm text-gray-500">Aucune section.</p>}

      {sorted.map((s) =>
        editingId === s.id ? (
          <SectionForm
            key={s.id}
            initial={{ title: s.title ?? "", content: s.content, sectionType: s.sectionType, sectionOrder: s.sectionOrder ?? 1, active: s.active !== false }}
            submitLabel="Enregistrer"
            pending={update.isPending}
            error={error}
            onSubmit={(f) => update.mutate({ id: s.id, f })}
            onCancel={() => {
              setEditingId(null);
              setError(null);
            }}
          />
        ) : (
          <ItemRow key={s.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {s.sectionOrder}. {s.title || SECTION_TYPE_LABELS[s.sectionType] || s.sectionType}
                  </span>
                  <Tag>{SECTION_TYPE_LABELS[s.sectionType] ?? s.sectionType}</Tag>
                  {s.active === false && <StatusChip tone="neutral">Inactive</StatusChip>}
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <IconButton
                  icon={Pencil}
                  label="Modifier la section"
                  onClick={() => {
                    setEditingId(s.id);
                    setAdding(false);
                    setError(null);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  label="Supprimer la section"
                  onClick={() =>
                    toast.confirm({
                      message: `Supprimer la section « ${s.title || SECTION_TYPE_LABELS[s.sectionType] || s.sectionType} » ?`,
                      confirmLabel: "Supprimer",
                      pendingLabel: "Suppression",
                      successMessage: "Section supprimée",
                      errorMessage: "Suppression impossible",
                      onConfirm: () => remove.mutateAsync(s.id),
                    })
                  }
                />
              </div>
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{s.content}</p>
          </ItemRow>
        ),
      )}

      {adding ? (
        <SectionForm
          key={`new-${nextOrder}`}
          initial={{ title: "", content: "", sectionType: "ARTICLE", sectionOrder: nextOrder, active: true }}
          submitLabel="Ajouter la section"
          pending={add.isPending}
          error={error}
          onSubmit={(f) => add.mutate(f)}
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
        />
      ) : (
        <ActionButton
          variant="ghost"
          icon={Plus}
          className="w-full sm:w-auto"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setError(null);
          }}
        >
          Ajouter une section
        </ActionButton>
      )}
    </div>
  );
};
