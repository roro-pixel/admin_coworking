import React, { useState } from "react";
import { ArrowDownUp, Plus, Trash2 } from "lucide-react";
import { DUNNING_TEMPLATE_VARIABLES } from "../../../services/dunning.service";
import type { DunningAction, DunningChannel, DunningPolicyRequest, DunningPolicyView, DunningSegment, DunningTone } from "../../../services/dunning.service";
import { ActionButton, CheckField, Field, IconButton, ItemRow, PanelForm } from "../../subscription/kit";
import { FIELD_SOFT } from "../../subscription/kitUtils";
import { ACTION_LABEL, CHANNEL_LABEL, SEGMENT_LABEL, TONE_LABEL } from "./dunningLabels";

interface StepState {
  daysAfterDue: string;
  action: DunningAction;
  channel: DunningChannel;
  subjectTemplate: string;
  messageTemplate: string;
}

interface FormState {
  policyCode: string;
  name: string;
  segment: DunningSegment;
  tone: DunningTone;
  active: boolean;
  steps: StepState[];
}

const emptyStep = (): StepState => ({ daysAfterDue: "", action: "REMINDER", channel: "EMAIL", subjectTemplate: "", messageTemplate: "" });

const emptyForm = (): FormState => ({
  policyCode: "",
  name: "",
  segment: "DEFAULT",
  tone: "STANDARD",
  active: true,
  steps: [emptyStep()],
});

const fromPolicy = (p: DunningPolicyView): FormState => ({
  policyCode: p.policyCode,
  name: p.name,
  segment: p.segment,
  tone: p.tone,
  active: p.active,
  steps: (p.steps ?? []).map((s) => ({
    daysAfterDue: String(s.daysAfterDue),
    action: s.action,
    channel: s.channel,
    subjectTemplate: s.subjectTemplate ?? "",
    messageTemplate: s.messageTemplate ?? "",
  })),
});

const toRequest = (f: FormState): DunningPolicyRequest => ({
  policyCode: f.policyCode.trim(),
  name: f.name.trim(),
  segment: f.segment,
  tone: f.tone,
  active: f.active,
  steps: f.steps.map((s) => ({
    daysAfterDue: Number(s.daysAfterDue),
    action: s.action,
    channel: s.channel,
    subjectTemplate: s.subjectTemplate.trim() || undefined,
    messageTemplate: s.messageTemplate.trim() || undefined,
  })),
});

const stepsOrderError = (steps: StepState[]): string | null => {
  const days = steps.map((s) => Number(s.daysAfterDue));
  if (days.some((d) => isInvalidDays(d))) return "Chaque palier a besoin d'un nombre de jours entier, à partir de 0.";
  for (let i = 1; i < days.length; i++) {
    if (days[i] <= days[i - 1]) return "Les paliers doivent se suivre dans l'ordre croissant des jours.";
  }
  return null;
};
const isInvalidDays = (d: number) => !Number.isInteger(d) || d < 0;

/** Formulaire en ligne de création ou de modification d'une politique de relance */
export const DunningPolicyForm: React.FC<{
  policy: DunningPolicyView | null;
  pending: boolean;
  error?: string | null;
  onSubmit: (data: DunningPolicyRequest) => void;
  onCancel: () => void;
}> = ({ policy, pending, error, onSubmit, onCancel }) => {
  const [form, setForm] = useState<FormState>(() => (policy ? fromPolicy(policy) : emptyForm()));
  const editing = policy !== null;

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const patchStep = (index: number, p: Partial<StepState>) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? { ...s, ...p } : s)) }));

  const orderError = form.steps.length > 0 ? stepsOrderError(form.steps) : null;
  const canSubmit = form.policyCode.trim() && form.name.trim() && form.steps.length > 0 && !orderError;

  const sortSteps = () =>
    setForm((f) => ({ ...f, steps: [...f.steps].sort((a, b) => Number(a.daysAfterDue) - Number(b.daysAfterDue)) }));

  return (
    <PanelForm
      title={editing ? `Modifier la politique ${policy.policyCode}` : "Nouvelle politique de relance"}
      pending={pending}
      submitLabel="Enregistrer"
      submitDisabled={!canSubmit}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(toRequest(form));
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" required hint={editing ? "Le code ne change pas : enregistrer remplace la politique." : undefined}>
          <input className={FIELD_SOFT} value={form.policyCode} disabled={editing} onChange={(e) => patch({ policyCode: e.target.value })} placeholder="RELANCE-STANDARD" />
        </Field>
        <Field label="Nom" required>
          <input className={FIELD_SOFT} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Segment" hint="Une seule politique active par segment.">
          <select className={FIELD_SOFT} value={form.segment} onChange={(e) => patch({ segment: e.target.value as DunningSegment })}>
            {Object.entries(SEGMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ton">
          <select className={FIELD_SOFT} value={form.tone} onChange={(e) => patch({ tone: e.target.value as DunningTone })}>
            {Object.entries(TONE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <CheckField checked={form.active} onChange={(v) => patch({ active: v })} label="Politique active : remplace celle déjà active sur ce segment" />

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-sm font-bold text-gray-950">Paliers</h5>
          <div className="flex gap-2">
            <ActionButton variant="ghost" icon={ArrowDownUp} className="!px-4 !py-2" onClick={sortSteps} disabled={form.steps.length < 2}>
              Trier par jours
            </ActionButton>
            <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => patch({ steps: [...form.steps, emptyStep()] })}>
              Ajouter un palier
            </ActionButton>
          </div>
        </div>

        {form.steps.length === 0 ? (
          <p className="py-3 text-center text-sm text-gray-400">Aucun palier. Ajoutez au moins un palier.</p>
        ) : (
          <div className="space-y-3">
            {form.steps.map((s, i) => (
              <ItemRow key={i} className="bg-gray-50 !shadow-none">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field label="Retard (jours)">
                    <input type="number" min={0} className={FIELD_SOFT} value={s.daysAfterDue} onChange={(e) => patchStep(i, { daysAfterDue: e.target.value })} />
                  </Field>
                  <Field label="Action">
                    <select className={FIELD_SOFT} value={s.action} onChange={(e) => patchStep(i, { action: e.target.value as DunningAction })}>
                      {Object.entries(ACTION_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Canal">
                    <select className={FIELD_SOFT} value={s.channel} onChange={(e) => patchStep(i, { channel: e.target.value as DunningChannel })}>
                      {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end justify-end">
                    <IconButton icon={Trash2} tone="danger" label="Retirer le palier" onClick={() => patch({ steps: form.steps.filter((_, j) => j !== i) })} />
                  </div>
                </div>

                {s.channel === "EMAIL" && (
                  <Field label="Objet" className="mt-3">
                    <input className={FIELD_SOFT} value={s.subjectTemplate} onChange={(e) => patchStep(i, { subjectTemplate: e.target.value })} placeholder="Facture {documentNumber} en retard" />
                  </Field>
                )}
                <Field label="Message" className="mt-3">
                  <textarea className={`${FIELD_SOFT} resize-none`} rows={3} value={s.messageTemplate} onChange={(e) => patchStep(i, { messageTemplate: e.target.value })} />
                </Field>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-400">Insérer :</span>
                  {DUNNING_TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patchStep(i, { messageTemplate: `${s.messageTemplate}{${v}}` })}
                      className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-gray-600 shadow-sm hover:bg-gray-100"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </ItemRow>
            ))}
          </div>
        )}
        {orderError && <p className="mt-2 text-sm text-red-600">{orderError}</p>}
      </div>
    </PanelForm>
  );
};
