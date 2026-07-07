import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  Bell,
  GitBranch,
  RotateCcw,
  CreditCard,
  Activity,
  Users,
  Layers,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  SubscriptionEntitlement,
  Seat,
  Addon,
  SubscriptionChange,
  TimelineEvent,
  SubscriptionNotification,
  OverageCharge,
  Rollover,
  UsageRecord,
  BillableItem,
} from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { AddSeatModal } from "./AddSeatModal";
import { CreateAddonModal } from "./CreateAddonModal";
import { CreateChangeModal } from "./CreateChangeModal";
import { CreateTimelineEventModal } from "./CreateTimelineEventModal";
import { CreateNotificationModal } from "./CreateNotificationModal";
import { CreateUsageRecordModal } from "../usage/CreateUsageRecordModal";

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  PENDING_ACTIVATION: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
  },
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "En retard", color: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspendu", color: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500" },
};

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: "Unique",
  DAILY: "Journalier",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

// 12 onglets selon la doc
type Tab =
  | "info"
  | "entitlements"
  | "billing"
  | "billable"
  | "usage"
  | "addons"
  | "seats"
  | "changes"
  | "timeline"
  | "notifications"
  | "overage"
  | "rollover";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "info", label: "Résumé", icon: Activity },
  { id: "entitlements", label: "Droits", icon: CheckCircle },
  { id: "billing", label: "Facturation", icon: CreditCard },
  { id: "billable", label: "Items facturables", icon: CreditCard },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "addons", label: "Add-ons", icon: Layers },
  { id: "seats", label: "Sièges", icon: Users },
  { id: "changes", label: "Changements", icon: GitBranch },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "overage", label: "Overage", icon: AlertCircle },
  { id: "rollover", label: "Rollover", icon: RotateCcw },
];

export const SubscriptionDetailPage: React.FC = () => {
  const { subscriptionNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["info"]));

  // Modaux enfants
  const [addSeatOpen, setAddSeatOpen] = useState(false);
  const [addAddonOpen, setAddAddonOpen] = useState(false);
  const [addChangeOpen, setAddChangeOpen] = useState(false);
  const [addTimelineOpen, setAddTimelineOpen] = useState(false);
  const [addNotifOpen, setAddNotifOpen] = useState(false);
  const [addUsageOpen, setAddUsageOpen] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((p) => new Set([...p, tab]));
  };

  const subNum = subscriptionNumber ?? "";

  // ── Chargement de la souscription ─────────────────────────────────────────
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ["subscription", subNum],
    queryFn: () => subscriptionService.getSubscription(subNum),
    enabled: !!subNum,
  });

  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    refetchSub();
  };

  // ── Données par onglet (lazy) ─────────────────────────────────────────────
  const { data: entitlements } = useQuery({
    queryKey: ["subscription-entitlements", subNum],
    queryFn: () => subscriptionService.getSubscriptionEntitlements(subNum),
    enabled: !!subNum && visitedTabs.has("entitlements"),
  });

  const { data: billingScheduleRaw } = useQuery({
    queryKey: ["subscription-billing", subNum],
    queryFn: () => subscriptionService.getSubscriptionBillingSchedule(subNum),
    enabled: !!subNum && visitedTabs.has("billing"),
  });
  const billingItems: any[] = Array.isArray(billingScheduleRaw)
    ? billingScheduleRaw
    : (billingScheduleRaw?.items ?? billingScheduleRaw?.content ?? []);

  const { data: billableData } = useQuery({
    queryKey: [
      "billable-items",
      "",
      subscription?.subscriberType ?? "",
      subscription?.subscriberCode ?? "",
      "",
      0,
    ],
    queryFn: () =>
      subscriptionService.getBillableItems({
        subscriberType: subscription?.subscriberType ?? "",
        subscriberCode: subscription?.subscriberCode ?? "",
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("billable"),
  });
  const billableItems: BillableItem[] = billableData?.content ?? [];

  const { data: usageData } = useQuery({
    queryKey: [
      "usage-records",
      subscription?.subscriberType ?? "",
      subscription?.subscriberCode ?? "",
      "",
      "",
      0,
    ],
    queryFn: () =>
      subscriptionService.getUsageRecords({
        ownerType: subscription?.subscriberType ?? "",
        ownerCode: subscription?.subscriberCode ?? "",
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("usage"),
  });
  const usageRecords: UsageRecord[] = usageData?.content ?? [];

  const { data: addonsData } = useQuery({
    queryKey: ["subscription-addons", subNum],
    queryFn: () =>
      subscriptionService.getAddons({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("addons"),
  });
  const addons: Addon[] = addonsData?.content ?? [];

  const { data: seatsData } = useQuery({
    queryKey: ["subscription-seats", subNum],
    queryFn: () =>
      subscriptionService.getSeats({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("seats"),
  });
  const seats: Seat[] = seatsData?.content ?? [];

  const { data: changesData } = useQuery({
    queryKey: ["subscription-changes", subNum],
    queryFn: () =>
      subscriptionService.getChanges({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("changes"),
  });
  const changes: SubscriptionChange[] = changesData?.content ?? [];

  const { data: timelineData } = useQuery({
    queryKey: ["subscription-timeline", subNum],
    queryFn: () =>
      subscriptionService.getTimeline({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("timeline"),
  });
  const timelineEvents: TimelineEvent[] = timelineData?.content ?? [];

  const { data: notifData } = useQuery({
    queryKey: ["subscription-notifications", subNum],
    queryFn: () =>
      subscriptionService.getNotifications({
        subscriptionNumber: subNum,
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("notifications"),
  });
  const notifications: SubscriptionNotification[] = notifData?.content ?? [];

  const { data: overageData } = useQuery({
    queryKey: ["subscription-overage-charges", subNum],
    queryFn: () =>
      subscriptionService.getOverageCharges({
        subscriptionNumber: subNum,
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("overage"),
  });
  const overageCharges: OverageCharge[] = overageData?.content ?? [];

  const { data: rolloverData } = useQuery({
    queryKey: ["subscription-rollovers", subNum],
    queryFn: () =>
      subscriptionService.getRollovers({
        subscriptionNumber: subNum,
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("rollover"),
  });
  const rollovers: Rollover[] = rolloverData?.content ?? [];

  // ── Mutations lifecycle ────────────────────────────────────────────────────
  const activateMutation = useMutation({
    mutationFn: () =>
      subscriptionService.activateSubscription(
        subNum,
        "Activé par admin",
        "ADMIN",
      ),
    onSuccess: invalidateAndRefetch,
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur activation."),
  });
  const suspendMutation = useMutation({
    mutationFn: () =>
      subscriptionService.suspendSubscription(
        subNum,
        "Suspendu par admin",
        "ADMIN",
      ),
    onSuccess: invalidateAndRefetch,
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur suspension."),
  });
  const cancelMutation = useMutation({
    mutationFn: () =>
      subscriptionService.cancelSubscription(
        subNum,
        "Annulé par admin",
        "ADMIN",
      ),
    onSuccess: invalidateAndRefetch,
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur annulation."),
  });
  const renewMutation = useMutation({
    mutationFn: () =>
      subscriptionService.renewSubscription(subNum, "Renouvelé par admin"),
    onSuccess: () => {
      invalidateAndRefetch();
      queryClient.invalidateQueries({
        queryKey: ["subscription-entitlements", subNum],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscription-billing", subNum],
      });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur renouvellement."),
  });

  const removeSeatMutation = useMutation({
    mutationFn: (memberCode: string) =>
      subscriptionService.removeSeat(subNum, memberCode),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["subscription-seats", subNum],
      }),
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur retrait siège."),
  });

  const cancelAddonMutation = useMutation({
    mutationFn: (addonId: string) =>
      subscriptionService.cancelAddon(addonId, "Annulé par admin"),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["subscription-addons", subNum],
      }),
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur annulation add-on."),
  });

  const approveChangeMutation = useMutation({
    mutationFn: (changeNumber: string) =>
      subscriptionService.approveChange(changeNumber, "ADMIN"),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["subscription-changes", subNum],
      }),
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur approbation."),
  });

  const applyChangeMutation = useMutation({
    mutationFn: (changeNumber: string) =>
      subscriptionService.applyChange(changeNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-changes", subNum],
      });
      invalidateAndRefetch();
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur application."),
  });

  const cancelNotifMutation = useMutation({
    mutationFn: (notificationNumber: string) =>
      subscriptionService.cancelNotification(notificationNumber),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["subscription-notifications", subNum],
      }),
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? "Erreur annulation notification."),
  });

  const anyPending =
    activateMutation.isPending ||
    suspendMutation.isPending ||
    cancelMutation.isPending ||
    renewMutation.isPending;

  if (subscriptionLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          Chargement de la souscription...
        </div>
      </AdminLayout>
    );
  }

  if (subscriptionError || !subscription) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          Souscription introuvable.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/subscriptions")}
              className="mt-1 rounded-xl border border-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {subscription.planName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 font-mono">{subNum}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusConfig[subscription.status]?.color ?? "bg-gray-100 text-gray-600"}`}
          >
            {statusConfig[subscription.status]?.label ?? subscription.status}
          </span>
        </div>

        {/* Actions rapides */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          {subscription.status === "PENDING_ACTIVATION" && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Play size={14} /> Activer
            </button>
          )}
          {subscription.status === "PAST_DUE" && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Play size={14} /> Réactiver
            </button>
          )}
          {subscription.status === "ACTIVE" && (
            <>
              <button
                onClick={() => suspendMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Pause size={14} /> Suspendre
              </button>
              <button
                onClick={() => renewMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={14} /> Renouveler
              </button>
            </>
          )}
          {["ACTIVE", "SUSPENDED", "PAST_DUE"].includes(
            subscription.status,
          ) && (
            <button
              onClick={() => {
                if (confirm("Confirmer l'annulation ?"))
                  cancelMutation.mutate();
              }}
              disabled={anyPending}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <XCircle size={14} /> Annuler
            </button>
          )}
          {anyPending && (
            <span className="text-xs text-gray-500 self-center animate-pulse">
              Opération en cours...
            </span>
          )}
        </div>

        {/* Onglets — scroll horizontal sur mobile */}
        <div className="overflow-x-auto rounded-2xl bg-white px-2 shadow-sm ring-1 ring-gray-100">
          <div className="flex space-x-1 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-3 px-3 text-xs font-medium rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {/* ── Résumé ──────────────────────────────────────────────────────── */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-500 mb-1 font-medium">
                  Souscripteur
                </p>
                <p className="font-semibold text-blue-900">
                  {subscription?.subscriberName ??
                    subscription?.subscriberCode ??
                    ""}
                </p>
                <p className="text-xs text-blue-600 font-mono">
                  {subscription?.subscriberType ?? ""} ·{" "}
                  {subscription?.subscriberCode ?? ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Statut</p>
                  <span
                    className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs ${statusConfig[subscription.status]?.color ?? "bg-gray-100"}`}
                  >
                    {statusConfig[subscription.status]?.label ??
                      subscription.status}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cycle</p>
                  <p className="font-medium text-sm">
                    {billingCycleLabels[subscription.billingCycle] ??
                      subscription.billingCycle}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Sous-total</p>
                  <p className="font-medium">
                    {(subscription.subtotalAmount ?? 0).toLocaleString("fr-FR")}{" "}
                    {subscription.currency ?? "XAF"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total TTC</p>
                  <p className="font-bold text-green-700">
                    {(subscription.totalAmount ?? 0).toLocaleString("fr-FR")}{" "}
                    {subscription.currency ?? "XAF"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Début</p>
                  <p className="font-medium text-sm">
                    {new Date(subscription.startDate).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Fin</p>
                  <p className="font-medium text-sm">
                    {subscription.endDate
                      ? new Date(subscription.endDate).toLocaleDateString(
                          "fr-FR",
                        )
                      : "—"}
                  </p>
                </div>
                {subscription.nextBillingDate && (
                  <div className="p-3 bg-amber-50 rounded-lg col-span-2">
                    <p className="text-xs text-amber-600">
                      Prochaine facturation
                    </p>
                    <p className="font-semibold text-amber-800">
                      {new Date(
                        subscription.nextBillingDate,
                      ).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="font-medium text-sm">{subscription.planName}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {subscription.planCode}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Renouvellement auto</p>
                  <p className="font-medium text-sm">
                    {subscription.autoRenew ? "✅ Oui" : "❌ Non"}
                  </p>
                </div>
                {subscription.contractCode && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500">Contrat lié</p>
                    <p className="font-mono text-sm text-primary-600">
                      {subscription.contractCode}
                    </p>
                  </div>
                )}
              </div>
              {subscription.metadataJson && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Métadonnées</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(subscription.metadataJson!),
                          null,
                          2,
                        );
                      } catch {
                        return subscription.metadataJson;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Droits ──────────────────────────────────────────────────────── */}
          {activeTab === "entitlements" && (
            <div className="space-y-3">
              {(entitlements ?? []).map((ent: SubscriptionEntitlement, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{ent.entitlementName}</p>
                      <p className="text-sm text-gray-500 font-mono">
                        {ent.entitlementCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {ent.unlimited
                          ? "Illimité"
                          : `${ent.remainingQuantity} / ${ent.quantity}`}
                      </p>
                      {!ent.unlimited && (
                        <p className="text-xs text-gray-500">
                          Utilisé : {ent.usedQuantity}
                        </p>
                      )}
                    </div>
                  </div>
                  {!ent.unlimited && ent.quantity > 0 && (
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (ent.usedQuantity / ent.quantity) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  {(ent.validFrom || ent.validUntil) && (
                    <p className="text-xs text-gray-400 mt-2">
                      {ent.validFrom &&
                        `Du ${new Date(ent.validFrom).toLocaleDateString("fr-FR")}`}
                      {ent.validUntil &&
                        ` au ${new Date(ent.validUntil).toLocaleDateString("fr-FR")}`}
                    </p>
                  )}
                </div>
              ))}
              {(!entitlements || entitlements.length === 0) && (
                <EmptyState text="Aucun droit associé" />
              )}
            </div>
          )}

          {/* ── Facturation (billing schedule) ────────────────────────────── */}
          {activeTab === "billing" && (
            <div className="space-y-3">
              {billingItems.map((item: any, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div>
                    <p className="font-medium text-sm">
                      Échéance :{" "}
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString("fr-FR")
                        : item.scheduledDate
                          ? new Date(item.scheduledDate).toLocaleDateString(
                              "fr-FR",
                            )
                          : "N/A"}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {(item.amount ?? item.totalAmount ?? 0).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      {item.currency ?? "FCFA"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      item.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : item.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status === "PAID"
                      ? "Payé"
                      : item.status === "PENDING"
                        ? "En attente"
                        : (item.status ?? "—")}
                  </span>
                </div>
              ))}
              {billingItems.length === 0 && (
                <EmptyState text="Aucune échéance" />
              )}
            </div>
          )}

          {/* ── Items facturables ──────────────────────────────────────────── */}
          {activeTab === "billable" && (
            <div className="space-y-3">
              {billableItems.map((item, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div>
                    <p className="font-mono text-sm">{item.billableNumber}</p>
                    <p className="text-xs text-gray-400">
                      {item.sourceType} · {item.sourceId}
                    </p>
                    <p className="font-semibold mt-1">
                      {item.amount.toLocaleString("fr-FR")} {item.currency}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      item.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : item.status === "INVOICED"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              {billableItems.length === 0 && (
                <EmptyState text="Aucun item facturable" />
              )}
            </div>
          )}

          {/* ── Usage ─────────────────────────────────────────────────────── */}
          {activeTab === "usage" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddUsageOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Enregistrer un usage
                </button>
              </div>
              <div className="space-y-2">
                {usageRecords.map((r, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-mono">{r.usageNumber}</p>
                      <p className="text-xs text-gray-500">
                        {r.entitlementCode}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.occurredAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {r.quantity} {r.unit}
                      </p>
                      {r.billable && (
                        <p className="text-xs text-green-600">
                          {r.billableAmount?.toLocaleString("fr-FR")}{" "}
                          {r.currency}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {usageRecords.length === 0 && (
                  <EmptyState text="Aucun usage enregistré" />
                )}
              </div>
            </div>
          )}

          {/* ── Add-ons ───────────────────────────────────────────────────── */}
          {activeTab === "addons" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddAddonOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Ajouter un add-on
                </button>
              </div>
              <div className="space-y-3">
                {addons.map((addon, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-4 flex justify-between items-start"
                  >
                    <div>
                      <p className="text-sm font-mono">{addon.addonId}</p>
                      <p className="text-xs text-gray-500">
                        Version : {addon.planVersionId}
                      </p>
                      <p className="text-xs text-gray-400">
                        Qté : {addon.quantity} · Début :{" "}
                        {new Date(addon.startsAt).toLocaleDateString("fr-FR")}
                        {addon.endsAt &&
                          ` → ${new Date(addon.endsAt).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          addon.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {addon.status}
                      </span>
                      {addon.status === "ACTIVE" && (
                        <button
                          onClick={() => {
                            if (confirm("Annuler cet add-on ?"))
                              cancelAddonMutation.mutate(addon.addonId);
                          }}
                          disabled={cancelAddonMutation.isPending}
                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                          title="Annuler l'add-on"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {addons.length === 0 && (
                  <EmptyState text="Aucun add-on actif" />
                )}
              </div>
            </div>
          )}

          {/* ── Sièges ───────────────────────────────────────────────────── */}
          {activeTab === "seats" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddSeatOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Ajouter un siège
                </button>
              </div>
              <div className="space-y-2">
                {seats.map((seat, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-mono text-sm">{seat.memberCode}</p>
                      <p className="text-xs text-gray-500">{seat.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          seat.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {seat.status}
                      </span>
                      {seat.role !== "OWNER" && (
                        <button
                          onClick={() => {
                            if (confirm(`Retirer ${seat.memberCode} ?`))
                              removeSeatMutation.mutate(seat.memberCode);
                          }}
                          disabled={removeSeatMutation.isPending}
                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                          title="Retirer le siège"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {seats.length === 0 && (
                  <EmptyState text="Aucun siège enregistré" />
                )}
              </div>
            </div>
          )}

          {/* ── Changements ──────────────────────────────────────────────── */}
          {activeTab === "changes" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddChangeOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Demander un changement
                </button>
              </div>
              <div className="space-y-3">
                {changes.map((c, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono text-sm">{c.changeNumber}</p>
                        <p className="text-xs text-gray-500">
                          {c.changeType} · {c.effectivePolicy}
                        </p>
                        {c.reason && (
                          <p className="text-xs text-gray-400 mt-1">
                            {c.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          c.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : c.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : c.status === "APPLIED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {c.status === "PENDING" && (
                        <button
                          onClick={() =>
                            approveChangeMutation.mutate(c.changeNumber)
                          }
                          disabled={approveChangeMutation.isPending}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                        >
                          Approuver
                        </button>
                      )}
                      {c.status === "APPROVED" && (
                        <button
                          onClick={() =>
                            applyChangeMutation.mutate(c.changeNumber)
                          }
                          disabled={applyChangeMutation.isPending}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
                        >
                          Appliquer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {changes.length === 0 && <EmptyState text="Aucun changement" />}
              </div>
            </div>
          )}

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          {activeTab === "timeline" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddTimelineOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Ajouter un événement
                </button>
              </div>
              <div className="space-y-2">
                {timelineEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <Clock
                      size={16}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(ev.occurredAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">{ev.eventType}</p>
                      {ev.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {ev.description}
                        </p>
                      )}
                      {ev.sourceType && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {ev.sourceType}
                          {ev.sourceId ? ` · ${ev.sourceId}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <EmptyState text="Aucun événement sur la timeline" />
                )}
              </div>
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setAddNotifOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
                >
                  <Plus size={14} /> Planifier une notification
                </button>
              </div>
              <div className="space-y-2">
                {notifications.map((n, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 flex justify-between items-start"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {n.notificationType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {n.channel} · {n.recipient}
                      </p>
                      <p className="text-xs text-gray-400">
                        Planifié :{" "}
                        {new Date(n.scheduledAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          n.status === "SENT"
                            ? "bg-green-100 text-green-700"
                            : n.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : n.status === "CANCELLED"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {n.status}
                      </span>
                      {n.status === "PENDING" && (
                        <button
                          onClick={() =>
                            cancelNotifMutation.mutate(n.notificationNumber)
                          }
                          disabled={cancelNotifMutation.isPending}
                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                          title="Annuler la notification"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <EmptyState text="Aucune notification planifiée" />
                )}
              </div>
            </div>
          )}

          {/* ── Overage ──────────────────────────────────────────────────── */}
          {activeTab === "overage" && (
            <div className="space-y-3">
              {overageCharges.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 flex justify-between">
                  <span>Total overage</span>
                  <strong>
                    {overageCharges
                      .reduce((s, c) => s + c.totalAmount, 0)
                      .toLocaleString("fr-FR")}{" "}
                    {overageCharges[0]?.currency}
                  </strong>
                </div>
              )}
              {overageCharges.map((charge, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm">{charge.chargeNumber}</p>
                      <p className="text-xs text-gray-500">
                        {charge.entitlementCode}
                      </p>
                      <p className="text-xs text-gray-400">
                        {charge.quantity} unités ×{" "}
                        {charge.unitPrice.toLocaleString("fr-FR")}{" "}
                        {charge.currency}
                      </p>
                    </div>
                    <p className="font-bold text-orange-700">
                      {charge.totalAmount.toLocaleString("fr-FR")}{" "}
                      {charge.currency}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(charge.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))}
              {overageCharges.length === 0 && (
                <EmptyState text="Aucun overage enregistré" />
              )}
            </div>
          )}

          {/* ── Rollover ─────────────────────────────────────────────────── */}
          {activeTab === "rollover" && (
            <div className="space-y-3">
              {rollovers.map((r, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm">{r.rolloverNumber}</p>
                      <p className="text-xs text-gray-500">
                        {r.entitlementCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-700">
                        +{r.quantity} reportés
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.rolledAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {rollovers.length === 0 && (
                <EmptyState text="Aucun report de crédits" />
              )}
            </div>
          )}
        </div>

        {/* Modaux enfants */}
        <AddSeatModal
          isOpen={addSeatOpen}
          onClose={() => setAddSeatOpen(false)}
          subscriptionNumber={subNum}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["subscription-seats", subNum],
            });
            setAddSeatOpen(false);
          }}
        />
        <CreateAddonModal
          isOpen={addAddonOpen}
          onClose={() => setAddAddonOpen(false)}
          subscriptionNumber={subNum}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["subscription-addons", subNum],
            });
            setAddAddonOpen(false);
          }}
        />
        <CreateChangeModal
          isOpen={addChangeOpen}
          onClose={() => setAddChangeOpen(false)}
          subscriptionNumber={subNum}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["subscription-changes", subNum],
            });
            setAddChangeOpen(false);
          }}
        />
        <CreateTimelineEventModal
          isOpen={addTimelineOpen}
          onClose={() => setAddTimelineOpen(false)}
          subscriptionNumber={subNum}
          ownerType={subscription?.subscriberType ?? ""}
          ownerCode={subscription?.subscriberCode ?? ""}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["subscription-timeline", subNum],
            });
            setAddTimelineOpen(false);
          }}
        />
        <CreateNotificationModal
          isOpen={addNotifOpen}
          onClose={() => setAddNotifOpen(false)}
          subscriptionNumber={subNum}
          ownerType={subscription?.subscriberType ?? ""}
          ownerCode={subscription?.subscriberCode ?? ""}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["subscription-notifications", subNum],
            });
            setAddNotifOpen(false);
          }}
        />
        <CreateUsageRecordModal
          isOpen={addUsageOpen}
          onClose={() => setAddUsageOpen(false)}
          defaultOwnerType={subscription?.subscriberType ?? ""}
          defaultOwnerCode={subscription?.subscriberCode ?? ""}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["usage-records"] });
            setAddUsageOpen(false);
          }}
        />
      </div>
    </AdminLayout>
  );
};

// ── Helper ────────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-8 text-gray-500">{text}</div>
);
