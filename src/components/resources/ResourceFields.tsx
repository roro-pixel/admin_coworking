import React from "react";
import { CheckField, Field } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import type { ResourceGroupResponse, ResourcePolicyResponse, ResourceResponse, ResourceStatus, ResourceTypeResponse } from "../../services/resource.service";
import { STATUSES, STATUS_LABEL } from "./resKit";

export interface ResourceForm {
  name: string;
  description: string;
  typeCode: string;
  groupCode: string;
  policyCode: string;
  capacity: number;
  zone: string;
  locationLabel: string;
  floorLabel: string;
  status: ResourceStatus;
  bookingEnabled: boolean;
  portalVisible: boolean;
  active: boolean;
  displayOrder: number;
}

export const RESOURCE_DEFAULTS: ResourceForm = {
  name: "",
  description: "",
  typeCode: "",
  groupCode: "",
  policyCode: "",
  capacity: 1,
  zone: "",
  locationLabel: "",
  floorLabel: "",
  status: "ACTIVE",
  bookingEnabled: true,
  portalVisible: true,
  active: true,
  displayOrder: 0,
};

/** Le formulaire de modification est pré-rempli avec la classification actuelle */
export const resourceToForm = (r: ResourceResponse): ResourceForm => ({
  name: r.name || "",
  description: r.description || "",
  typeCode: r.typeCode || "",
  groupCode: r.groupCode || "",
  policyCode: r.policyCode || "",
  capacity: r.capacity ?? 1,
  zone: r.zone || "",
  locationLabel: r.locationLabel || "",
  floorLabel: r.floorLabel || "",
  status: r.status as ResourceStatus,
  bookingEnabled: r.bookingEnabled,
  portalVisible: r.portalVisible,
  active: r.active,
  displayOrder: r.displayOrder ?? 0,
});

export const resourceError = (f: ResourceForm): string | null => {
  if (!f.name.trim()) return "Le nom est obligatoire.";
  if (!f.typeCode) return "Le type de ressource est obligatoire.";
  if (f.capacity < 1) return "La capacité doit être supérieure à 0.";
  return null;
};

interface Props {
  value: ResourceForm;
  onChange: (patch: Partial<ResourceForm>) => void;
  types: ResourceTypeResponse[];
  groups: ResourceGroupResponse[];
  policies: ResourcePolicyResponse[];
  /** En modification, on expose aussi l'état actif et l'ordre d'affichage */
  editing?: boolean;
}

export const ResourceFields: React.FC<Props> = ({ value: f, onChange: set, types, groups, policies, editing }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom" required className="sm:col-span-2">
        <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex. Salle de réunion principale" className={FIELD} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${FIELD} resize-none`} />
      </Field>
      <Field label="Capacité (personnes)" required>
        <input type="number" min={1} value={f.capacity} onChange={(e) => set({ capacity: Number(e.target.value) || 1 })} className={FIELD} />
      </Field>
      <Field label="Zone">
        <input value={f.zone} onChange={(e) => set({ zone: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Étage (libellé)">
        <input value={f.floorLabel} onChange={(e) => set({ floorLabel: e.target.value })} placeholder="Ex. 2e étage" className={FIELD} />
      </Field>
      <Field label="Emplacement" className="sm:col-span-2">
        <input value={f.locationLabel} onChange={(e) => set({ locationLabel: e.target.value })} placeholder="Ex. 2e étage, porte 12" className={FIELD} />
      </Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Type" required>
        <select value={f.typeCode} onChange={(e) => set({ typeCode: e.target.value })} className={FIELD}>
          <option value="">Choisir un type</option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Groupe">
        <select value={f.groupCode} onChange={(e) => set({ groupCode: e.target.value })} className={FIELD}>
          <option value="">Aucun groupe</option>
          {groups.map((g) => (
            <option key={g.code} value={g.code}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Politique de réservation">
        <select value={f.policyCode} onChange={(e) => set({ policyCode: e.target.value })} className={FIELD}>
          <option value="">Aucune politique</option>
          {policies.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Statut">
        <select value={f.status} onChange={(e) => set({ status: e.target.value as ResourceStatus })} className={FIELD}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      {editing && (
        <Field label="Ordre d'affichage">
          <input type="number" min={0} value={f.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) || 0 })} className={FIELD} />
        </Field>
      )}
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <CheckField checked={f.bookingEnabled} onChange={(v) => set({ bookingEnabled: v })} label="Réservable" />
      <CheckField checked={f.portalVisible} onChange={(v) => set({ portalVisible: v })} label="Visible sur le portail" />
      {editing && <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Ressource active" />}
    </div>
  </>
);
