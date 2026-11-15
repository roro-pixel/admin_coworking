import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { paymentService } from "../../services/payment.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, Field, PageHeader, Section } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { CUSTOMER_TYPES, PURPOSES } from "../../components/payment/paymentLabels";

const defaultExpiresAt = (): string => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
};

const buildDefaultFormData = () => ({
  customerType: "CUSTOMER",
  customerCode: "",
  amount: 0,
  currency: "XAF",
  purpose: "MANUAL_PAYMENT",
  sourceType: "MANUAL",
  sourceCode: "",
  description: "",
  expiresAt: defaultExpiresAt().slice(0, 16),
});

export const CreatePaymentIntentPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState(buildDefaultFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);

  const handleCustomerTypeChange = (type: string) => {
    setFormData((prev) => ({ ...prev, customerType: type, customerCode: "" }));
    setSelectedCustomer(null);
    setSelectedMember(null);
  };

  const handleCustomerSelect = (customer: CustomerSummaryResponse | null) => {
    setSelectedCustomer(customer);
    setSelectedMember(null);
    setFormData((prev) => ({ ...prev, customerType: "CUSTOMER", customerCode: customer?.customerId || "" }));
  };

  const handleMemberSelect = (member: MemberSummaryResponse | null) => {
    setSelectedMember(member);
    setSelectedCustomer(null);
    setFormData((prev) => ({ ...prev, customerType: "MEMBER", customerCode: member?.memberId || "" }));
  };

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createPaymentIntent({
        customerType: formData.customerType,
        customerCode: formData.customerCode,
        amount: parseFloat(String(formData.amount)) || 0,
        currency: formData.currency,
        purpose: formData.purpose,
        sourceType: formData.sourceType,
        sourceCode: formData.sourceCode || undefined,
        description: formData.description || undefined,
        idempotencyKey: `intent-${formData.customerCode}-${formData.amount}-${Date.now()}`,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        createdBy: admin?.email || String(admin?.id) || "admin",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      navigate(`/payments/${data.intentNumber}`);
    },
    onError: (error: unknown) => setErrorMessage(apiMessage(error, "Erreur lors de la création de l'intention.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerCode) {
      setErrorMessage("Veuillez sélectionner un client.");
      return;
    }
    if (formData.amount <= 0) {
      setErrorMessage("Le montant doit être supérieur à 0.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const customerLabel =
    formData.customerType === "MEMBER" ? "Membre" : formData.customerType === "BUSINESS_ENTITY" ? "Entreprise" : "Client";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Nouvelle intention de paiement"
        subtitle="Créez une demande pour encaisser un paiement."
        onBack={() => navigate("/payments")}
        backLabel="Retour aux intentions"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>
        )}

        <Section title="Client" description="Qui doit payer ?">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Type de client">
              <select
                value={formData.customerType}
                onChange={(e) => handleCustomerTypeChange(e.target.value)}
                className={FIELD}
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">{customerLabel}</span>
              {formData.customerType === "MEMBER" ? (
                <MemberAutocomplete
                  onSelect={handleMemberSelect}
                  selectedMember={selectedMember}
                  placeholder="Rechercher un membre..."
                />
              ) : (
                <CustomerAutocomplete
                  onSelect={handleCustomerSelect}
                  selectedCustomer={selectedCustomer}
                  typeFilter={formData.customerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
                  placeholder={
                    formData.customerType === "BUSINESS_ENTITY" ? "Rechercher une entreprise..." : "Rechercher un client..."
                  }
                />
              )}
            </div>
          </div>
        </Section>

        <Section title="Paiement" description="Montant, objet et échéance.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Montant (FCFA)" required>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                min="1"
                step="100"
                required
                placeholder="50000"
                className={FIELD}
              />
            </Field>
            <Field label="Objectif">
              <select
                value={formData.purpose}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                className={FIELD}
              >
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Code source" hint="Réservation, abonnement… (facultatif)">
              <input
                type="text"
                value={formData.sourceCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, sourceCode: e.target.value }))}
                placeholder="BOOK-001, SUB-001"
                className={`${FIELD} font-mono`}
              />
            </Field>
            <Field label="Expire le">
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                className={FIELD}
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Motif du paiement"
                className={FIELD}
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={() => navigate("/payments")} disabled={createMutation.isPending}>
            Annuler
          </ActionButton>
          <ActionButton type="submit" pending={createMutation.isPending}>
            Créer l'intention
          </ActionButton>
        </div>
      </form>
    </div>
  );
};
