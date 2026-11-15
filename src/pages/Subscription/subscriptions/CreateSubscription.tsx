import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Package, Tags, User } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { subscriptionService } from "../../../services/subscription.service";
import type { Plan, PlanVersion } from "../../../services/subscription.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { CustomerAutocomplete } from "../../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  ErrorBanner,
  Field,
  PageHeader,
  Section,
  Switch,
} from "../../../components/subscription/kit";
import {
  FIELD,
  PINK_SOFT,
  apiMessage,
  formatDate,
  formatMoney,
} from "../../../components/subscription/kitUtils";
import {
  BILLING_CYCLE_LABELS,
  SUBSCRIBER_TYPE_LABELS,
} from "../../../components/subscription/labels";

const buildDefaultFormData = () => ({
  planCode: "",
  // planVersionId est une string opaque (l'id peut dépasser MAX_SAFE_INTEGER)
  planVersionId: "",
  billingCycle: "MONTHLY",
  subscriberType: "MEMBER",
  subscriberCode: "",
  startDate: new Date().toISOString().split("T")[0],
  autoRenew: true,
  couponCodesText: "",
  metadataJson: "",
});

export const CreateSubscription: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(buildDefaultFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Seuls les plans ACTIVE sont éligibles à la souscription
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: () => subscriptionService.getPlans({ status: "ACTIVE", size: 100 }),
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", formData.planCode],
    queryFn: () => subscriptionService.getPlanVersions(formData.planCode),
    enabled: !!formData.planCode,
  });

  const plans = plansData?.content ?? [];
  const versions = versionsData ?? [];

  // planVersionId est optionnel si le backend peut résoudre la version active.
  // On propose ACTIVE + DRAFT pour permettre de choisir une version future.
  const availableVersions = versions.filter(
    (v: PlanVersion) => v.status === "ACTIVE" || v.status === "DRAFT",
  );

  const selectedPlan = plans.find((p: Plan) => p.code === formData.planCode);
  const activeVersion = selectedPlan?.activeVersion;

  const selectedVersion = (
    formData.planVersionId
      ? availableVersions.find((v: PlanVersion) => v.id === formData.planVersionId)
      : activeVersion
  ) as PlanVersion | undefined;

  const handleSubscriberTypeChange = (type: string) => {
    setFormData((prev) => ({ ...prev, subscriberType: type, subscriberCode: "" }));
    setSelectedCustomer(null);
    setSelectedMember(null);
  };

  const isMetadataJsonValid =
    !formData.metadataJson.trim() ||
    (() => {
      try {
        JSON.parse(formData.metadataJson);
        return true;
      } catch {
        return false;
      }
    })();

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof subscriptionService.createSubscription>[0] = {
        planCode: formData.planCode,
        subscriberType: formData.subscriberType as "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY",
        subscriberCode: formData.subscriberCode,
        startDate: formData.startDate,
        autoRenew: formData.autoRenew,
      };

      if (formData.planVersionId) payload.planVersionId = formData.planVersionId;
      if (formData.billingCycle) payload.billingCycle = formData.billingCycle;
      if (formData.metadataJson.trim() && isMetadataJsonValid)
        payload.metadataJson = formData.metadataJson;
      // Les coupons indiqués sont consommés à la création : la retenue éventuelle est capturée
      const couponCodes = formData.couponCodesText.split(/[\s,;]+/).filter(Boolean);
      if (couponCodes.length > 0) payload.couponCodes = couponCodes;

      return subscriptionService.createSubscription(payload);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Souscription créée");
      navigate(
        created?.subscriptionNumber
          ? `/subscriptions/${created.subscriptionNumber}`
          : "/subscriptions/subscriptions",
      );
    },
    onError: (error: unknown) => {
      const msg = apiMessage(error, "Erreur lors de la création.");
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMetadataJsonValid) {
      setErrorMessage("Le JSON des métadonnées est invalide.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const subscriberLabel =
    formData.subscriberType === "MEMBER"
      ? "Membre"
      : formData.subscriberType === "CUSTOMER"
        ? "Customer"
        : "Entreprise";

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Nouvelle souscription"
          subtitle="Abonnez un membre ou un client à un plan"
          onBack={() => navigate("/subscriptions/subscriptions")}
          backLabel="Souscriptions"
        />

        {plansLoading ? (
          <div role="status" aria-label="Chargement" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm"
              >
                <Skeleton className="mb-3 ml-3 mt-2 h-4 w-40" />
                <div className="grid gap-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2">
                  <Skeleton className="h-11 rounded-2xl" />
                  <Skeleton className="h-11 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorBanner message={errorMessage} />

            <Section title="Plan et facturation" icon={Package}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Plan" required>
                  <select
                    value={formData.planCode}
                    onChange={(e) =>
                      setFormData({ ...formData, planCode: e.target.value, planVersionId: "" })
                    }
                    required
                    className={FIELD}
                  >
                    <option value="">Sélectionner un plan</option>
                    {plans.map((plan: Plan) => (
                      <option key={plan.code} value={plan.code}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Cycle de facturation" required>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className={FIELD}
                  >
                    {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                {formData.planCode && (
                  <Field
                    label={versionsLoading ? "Version du plan (chargement)" : "Version du plan"}
                    className="md:col-span-2"
                  >
                    <select
                      value={formData.planVersionId}
                      onChange={(e) => setFormData({ ...formData, planVersionId: e.target.value })}
                      className={FIELD}
                      disabled={versionsLoading}
                    >
                      <option value="">
                        Version active par défaut
                        {activeVersion ? ` (v${activeVersion.versionNumber})` : ""}
                      </option>
                      {availableVersions.map((v: PlanVersion) => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber} · {v.name} ({v.status === "ACTIVE" ? "Active" : "Brouillon"})
                          {v.effectiveFrom && ` · dès le ${formatDate(v.effectiveFrom)}`}
                        </option>
                      ))}
                    </select>

                    {selectedVersion && selectedVersion.prices?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedVersion.prices.map((price, idx) => (
                          <span
                            key={idx}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                          >
                            {formatMoney(price.amount, price.currency)} /{" "}
                            {BILLING_CYCLE_LABELS[price.billingCycle] ?? price.billingCycle}
                            {price.setupFee > 0 &&
                              ` · activation ${formatMoney(price.setupFee, price.currency)}`}
                            {!price.taxIncluded && " · HT"}
                          </span>
                        ))}
                      </div>
                    )}
                  </Field>
                )}
              </div>
            </Section>

            <Section title="Souscripteur" icon={User}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Type" required>
                  <select
                    value={formData.subscriberType}
                    onChange={(e) => handleSubscriberTypeChange(e.target.value)}
                    className={FIELD}
                  >
                    {Object.entries(SUBSCRIBER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                    {subscriberLabel}
                    <span className="text-[color:var(--logo-pink-dark)]"> *</span>
                  </span>
                  {formData.subscriberType === "MEMBER" ? (
                    <MemberAutocomplete
                      onSelect={(member) => {
                        setSelectedMember(member);
                        setSelectedCustomer(null);
                        setFormData((prev) => ({
                          ...prev,
                          subscriberCode: member?.memberId ?? "",
                          subscriberType: "MEMBER",
                        }));
                      }}
                      selectedMember={selectedMember}
                      placeholder="Rechercher un membre..."
                    />
                  ) : (
                    <CustomerAutocomplete
                      onSelect={(customer) => {
                        setSelectedCustomer(customer);
                        setSelectedMember(null);
                        setFormData((prev) => ({
                          ...prev,
                          subscriberCode: customer?.customerId ?? "",
                        }));
                      }}
                      selectedCustomer={selectedCustomer}
                      typeFilter={formData.subscriberType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
                      placeholder={
                        formData.subscriberType === "BUSINESS_ENTITY"
                          ? "Rechercher une entreprise..."
                          : "Rechercher un customer..."
                      }
                    />
                  )}
                  {formData.subscriberCode && (
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      Code : {formData.subscriberCode}
                    </p>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Dates et options" icon={CalendarDays}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Date de début" required>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className={FIELD}
                  />
                </Field>
                <Field label="Codes coupon" className="md:col-span-2" hint="Séparés par une virgule. Ils sont consommés à la création de la souscription.">
                  <input
                    type="text"
                    value={formData.couponCodesText}
                    onChange={(e) => setFormData({ ...formData, couponCodesText: e.target.value })}
                    placeholder="BIENVENUE10"
                    className={`${FIELD} font-mono`}
                  />
                </Field>
                <div className="self-end">
                  <Switch
                    checked={formData.autoRenew}
                    onChange={(v) => setFormData((prev) => ({ ...prev, autoRenew: v }))}
                    label="Renouvellement automatique"
                    hint="Se renouvelle à la fin de chaque période"
                  />
                </div>
              </div>
            </Section>

            <Section title="Métadonnées" description="Optionnel" icon={Tags}>
              <Field
                label="JSON libre"
                error={
                  formData.metadataJson && !isMetadataJsonValid ? "JSON invalide" : undefined
                }
              >
                <textarea
                  value={formData.metadataJson}
                  onChange={(e) => setFormData({ ...formData, metadataJson: e.target.value })}
                  placeholder='{"source": "backoffice", "campaign": "..."}'
                  rows={3}
                  className={`${FIELD} resize-none font-mono ${
                    formData.metadataJson && !isMetadataJsonValid ? "!border-red-300" : ""
                  }`}
                />
              </Field>
            </Section>

            {formData.planCode && formData.subscriberCode && (
              <div className={`rounded-[1.75rem] p-5 ${PINK_SOFT}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[color:var(--logo-pink-dark)]">
                  Récapitulatif
                </p>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  {(
                    [
                      ["Plan", selectedPlan?.name ?? formData.planCode],
                      ["Souscripteur", formData.subscriberCode],
                      ["Type", SUBSCRIBER_TYPE_LABELS[formData.subscriberType]],
                      ["Cycle", BILLING_CYCLE_LABELS[formData.billingCycle]],
                      ["Début", formatDate(formData.startDate)],
                      ["Renouvellement", formData.autoRenew ? "Automatique" : "Manuel"],
                      ...(selectedVersion && selectedVersion.prices?.length > 0
                        ? [
                            [
                              "Prix",
                              formatMoney(
                                selectedVersion.prices[0].amount,
                                selectedVersion.prices[0].currency,
                              ),
                            ],
                          ]
                        : []),
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="text-right font-semibold text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <ActionButton
                variant="ghost"
                disabled={createMutation.isPending}
                onClick={() => navigate("/subscriptions/subscriptions")}
              >
                Annuler
              </ActionButton>
              <ActionButton
                type="submit"
                pending={createMutation.isPending}
                disabled={!formData.planCode || !formData.subscriberCode || !isMetadataJsonValid}
              >
                Créer la souscription
              </ActionButton>
            </div>
          </form>
        )}
      </div>
      <Toaster />
    </AdminLayout>
  );
};
