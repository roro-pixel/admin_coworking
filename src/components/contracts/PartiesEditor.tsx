import React, { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, ErrorBanner, Field, IconButton, ItemRow, StatusChip, Tag } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import { CustomerAutocomplete } from "./CustomerAutocomplete";
import { MemberAutocomplete } from "./MemberAutocomplete";
import { ChoiceTiles, Group } from "./ChoiceTiles";
import { PARTY_ROLES, PARTY_ROLE_CHOICES, PARTY_TYPE_CHOICES, OWNER_TYPE_LABELS } from "./contractLabels";
import type { PartyDraft } from "./contractFormModel";

const blankParty = () => ({
  partyType: "MEMBER",
  partyCode: "",
  displayName: "",
  email: "",
  phone: "",
  role: "SIGNATORY",
  mustSign: true,
});

/**
 * Parties prenantes d'un contrat : liste + ajout d'une partie.
 */
export const PartiesEditor: React.FC<{
  parties: PartyDraft[];
  onChange: (parties: PartyDraft[]) => void;
  error?: string;
}> = ({ parties, onChange, error }) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blankParty());
  const [pickedCustomer, setPickedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [pickedMember, setPickedMember] = useState<MemberSummaryResponse | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const reset = () => {
    setDraft(blankParty());
    setPickedCustomer(null);
    setPickedMember(null);
    setAddError(null);
  };

  const close = () => {
    setAdding(false);
    reset();
  };

  const pickType = (type: string) => {
    setDraft({ ...draft, partyType: type, partyCode: "", displayName: "", email: "", phone: "" });
    setPickedCustomer(null);
    setPickedMember(null);
  };

  const pickCustomer = (c: CustomerSummaryResponse | null) => {
    setPickedMember(null);
    setPickedCustomer(c);
    // Le type choisi (Customer ou Business) est conservé tel quel
    setDraft(
      c
        ? { ...draft, partyCode: c.customerId, displayName: c.displayName, email: c.email }
        : { ...draft, partyCode: "", displayName: "", email: "" },
    );
  };

  const pickMember = (m: MemberSummaryResponse | null) => {
    setPickedCustomer(null);
    setPickedMember(m);
    setDraft(
      m
        ? { ...draft, partyType: "MEMBER", partyCode: m.memberId, displayName: m.fullName, email: m.email }
        : { ...draft, partyCode: "", displayName: "", email: "" },
    );
  };

  const add = () => {
    if (!draft.partyCode || !draft.displayName || !draft.email) {
      setAddError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    onChange([...parties, { ...draft, signOrder: parties.length + 1 }]);
    close();
  };

  const signatories = parties.filter((p) => p.role === "SIGNATORY").length;
  const beneficiaries = parties.filter((p) => p.role === "BENEFICIARY").length;
  const locked = !!(pickedCustomer || pickedMember);

  return (
    <div className="space-y-4">
      {parties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={signatories > 0 ? "success" : "warn"}>
            {signatories} signataire{signatories > 1 ? "s" : ""}
          </StatusChip>
          <StatusChip tone="info">
            {beneficiaries} bénéficiaire{beneficiaries > 1 ? "s" : ""}
          </StatusChip>
        </div>
      )}

      {parties.length > 0 && (
        <div className="space-y-2">
          {parties.map((p, idx) => {
            const role = PARTY_ROLES[p.role];
            return (
              <ItemRow key={`${p.partyCode}-${idx}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={role?.tone ?? "neutral"}>{role?.label ?? p.role}</StatusChip>
                    <Tag>{OWNER_TYPE_LABELS[p.partyType] ?? p.partyType}</Tag>
                    <span className="font-mono text-xs text-gray-400">{p.partyCode}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-900">{p.displayName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {p.email}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                </div>
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  label="Retirer cette partie"
                  onClick={() => onChange(parties.filter((_, i) => i !== idx))}
                />
              </ItemRow>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)]">
          <h4 className="text-sm font-bold text-gray-950">Ajouter une partie prenante</h4>
          <ErrorBanner message={addError} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Group label="Type">
              <ChoiceTiles
                label="Type de partie"
                compact
                columns="grid-cols-3"
                items={PARTY_TYPE_CHOICES}
                value={draft.partyType}
                onChange={pickType}
              />
            </Group>
            <Field label="Rôle" required>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value, mustSign: e.target.value === "SIGNATORY" })}
                className={`${FIELD} bg-gray-50 shadow-none`}
              >
                {PARTY_ROLE_CHOICES.map((r) => (
                  <option key={r} value={r}>
                    {PARTY_ROLES[r].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Rechercher</span>
            {draft.partyType === "MEMBER" ? (
              <MemberAutocomplete onSelect={pickMember} selectedMember={pickedMember} placeholder="Rechercher un membre..." />
            ) : (
              <CustomerAutocomplete onSelect={pickCustomer} selectedCustomer={pickedCustomer} placeholder="Rechercher un customer..." />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <input
                type="email"
                value={draft.email}
                readOnly={locked}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={`${FIELD} bg-gray-50 shadow-none read-only:text-gray-500`}
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className={`${FIELD} bg-gray-50 shadow-none`}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={close}>
              Annuler
            </ActionButton>
            <ActionButton icon={Plus} onClick={add}>
              Ajouter
            </ActionButton>
          </div>
        </div>
      ) : (
        <ActionButton variant="ghost" icon={Users} className="w-full sm:w-auto" onClick={() => setAdding(true)}>
          Ajouter une partie
        </ActionButton>
      )}

      <ErrorBanner message={error ?? null} />
    </div>
  );
};
