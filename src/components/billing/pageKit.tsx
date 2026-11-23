import React, { useState } from "react";
import { X, User } from "lucide-react";
import { EmptyState, ErrorBlock, IconButton } from "../subscription/kit";
import { PINK_SOFT } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { PillChoice } from "../operations/opsKit";
import { CustomerAutocomplete } from "../customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

/** Chargement, erreur, vide : même rendu pour toutes les listes de la facturation. */
export const QueryState: React.FC<{
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  isEmpty: boolean;
  icon: React.ElementType;
  title: string;
  hint?: string;
  rows?: number;
  children: React.ReactNode;
}> = ({ isLoading, isError, onRetry, isEmpty, icon, title, hint, rows = 5, children }) => {
  if (isLoading) return <ListSkeleton rows={rows} />;
  if (isError) return <ErrorBlock message="Impossible de charger les données." onRetry={onRetry} />;
  if (isEmpty) return <EmptyState icon={icon} title={title} hint={hint} />;
  return <>{children}</>;
};

export type CustomerKind = "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY";
export type PickedCustomer = { type: CustomerKind; code: string; label: string };

const KIND_OPTIONS: { value: CustomerKind; label: string }[] = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Client" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];

/** Sélection d'un client (membre, client ou entreprise) : même logique que le relevé client. */
export const CustomerPicker: React.FC<{ value: PickedCustomer | null; onChange: (v: PickedCustomer | null) => void }> = ({ value, onChange }) => {
  const [kind, setKind] = useState<CustomerKind>(value?.type ?? "MEMBER");
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [customer, setCustomer] = useState<CustomerSummaryResponse | null>(null);

  const changeKind = (k: CustomerKind) => {
    setKind(k);
    setMember(null);
    setCustomer(null);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <PillChoice label="Type de client" options={KIND_OPTIONS} value={kind} onChange={(v) => changeKind(v as CustomerKind)} />
      {kind === "MEMBER" ? (
        <MemberAutocomplete
          selectedMember={member}
          onSelect={(m) => {
            setMember(m);
            onChange(m ? { type: "MEMBER", code: m.memberId, label: (m.fullName ?? "").trim() || m.memberId } : null);
          }}
          placeholder="Rechercher un membre par nom ou e-mail"
        />
      ) : (
        <CustomerAutocomplete
          selectedCustomer={customer}
          onSelect={(c) => {
            setCustomer(c);
            onChange(c ? { type: kind, code: c.customerId, label: c.displayName ?? c.customerId } : null);
          }}
          typeFilter={kind === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
          placeholder={kind === "BUSINESS_ENTITY" ? "Rechercher une entreprise" : "Rechercher un client par nom ou e-mail"}
        />
      )}
      {value && (
        <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${PINK_SOFT}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--logo-pink-dark)]">
              <User size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-950">{value.label}</p>
              <p className="truncate font-mono text-xs text-gray-500">{value.type} {value.code}</p>
            </div>
          </div>
          <IconButton
            icon={X}
            label="Effacer la sélection"
            onClick={() => {
              setMember(null);
              setCustomer(null);
              onChange(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

/** Montant saisi : accepte les décimales, renvoie undefined si vide. */
export const toNum = (v: string): number | undefined => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? undefined : n;
};
