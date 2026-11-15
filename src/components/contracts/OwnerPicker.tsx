import React, { useState } from "react";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ChoiceTiles, Group } from "./ChoiceTiles";
import { CustomerAutocomplete } from "./CustomerAutocomplete";
import { MemberAutocomplete } from "./MemberAutocomplete";
import { OWNER_TYPE_CHOICES } from "./contractLabels";

export interface OwnerValue {
  ownerType: string;
  ownerCode: string;
  businessCode: string;
}

/** Choix du propriétaire (type + recherche) et du business facultatif, pour les rédactions. */
export const OwnerPicker: React.FC<{ value: OwnerValue; onChange: (patch: Partial<OwnerValue>) => void }> = ({ value, onChange }) => {
  const [owner, setOwner] = useState<CustomerSummaryResponse | MemberSummaryResponse | null>(null);
  const [business, setBusiness] = useState<CustomerSummaryResponse | null>(null);

  const pick = (item: CustomerSummaryResponse | MemberSummaryResponse | null) => {
    setOwner(item);
    onChange({ ownerCode: item ? ((item as CustomerSummaryResponse).customerId ?? (item as MemberSummaryResponse).memberId) : "" });
  };

  return (
    <div className="space-y-4">
      <Group label="Type de propriétaire">
        <ChoiceTiles
          label="Type de propriétaire"
          compact
          columns="grid-cols-1 sm:grid-cols-3"
          items={OWNER_TYPE_CHOICES.map(({ value: v, label }) => ({ value: v, label }))}
          value={value.ownerType}
          onChange={(v) => {
            setOwner(null);
            onChange({ ownerType: v, ownerCode: "" });
          }}
        />
      </Group>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">{value.ownerType === "MEMBER" ? "Membre" : "Customer"}</span>
          {value.ownerType === "MEMBER" ? (
            <MemberAutocomplete onSelect={pick} selectedMember={owner as MemberSummaryResponse | null} placeholder="Rechercher un membre..." />
          ) : (
            <CustomerAutocomplete onSelect={pick} selectedCustomer={owner as CustomerSummaryResponse | null} placeholder="Rechercher un customer..." />
          )}
          {value.ownerCode && !owner && (
            <p className="mt-1.5 text-xs text-gray-500">
              Actuel : <span className="font-mono font-semibold text-gray-700">{value.ownerCode}</span>
            </p>
          )}
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Business (optionnel)</span>
          <CustomerAutocomplete
            onSelect={(c) => {
              setBusiness(c);
              onChange({ businessCode: c?.customerId ?? "" });
            }}
            selectedCustomer={business}
            placeholder="Lier à un business..."
          />
          {value.businessCode && !business && (
            <p className="mt-1.5 text-xs text-gray-500">
              Actuel : <span className="font-mono font-semibold text-gray-700">{value.businessCode}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
