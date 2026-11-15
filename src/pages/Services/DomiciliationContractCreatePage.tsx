import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../services/subscription.service";
import { domiciliationService } from "../../services/domiciliation.service";
import type { DomiciliationBillingCycle, MailForwardingMode } from "../../services/domiciliation.service";
import { ActionButton, ErrorBanner, Field, PageHeader, Section } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { SUBSCRIPTION_STATUS, statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { LifecycleShell } from "../../components/subscription/lifecycle/LifecycleShell";
import { SubscriberPicker } from "../../components/subscription/promotions/SubscriberPicker";
import type { SubscriberRef } from "../../components/subscription/promotions/SubscriberPicker";
import { DOMICILIATION_CYCLE_OPTIONS, FORWARDING_MODE_OPTIONS } from "../../components/services/serviceLabels";

const BLOCK = "rounded-2xl bg-white p-5 shadow-sm";

/** Ouverture d'un contrat de domiciliation : abonnement, entreprise, adresse, engagement. Le contrat naît en brouillon. */
export const DomiciliationContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const preset = params.get("subscription") ?? "";

  const [subscriber, setSubscriber] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [subscriptionNumber, setSubscriptionNumber] = useState(preset);
  const [f, setF] = useState({
    legalName: "",
    legalForm: "",
    registrationNumber: "",
    taxNumber: "",
    legalRepresentativeName: "",
    addressCode: "",
    suiteNumber: "",
    billingCycle: "MONTHLY",
    commitmentMonths: "",
    noticePeriodDays: "",
    startDate: "",
    mailForwardingMode: "HOLD",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));

  const subscriptions = useQuery({
    queryKey: ["subscriptions", "for-domiciliation", subscriber.type, subscriber.code],
    queryFn: () => subscriptionService.getSubscriptions({ subscriberType: subscriber.type, subscriberCode: subscriber.code, size: 50 }),
    enabled: !!subscriber.code,
  });
  const addresses = useQuery({
    queryKey: ["domiciliation-addresses"],
    queryFn: () => domiciliationService.getAddresses(),
  });
  const activeAddresses = (addresses.data ?? []).filter((a) => a.active);
  const address = activeAddresses.find((a) => a.code === f.addressCode);
  const months = Number(f.commitmentMonths);

  const create = useMutation({
    mutationFn: () =>
      domiciliationService.openContract({
        subscriptionNumber,
        legalName: f.legalName.trim(),
        legalForm: f.legalForm.trim() || undefined,
        registrationNumber: f.registrationNumber.trim() || undefined,
        taxNumber: f.taxNumber.trim() || undefined,
        legalRepresentativeName: f.legalRepresentativeName.trim(),
        addressCode: f.addressCode,
        suiteNumber: f.suiteNumber.trim() || undefined,
        billingCycle: f.billingCycle as DomiciliationBillingCycle,
        commitmentMonths: months,
        noticePeriodDays: f.noticePeriodDays ? Number(f.noticePeriodDays) : undefined,
        startDate: f.startDate,
        mailForwardingMode: f.mailForwardingMode as MailForwardingMode,
      }),
    onSuccess: (c) => {
      toast.success("Contrat ouvert en brouillon");
      qc.invalidateQueries({ queryKey: ["domiciliation-contracts"] });
      navigate(`/services/contracts/${encodeURIComponent(c.contractNumber)}`);
    },
    onError: (e) => setError(apiMessage(e, "Ouverture impossible.")),
  });

  const valid =
    !!subscriptionNumber &&
    !!f.legalName.trim() &&
    !!f.legalRepresentativeName.trim() &&
    !!f.addressCode &&
    Number.isInteger(months) &&
    months >= 0 &&
    f.commitmentMonths !== "" &&
    !!f.startDate;

  const fiscalOk = months >= 12 && !!address?.fiscalCapable;

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
        <PageHeader
          title="Ouvrir un contrat de domiciliation"
          subtitle="Le contrat naît en brouillon : pièces, signature et enregistrement suivent depuis sa fiche."
          onBack={() => navigate("/services/contracts")}
          backLabel="Retour aux contrats"
        />
        <div className="space-y-5">
          <ErrorBanner message={error} />

          <Section title="Abonnement" description="Le contrat se rattache à un abonnement existant.">
            <div className={BLOCK}>
              {preset && subscriptionNumber === preset ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400">Abonnement</p>
                    <p className="font-mono text-sm font-semibold text-gray-900">{preset}</p>
                  </div>
                  <ActionButton variant="ghost" onClick={() => setSubscriptionNumber("")}>
                    Changer d'abonnement
                  </ActionButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <SubscriberPicker
                    value={subscriber}
                    onChange={(v) => {
                      setSubscriber(v);
                      setSubscriptionNumber("");
                    }}
                    label="Souscripteur"
                  />
                  {subscriber.code && (
                    <Field label="Abonnement" required>
                      <select className={FIELD_SOFT} value={subscriptionNumber} onChange={(e) => setSubscriptionNumber(e.target.value)} disabled={subscriptions.isLoading}>
                        <option value="">{subscriptions.isLoading ? "Chargement des abonnements" : "Choisir un abonnement"}</option>
                        {(subscriptions.data?.content ?? []).map((s) => (
                          <option key={s.subscriptionNumber} value={s.subscriptionNumber}>
                            {s.planName} · {s.subscriptionNumber} · {statusOf(SUBSCRIPTION_STATUS, s.status).label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section title="Entreprise domiciliée">
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${BLOCK}`}>
              <Field label="Raison sociale" required className="sm:col-span-2">
                <input className={FIELD_SOFT} value={f.legalName} onChange={(e) => set({ legalName: e.target.value })} />
              </Field>
              <Field label="Forme juridique">
                <input className={FIELD_SOFT} value={f.legalForm} onChange={(e) => set({ legalForm: e.target.value })} />
              </Field>
              <Field label="Représentant légal" required>
                <input className={FIELD_SOFT} value={f.legalRepresentativeName} onChange={(e) => set({ legalRepresentativeName: e.target.value })} />
              </Field>
              <Field label="N° d'immatriculation">
                <input className={`${FIELD_SOFT} font-mono`} value={f.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} />
              </Field>
              <Field label="N° d'identification fiscale">
                <input className={`${FIELD_SOFT} font-mono`} value={f.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="Adresse">
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${BLOCK}`}>
              <Field label="Adresse de domiciliation" required>
                <select className={FIELD_SOFT} value={f.addressCode} onChange={(e) => set({ addressCode: e.target.value })} disabled={addresses.isLoading}>
                  <option value="">{addresses.isLoading ? "Chargement des adresses" : "Choisir une adresse"}</option>
                  {activeAddresses.map((a) => {
                    const full = a.maxOccupants != null && (a.occupants ?? 0) >= a.maxOccupants;
                    return (
                      <option key={a.code} value={a.code} disabled={full}>
                        {a.label}
                        {full ? " (complète)" : ""}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="N° de suite">
                <input className={FIELD_SOFT} value={f.suiteNumber} onChange={(e) => set({ suiteNumber: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="Engagement et courrier">
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${BLOCK}`}>
              <Field label="Rythme de facturation" required hint="Trois rythmes seulement sont admis.">
                <select className={FIELD_SOFT} value={f.billingCycle} onChange={(e) => set({ billingCycle: e.target.value })}>
                  {DOMICILIATION_CYCLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Engagement (mois)" required>
                <input type="number" min={0} className={FIELD_SOFT} value={f.commitmentMonths} onChange={(e) => set({ commitmentMonths: e.target.value })} />
              </Field>
              <Field label="Préavis (jours)">
                <input type="number" min={0} className={FIELD_SOFT} value={f.noticePeriodDays} onChange={(e) => set({ noticePeriodDays: e.target.value })} />
              </Field>
              <Field label="Date de début" required>
                <input type="date" className={FIELD_SOFT} value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </Field>
              <Field label="Traitement du courrier" required className="sm:col-span-2">
                <select className={FIELD_SOFT} value={f.mailForwardingMode} onChange={(e) => set({ mailForwardingMode: e.target.value })}>
                  {FORWARDING_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              {f.commitmentMonths !== "" && (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm sm:col-span-2 ${fiscalOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {fiscalOk
                    ? "Cette adresse pourra être attestée fiscale : l'engagement atteint douze mois."
                    : months < 12
                      ? "Sous douze mois d'engagement, seule une attestation commerciale pourra être délivrée."
                      : address && !address.fiscalCapable
                        ? "Cette adresse n'est pas fiscale : seule une attestation commerciale pourra être délivrée."
                        : "L'attestation fiscale dépend d'un engagement de douze mois sur une adresse fiscale."}
                </p>
              )}
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => navigate("/services/contracts")} disabled={create.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={create.isPending} disabled={!valid}>
              Ouvrir le contrat
            </ActionButton>
          </div>
        </div>
      </form>
    </LifecycleShell>
  );
};
