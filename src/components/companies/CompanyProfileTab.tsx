import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Link2, Pencil, Phone } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyResponse } from "../../services/company.service";
import { ActionButton, Detail, Field, PanelForm, Section } from "../subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { COMPANIES_KEY, IDENTIFIER_LABEL, ORG_TYPE_LABEL, VAT_LABEL } from "./companyLabels";
import {
  BillingFields,
  ContactFields,
  LegalFields,
  addressLine,
  billingDraftOf,
  billingPayload,
  contactDraftOf,
  contactPayload,
  legalDraftOf,
  legalInvalid,
  legalPayload,
} from "./companyKit";

type Panel = "legal" | "billing" | "contact" | "profile" | null;

/** Onglet Fiche */
export const CompanyProfileTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [legal, setLegal] = useState(() => legalDraftOf(company));
  const [billing, setBilling] = useState(() => billingDraftOf(company));
  const [contact, setContact] = useState(() => contactDraftOf(company));
  const [businessCode, setBusinessCode] = useState("");
  const id = company.customerId;
  const currency = company.currencyCode ?? "XAF";

  const open = (p: Exclude<Panel, null>) => {
    setError(null);
    setLegal(legalDraftOf(company));
    setBilling(billingDraftOf(company));
    setContact(contactDraftOf(company));
    setBusinessCode("");
    setPanel(p);
  };
  const close = () => setPanel(null);

  const saved = (message: string) => {
    queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
    toast.success(message);
    close();
  };
  const failed = (e: unknown) => setError(apiMessage(e, "Enregistrement impossible."));

  const legalMutation = useMutation({
    mutationFn: () => companyService.updateLegal(id, legalPayload(legal)),
    onSuccess: () => saved("Identité légale enregistrée"),
    onError: failed,
  });
  const billingMutation = useMutation({
    mutationFn: () => companyService.updateBilling(id, billingPayload(billing)),
    onSuccess: () => saved("Facturation enregistrée"),
    onError: failed,
  });
  const contactMutation = useMutation({
    mutationFn: () => companyService.updateContact(id, contactPayload(contact)),
    onSuccess: () => saved("Contact enregistré"),
    onError: failed,
  });
  const profileMutation = useMutation({
    mutationFn: () => companyService.linkLegalProfile(id, businessCode.trim()),
    onSuccess: () => saved("Profil légal relié"),
    onError: failed,
  });

  const submit = (run: () => void) => (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    run();
  };

  const edit = (p: Exclude<Panel, null>, label = "Modifier") => (
    <ActionButton variant="ghost" icon={Pencil} onClick={() => open(p)} disabled={panel !== null}>
      {label}
    </ActionButton>
  );

  const outstandingTone = company.creditLimit != null && company.outstanding > company.creditLimit ? "text-red-600" : "text-gray-900";

  return (
    <div className="space-y-5">
      {panel === "legal" && (
        <PanelForm title="Modifier l'identité légale" pending={legalMutation.isPending} submitLabel="Enregistrer" submitDisabled={legalInvalid(legal)} error={error} onCancel={close} onSubmit={submit(() => legalMutation.mutate())}>
          <LegalFields value={legal} onChange={setLegal} suggested={company.suggestedIdentifiers as string[]} />
          <p className="text-xs text-gray-400">La liste d'identifiants enregistrée remplace celle de la fiche.</p>
        </PanelForm>
      )}
      {panel === "billing" && (
        <PanelForm title="Modifier la facturation" pending={billingMutation.isPending} submitLabel="Enregistrer" error={error} onCancel={close} onSubmit={submit(() => billingMutation.mutate())}>
          <BillingFields value={billing} onChange={setBilling} hasLimit={company.creditLimit != null} />
        </PanelForm>
      )}
      {panel === "contact" && (
        <PanelForm title="Modifier le contact" pending={contactMutation.isPending} submitLabel="Enregistrer" error={error} onCancel={close} onSubmit={submit(() => contactMutation.mutate())}>
          <ContactFields value={contact} onChange={setContact} />
        </PanelForm>
      )}
      {panel === "profile" && (
        <PanelForm title="Relier un profil légal" pending={profileMutation.isPending} submitLabel="Relier" submitDisabled={businessCode.trim() === ""} error={error} onCancel={close} onSubmit={submit(() => profileMutation.mutate())}>
          <Field label="Code du profil légal" required hint="Profil déjà existant, à relier à cette organisation">
            <input value={businessCode} onChange={(e) => setBusinessCode(e.target.value)} className={`${FIELD} font-mono`} />
          </Field>
        </PanelForm>
      )}

      <Section
        title="Identité légale"
        icon={Building2}
        action={
          <div className="flex flex-wrap gap-2">
            {edit("profile", "Relier un profil")}
            {edit("legal")}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Dénomination">{company.name}</Detail>
          <Detail label="Type">{ORG_TYPE_LABEL[company.organizationType] ?? company.organizationTypeLabel ?? company.organizationType}</Detail>
          <Detail label="Forme juridique">{company.legalForm}</Detail>
          <Detail label="Activité">{company.activity}</Detail>
          <Detail label="Représentant légal">
            {company.legalRepresentativeName ? (
              <>
                {company.legalRepresentativeName}
                {company.legalRepresentativeTitle && <span className="block text-xs font-normal text-gray-400">{company.legalRepresentativeTitle}</span>}
              </>
            ) : undefined}
          </Detail>
          <Detail label="TVA">
            {VAT_LABEL[company.vatRegime] ?? company.vatRegime}
            {company.vatRegime === "EXEMPT" && company.vatExemptionNote && <span className="block text-xs font-normal text-gray-400">{company.vatExemptionNote}</span>}
          </Detail>
          {(company.identifiers ?? []).map((i) => (
            <Detail key={`${i.type}-${i.value}`} label={i.type === "AUTRE" && i.label ? i.label : IDENTIFIER_LABEL[i.type] ?? i.type} mono>
              {i.value}
              {i.format === "LEGACY" && <span className="ml-2 font-sans text-xs font-normal text-gray-400">ancien format</span>}
            </Detail>
          ))}
        </div>
        {(company.identifiers ?? []).length === 0 && <p className="mt-5 text-sm text-gray-500">Aucun identifiant saisi : rien n'est imprimé sur les factures.</p>}
      </Section>

      <Section title="Facturation" icon={CreditCard} action={edit("billing")}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="E-mail de facturation">{company.billingEmail}</Detail>
          <Detail label="Délai de paiement">{company.paymentTermsDays != null ? `${company.paymentTermsDays} jours` : undefined}</Detail>
          <Detail label="Encours">
            <span className={`tabular-nums ${outstandingTone}`}>{formatMoney(company.outstanding ?? 0, currency)}</span>
          </Detail>
          <Detail label="Plafond d'encours">{company.creditLimit != null ? formatMoney(company.creditLimit, currency) : undefined}</Detail>
          <Detail label="Adresse de facturation" wide>
            {addressLine(company.billingAddress)}
          </Detail>
        </div>
        {company.creditLimit == null && !company.billingEmail && company.paymentTermsDays == null && <p className="text-sm text-gray-500">Facturation non renseignée : l'adresse et l'e-mail du contact servent par défaut.</p>}
      </Section>

      <Section title="Contact" icon={Phone} action={edit("contact")}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="E-mail">{company.email}</Detail>
          <Detail label="Téléphone">{company.phone}</Detail>
          <Detail label="Site web">{company.website}</Detail>
          <Detail label="Adresse du siège" wide>
            {addressLine(company.address)}
          </Detail>
        </div>
        {!company.email && !company.phone && !company.website && !addressLine(company.address) && <p className="text-sm text-gray-500">Aucune coordonnée renseignée.</p>}
      </Section>

      <p className="flex items-center gap-2 px-2 text-xs text-gray-400">
        <Link2 size={13} />
        Code client <span className="font-mono">{company.customerId}</span>
      </p>
    </div>
  );
};
