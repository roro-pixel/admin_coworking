import React, { useState } from "react";
import { Calendar, FileText, User, Users } from "lucide-react";
import type { TemplateResponse } from "../../services/contract.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { Field, Section } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { ChoiceTiles, Group } from "./ChoiceTiles";
import { CustomerAutocomplete } from "./CustomerAutocomplete";
import { MemberAutocomplete } from "./MemberAutocomplete";
import { PartiesEditor } from "./PartiesEditor";
import { OWNER_TYPE_CHOICES, RENEWAL_CHOICES } from "./contractLabels";
import type { ContractFormValues, PartyDraft } from "./contractFormModel";

/**
 * Corps du formulaire de contrat, partagé par la page de création et le panneau
 * de création rapide / modification de la liste.
 */
export const ContractForm: React.FC<{
  values: ContractFormValues;
  onChange: (patch: Partial<ContractFormValues>) => void;
  parties: PartyDraft[];
  onPartiesChange: (parties: PartyDraft[]) => void;
  templates: TemplateResponse[];
  templatesLoading: boolean;
  errors: Record<string, string>;
  /** Le serveur ne permet pas de changer le propriétaire d'un contrat existant : on l'affiche sans le proposer à la modification. */
  ownerLocked?: boolean;
}> = ({ values, onChange, parties, onPartiesChange, templates, templatesLoading, errors, ownerLocked }) => {
  const [owner, setOwner] = useState<CustomerSummaryResponse | MemberSummaryResponse | null>(null);
  const [business, setBusiness] = useState<CustomerSummaryResponse | null>(null);

  const pickOwner = (item: CustomerSummaryResponse | MemberSummaryResponse | null) => {
    setOwner(item);
    onChange({
      ownerCode: item ? ((item as CustomerSummaryResponse).customerId ?? (item as MemberSummaryResponse).memberId) : "",
    });
  };

  return (
    <div className="space-y-4">
      <Section title="Template et informations" icon={FileText}>
        <div className="space-y-5">
          <Group label="Template de contrat" required error={errors.templateCode}>
            {templatesLoading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="status" aria-label="Chargement">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
                ))}
              </div>
            ) : (
              <ChoiceTiles
                label="Template de contrat"
                items={templates.map((t) => ({ value: t.code, label: t.name, description: t.description ?? undefined }))}
                value={values.templateCode}
                onChange={(v) => onChange({ templateCode: v })}
              />
            )}
          </Group>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Titre du contrat" required error={errors.title}>
              <input
                value={values.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Ex : Contrat d'abonnement mensuel"
                className={FIELD}
              />
            </Field>
            <Field label="Description">
              <input
                value={values.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Description optionnelle"
                className={FIELD}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Propriétaire du contrat" icon={User}>
        <div className="space-y-5">
          {ownerLocked ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Propriétaire (non modifiable)</p>
              <p className="mt-1 font-semibold text-gray-900">
                {OWNER_TYPE_CHOICES.find((c) => c.value === values.ownerType)?.label ?? values.ownerType} <span className="font-mono text-xs text-gray-500">{values.ownerCode}</span>
              </p>
            </div>
          ) : (
            <>
          <Group label="Type de propriétaire" required>
              <ChoiceTiles
                label="Type de propriétaire"
                columns="grid-cols-1 sm:grid-cols-3"
                items={OWNER_TYPE_CHOICES}
                value={values.ownerType}
                onChange={(v) => {
                  // Changer de type vide le propriétaire choisi
                  setOwner(null);
                  onChange({ ownerType: v as ContractFormValues["ownerType"], ownerCode: "" });
                }}
              />
            </Group>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                {values.ownerType === "MEMBER" ? "Membre" : "Customer"}
                <span className="text-[color:var(--logo-pink-dark)]"> *</span>
              </span>
              {values.ownerType === "MEMBER" ? (
                <MemberAutocomplete
                  onSelect={pickOwner}
                  selectedMember={owner as MemberSummaryResponse | null}
                  placeholder="Rechercher un membre..."
                />
              ) : (
                <CustomerAutocomplete
                  onSelect={pickOwner}
                  selectedCustomer={owner as CustomerSummaryResponse | null}
                  placeholder="Rechercher un customer..."
                />
              )}
              {values.ownerCode && !owner && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Actuel : <span className="font-mono font-semibold text-gray-700">{values.ownerCode}</span>
                </p>
              )}
              {errors.ownerCode && <p className="mt-1 text-xs text-red-600">{errors.ownerCode}</p>}
            </div>
            </>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Business (optionnel)</span>
            <CustomerAutocomplete
              onSelect={(c) => {
                setBusiness(c);
                onChange({ businessCode: c?.customerId || "" });
              }}
              selectedCustomer={business}
              placeholder="Lier à un business..."
            />
            {values.businessCode && !business ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Actuel : <span className="font-mono font-semibold text-gray-700">{values.businessCode}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-400">Si le contrat concerne une entité business spécifique</p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Dates et renouvellement" icon={Calendar}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date d'effet" required error={errors.effectiveDate}>
              <input
                type="date"
                value={values.effectiveDate}
                onChange={(e) => onChange({ effectiveDate: e.target.value })}
                className={FIELD}
              />
            </Field>
            <Field label="Date de début" required error={errors.startDate}>
              <input
                type="date"
                value={values.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className={FIELD}
              />
            </Field>
            <Field label="Date de fin" hint="Vide si durée indéterminée" error={errors.endDate}>
              <input
                type="date"
                value={values.endDate}
                min={values.startDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className={FIELD}
              />
            </Field>
          </div>
          <Group label="Type de renouvellement" required>
            <ChoiceTiles
              label="Type de renouvellement"
              compact
              columns="grid-cols-1 sm:grid-cols-3"
              items={RENEWAL_CHOICES}
              value={values.renewalType}
              onChange={(v) => onChange({ renewalType: v as ContractFormValues["renewalType"] })}
            />
          </Group>
        </div>
      </Section>

      <Section title="Parties prenantes" description="Au moins un signataire est requis" icon={Users}>
        <PartiesEditor parties={parties} onChange={onPartiesChange} error={errors.parties} />
      </Section>
    </div>
  );
};
