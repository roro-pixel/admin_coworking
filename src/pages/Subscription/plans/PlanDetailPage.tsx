import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  Archive,
  Eye,
  EyeOff,
  Edit,
  Loader2,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  Plan,
  PlanVersion,
  EntitlementDefinition,
} from "../../../services/subscription.service";
import { PlanFormModal } from "./PlanFormModal";

// ─── Labels ──────────────────────────────────────────────────────────────────

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: "Unique",
  DAILY: "Journalier",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

const planTypeLabels: Record<string, string> = {
  MEMBERSHIP: "Adhésion",
  COWORKING_ACCESS: "Accès coworking",
  DEDICATED_DESK: "Bureau dédié",
  PRIVATE_OFFICE: "Bureau privé",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  VIRTUAL_OFFICE: "Bureau virtuel",
  COMPANY_PLAN: "Plan entreprise",
  CUSTOM: "Personnalisé",
};

const targetAudienceLabels: Record<string, string> = {
  INDIVIDUAL: "Particulier",
  COMPANY: "Entreprise",
  BOTH: "Les deux",
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock size={13} />,
  },
  ACTIVE: {
    label: "Actif",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={13} />,
  },
  ARCHIVED: {
    label: "Archivé",
    color: "bg-gray-100 text-gray-500",
    icon: <Archive size={13} />,
  },
};

const versionStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "Archivée", color: "bg-gray-100 text-gray-500" },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlanDetailPageProps {
  plan: Plan;
  onBack: () => void;
  /** Navigation vers le formulaire nouvelle version */
  onNewVersion: (planCode: string) => void;
  /** Navigation vers le détail d'une version */
  onVersionDetail: (planCode: string, version: PlanVersion) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export const PlanDetailPage: React.FC<PlanDetailPageProps> = ({
  plan: initialPlan,
  onBack,
  onNewVersion,
  onVersionDetail,
}) => {
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Refresh du plan pour avoir le statut à jour après publication d'une version
  const { data: freshPlan } = useQuery({
    queryKey: ["subscription-plan-detail", initialPlan.code],
    queryFn: () => subscriptionService.getPlan(initialPlan.code),
  });
  const plan = freshPlan ?? initialPlan;

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", plan.code],
    queryFn: () => subscriptionService.getPlanVersions(plan.code),
  });

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        active: true,
        size: 100,
      }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const getEntName = (code: string) =>
    entDefs.find((d) => d.code === code)?.name ?? code;

  const publishMutation = useMutation({
    mutationFn: (versionId: string) =>
      subscriptionService.publishPlanVersion(plan.code, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-versions", plan.code] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["subscription-plan-detail", plan.code],
      });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur lors de la publication."),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: () =>
      subscriptionService.updatePlan(plan.code, { visible: !plan.visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["subscription-plan-detail", plan.code],
      });
    },
    onError: () => alert("Erreur lors de la mise à jour de la visibilité."),
  });

  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );

  const cfg = statusConfig[plan.status] ?? {
    label: plan.status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };

  return (
    <>
      {/* ── Breadcrumb + header ────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux plans
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}
              >
                {cfg.icon}
                {cfg.label}
              </span>
              {plan.visible ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Eye size={13} /> Visible
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <EyeOff size={13} /> Masqué
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono mt-1">{plan.code}</p>
            {plan.description && (
              <p className="text-gray-600 mt-2 max-w-2xl">{plan.description}</p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => toggleVisibilityMutation.mutate()}
              disabled={toggleVisibilityMutation.isPending}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              {plan.visible ? <EyeOff size={15} /> : <Eye size={15} />}
              {plan.visible ? "Masquer" : "Rendre visible"}
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit size={15} /> Modifier
            </button>
            <button
              onClick={() => onNewVersion(plan.code)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} /> Nouvelle version
            </button>
          </div>
        </div>
      </div>

      {/* ── Métadonnées du plan ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Type",
            value: planTypeLabels[plan.planType] ?? plan.planType,
          },
          {
            label: "Public cible",
            value:
              targetAudienceLabels[plan.targetAudience] ?? plan.targetAudience,
          },
          { label: "Ordre d'affichage", value: String(plan.sortOrder) },
          {
            label: "Version active",
            value: plan.activeVersion
              ? `v${plan.activeVersion.versionNumber}`
              : "Aucune",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Versions ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Versions
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({versions.length})
          </span>
        </h2>
      </div>

      {versionsLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-3" /> Chargement...
        </div>
      ) : sortedVersions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-500 mb-3">Aucune version pour ce plan.</p>
          <button
            onClick={() => onNewVersion(plan.code)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
          >
            <Plus size={15} /> Créer la première version
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedVersions.map((version) => {
            const vCfg = versionStatusConfig[version.status] ?? {
              label: version.status,
              color: "bg-gray-100 text-gray-600",
            };
            return (
              <div
                key={version.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* ── En-tête version ── */}
                <div className="flex items-start justify-between p-5 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900">
                        Version {version.versionNumber}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${vCfg.color}`}
                      >
                        {vCfg.label}
                      </span>
                      {version.status === "ACTIVE" && (
                        <span className="text-xs text-primary-600 font-medium">
                          ● Version actuelle
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{version.name}</p>
                    {version.description && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {version.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Effet :{" "}
                        {new Date(version.effectiveFrom).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                      {version.effectiveTo && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Fin :{" "}
                          {new Date(version.effectiveTo).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {version.status === "DRAFT" && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Publier la version ${version.versionNumber} ? L'ancienne version active sera archivée.`,
                            )
                          ) {
                            publishMutation.mutate(version.id);
                          }
                        }}
                        disabled={publishMutation.isPending}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle size={13} />
                        )}
                        Publier
                      </button>
                    )}
                    <button
                      onClick={() => onVersionDetail(plan.code, version)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <Eye size={13} /> Voir détails
                    </button>
                  </div>
                </div>

                {/* ── Corps version : résumé compact ── */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarifs */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Tarifs
                    </p>
                    {version.prices?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {version.prices.map((price, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                          >
                            {price.amount.toLocaleString("fr-FR")}{" "}
                            {price.currency}
                            <span className="mx-1 text-blue-300">/</span>
                            {billingCycleLabels[price.billingCycle] ??
                              price.billingCycle}
                            {!price.taxIncluded && (
                              <span className="ml-1 opacity-60">HT</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Aucun tarif
                      </p>
                    )}
                  </div>

                  {/* Avantages */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Avantages
                    </p>
                    {version.benefits?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[...version.benefits]
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .slice(0, 4)
                          .map((b, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${b.highlighted ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              {b.icon && <span>{b.icon}</span>}
                              {b.title}
                              {b.highlighted && (
                                <Tag size={10} className="text-primary-500" />
                              )}
                            </span>
                          ))}
                        {version.benefits.length > 4 && (
                          <span className="text-xs text-gray-400">
                            +{version.benefits.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Aucun avantage
                      </p>
                    )}
                  </div>

                  {/* Droits */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Droits inclus
                    </p>
                    {version.entitlements?.length > 0 ? (
                      <div className="space-y-1">
                        {[...version.entitlements]
                          .sort((a, b) => a.priority - b.priority)
                          .slice(0, 3)
                          .map((ent, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs"
                            >
                              <span
                                className="text-gray-700 truncate max-w-[140px]"
                                title={ent.entitlementCode}
                              >
                                {getEntName(ent.entitlementCode)}
                              </span>
                              <span className="text-gray-500 ml-2 flex-shrink-0">
                                {ent.unlimited ? "∞" : ent.quantity}
                                {ent.validForDays > 0
                                  ? ` / ${ent.validForDays}j`
                                  : ""}
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
                      <p className="text-xs text-gray-400 italic">
                        Aucun droit
                      </p>
                    )}
                  </div>
                </div>

                {/* Conditions */}
                {version.termsJson &&
                  (() => {
                    try {
                      const parsed = JSON.parse(version.termsJson);
                      const entries = Object.entries(parsed);
                      if (entries.length === 0) return null;
                      return (
                        <div className="px-5 pb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Conditions
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entries.map(([k, v]) => (
                              <span
                                key={k}
                                className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded"
                              >
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal édition plan */}
      <PlanFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingPlan={plan}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
          queryClient.invalidateQueries({
            queryKey: ["subscription-plan-detail", plan.code],
          });
          setEditModalOpen(false);
        }}
      />
    </>
  );
};
