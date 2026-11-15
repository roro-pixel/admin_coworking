import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, CheckCircle2, Layers, Plus, Rocket } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassPlanVersionResponse } from "../../../services/subscription.service";
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
import { PINK_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import {
  DURATION_UNIT_LABELS,
  PASS_TYPE_LABELS,
  PLAN_STATUS,
  TARGET_AUDIENCE_LABELS,
  VERSION_STATUS,
  statusOf,
} from "../../../components/subscription/labels";
import { PassPlanVersionPanel } from "./PassPlanVersionPanel";
import { PassPlanPriceManager } from "./PassPlanPriceManager";
import { PassPlanEntitlementsManager } from "./PassPlanEntitlementsManager";
import { PurchasePassPanel } from "./PurchasePassPanel";

export const PassPlanDetailPage: React.FC = () => {
  const { planCode = "" } = useParams<{ planCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<"version" | "purchase" | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["pass-plan", planCode],
    queryFn: () => subscriptionService.getPassPlan(planCode),
    enabled: !!planCode,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["pass-plan-versions", planCode],
    queryFn: () => subscriptionService.getPassPlanVersions(planCode),
    enabled: !!planCode,
  });
  const versionsList = versions as PassPlanVersionResponse[];
  // La version sélectionnée est relue dans la liste pour refléter son statut à jour
  const selectedVersion = versionsList.find((v) => v.id === selectedId) ?? null;

  const publishPlanMutation = useMutation({
    mutationFn: () => subscriptionService.publishPassPlan(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] });
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
      toast.success("Plan publié");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la publication.")),
  });

  // Archivage : toast de confirmation, l'erreur de l'API y est affichée
  const archivePlanMutation = useMutation({
    mutationFn: () => subscriptionService.archivePassPlan(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] });
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
    },
  });

  const publishVersionMutation = useMutation({
    mutationFn: (versionId: number) => subscriptionService.publishPassPlanVersion(planCode, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plan-versions", planCode] });
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] });
      toast.success("Version publiée");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la publication de la version.")),
  });

  const askArchive = () =>
    toast.confirm({
      message: "Archiver ce plan ?",
      detail: plan?.name ?? planCode,
      confirmLabel: "Archiver",
      pendingLabel: "Archivage en cours",
      successMessage: "Plan archivé",
      errorMessage: "L'archivage a échoué",
      onConfirm: () => archivePlanMutation.mutateAsync(),
    });

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (!plan) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Plan introuvable" onBack={() => navigate("/subscriptions/pass-plans")} backLabel="Plans de pass" />
          <ErrorBlock message="Ce plan n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const st = statusOf(PLAN_STATUS, plan.status);

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
              {plan.visible && <Tag tone="pink">Visible client</Tag>}
            </>
          }
          actions={
            <>
              <ActionButton icon={Rocket} onClick={() => setPanel(panel === "purchase" ? null : "purchase")}>
                Acheter
              </ActionButton>
              <ActionButton
                variant="ghost"
                icon={CheckCircle2}
                pending={publishPlanMutation.isPending}
                onClick={() => publishPlanMutation.mutate()}
              >
                Publier
              </ActionButton>
              <ActionButton variant="danger" icon={Archive} onClick={askArchive}>
                Archiver
              </ActionButton>
            </>
          }
          onBack={() => navigate("/subscriptions/pass-plans")}
          backLabel="Plans de pass"
        />

        {panel === "purchase" && (
          <PurchasePassPanel
            plan={plan}
            onCancel={() => setPanel(null)}
            onDone={(passNumber) => {
              setPanel(null);
              toast.success("Pass généré");
              navigate(`/subscriptions/passes/${passNumber}`);
            }}
          />
        )}

        <div className="space-y-4">
          <Section title="Informations" icon={Layers}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
              <Detail label="Type">{PASS_TYPE_LABELS[plan.passType] ?? String(plan.passType)}</Detail>
              <Detail label="Public cible">
                {TARGET_AUDIENCE_LABELS[plan.targetAudience] ?? String(plan.targetAudience)}
              </Detail>
              <Detail label="KYC requis">{`Niveau ${plan.requiredKycLevel}`}</Detail>
              <Detail label="Ordre d'affichage">{String(plan.sortOrder)}</Detail>
            </div>
          </Section>

          {panel === "version" && (
            <PassPlanVersionPanel planCode={plan.code} onDone={() => setPanel(null)} onCancel={() => setPanel(null)} />
          )}

          <Section
            title="Versions"
            description="Chaque version porte la durée, les prix et les droits."
            action={
              <ActionButton icon={Plus} className="!px-4 !py-2" onClick={() => setPanel(panel === "version" ? null : "version")}>
                Nouvelle version
              </ActionButton>
            }
          >
            {versionsList.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Aucune version"
                hint="Créez une version pour pouvoir définir prix et droits."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {versionsList.map((v) => {
                  const vs = statusOf(VERSION_STATUS, v.status);
                  const on = selectedVersion?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedId(on ? null : v.id)}
                      aria-pressed={on}
                      className={`rounded-2xl p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${
                        on ? `${PINK_SOFT} ring-2 ring-[color:var(--logo-pink)]` : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            v{v.versionNumber} · {v.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {v.duration} {DURATION_UNIT_LABELS[v.durationUnit] ?? v.durationUnit} ·{" "}
                            {v.autoRenewable ? "renouvelable" : "non renouvelable"}
                          </p>
                        </div>
                        <StatusChip tone={vs.tone}>{vs.label}</StatusChip>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Tag>KYC {v.requiredKycLevel}</Tag>
                        <Tag>Max {v.maxUses ?? "illimité"}</Tag>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {selectedVersion && (
            <>
              <div className={`flex flex-col gap-3 rounded-[1.75rem] p-4 sm:flex-row sm:items-center sm:justify-between ${PINK_SOFT}`}>
                <div>
                  <p className="text-sm text-gray-500">Version sélectionnée</p>
                  <p className="font-semibold">
                    v{selectedVersion.versionNumber} · {selectedVersion.name}
                  </p>
                </div>
                {selectedVersion.status !== "ACTIVE" && (
                  <ActionButton
                    pending={publishVersionMutation.isPending}
                    onClick={() => publishVersionMutation.mutate(selectedVersion.id)}
                  >
                    Publier la version
                  </ActionButton>
                )}
              </div>
              <PassPlanPriceManager versionId={selectedVersion.id} />
              <PassPlanEntitlementsManager versionId={selectedVersion.id} />
            </>
          )}
        </div>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
