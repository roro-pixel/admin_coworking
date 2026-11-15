import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
  History,
  Receipt,
  Send,
  UserRound,
  Workflow,
  LogIn,
  Briefcase,
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
  OveragePolicy,
  Rollover,
  UsageRecord,
  BillableItem,
  EntitlementBalance,
  EntitlementGrant,
} from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  Detail,
  ErrorBlock,
  IconButton,
  ItemRow,
  PageHeader,
  Section,
  StatusChip,
  Tabs,
  Tag,
} from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import {
  PINK_SOFT,
  apiMessage,
  formatDate,
  formatDateTime,
  formatMoney,
} from "../../../components/subscription/kitUtils";
import {
  BILLABLE_STATUS,
  BILLING_CYCLE_LABELS,
  BILLING_SCHEDULE_STATUS,
  CHANGE_STATUS,
  NOTIFICATION_STATUS,
  OVERAGE_MODE_LABELS,
  SUBSCRIBER_TYPE_LABELS,
  SUBSCRIPTION_STATUS,
  USAGE_STATUS,
  statusOf,
} from "../../../components/subscription/labels";
import { AddSeatPanel } from "./AddSeatPanel";
import { AddonPanel } from "./AddonPanel";
import { ChangePanel } from "./ChangePanel";
import { TimelineEventPanel } from "./TimelineEventPanel";
import { NotificationPanel } from "./NotificationPanel";
import { OveragePolicyPanel } from "./OveragePolicyPanel";
import { UsageRecordForm } from "../usage/UsageRecordForm";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import { CommitmentPanel } from "../../../components/subscription/lifecycle/CommitmentPanel";
import { FreezePanel } from "../../../components/subscription/lifecycle/FreezePanel";
import { DebitMandatePanel } from "../../../components/subscription/lifecycle/DebitMandatePanel";
import { TerminationPanel } from "../../../components/subscription/lifecycle/TerminationPanel";
import { DerivationPanel } from "../../../components/subscription/lifecycle/DerivationPanel";
import { SubscriptionServicesPanel } from "../../../components/services/SubscriptionServicesPanel";

type Tab =
  | "info"
  | "entitlements"
  | "billing"
  | "billable"
  | "usage"
  | "addons"
  | "services"
  | "seats"
  | "changes"
  | "timeline"
  | "notifications"
  | "overage"
  | "rollover"
  | "lifecycle"
  | "history";

const TABS: TabItem<Tab>[] = [
  { id: "info", label: "Résumé", icon: Activity },
  { id: "entitlements", label: "Droits", icon: CheckCircle },
  { id: "billing", label: "Facturation", icon: CreditCard },
  { id: "billable", label: "Items facturables", icon: Receipt },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "addons", label: "Add-ons", icon: Layers },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "seats", label: "Sièges", icon: Users },
  { id: "changes", label: "Changements", icon: GitBranch },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "overage", label: "Overage", icon: AlertCircle },
  { id: "rollover", label: "Rollover", icon: RotateCcw },
  { id: "lifecycle", label: "Cycle de vie", icon: Workflow },
  { id: "history", label: "Historique", icon: History },
];

type Panel =
  | "usage"
  | "addon"
  | "seat"
  | "change"
  | "timeline"
  | "notification"
  | "overage"
  | null;

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="py-8 text-center text-sm text-gray-500">{text}</p>
);

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-xs font-semibold text-gray-700">{children}</span>
);

type RowMutation = { isPending: boolean; variables: string | undefined };
const busy = (m: RowMutation, id: string) => m.isPending && m.variables === id;

export const SubscriptionDetailPage: React.FC = () => {
  const { subscriptionNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["info"]));
  const [panel, setPanel] = useState<Panel>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPanel(null);
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

  const ownerType = subscription?.subscriberType ?? "";
  const ownerCode = subscription?.subscriberCode ?? "";

  // ── Données par onglet (chargées à la première visite) ────────────────────
  const { data: entitlements } = useQuery({
    queryKey: ["subscription-entitlements", subNum],
    queryFn: () => subscriptionService.getSubscriptionEntitlements(subNum),
    enabled: !!subNum && visitedTabs.has("entitlements"),
  });

  const { data: balances } = useQuery({
    queryKey: ["subscription-balances", ownerType, ownerCode],
    queryFn: () => subscriptionService.getEntitlementBalances({ ownerType, ownerCode }),
    enabled: !!ownerCode && visitedTabs.has("entitlements"),
  });

  const { data: grantsData } = useQuery({
    queryKey: ["subscription-grants", ownerType, ownerCode],
    queryFn: () => subscriptionService.getEntitlementGrants({ ownerType, ownerCode, size: 50 }),
    enabled: !!ownerCode && visitedTabs.has("entitlements"),
  });
  const grants: EntitlementGrant[] = grantsData?.content ?? [];

  const { data: billingScheduleRaw } = useQuery({
    queryKey: ["subscription-billing", subNum],
    queryFn: () => subscriptionService.getSubscriptionBillingSchedule(subNum),
    enabled: !!subNum && visitedTabs.has("billing"),
  });
  const billingItems: any[] = Array.isArray(billingScheduleRaw)
    ? billingScheduleRaw
    : (billingScheduleRaw?.items ?? billingScheduleRaw?.content ?? []);

  const { data: billableData } = useQuery({
    queryKey: ["billable-items", "", ownerType, ownerCode, "", 0],
    queryFn: () =>
      subscriptionService.getBillableItems({
        subscriberType: ownerType,
        subscriberCode: ownerCode,
        size: 50,
      }),
    enabled: !!subNum && visitedTabs.has("billable"),
  });
  const billableItems: BillableItem[] = billableData?.content ?? [];

  const { data: usageData } = useQuery({
    queryKey: ["usage-records", ownerType, ownerCode, "", "", 0],
    queryFn: () =>
      subscriptionService.getUsageRecords({ ownerType, ownerCode, size: 50 }),
    enabled: !!subNum && visitedTabs.has("usage"),
  });
  const usageRecords: UsageRecord[] = usageData?.content ?? [];

  const { data: addonsData } = useQuery({
    queryKey: ["subscription-addons", subNum],
    queryFn: () => subscriptionService.getAddons({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("addons"),
  });
  const addons: Addon[] = addonsData?.content ?? [];

  const { data: seatsData } = useQuery({
    queryKey: ["subscription-seats", subNum],
    queryFn: () => subscriptionService.getSeats({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("seats"),
  });
  const seats: Seat[] = seatsData?.content ?? [];

  const { data: changesData } = useQuery({
    queryKey: ["subscription-changes", subNum],
    queryFn: () => subscriptionService.getChanges({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("changes"),
  });
  const changes: SubscriptionChange[] = changesData?.content ?? [];

  const { data: timelineData } = useQuery({
    queryKey: ["subscription-timeline", subNum],
    queryFn: () => subscriptionService.getTimeline({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("timeline"),
  });
  const timelineEvents: TimelineEvent[] = timelineData?.content ?? [];

  const { data: notifData } = useQuery({
    queryKey: ["subscription-notifications", subNum],
    queryFn: () => subscriptionService.getNotifications({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("notifications"),
  });
  const notifications: SubscriptionNotification[] = notifData?.content ?? [];

  const { data: overageData } = useQuery({
    queryKey: ["subscription-overage-charges", subNum],
    queryFn: () => subscriptionService.getOverageCharges({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("overage"),
  });
  const overageCharges: OverageCharge[] = overageData?.content ?? [];

  const planVersionId = subscription?.planVersionId ?? "";
  const { data: policiesData } = useQuery({
    queryKey: ["overage-policies", planVersionId],
    queryFn: () => subscriptionService.getOveragePolicies({ planVersionId, size: 50 }),
    enabled: !!planVersionId && visitedTabs.has("overage"),
  });
  const policies: OveragePolicy[] = policiesData?.content ?? [];

  const { data: rolloverData } = useQuery({
    queryKey: ["subscription-rollovers", subNum],
    queryFn: () => subscriptionService.getRollovers({ subscriptionNumber: subNum, size: 50 }),
    enabled: !!subNum && visitedTabs.has("rollover"),
  });
  const rollovers: Rollover[] = rolloverData?.content ?? [];

  const { data: historyRaw } = useQuery({
    queryKey: ["subscription-history", subNum],
    queryFn: () => subscriptionService.getSubscriptionHistory(subNum),
    enabled: !!subNum && visitedTabs.has("history"),
  });
  const history: any[] = Array.isArray(historyRaw) ? historyRaw : [];

  // ── Mutations du cycle de vie ─────────────────────────────────────────────
  const activateMutation = useMutation({
    mutationFn: () => subscriptionService.activateSubscription(subNum, "Activé par admin", "ADMIN"),
    onSuccess: () => {
      invalidateAndRefetch();
      toast.success("Souscription activée");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur activation.")),
  });
  const suspendMutation = useMutation({
    mutationFn: () => subscriptionService.suspendSubscription(subNum, "Suspendu par admin", "ADMIN"),
    onSuccess: () => {
      invalidateAndRefetch();
      toast.success("Souscription suspendue");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur suspension.")),
  });
  // Annulation : toast de confirmation, l'erreur est gérée par le toast
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelSubscription(subNum, "Annulé par admin", "ADMIN"),
    onSuccess: invalidateAndRefetch,
  });
  const renewMutation = useMutation({
    mutationFn: () => subscriptionService.renewSubscription(subNum, "Renouvellement demandé par admin"),
    onSuccess: () => {
      invalidateAndRefetch();
      queryClient.invalidateQueries({ queryKey: ["subscription-entitlements", subNum] });
      queryClient.invalidateQueries({ queryKey: ["subscription-billing", subNum] });
      toast.success("Facture de renouvellement émise, à régler");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur renouvellement.")),
  });

  // Actions de suppression : toast de confirmation
  const removeSeatMutation = useMutation({
    mutationFn: (memberCode: string) => subscriptionService.removeSeat(subNum, memberCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription-seats", subNum] }),
  });
  const cancelAddonMutation = useMutation({
    mutationFn: (addonId: string) => subscriptionService.cancelAddon(addonId, "Annulé par admin"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription-addons", subNum] }),
  });
  const deleteEntitlementMutation = useMutation({
    mutationFn: (entitlementCode: string) =>
      subscriptionService.deleteSubscriptionEntitlement(subNum, entitlementCode),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscription-entitlements", subNum] }),
  });

  const approveChangeMutation = useMutation({
    mutationFn: (changeNumber: string) => subscriptionService.approveChange(changeNumber, "ADMIN"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-changes", subNum] });
      toast.success("Changement approuvé");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur approbation.")),
  });
  const applyChangeMutation = useMutation({
    mutationFn: (changeNumber: string) => subscriptionService.applyChange(changeNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-changes", subNum] });
      invalidateAndRefetch();
      toast.success("Changement appliqué");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur application.")),
  });
  const cancelNotifMutation = useMutation({
    mutationFn: (notificationNumber: string) =>
      subscriptionService.cancelNotification(notificationNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-notifications", subNum] });
      toast.success("Notification annulée");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur annulation notification.")),
  });

  const exitGraceMutation = useMutation({
    mutationFn: () => subscriptionLifecycleService.exitGracePeriod(subNum),
    onSuccess: () => {
      invalidateAndRefetch();
      toast.success("Sortie de la période de tolérance");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Sortie de tolérance impossible.")),
  });

  const askCancel = () =>
    toast.confirm({
      message: "Annuler cette souscription ?",
      detail: subNum,
      confirmLabel: "Annuler la souscription",
      pendingLabel: "Annulation en cours",
      successMessage: "Souscription annulée",
      errorMessage: "L'annulation a échoué",
      onConfirm: () => cancelMutation.mutateAsync(),
    });

  const askRemoveSeat = (memberCode: string) =>
    toast.confirm({
      message: "Retirer ce siège ?",
      detail: memberCode,
      confirmLabel: "Retirer",
      pendingLabel: "Retrait en cours",
      successMessage: "Siège retiré",
      errorMessage: "Le retrait a échoué",
      onConfirm: () => removeSeatMutation.mutateAsync(memberCode),
    });

  const askCancelAddon = (addonId: string) =>
    toast.confirm({
      message: "Annuler cet add-on ?",
      detail: addonId,
      confirmLabel: "Annuler l'add-on",
      pendingLabel: "Annulation en cours",
      successMessage: "Add-on annulé",
      errorMessage: "L'annulation a échoué",
      onConfirm: () => cancelAddonMutation.mutateAsync(addonId),
    });

  const askDeleteEntitlement = (ent: SubscriptionEntitlement) =>
    toast.confirm({
      message: "Retirer ce droit de la souscription ?",
      detail: ent.entitlementName || ent.entitlementCode,
      confirmLabel: "Retirer",
      pendingLabel: "Retrait en cours",
      successMessage: "Droit retiré",
      errorMessage: "Le retrait a échoué",
      onConfirm: () => deleteEntitlementMutation.mutateAsync(ent.entitlementCode),
    });

  // Actions d'administration globales (elles traitent toutes les souscriptions)
  const askApplyRollovers = () =>
    toast.confirm({
      tone: "primary",
      message: "Appliquer les reports dus ?",
      detail: "Traite les reports échus de toutes les souscriptions",
      confirmLabel: "Appliquer",
      pendingLabel: "Application en cours",
      successMessage: "Reports appliqués",
      errorMessage: "L'application des reports a échoué",
      onConfirm: async () => {
        await subscriptionService.applyDueRollovers();
        queryClient.invalidateQueries({ queryKey: ["subscription-rollovers", subNum] });
      },
    });

  const askDispatchNotifications = () =>
    toast.confirm({
      tone: "primary",
      message: "Envoyer les notifications dues ?",
      detail: "Envoie jusqu'à 100 notifications échues, toutes souscriptions confondues",
      confirmLabel: "Envoyer",
      pendingLabel: "Envoi en cours",
      successMessage: "Notifications envoyées",
      errorMessage: "L'envoi a échoué",
      onConfirm: async () => {
        await subscriptionService.dispatchDueNotifications();
        queryClient.invalidateQueries({ queryKey: ["subscription-notifications", subNum] });
      },
    });

  const anyPending =
    activateMutation.isPending ||
    suspendMutation.isPending ||
    cancelMutation.isPending ||
    renewMutation.isPending ||
    exitGraceMutation.isPending;

  if (subscriptionLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (subscriptionError || !subscription) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader
            title="Souscription introuvable"
            onBack={() => navigate("/subscriptions/subscriptions")}
            backLabel="Souscriptions"
          />
          <ErrorBlock message="Cette souscription n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const st = statusOf(SUBSCRIPTION_STATUS, subscription.status);
  const currency = subscription.currency ?? "XAF";
  const subscriberTypeLabel =
    SUBSCRIBER_TYPE_LABELS[subscription.subscriberType] ?? subscription.subscriberType;

  const addButton = (label: string, target: Exclude<Panel, null>) => (
    <ActionButton
      icon={Plus}
      className="!px-4 !py-2"
      onClick={() => setPanel(panel === target ? null : target)}
    >
      {label}
    </ActionButton>
  );

  const closePanel = () => setPanel(null);

  const lifecycleActions = (
    <>
      {subscription.status === "PENDING_ACTIVATION" && (
        <ActionButton
          icon={Play}
          pending={activateMutation.isPending}
          disabled={anyPending}
          onClick={() => activateMutation.mutate()}
        >
          Activer
        </ActionButton>
      )}
      {subscription.status === "PAST_DUE" && (
        <ActionButton
          icon={Play}
          pending={activateMutation.isPending}
          disabled={anyPending}
          onClick={() => activateMutation.mutate()}
        >
          Réactiver
        </ActionButton>
      )}
      {subscription.status === "GRACE_PERIOD" && (
        <ActionButton
          variant="ghost"
          icon={LogIn}
          pending={exitGraceMutation.isPending}
          disabled={anyPending}
          onClick={() => exitGraceMutation.mutate()}
        >
          Sortir de la tolérance
        </ActionButton>
      )}
      {subscription.status === "ACTIVE" && (
        <>
          <ActionButton
            variant="ghost"
            icon={Pause}
            pending={suspendMutation.isPending}
            disabled={anyPending}
            onClick={() => suspendMutation.mutate()}
          >
            Suspendre
          </ActionButton>
          {!subscription.pendingRenewalInvoice && (
            <ActionButton
              variant="ghost"
              icon={RefreshCw}
              pending={renewMutation.isPending}
              disabled={anyPending}
              onClick={() => renewMutation.mutate()}
            >
              Renouveler
            </ActionButton>
          )}
        </>
      )}
      {subscription.pendingRenewalInvoice && (
        <ActionButton
          icon={CreditCard}
          disabled={anyPending}
          onClick={() => navigate(`/billing/documents/${encodeURIComponent(subscription.pendingRenewalInvoice ?? "")}`)}
        >
          Régler la facture
        </ActionButton>
      )}
      {["ACTIVE", "SUSPENDED", "PAST_DUE"].includes(subscription.status) && (
        <ActionButton variant="danger" icon={XCircle} disabled={anyPending} onClick={askCancel}>
          Annuler
        </ActionButton>
      )}
    </>
  );

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={subscription.planName}
          subtitle={
            <span>
              <span className="font-mono">{subNum}</span>
              {subscription.subscriberName && <span> · {subscription.subscriberName}</span>}
            </span>
          }
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          actions={lifecycleActions}
          onBack={() => navigate("/subscriptions/subscriptions")}
          backLabel="Souscriptions"
        />

        <div className="mb-5">
          <Tabs variant="soft" items={TABS} active={activeTab} onChange={handleTabChange} />
        </div>

        {/* ── Résumé ─────────────────────────────────────────────────────── */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <Section title="Souscripteur" icon={UserRound}>
              <p className="text-base font-bold text-gray-950">
                {subscription.subscriberName ?? subscription.subscriberCode}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tag>{subscriberTypeLabel}</Tag>
                <span className="font-mono text-xs text-gray-500">{subscription.subscriberCode}</span>
              </div>
            </Section>

            <Section title="Détails" icon={CreditCard}>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Statut">
                  <StatusChip tone={st.tone}>{st.label}</StatusChip>
                </Detail>
                <Detail label="Cycle">
                  {BILLING_CYCLE_LABELS[subscription.billingCycle] ?? subscription.billingCycle}
                </Detail>
                <Detail label="Sous-total">
                  {formatMoney(subscription.subtotalAmount, currency)}
                </Detail>
                <Detail label="Total TTC">
                  {subscription.totalAmount !== undefined && (
                    <span className="text-base font-bold text-emerald-700">
                      {formatMoney(subscription.totalAmount, currency)}
                    </span>
                  )}
                </Detail>
                <Detail label="Début">{formatDate(subscription.startDate)}</Detail>
                <Detail label="Fin">{formatDate(subscription.endDate)}</Detail>
                <Detail label="Prochaine facturation">
                  {formatDate(subscription.nextBillingDate)}
                </Detail>
                <Detail label="Renouvellement">
                  {subscription.autoRenew ? "Automatique" : "Manuel"}
                </Detail>
                {subscription.pendingRenewalInvoice && (
                  <Detail label="Facture à régler" mono>
                    {subscription.pendingRenewalInvoice}
                    {subscription.pendingRenewalStart && subscription.pendingRenewalEnd && (
                      <span className="block font-sans text-xs font-normal text-gray-400">
                        Période prévue du {formatDate(subscription.pendingRenewalStart)} au {formatDate(subscription.pendingRenewalEnd)}
                      </span>
                    )}
                  </Detail>
                )}
                <Detail label="Plan">
                  <span>{subscription.planName}</span>
                  <span className="block font-mono text-xs font-normal text-gray-400">
                    {subscription.planCode}
                    {subscription.planVersion !== undefined && ` · v${subscription.planVersion}`}
                  </span>
                </Detail>
                <Detail label="Contrat lié" mono>
                  {subscription.contractCode}
                </Detail>
              </div>
            </Section>

            {subscription.metadataJson && (
              <Section title="Métadonnées">
                <pre className="overflow-x-auto rounded-xl bg-white p-3 text-xs text-gray-700 shadow-sm">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(subscription.metadataJson), null, 2);
                    } catch {
                      return subscription.metadataJson;
                    }
                  })()}
                </pre>
              </Section>
            )}
          </div>
        )}

        {/* ── Droits ─────────────────────────────────────────────────────── */}
        {activeTab === "entitlements" && (
          <div className="space-y-4">
            <Section title="Droits de la souscription" icon={CheckCircle}>
              <div className="space-y-2">
                {(entitlements ?? []).map((ent: SubscriptionEntitlement) => (
                  <ItemRow key={ent.entitlementCode}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{ent.entitlementName}</p>
                        <p className="font-mono text-xs text-gray-400">{ent.entitlementCode}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {ent.unlimited ? "Illimité" : `${ent.remainingQuantity} / ${ent.quantity}`}
                          </p>
                          {!ent.unlimited && (
                            <p className="text-xs text-gray-500">Utilisé : {ent.usedQuantity}</p>
                          )}
                        </div>
                        <IconButton
                          icon={Trash2}
                          label="Retirer ce droit"
                          tone="danger"
                          pending={
                            deleteEntitlementMutation.isPending &&
                            deleteEntitlementMutation.variables === ent.entitlementCode
                          }
                          onClick={() => askDeleteEntitlement(ent)}
                        />
                      </div>
                    </div>
                    {!ent.unlimited && ent.quantity > 0 && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[color:var(--logo-pink)]"
                          style={{
                            width: `${Math.min(100, (ent.usedQuantity / ent.quantity) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {(ent.validFrom || ent.validUntil) && (
                      <p className="mt-2 text-xs text-gray-400">
                        {ent.validFrom && `Du ${formatDate(ent.validFrom)}`}
                        {ent.validUntil && ` au ${formatDate(ent.validUntil)}`}
                      </p>
                    )}
                  </ItemRow>
                ))}
                {(!entitlements || entitlements.length === 0) && <Empty text="Aucun droit associé" />}
              </div>
            </Section>

            {(balances ?? []).length > 0 && (
              <Section
                title="Soldes du souscripteur"
                description="Tous droits confondus, pas seulement cette souscription"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(balances ?? []).map((b: EntitlementBalance) => (
                    <ItemRow key={b.entitlementCode}>
                      <p className="font-mono text-xs font-semibold text-gray-700">{b.entitlementCode}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {b.unlimited ? "Illimité" : `${b.remainingQuantity} restant sur ${b.totalQuantity}`}
                      </p>
                      {!b.unlimited && (
                        <p className="text-xs text-gray-500">Utilisé : {b.usedQuantity}</p>
                      )}
                    </ItemRow>
                  ))}
                </div>
              </Section>
            )}

            {grants.length > 0 && (
              <Section title="Octrois" description="Droits accordés au souscripteur">
                <div className="space-y-2">
                  {grants.map((g) => (
                    <ItemRow key={g.grantNumber}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Mono>{g.grantNumber}</Mono>
                          <p className="mt-1 text-sm text-gray-800">{g.entitlementCode}</p>
                          {(g.validFrom || g.validUntil) && (
                            <p className="mt-1 text-xs text-gray-400">
                              {g.validFrom && `Du ${formatDate(g.validFrom)}`}
                              {g.validUntil && ` au ${formatDate(g.validUntil)}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {g.unlimited ? "Illimité" : g.quantity}
                          </p>
                          <Tag>{g.status}</Tag>
                        </div>
                      </div>
                    </ItemRow>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── Facturation ────────────────────────────────────────────────── */}
        {activeTab === "billing" && (
          <Section title="Échéancier" icon={CreditCard}>
            <div className="space-y-2">
              {billingItems.map((item: any, i) => {
                const bs = statusOf(BILLING_SCHEDULE_STATUS, item.status);
                const due = item.dueDate ?? item.scheduledDate;
                const amount = item.amount ?? item.totalAmount;
                return (
                  <ItemRow key={i}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {due && (
                          <p className="text-sm font-semibold text-gray-900">
                            Échéance : {formatDate(due)}
                          </p>
                        )}
                        {item.description && (
                          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                        )}
                        {typeof amount === "number" && (
                          <p className="mt-1 text-sm text-gray-700">
                            {formatMoney(amount, item.currency ?? "XAF")}
                          </p>
                        )}
                      </div>
                      {item.status && (
                        <StatusChip tone={item.status in BILLING_SCHEDULE_STATUS ? bs.tone : "danger"}>
                          {bs.label}
                        </StatusChip>
                      )}
                    </div>
                  </ItemRow>
                );
              })}
              {billingItems.length === 0 && <Empty text="Aucune échéance" />}
            </div>
          </Section>
        )}

        {/* ── Items facturables ──────────────────────────────────────────── */}
        {activeTab === "billable" && (
          <Section title="Items facturables" icon={Receipt}>
            <div className="space-y-2">
              {billableItems.map((item) => {
                const bs = statusOf(BILLABLE_STATUS, item.status);
                return (
                  <ItemRow key={item.billableNumber}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Mono>{item.billableNumber}</Mono>
                        <p className="mt-1 text-xs text-gray-400">
                          {item.sourceType} · {item.sourceId}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatMoney(item.amount, item.currency)}
                        </p>
                      </div>
                      <StatusChip tone={bs.tone}>{bs.label}</StatusChip>
                    </div>
                  </ItemRow>
                );
              })}
              {billableItems.length === 0 && <Empty text="Aucun item facturable" />}
            </div>
          </Section>
        )}

        {/* ── Usage ──────────────────────────────────────────────────────── */}
        {activeTab === "usage" && (
          <>
            {panel === "usage" && (
              <UsageRecordForm
                layout="panel"
                defaultOwnerType={ownerType}
                defaultOwnerCode={ownerCode}
                onDone={closePanel}
                onCancel={closePanel}
              />
            )}
            <Section
              title="Usage"
              icon={Activity}
              action={addButton("Enregistrer un usage", "usage")}
            >
              <div className="space-y-2">
                {usageRecords.map((r) => {
                  const us = statusOf(USAGE_STATUS, r.status);
                  return (
                    <ItemRow key={r.usageNumber}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Mono>{r.usageNumber}</Mono>
                          <p className="mt-1 text-sm text-gray-800">{r.entitlementCode}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(r.occurredAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {r.quantity} {r.unit}
                          </p>
                          {r.billable && (
                            <p className="text-xs font-semibold text-emerald-600">
                              {formatMoney(r.billableAmount, r.currency || "XAF")}
                            </p>
                          )}
                          {r.status && (
                            <div className="mt-1">
                              <StatusChip tone={us.tone}>{us.label}</StatusChip>
                            </div>
                          )}
                        </div>
                      </div>
                    </ItemRow>
                  );
                })}
                {usageRecords.length === 0 && <Empty text="Aucun usage enregistré" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Add-ons ────────────────────────────────────────────────────── */}
        {activeTab === "addons" && (
          <>
            {panel === "addon" && (
              <AddonPanel subscriptionNumber={subNum} onDone={closePanel} onCancel={closePanel} />
            )}
            <Section title="Add-ons" icon={Layers} action={addButton("Ajouter un add-on", "addon")}>
              <div className="space-y-2">
                {addons.map((addon) => (
                  <ItemRow key={addon.addonId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Mono>{addon.addonId}</Mono>
                        <p className="mt-1 text-xs text-gray-500">Version : {addon.planVersionId}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Qté : {addon.quantity} · Début : {formatDate(addon.startsAt)}
                          {addon.endsAt && ` → ${formatDate(addon.endsAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusChip tone={addon.status === "ACTIVE" ? "success" : "neutral"}>
                          {addon.status === "ACTIVE" ? "Actif" : addon.status}
                        </StatusChip>
                        {addon.status === "ACTIVE" && (
                          <IconButton
                            icon={XCircle}
                            label="Annuler l'add-on"
                            tone="danger"
                            pending={
                              cancelAddonMutation.isPending &&
                              cancelAddonMutation.variables === addon.addonId
                            }
                            onClick={() => askCancelAddon(addon.addonId)}
                          />
                        )}
                      </div>
                    </div>
                  </ItemRow>
                ))}
                {addons.length === 0 && <Empty text="Aucun add-on actif" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Services ───────────────────────────────────────────────────── */}
        {activeTab === "services" && <SubscriptionServicesPanel subscriptionNumber={subNum} />}

        {/* ── Sièges ─────────────────────────────────────────────────────── */}
        {activeTab === "seats" && (
          <>
            {panel === "seat" && (
              <AddSeatPanel subscriptionNumber={subNum} onDone={closePanel} onCancel={closePanel} />
            )}
            <Section title="Sièges" icon={Users} action={addButton("Ajouter un siège", "seat")}>
              <div className="space-y-2">
                {seats.map((seat) => (
                  <ItemRow key={seat.memberCode}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Mono>{seat.memberCode}</Mono>
                        <p className="mt-1">
                          <Tag>{seat.role}</Tag>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusChip tone={seat.status === "ACTIVE" ? "success" : "neutral"}>
                          {seat.status === "ACTIVE" ? "Actif" : seat.status}
                        </StatusChip>
                        {seat.role !== "OWNER" && (
                          <IconButton
                            icon={Trash2}
                            label="Retirer le siège"
                            tone="danger"
                            pending={
                              removeSeatMutation.isPending &&
                              removeSeatMutation.variables === seat.memberCode
                            }
                            onClick={() => askRemoveSeat(seat.memberCode)}
                          />
                        )}
                      </div>
                    </div>
                  </ItemRow>
                ))}
                {seats.length === 0 && <Empty text="Aucun siège enregistré" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Changements ────────────────────────────────────────────────── */}
        {activeTab === "changes" && (
          <>
            {panel === "change" && (
              <ChangePanel subscriptionNumber={subNum} onDone={closePanel} onCancel={closePanel} />
            )}
            <Section
              title="Changements"
              icon={GitBranch}
              action={addButton("Demander un changement", "change")}
            >
              <div className="space-y-2">
                {changes.map((c) => {
                  const cs = statusOf(CHANGE_STATUS, c.status);
                  return (
                    <ItemRow key={c.changeNumber}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Mono>{c.changeNumber}</Mono>
                          <p className="mt-1 text-xs text-gray-500">
                            {c.changeType} · {c.effectivePolicy}
                          </p>
                          {c.reason && <p className="mt-1 text-xs text-gray-400">{c.reason}</p>}
                        </div>
                        <StatusChip tone={cs.tone}>{cs.label}</StatusChip>
                      </div>
                      {(c.status === "PENDING" || c.status === "APPROVED") && (
                        <div className="mt-3 flex gap-2">
                          {c.status === "PENDING" && (
                            <ActionButton
                              className="!px-4 !py-1.5 !text-xs"
                              pending={busy(approveChangeMutation, c.changeNumber)}
                              onClick={() => approveChangeMutation.mutate(c.changeNumber)}
                            >
                              Approuver
                            </ActionButton>
                          )}
                          {c.status === "APPROVED" && (
                            <ActionButton
                              className="!px-4 !py-1.5 !text-xs"
                              pending={busy(applyChangeMutation, c.changeNumber)}
                              onClick={() => applyChangeMutation.mutate(c.changeNumber)}
                            >
                              Appliquer
                            </ActionButton>
                          )}
                        </div>
                      )}
                    </ItemRow>
                  );
                })}
                {changes.length === 0 && <Empty text="Aucun changement" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <>
            {panel === "timeline" && (
              <TimelineEventPanel
                subscriptionNumber={subNum}
                ownerType={ownerType}
                ownerCode={ownerCode}
                onDone={closePanel}
                onCancel={closePanel}
              />
            )}
            <Section
              title="Timeline"
              icon={Clock}
              action={addButton("Ajouter un événement", "timeline")}
            >
              <div className="space-y-2">
                {timelineEvents.map((ev) => (
                  <ItemRow key={ev.eventNumber}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                      >
                        <Clock size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
                          <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
                          <p className="whitespace-nowrap text-xs text-gray-500">
                            {formatDateTime(ev.occurredAt)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">{ev.eventType}</p>
                        {ev.description && <p className="mt-1 text-xs text-gray-600">{ev.description}</p>}
                        {ev.sourceType && (
                          <p className="mt-1 font-mono text-xs text-gray-400">
                            {ev.sourceType}
                            {ev.sourceId ? ` · ${ev.sourceId}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </ItemRow>
                ))}
                {timelineEvents.length === 0 && <Empty text="Aucun événement sur la timeline" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Notifications ──────────────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <>
            {panel === "notification" && (
              <NotificationPanel
                subscriptionNumber={subNum}
                ownerType={ownerType}
                ownerCode={ownerCode}
                onDone={closePanel}
                onCancel={closePanel}
              />
            )}
            <Section
              title="Notifications"
              icon={Bell}
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton
                    variant="ghost"
                    icon={Send}
                    className="!px-4 !py-2"
                    onClick={askDispatchNotifications}
                  >
                    Envoyer les notifications dues
                  </ActionButton>
                  {addButton("Planifier une notification", "notification")}
                </div>
              }
            >
              <div className="space-y-2">
                {notifications.map((n) => {
                  const ns = statusOf(NOTIFICATION_STATUS, n.status);
                  return (
                    <ItemRow key={n.notificationNumber}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{n.notificationType}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {n.channel} · {n.recipient}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            Planifiée : {formatDateTime(n.scheduledAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusChip tone={ns.tone}>{ns.label}</StatusChip>
                          {n.status === "PENDING" && (
                            <IconButton
                              icon={XCircle}
                              label="Annuler la notification"
                              tone="danger"
                              pending={busy(cancelNotifMutation, n.notificationNumber)}
                              onClick={() => cancelNotifMutation.mutate(n.notificationNumber)}
                            />
                          )}
                        </div>
                      </div>
                    </ItemRow>
                  );
                })}
                {notifications.length === 0 && <Empty text="Aucune notification planifiée" />}
              </div>
            </Section>
          </>
        )}

        {/* ── Overage ────────────────────────────────────────────────────── */}
        {activeTab === "overage" && (
          <div className="space-y-4">
            <Section title="Frais de dépassement" icon={AlertCircle}>
              {overageCharges.length > 0 && (
                <div
                  className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${PINK_SOFT}`}
                >
                  <span className="font-semibold text-[color:var(--logo-pink-dark)]">Total overage</span>
                  <strong className="text-gray-950">
                    {formatMoney(
                      overageCharges.reduce((s, c) => s + c.totalAmount, 0),
                      overageCharges[0]?.currency,
                    )}
                  </strong>
                </div>
              )}
              <div className="space-y-2">
                {overageCharges.map((charge) => (
                  <ItemRow key={charge.chargeNumber}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Mono>{charge.chargeNumber}</Mono>
                        <p className="mt-1 text-sm text-gray-800">{charge.entitlementCode}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {charge.quantity} unités × {formatMoney(charge.unitPrice, charge.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-950">
                          {formatMoney(charge.totalAmount, charge.currency)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(charge.createdAt)}</p>
                      </div>
                    </div>
                  </ItemRow>
                ))}
                {overageCharges.length === 0 && <Empty text="Aucun overage enregistré" />}
              </div>
            </Section>

            {planVersionId && (
              <>
                {panel === "overage" && (
                  <OveragePolicyPanel
                    planVersionId={planVersionId}
                    onDone={closePanel}
                    onCancel={closePanel}
                  />
                )}
                <Section
                  title="Règles de dépassement"
                  description="Appliquées à la version du plan de cette souscription"
                  action={addButton("Nouvelle règle", "overage")}
                >
                  <div className="space-y-2">
                    {policies.map((p) => (
                      <ItemRow key={p.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{p.entitlementCode}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {OVERAGE_MODE_LABELS[p.mode] ?? p.mode}
                              {typeof p.unitPrice === "number" &&
                                ` · ${formatMoney(p.unitPrice, p.currency || "XAF")} l'unité`}
                              {typeof p.freeQuantity === "number" &&
                                p.freeQuantity > 0 &&
                                ` · ${p.freeQuantity} gratuites`}
                            </p>
                          </div>
                          <StatusChip tone={p.active ? "success" : "neutral"}>
                            {p.active ? "Active" : "Inactive"}
                          </StatusChip>
                        </div>
                      </ItemRow>
                    ))}
                    {policies.length === 0 && <Empty text="Aucune règle de dépassement" />}
                  </div>
                </Section>
              </>
            )}
          </div>
        )}

        {/* ── Rollover ───────────────────────────────────────────────────── */}
        {activeTab === "rollover" && (
          <Section
            title="Reports de crédits"
            icon={RotateCcw}
            action={
              <ActionButton
                variant="ghost"
                icon={RotateCcw}
                className="!px-4 !py-2"
                onClick={askApplyRollovers}
              >
                Appliquer les reports dus
              </ActionButton>
            }
          >
            <div className="space-y-2">
              {rollovers.map((r) => (
                <ItemRow key={r.rolloverNumber}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Mono>{r.rolloverNumber}</Mono>
                      <p className="mt-1 text-sm text-gray-800">{r.entitlementCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[color:var(--logo-pink-dark)]">
                        +{r.quantity} reportés
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(r.rolledAt)}</p>
                    </div>
                  </div>
                </ItemRow>
              ))}
              {rollovers.length === 0 && <Empty text="Aucun report de crédits" />}
            </div>
          </Section>
        )}

        {/* ── Cycle de vie ───────────────────────────────────────────────── */}
        {activeTab === "lifecycle" && (
          <div className="space-y-4">
            <CommitmentPanel subscriptionNumber={subNum} currency={currency} onChanged={invalidateAndRefetch} />
            <FreezePanel subscriptionNumber={subNum} status={subscription.status} currency={currency} onChanged={invalidateAndRefetch} />
            <DebitMandatePanel subscriptionNumber={subNum} currency={currency} onChanged={invalidateAndRefetch} />
            <TerminationPanel subscriptionNumber={subNum} onChanged={invalidateAndRefetch} />
            <DerivationPanel subscriptionNumber={subNum} currency={currency} onChanged={invalidateAndRefetch} />
          </div>
        )}

        {/* ── Historique ─────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <Section title="Historique des statuts" icon={History}>
            <div className="space-y-2">
              {history.map((h: any, i) => {
                const to = h.toStatus ?? h.status;
                const from = h.fromStatus;
                const when = h.changedAt ?? h.createdAt ?? h.occurredAt;
                return (
                  <ItemRow key={h.id ?? i}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {to && (
                          <p className="text-sm font-semibold text-gray-900">
                            {from
                              ? `${statusOf(SUBSCRIPTION_STATUS, from).label} → ${statusOf(SUBSCRIPTION_STATUS, to).label}`
                              : statusOf(SUBSCRIPTION_STATUS, to).label}
                          </p>
                        )}
                        {h.reason && <p className="mt-1 text-xs text-gray-500">{h.reason}</p>}
                        {h.changedBy && <p className="mt-0.5 text-xs text-gray-400">Par {h.changedBy}</p>}
                      </div>
                      {when && (
                        <p className="whitespace-nowrap text-xs text-gray-500">{formatDateTime(when)}</p>
                      )}
                    </div>
                  </ItemRow>
                );
              })}
              {history.length === 0 && <Empty text="Aucun changement de statut" />}
            </div>
          </Section>
        )}
      </div>
      <Toaster />
    </AdminLayout>
  );
};