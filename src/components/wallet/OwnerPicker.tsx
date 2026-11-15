import React from "react";
import { CheckField } from "../subscription/kit";
import { FIELD_SOFT } from "../subscription/kitUtils";
import { PillChoice } from "../operations/opsKit";
import { CustomerAutocomplete } from "../customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { OWNER_TYPE_OPTIONS } from "./walletLabels";
import type { OwnerType } from "./walletLabels";

/** Libellé d'un champ qui contient un autocomplete (un <label> capterait les clics de la liste). */
const PlainLabel: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div>
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">{text}</span>
    {children}
  </div>
);

/**
 * Choix du propriétaire d'un portefeuille, partagé par « Recherche / création » et « Top-up » :
 * type, puis autocomplete adapté (ou saisie manuelle du code).
 */
export const OwnerPicker: React.FC<{
  ownerType: OwnerType;
  onTypeChange: (t: OwnerType) => void;
  ownerCode: string;
  onCodeChange: (code: string) => void;
  selectedCustomer: CustomerSummaryResponse | null;
  selectedMember: MemberSummaryResponse | null;
  onCustomer: (c: CustomerSummaryResponse | null) => void;
  onMember: (m: MemberSummaryResponse | null) => void;
  /** Propose la saisie manuelle du code (utile quand le propriétaire n'est pas dans l'annuaire) */
  allowManual?: boolean;
  manual?: boolean;
  onManualChange?: (v: boolean) => void;
}> = ({ ownerType, onTypeChange, ownerCode, onCodeChange, selectedCustomer, selectedMember, onCustomer, onMember, allowManual, manual = false, onManualChange }) => (
  <div className="space-y-4">
    <PillChoice label="Type de propriétaire" options={OWNER_TYPE_OPTIONS} value={ownerType} onChange={onTypeChange} />
    {allowManual && onManualChange && <CheckField checked={manual} onChange={onManualChange} label="Saisir le code du propriétaire à la main" />}
    {manual ? (
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-gray-600">Code propriétaire</span>
        <input value={ownerCode} onChange={(e) => onCodeChange(e.target.value)} placeholder="CUS-000001, MBR-000001" className={`${FIELD_SOFT} font-mono`} />
      </label>
    ) : ownerType === "MEMBER" ? (
      <PlainLabel text="Membre">
        <MemberAutocomplete selectedMember={selectedMember} onSelect={onMember} placeholder="Rechercher un membre" />
      </PlainLabel>
    ) : (
      <PlainLabel text={ownerType === "BUSINESS_ENTITY" ? "Entreprise" : "Client"}>
        <CustomerAutocomplete
          selectedCustomer={selectedCustomer}
          onSelect={onCustomer}
          typeFilter={ownerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
          placeholder={ownerType === "BUSINESS_ENTITY" ? "Rechercher une entreprise" : "Rechercher un client"}
        />
      </PlainLabel>
    )}
  </div>
);
