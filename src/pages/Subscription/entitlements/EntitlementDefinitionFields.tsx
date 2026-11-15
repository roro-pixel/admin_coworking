import React from "react";
import { Boxes, Gauge, Settings2, Tags } from "lucide-react";
import { CheckField, Field, Section, Switch } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ResourceCombobox } from "./ResourceCombobox";
import {
  CONSUMPTION_MODE_OPTIONS,
  ENTITLEMENT_TYPE_OPTIONS,
  RESET_POLICY_OPTIONS,
  UNIT_OPTIONS,
  searchResourceGroups,
  searchResourceTypes,
} from "./entitlementForm";
import type { EntitlementFormData } from "./entitlementForm";

type Props = {
  formData: EntitlementFormData;
  onChange: (next: EntitlementFormData) => void;
  disabled?: boolean;
};

/** Champs partagés par la création et la modification d'un droit. */
export const EntitlementDefinitionFields: React.FC<Props> = ({ formData, onChange, disabled = false }) => {
  const update = <K extends keyof EntitlementFormData>(key: K, value: EntitlementFormData[K]) =>
    onChange({ ...formData, [key]: value });

  return (
    <div className="space-y-4">
      <Section title="Informations générales" description="Nom, description et typologie du droit." icon={Tags}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom du droit" required className="md:col-span-2">
            <input
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              required
              disabled={disabled}
              placeholder="Ex : Accès coworking mensuel"
              className={FIELD}
            />
          </Field>
          <Field label="Type" required>
            <select
              value={formData.entitlementType}
              onChange={(e) => update("entitlementType", e.target.value as EntitlementFormData["entitlementType"])}
              disabled={disabled}
              className={FIELD}
            >
              {ENTITLEMENT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unité" required>
            <select
              value={formData.unit}
              onChange={(e) => update("unit", e.target.value as EntitlementFormData["unit"])}
              disabled={disabled}
              className={FIELD}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={formData.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Décrivez ce que ce droit autorise ou consomme."
              className={`${FIELD} resize-none`}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Règles de consommation"
        description="Comment le droit est vérifié, réservé, consommé et réinitialisé."
        icon={Gauge}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Mode de consommation" required>
            <select
              value={formData.consumptionMode}
              onChange={(e) => update("consumptionMode", e.target.value as EntitlementFormData["consumptionMode"])}
              disabled={disabled}
              className={FIELD}
            >
              {CONSUMPTION_MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Politique de reset" required>
            <select
              value={formData.resetPolicy}
              onChange={(e) => update("resetPolicy", e.target.value as EntitlementFormData["resetPolicy"])}
              disabled={disabled}
              className={FIELD}
            >
              {RESET_POLICY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <CheckField checked={formData.stackable} onChange={(v) => update("stackable", v)} label="Cumulable" />
          <CheckField checked={formData.transferable} onChange={(v) => update("transferable", v)} label="Transférable" />
        </div>
      </Section>

      <Section
        title="Ressources liées"
        description="Associez le droit à un type ou à un groupe de ressources si nécessaire."
        icon={Boxes}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Type de ressource">
            <ResourceCombobox
              value={formData.resourceTypeCode}
              onChange={(v) => update("resourceTypeCode", v)}
              searchFn={searchResourceTypes}
              queryKeyPrefix="resource-types-basic-search"
              placeholder="Rechercher un type de ressource"
              disabled={disabled}
            />
          </Field>
          <Field label="Groupe de ressources">
            <ResourceCombobox
              value={formData.resourceGroupCode}
              onChange={(v) => update("resourceGroupCode", v)}
              searchFn={searchResourceGroups}
              queryKeyPrefix="resource-groups-basic-search"
              placeholder="Rechercher un groupe"
              disabled={disabled}
            />
          </Field>
        </div>
      </Section>

      <Section title="Paramètres avancés" description="Statut et métadonnées JSON optionnelles." icon={Settings2}>
        <div className="space-y-4">
          <Switch checked={formData.active} onChange={(v) => update("active", v)} label="Droit actif" />
          <Field label="Métadonnées JSON">
            <textarea
              value={formData.metadataJson}
              onChange={(e) => update("metadataJson", e.target.value)}
              disabled={disabled}
              rows={5}
              placeholder='{"scope":"premium", "displayOrder": 1}'
              className={`${FIELD} resize-none font-mono`}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
};
