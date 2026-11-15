import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Phone } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CreateCompanyRequest } from "../../services/company.service";
import { ActionButton, ErrorBanner, PageHeader, Section } from "../../components/subscription/kit";
import { apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { CompanyShell } from "../../components/companies/CompanyShell";
import { COMPANIES_KEY } from "../../components/companies/companyLabels";
import {
  BillingFields,
  ContactFields,
  LegalFields,
  addressPayload,
  billingDraftOf,
  billingPayload,
  contactDraftOf,
  contactPayload,
  emptyLegalDraft,
  legalInvalid,
  legalPayload,
} from "../../components/companies/companyKit";

/** Création d'une organisation cliente en un appel : identité, contact et facturation. */
export const CompanyCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [legal, setLegal] = useState(emptyLegalDraft);
  const [contact, setContact] = useState(() => contactDraftOf());
  const [billing, setBilling] = useState(() => billingDraftOf());
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const l = legalPayload(legal);
      const c = contactPayload(contact);
      const b = billingPayload(billing);
      const body: CreateCompanyRequest = {
        organizationType: legal.organizationType,
        name: l.name ?? "",
        legalForm: l.legalForm,
        activity: l.activity,
        identifiers: l.identifiers,
        legalRepresentativeName: l.legalRepresentativeName,
        legalRepresentativeTitle: l.legalRepresentativeTitle,
        vatRegime: l.vatRegime,
        vatExemptionNote: l.vatExemptionNote,
        email: c.email,
        phone: c.phone,
        website: c.website,
        address: c.address,
        billingEmail: b.billingEmail,
        billingAddress: addressPayload(billing.billingAddress) ?? null,
        paymentTermsDays: b.paymentTermsDays,
        creditLimit: b.creditLimit,
        currencyCode: b.currencyCode,
      };
      return companyService.createCompany(body);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Organisation créée");
      navigate(`/companies/${encodeURIComponent(created.customerId)}`);
    },
    onError: (e) => setError(apiMessage(e, "Création impossible.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <CompanyShell>
      <form onSubmit={submit} className="mx-auto w-full max-w-4xl">
        <PageHeader title="Nouvelle entreprise" subtitle="Société, association, profession libérale et autres organisations clientes" onBack={() => navigate("/companies")} backLabel="Entreprises" />
        <div className="space-y-5">
          <ErrorBanner message={error} />
          <Section title="Identité légale" description="Aucun identifiant n'est obligatoire" icon={Building2}>
            <LegalFields value={legal} onChange={setLegal} />
          </Section>
          <Section title="Contact" icon={Phone}>
            <ContactFields value={contact} onChange={setContact} />
          </Section>
          <Section title="Facturation" description="Échéance, plafond d'encours et destinataire des factures" icon={CreditCard}>
            <BillingFields value={billing} onChange={setBilling} hasLimit={false} />
          </Section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => navigate("/companies")} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={createMutation.isPending} disabled={legalInvalid(legal)}>
              Créer l'entreprise
            </ActionButton>
          </div>
        </div>
      </form>
    </CompanyShell>
  );
};
