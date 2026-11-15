import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, EyeOff, Pencil, CheckCircle, ArrowUpRight, Calendar, Layers } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PlanVersion, EntitlementDefinition } from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  Detail,
  EmptyState,
  ErrorBlock,
  PageHeader,
  Section,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import { PINK_SOFT, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import {
  BILLING_CYCLE_LABELS,
  PLAN_STATUS,
  PLAN_TYPE_LABELS,
  TARGET_AUDIENCE_LABELS,
  VERSION_STATUS,
  statusOf,
} from "../../../components/subscription/labels";
import { PlanPanel } from "./PlanPanel";

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</p>
);

export const PlanDetailPage: React.FC = () => {
  const { planCode = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    data: plan,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["subscription-plan-detail", planCode],
    queryFn: () => subscriptionService.getPlan(planCode),
    enabled: !!planCode,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", planCode],
    queryFn: () => subscriptionService.getPlanVersions(planCode),
    enabled: !!planCode,
  });

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];
  const getEntName = (code: string) => entDefs.find((d) => d.code === code)?.name ?? code;

  const refreshPlan = () => {
    queryClient.invalidateQueries({ queryKey: ["plan-versions", planCode] });
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    queryClient.invalidateQueries({ queryKey: ["subscription-plan-detail", planCode] });
  };

  // Publication : toast de confirmation, l'erreur de l'API y est affichée
  const publishMutation = useMutation({
    mutationFn: (versionId: string) => subscriptionService.publishPlanVersion(planCode, versionId),
    onSuccess: refreshPlan,
  });

  const visibilityMutation = useMutation({
    mutationFn: () => subscriptionService.updatePlan(planCode, { visible: !plan?.visible }),
    onSuccess: () => {
      refreshPlan();
      toast.success(plan?.visible ? "Plan masqué" : "Plan rendu visible");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la mise à jour de la visibilité.")),
  });

  const askPublish = (version: PlanVersion) =>
    toast.confirm({
      tone: "primary",
      message: `Publier la version ${version.versionNumber} ?`,
      detail: "L'ancienne version active sera archivée.",
      confirmLabel: "Publier",
      pendingLabel: "Publication en cours",
      successMessage: "Version publiée",
      errorMessage: "La publication a échoué",
      onConfirm: () => publishMutation.mutateAsync(version.id),
    });

  const goNewVersion = () => navigate(`/subscriptions/plans/${planCode}/versions/new`);

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (error || !plan) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader
            title="Plan introuvable"
            onBack={() => navigate("/subscriptions/plans")}
            backLabel="Plans"
          />
          <ErrorBlock message="Ce plan n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const st = statusOf(PLAN_STATUS, plan.status);
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={plan.name}
          subtitle={
            <div>
              <span className="font-mono">{plan.code}</span>
              {plan.description && <p className="mt-2 max-w-2xl text-gray-600">{plan.description}</p>}
            </div>
          }
          badge={
            <>
              <StatusChip tone={st.tone}>{st.label}</StatusChip>
              <Tag>{plan.visible ? "Visible" : "Masqué"}</Tag>
            </>
          }
          actions={
            <>
              <ActionButton
                variant="ghost"
                icon={plan.visible ? EyeOff : Eye}
                pending={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate()}
              >
                {plan.visible ? "Masquer" : "Rendre visible"}
              </ActionButton>
              <ActionButton variant="ghost" icon={Pencil} onClick={() => setEditing(!editing)}>
                Modifier
              </ActionButton>
              <ActionButton icon={Plus} onClick={goNewVersion}>
                Nouvelle version
              </ActionButton>
            </>
          }
          onBack={() => navigate("/subscriptions/plans")}
          backLabel="Plans"
        />

        {editing && (
          <PlanPanel editingPlan={plan} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        )}

        <div className="space-y-4">
          <Section title="Informations" icon={Layers}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
              <Detail label="Type">{PLAN_TYPE_LABELS[plan.planType] ?? plan.planType}</Detail>
              <Detail label="Public cible">
                {TARGET_AUDIENCE_LABELS[plan.targetAudience] ?? plan.targetAudience}
              </Detail>
              <Detail label="Ordre d'affichage">{String(plan.sortOrder)}</Detail>
              <Detail label="Version active">
                {plan.activeVersion ? `v${plan.activeVersion.versionNumber}` : "Aucune"}
              </Detail>
            </div>
          </Section>

          <Section
            title="Versions"
            description={versionsLoading ? undefined : `${versions.length} au total`}
            action={
              versions.length > 0 ? (
                <ActionButton icon={Plus} className="!px-4 !py-2" onClick={goNewVersion}>
                  Nouvelle version
                </ActionButton>
              ) : undefined
            }
          >
            {versionsLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : sortedVersions.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Aucune version pour ce plan"
                action={
                  <ActionButton icon={Plus} onClick={goNewVersion}>
                    Créer la première version
                  </ActionButton>
                }
              />
            ) : (
              <div className="space-y-3">
                {sortedVersions.map((version) => {
                  const vs = statusOf(VERSION_STATUS, version.status);
                  const terms = (() => {
                    if (!version.termsJson) return [];
                    try {
                      return Object.entries(JSON.parse(version.termsJson));
                    } catch {
                      return [];
                    }
                  })();
                  return (
                    <div key={version.id} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-gray-950">
                              Version {version.versionNumber}
                            </h3>
                            <StatusChip tone={vs.tone}>{vs.label}</StatusChip>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{version.name}</p>
                          {version.description && (
                            <p className="mt-0.5 text-xs text-gray-400">{version.description}</p>
                          )}
                          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} /> Effet : {formatDate(version.effectiveFrom)}
                            </span>
                            {version.effectiveTo && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={12} /> Fin : {formatDate(version.effectiveTo)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {version.status === "DRAFT" && (
                            <ActionButton
                              icon={CheckCircle}
                              className="!px-4 !py-2"
                              pending={
                                publishMutation.isPending && publishMutation.variables === version.id
                              }
                              onClick={() => askPublish(version)}
                            >
                              Publier
                            </ActionButton>
                          )}
                          <ActionButton
                            variant="ghost"
                            icon={ArrowUpRight}
                            className="!px-4 !py-2"
                            onClick={() =>
                              navigate(`/subscriptions/plans/${planCode}/versions/${version.id}`)
                            }
                          >
                            Détails
                          </ActionButton>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <SubTitle>Tarifs</SubTitle>
                          {version.prices?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {version.prices.map((price, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                                >
                                  {price.amount.toLocaleString("fr-FR")} {price.currency} /{" "}
                                  {BILLING_CYCLE_LABELS[price.billingCycle] ?? price.billingCycle}
                                  {!price.taxIncluded && <span className="ml-1 opacity-60">HT</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Aucun tarif</p>
                          )}
                        </div>
                        <div>
                          <SubTitle>Avantages</SubTitle>
                          {version.benefits?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {[...version.benefits]
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .slice(0, 4)
                                .map((b, i) => (
                                  <Tag key={i} tone={b.highlighted ? "pink" : "gray"}>
                                    {b.icon ? `${b.icon} ` : ""}
                                    {b.title}
                                  </Tag>
                                ))}
                              {version.benefits.length > 4 && (
                                <span className="text-xs text-gray-400">
                                  +{version.benefits.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Aucun avantage</p>
                          )}
                        </div>
                        <div>
                          <SubTitle>Droits inclus</SubTitle>
                          {version.entitlements?.length > 0 ? (
                            <div className="space-y-1">
                              {[...version.entitlements]
                                .sort((a, b) => a.priority - b.priority)
                                .slice(0, 3)
                                .map((ent, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="truncate text-gray-700" title={ent.entitlementCode}>
                                      {getEntName(ent.entitlementCode)}
                                    </span>
                                    <span className="shrink-0 text-gray-500">
                                      {ent.unlimited ? "Illimité" : ent.quantity}
                                      {ent.validForDays > 0 ? ` / ${ent.validForDays}j` : ""}
                                    </span>
                                  </div>
                                ))}
                              {version.entitlements.length > 3 && (
                                <p className="text-xs text-gray-400">
                                  +{version.entitlements.length - 3} droits
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Aucun droit</p>
                          )}
                        </div>
                      </div>

                      {terms.length > 0 && (
                        <div className="mt-4">
                          <SubTitle>Conditions</SubTitle>
                          <div className="flex flex-wrap gap-1.5">
                            {terms.map(([k, v]) => (
                              <Tag key={k}>
                                {k} : {String(v)}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
