import React from "react";
import { CheckField, Field } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import type { ResourcePolicyRequest, ResourcePolicyResponse } from "../../services/resource.service";
import { formatDuration } from "./resKit";

export const POLICY_DEFAULTS = {
  name: "",
  description: "",
  minBookingDurationMinutes: 30,
  maxBookingDurationMinutes: 480,
  minBookingNoticeMinutes: 60,
  cancellationNoticeMinutes: 120,
  allowCancellation: true,
  active: true,
};
export type PolicyForm = typeof POLICY_DEFAULTS;

export const policyToForm = (p: ResourcePolicyResponse): PolicyForm => ({
  name: p.name || "",
  description: p.description || "",
  minBookingDurationMinutes: p.minBookingDurationMinutes ?? 30,
  maxBookingDurationMinutes: p.maxBookingDurationMinutes ?? 480,
  minBookingNoticeMinutes: p.minBookingNoticeMinutes ?? 60,
  cancellationNoticeMinutes: p.cancellationNoticeMinutes ?? 120,
  allowCancellation: p.allowCancellation ?? true,
  active: p.active ?? true,
});

/** Retourne un message d'erreur si le formulaire est incohérent */
export const policyError = (f: PolicyForm): string | null =>
  f.minBookingDurationMinutes >= f.maxBookingDurationMinutes ? "La durée minimale doit être inférieure à la durée maximale." : null;

export const policyPayload = (f: PolicyForm): ResourcePolicyRequest => ({
  name: f.name.trim(),
  description: f.description.trim() || undefined,
  minBookingDurationMinutes: f.minBookingDurationMinutes,
  maxBookingDurationMinutes: f.maxBookingDurationMinutes,
  minBookingNoticeMinutes: f.minBookingNoticeMinutes,
  allowCancellation: f.allowCancellation,
  cancellationNoticeMinutes: f.allowCancellation ? f.cancellationNoticeMinutes : undefined,
  active: f.active,
});

const Minutes: React.FC<{ label: string; value: number; min?: number; onChange: (v: number) => void }> = ({ label, value, min = 0, onChange }) => (
  <Field label={label} hint={value > 0 ? `Soit ${formatDuration(value)}` : undefined}>
    <input type="number" min={min} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className={FIELD} />
  </Field>
);

/** Champs d'une politique de réservation, partagés entre la création et la modification */
export const PolicyFields: React.FC<{ value: PolicyForm; onChange: (patch: Partial<PolicyForm>) => void }> = ({ value: f, onChange: set }) => (
  <>
    <Field label="Nom" required>
      <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} />
    </Field>
    <Field label="Description">
      <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
    </Field>
    <div className="grid gap-4 sm:grid-cols-3">
      <Minutes label="Durée minimale (min)" min={1} value={f.minBookingDurationMinutes} onChange={(v) => set({ minBookingDurationMinutes: v })} />
      <Minutes label="Durée maximale (min)" min={1} value={f.maxBookingDurationMinutes} onChange={(v) => set({ maxBookingDurationMinutes: v })} />
      <Minutes label="Préavis de réservation (min)" value={f.minBookingNoticeMinutes} onChange={(v) => set({ minBookingNoticeMinutes: v })} />
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <CheckField checked={f.allowCancellation} onChange={(v) => set({ allowCancellation: v })} label="Annulation autorisée" />
      <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Politique active" />
      {f.allowCancellation && <Minutes label="Délai d'annulation (min)" value={f.cancellationNoticeMinutes} onChange={(v) => set({ cancellationNoticeMinutes: v })} />}
    </div>
  </>
);
