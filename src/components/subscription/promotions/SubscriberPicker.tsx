import React, { useState } from "react";
import { MemberAutocomplete } from "../../members/MemberAutocomplete";
import { CustomerAutocomplete } from "../../customers/CustomerAutocomplete";
import type { MemberSummaryResponse } from "../../../services/member.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import { Field } from "../kit";
import { FIELD_SOFT } from "../kitUtils";
import { SUBSCRIBER_TYPE_OPTIONS } from "./promoLabels";

export interface SubscriberRef {
  type: string;
  code: string;
}

/** Type d'abonné puis recherche du membre, du client ou de l'entreprise : renvoie le couple type et code. */
export const SubscriberPicker: React.FC<{
  value: SubscriberRef;
  onChange: (v: SubscriberRef) => void;
  label?: string;
  /** Le sélecteur est posé sur un fond gris : le champ de type passe en blanc pour rester visible */
  onGray?: boolean;
}> = ({ value, onChange, label = "Abonné", onGray = false }) => {
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [customer, setCustomer] = useState<CustomerSummaryResponse | null>(null);

  const changeType = (type: string) => {
    setMember(null);
    setCustomer(null);
    onChange({ type, code: "" });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
      <Field label="Type">
        <select className={onGray ? `${FIELD_SOFT} !bg-white` : FIELD_SOFT} value={value.type} onChange={(e) => changeType(e.target.value)}>
          {SUBSCRIBER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
        {value.type === "MEMBER" ? (
          <MemberAutocomplete
            selectedMember={member}
            onSelect={(m) => {
              setMember(m);
              onChange({ type: value.type, code: m?.memberId ?? "" });
            }}
            placeholder="Rechercher un membre"
          />
        ) : (
          <CustomerAutocomplete
            selectedCustomer={customer}
            typeFilter={value.type === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
            onSelect={(c) => {
              setCustomer(c);
              onChange({ type: value.type, code: c?.customerId ?? "" });
            }}
            placeholder={value.type === "BUSINESS_ENTITY" ? "Rechercher une entreprise" : "Rechercher un client"}
          />
        )}
      </div>
    </div>
  );
};
