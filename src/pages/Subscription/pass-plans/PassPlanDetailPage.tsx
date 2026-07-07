import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  Loader2,
  Plus,
  Rocket,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassPlanVersionResponse } from "../../../services/subscription.service";
import { PassPlanVersionFormModal } from "./PassPlanVersionFormModal";
import { PassPlanPriceManager } from "./PassPlanPriceManager";
import { PassPlanEntitlementsManager } from "./PassPlanEntitlementsManager";
import { PurchasePassModal } from "./PurchasePassModal";

const statusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-50 text-green-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export const PassPlanDetailPage: React.FC = () => {
  const { planCode } = useParams<{ planCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] =
    useState<PassPlanVersionResponse | null>(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["pass-plan", planCode],
    queryFn: () => subscriptionService.getPassPlan(planCode!),
    enabled: !!planCode,
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["pass-plan-versions", planCode],
    queryFn: () => subscriptionService.getPassPlanVersions(planCode!),
    enabled: !!planCode,
  });

  const publishPlanMutation = useMutation({
    mutationFn: () => subscriptionService.publishPassPlan(planCode!),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] }),
  });
  const archivePlanMutation = useMutation({
    mutationFn: () => subscriptionService.archivePassPlan(planCode!),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] }),
  });
  const publishVersionMutation = useMutation({
    mutationFn: (versionId: number) =>
      subscriptionService.publishPassPlanVersion(planCode!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pass-plan-versions", planCode],
      });
      queryClient.invalidateQueries({ queryKey: ["pass-plan", planCode] });
    },
  });

  if (isLoading)
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto animate-spin text-primary-600" />
      </div>
    );
  if (!plan)
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-gray-500">
        Plan introuvable.
      </div>
    );

  const versionsList = versions as PassPlanVersionResponse[];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={17} /> Retour
      </button>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-950">{plan.name}</h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[plan.status] ?? "bg-gray-100"}`}
              >
                {plan.status}
              </span>
              {plan.visible && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  Visible client
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-gray-400">{plan.code}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
              {plan.description || "Aucune description."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsPurchaseOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white"
            >
              <Rocket size={16} /> Acheter
            </button>
            <button
              onClick={() => publishPlanMutation.mutate()}
              disabled={publishPlanMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
            >
              <CheckCircle2 size={16} /> Publier
            </button>
            <button
              onClick={() => archivePlanMutation.mutate()}
              disabled={archivePlanMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
            >
              <Archive size={16} /> Archiver
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Type" value={String(plan.passType)} />
          <Metric label="Audience" value={String(plan.targetAudience)} />
          <Metric label="KYC" value={`Niveau ${plan.requiredKycLevel}`} />
          <Metric label="Ordre" value={String(plan.sortOrder)} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Versions</h2>
            <p className="text-sm text-gray-500">
              Chaque version porte la durée, les prix et les droits.
            </p>
          </div>
          <button
            onClick={() => setIsVersionOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} /> Nouvelle version
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {versionsList.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVersion(v)}
              className={`rounded-2xl p-4 text-left ring-1 transition ${selectedVersion?.id === v.id ? "bg-primary-50 ring-primary-100" : "bg-gray-50 ring-gray-100 hover:bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    v{v.versionNumber} — {v.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {v.duration} {v.durationUnit} ·{" "}
                    {v.autoRenewable ? "renouvelable" : "non renouvelable"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${statusClass[v.status] ?? "bg-gray-100"}`}
                >
                  {v.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-500">
                  KYC {v.requiredKycLevel}
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-500">
                  Max {v.maxUses ?? "∞"}
                </span>
              </div>
            </button>
          ))}
        </div>
        {versionsList.length === 0 && (
          <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Aucune version. Créez une version pour pouvoir définir prix et
            droits.
          </p>
        )}
      </section>

      {selectedVersion && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-3xl bg-gray-950 p-4 text-white">
            <div>
              <p className="text-sm text-white/60">Version sélectionnée</p>
              <p className="font-semibold">
                v{selectedVersion.versionNumber} — {selectedVersion.name}
              </p>
            </div>
            <button
              onClick={() => publishVersionMutation.mutate(selectedVersion.id)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-950"
            >
              Publier la version
            </button>
          </div>
          <PassPlanPriceManager versionId={selectedVersion.id} />
          <PassPlanEntitlementsManager versionId={selectedVersion.id} />
        </div>
      )}

      <PassPlanVersionFormModal
        isOpen={isVersionOpen}
        onClose={() => setIsVersionOpen(false)}
        planCode={plan.code}
        onSuccess={() => setIsVersionOpen(false)}
      />
      <PurchasePassModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        plan={plan}
        onSuccess={(passNumber) => {
          setIsPurchaseOpen(false);
          navigate(`/subscriptions/passes/${passNumber}`);
        }}
      />
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 truncate font-semibold text-gray-900">{value}</p>
  </div>
);
