import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Shield, DollarSign, Star, CreditCard, RotateCcw, Copy } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import {
  ActionButton,
  EmptyState,
  ErrorBlock,
  ItemRow,
  PageHeader,
  Section,
  StatusChip,
  Tabs,
  Tag,
} from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { PINK_SOFT, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import {
  BENEFIT_CATEGORY_LABELS,
  BILLABLE_STATUS,
  BILLING_CYCLE_LABELS,
  CONSUMPTION_MODE_LABELS,
  ENTITLEMENT_TYPE_LABELS,
  RESET_POLICY_LABELS,
  VERSION_STATUS,
  statusOf,
} from "../../../components/subscription/labels";

type Tab = "entitlements" | "prices" | "benefits" | "billable";

const prettyJson = (raw?: string): string | null => {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return null;
  }
};

export const PlanVersionDetailPage: React.FC = () => {
  const { planCode = "", versionId = "" } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("entitlements");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["entitlements"]));

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((p) => new Set([...p, tab]));
  };

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["subscription-plan-detail", planCode],
    queryFn: () => subscriptionService.getPlan(planCode),
    enabled: !!planCode,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", planCode],
    queryFn: () => subscriptionService.getPlanVersions(planCode),
    enabled: !!planCode,
  });
  const version = versions?.find((v) => String(v.id) === versionId);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];
  const getEntDef = (code: string) => entDefs.find((d) => d.code === code);

  // Items facturables rattachés à la version (sourceType=SUBSCRIPTION, sourceId=id de version)
  const { data: billableData, isLoading: billableLoading } = useQuery({
    queryKey: ["billable-items-version", versionId],
    queryFn: () =>
      subscriptionService.getBillableItems({
        sourceType: "SUBSCRIPTION",
        sourceId: versionId,
        size: 100,
      }),
    enabled: !!versionId && visitedTabs.has("billable"),
  });
  const billableItems = billableData?.content ?? [];
  const pendingItems = billableItems.filter((i) => i.status === "PENDING");

  const goBack = () => navigate(`/subscriptions/plans/${planCode}`);

  if (planLoading || versionsLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (!plan || !version) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Version introuvable" onBack={() => navigate("/subscriptions/plans")} backLabel="Plans" />
          <ErrorBlock message="Cette version n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const vs = statusOf(VERSION_STATUS, version.status);
  const terms = (() => {
    if (!version.termsJson) return [];
    try {
      return Object.entries(JSON.parse(version.termsJson));
    } catch {
      return [];
    }
  })();

  const tabs: TabItem<Tab>[] = [
    { id: "entitlements", label: "Droits inclus", icon: Shield, count: version.entitlements?.length ?? 0 },
    { id: "prices", label: "Tarifs", icon: DollarSign, count: version.prices?.length ?? 0 },
    { id: "benefits", label: "Avantages", icon: Star, count: version.benefits?.length ?? 0 },
    { id: "billable", label: "Items facturables", icon: CreditCard },
  ];

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={`Version ${version.versionNumber} · ${version.name}`}
          subtitle={
            <div>
              <p>
                Plan : <span className="font-semibold text-gray-700">{plan.name}</span>
                <span className="ml-2 font-mono text-xs">{plan.code}</span>
              </p>
              {version.description && <p className="mt-2 max-w-2xl text-gray-600">{version.description}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> Effet : {formatDate(version.effectiveFrom)}
                </span>
                {version.effectiveTo && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> Fin : {formatDate(version.effectiveTo)}
                  </span>
                )}
              </p>
              {terms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {terms.map(([k, v]) => (
                    <Tag key={k}>
                      {k} : {String(v)}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          }
          badge={<StatusChip tone={vs.tone}>{vs.label}</StatusChip>}
          actions={
            <ActionButton
              variant="ghost"
              icon={Copy}
              onClick={() => navigate(`/subscriptions/plans/${planCode}/versions/new?base=${versionId}`)}
            >
              Nouvelle version basée sur celle-ci
            </ActionButton>
          }
          onBack={goBack}
          backLabel={plan.name}
        />

        <div className="mb-5">
          <Tabs variant="soft" items={tabs} active={activeTab} onChange={handleTabChange} />
        </div>

        {/* ── Droits ─────────────────────────────────────────────────────── */}
        {activeTab === "entitlements" &&
          (!version.entitlements?.length ? (
            <EmptyState icon={Shield} title="Aucun droit inclus dans cette version" />
          ) : (
            <Section title="Droits inclus" icon={Shield}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[...version.entitlements]
                  .sort((a, b) => a.priority - b.priority)
                  .map((ent, i) => {
                    const def = getEntDef(ent.entitlementCode);
                    const restrictions = prettyJson(ent.restrictionsJson);
                    return (
                      <ItemRow key={i}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">
                              {def?.name ?? ent.entitlementName ?? ent.entitlementCode}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
                              {ent.entitlementCode}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-bold text-[color:var(--logo-pink-dark)]">
                              {ent.unlimited ? "Illimité" : ent.quantity}
                            </p>
                            {def?.unit && <p className="text-xs text-gray-400">{def.unit}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {def && (
                            <>
                              <Tag tone="pink">
                                {ENTITLEMENT_TYPE_LABELS[def.entitlementType] ?? def.entitlementType}
                              </Tag>
                              <Tag>{CONSUMPTION_MODE_LABELS[def.consumptionMode] ?? def.consumptionMode}</Tag>
                            </>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-600">
                          {ent.rolloverAllowed && (
                            <span className="inline-flex items-center gap-1.5">
                              <RotateCcw size={11} className="text-gray-400" />
                              Report : {ent.rolloverLimit > 0 ? `max ${ent.rolloverLimit}` : "illimité"}
                            </span>
                          )}
                          {ent.validForDays > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar size={11} className="text-gray-400" />
                              Valide {ent.validForDays} jours
                            </span>
                          )}
                          {def?.resetPolicy && (
                            <span className="text-gray-500">
                              Remise à zéro : {RESET_POLICY_LABELS[def.resetPolicy] ?? def.resetPolicy}
                            </span>
                          )}
                          <span className="text-gray-500">Priorité : {ent.priority}</span>
                        </div>
                        {restrictions && (
                          <div className="mt-3">
                            <p className="mb-1 text-xs text-gray-400">Restrictions</p>
                            <pre className="overflow-x-auto rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600">
                              {restrictions}
                            </pre>
                          </div>
                        )}
                      </ItemRow>
                    );
                  })}
              </div>
            </Section>
          ))}

        {/* ── Tarifs ─────────────────────────────────────────────────────── */}
        {activeTab === "prices" &&
          (!version.prices?.length ? (
            <EmptyState icon={DollarSign} title="Aucun tarif défini pour cette version" />
          ) : (
            <Section title="Tarifs" icon={DollarSign}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {version.prices.map((price, i) => (
                  <ItemRow key={i}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {BILLING_CYCLE_LABELS[price.billingCycle] ?? price.billingCycle}
                      </span>
                      <Tag tone={price.taxIncluded ? "pink" : "gray"}>{price.taxIncluded ? "TTC" : "HT"}</Tag>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
                      {price.amount.toLocaleString("fr-FR")}
                      <span className="ml-1 text-base font-normal text-gray-400">{price.currency}</span>
                    </p>
                    {price.commitmentMonths > 0 && (
                      <p className="mt-1 text-xs text-gray-500">Engagement : {price.commitmentMonths} mois</p>
                    )}
                    {(price.setupFee > 0 || price.depositAmount > 0) && (
                      <div className="mt-3 space-y-1 rounded-xl bg-gray-50 p-3">
                        {price.setupFee > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Frais d'activation</span>
                            <span className="font-semibold text-gray-800">
                              {formatMoney(price.setupFee, price.currency)}
                            </span>
                          </div>
                        )}
                        {price.depositAmount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Dépôt de garantie</span>
                            <span className="font-semibold text-gray-800">
                              {formatMoney(price.depositAmount, price.currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </ItemRow>
                ))}
              </div>
            </Section>
          ))}

        {/* ── Avantages ──────────────────────────────────────────────────── */}
        {activeTab === "benefits" &&
          (!version.benefits?.length ? (
            <EmptyState icon={Star} title="Aucun avantage défini pour cette version" />
          ) : (
            <Section title="Avantages" icon={Star}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[...version.benefits]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((benefit, i) => (
                    <ItemRow key={i}>
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                            benefit.highlighted
                              ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {benefit.icon || <Star size={17} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
                            {benefit.highlighted && <Tag tone="pink">Mis en avant</Tag>}
                            {!benefit.included && <Tag>Non inclus</Tag>}
                          </div>
                          {benefit.description && (
                            <p className="mt-0.5 text-xs text-gray-500">{benefit.description}</p>
                          )}
                          {benefit.category && (
                            <p className="mt-1.5">
                              <Tag>{BENEFIT_CATEGORY_LABELS[benefit.category] ?? benefit.category}</Tag>
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-300">#{benefit.displayOrder}</span>
                      </div>
                    </ItemRow>
                  ))}
              </div>
            </Section>
          ))}

        {/* ── Items facturables ──────────────────────────────────────────── */}
        {activeTab === "billable" && (
          <Section title="Items facturables" icon={CreditCard}>
            {billableLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : billableItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Aucun item facturable lié à cette version de plan
              </p>
            ) : (
              <>
                {pendingItems.length > 0 && (
                  <div
                    className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-3 ${PINK_SOFT}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--logo-pink-dark)]">
                        Items en attente
                      </p>
                      <p className="text-xs text-gray-500">{pendingItems.length} item(s) à facturer</p>
                    </div>
                    <p className="text-lg font-bold text-gray-950">
                      {formatMoney(
                        pendingItems.reduce((s, i) => s + i.amount, 0),
                        pendingItems[0]?.currency,
                      )}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {billableItems.map((item) => {
                    const bs = statusOf(BILLABLE_STATUS, item.status);
                    return (
                      <ItemRow key={item.billableNumber}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-gray-700">
                              {item.billableNumber}
                            </p>
                            <p className="mt-1 font-mono text-xs text-gray-500">{item.subscriberCode}</p>
                            <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-950">{formatMoney(item.amount, item.currency)}</p>
                            <div className="mt-1">
                              <StatusChip tone={bs.tone}>{bs.label}</StatusChip>
                            </div>
                          </div>
                        </div>
                      </ItemRow>
                    );
                  })}
                </div>
              </>
            )}
          </Section>
        )}
      </div>
      <Toaster />
    </AdminLayout>
  );
};
