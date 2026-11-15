import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { SubscriptionQuoteRequest } from "../../../services/subscriptionLifecycle.service";
import { subscriptionService } from "../../../services/subscription.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { OwnerPicker } from "../../../components/wallet/OwnerPicker";
import type { OwnerType } from "../../../components/wallet/walletLabels";
import { ActionButton, ErrorBanner, Field, PageHeader, Section } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { LifecycleShell } from "../../../components/subscription/lifecycle/LifecycleShell";
import { BILLING_CYCLE_OPTIONS } from "../../../components/subscription/lifecycle/lifecycleLabels";

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

/** Création d'un devis d'abonnement. Un prix inférieur au catalogue est vérifié dès l'enregistrement. */
export const QuoteCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ownerType, setOwnerType] = useState<OwnerType>("CUSTOMER");
  const [ownerCode, setOwnerCode] = useState("");
  const [customer, setCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [f, setF] = useState({ planCode: "", billingCycle: "MONTHLY", quotedPrice: "", setupFee: "", commitmentMonths: "", trialDays: "", startDate: "", validUntil: "", proposalNumber: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));

  const plans = useQuery({
    queryKey: ["plans", "quote-select"],
    queryFn: () => subscriptionService.getPlans({ status: "ACTIVE", size: 100 }),
    staleTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: () => {
      const body: SubscriptionQuoteRequest = {
        subscriberType: ownerType,
        subscriberCode: ownerCode,
        planCode: f.planCode,
        billingCycle: f.billingCycle,
        quotedPrice: num(f.quotedPrice),
        setupFee: num(f.setupFee),
        commitmentMonths: num(f.commitmentMonths),
        trialDays: num(f.trialDays),
        startDate: f.startDate || null,
        validUntil: f.validUntil || null,
        notes: f.notes.trim() || undefined,
        proposalNumber: f.proposalNumber.trim() || undefined,
      };
      return subscriptionLifecycleService.createQuote(body);
    },
    onSuccess: (q) => {
      toast.success("Devis créé");
      qc.invalidateQueries({ queryKey: ["subscription-quotes"] });
      navigate(`/subscriptions/quotes/${q.quoteNumber}`);
    },
    onError: (e) => setError(apiMessage(e, "Création impossible.")),
  });

  const valid = !!ownerCode && !!f.planCode;
  const changeOwnerType = (t: OwnerType) => {
    setOwnerType(t);
    setOwnerCode("");
    setCustomer(null);
    setMember(null);
  };

  return (
    <LifecycleShell>
      <form
        className="mx-auto w-full max-w-4xl"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
      >
        <PageHeader title="Nouveau devis" subtitle="Laissez vide ce qui doit suivre le catalogue ou la politique." onBack={() => navigate("/subscriptions/quotes")} backLabel="Retour aux devis" />
        <div className="space-y-5">
          <ErrorBanner message={error} />
          <Section title="Souscripteur">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <OwnerPicker
                ownerType={ownerType}
                onTypeChange={changeOwnerType}
                ownerCode={ownerCode}
                onCodeChange={setOwnerCode}
                selectedCustomer={customer}
                selectedMember={member}
                onCustomer={(c) => { setCustomer(c); setOwnerCode(c?.customerId ?? ""); }}
                onMember={(m) => { setMember(m); setOwnerCode(m?.memberId ?? ""); }}
              />
            </div>
          </Section>
          <Section title="Offre">
            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
              <Field label="Plan" required>
                <select value={f.planCode} onChange={(e) => set({ planCode: e.target.value })} className={FIELD_SOFT}>
                  <option value="">Choisir un plan</option>
                  {(plans.data?.content ?? []).map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cycle de facturation" required>
                <select value={f.billingCycle} onChange={(e) => set({ billingCycle: e.target.value })} className={FIELD_SOFT}>
                  {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Prix proposé (FCFA)" hint="Vide : prix du catalogue.">
                <input type="number" min={0} value={f.quotedPrice} onChange={(e) => set({ quotedPrice: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Frais de mise en service (FCFA)">
                <input type="number" min={0} value={f.setupFee} onChange={(e) => set({ setupFee: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Engagement (mois)">
                <input type="number" min={0} value={f.commitmentMonths} onChange={(e) => set({ commitmentMonths: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Jours d'essai">
                <input type="number" min={0} value={f.trialDays} onChange={(e) => set({ trialDays: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Début souhaité">
                <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Valable jusqu'au" hint="Vide : durée de la politique.">
                <input type="date" value={f.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Référence de proposition CRM">
                <input value={f.proposalNumber} onChange={(e) => set({ proposalNumber: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} className={`${FIELD_SOFT} resize-none`} />
                </Field>
              </div>
            </div>
          </Section>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => navigate("/subscriptions/quotes")}>Annuler</ActionButton>
            <ActionButton type="submit" pending={create.isPending} disabled={!valid}>Créer le devis</ActionButton>
          </div>
        </div>
      </form>
    </LifecycleShell>
  );
};
