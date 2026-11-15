import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeftRight, History, Play, QrCode, RefreshCcw, Tag as TagIcon, XCircle } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  Detail,
  ErrorBlock,
  ItemRow,
  PageHeader,
  Section,
  StatusChip,
  Tabs,
} from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import {
  apiMessage,
  formatDateTime,
  formatMoney,
} from "../../../components/subscription/kitUtils";
import { CredentialsPanel } from "../../../components/subscription/pass/CredentialsPanel";
import { PassTransfersTab } from "../../../components/subscription/pass/PassTransfersTab";
import {
  PASS_STATUS,
  PASS_TYPE_LABELS,
  SUBSCRIBER_TYPE_LABELS,
  statusOf,
} from "../../../components/subscription/labels";

type Tab = "details" | "credentials" | "transfers" | "events" | "history" | "renewal";

const TABS: TabItem<Tab>[] = [
  { id: "details", label: "Détails", icon: TagIcon },
  { id: "credentials", label: "Identifiants", icon: QrCode },
  { id: "transfers", label: "Transferts", icon: ArrowLeftRight },
  { id: "events", label: "Événements", icon: Activity },
  { id: "history", label: "Historique", icon: History },
  { id: "renewal", label: "Renouvellement", icon: RefreshCcw },
];

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="py-8 text-center text-sm text-gray-500">{text}</p>
);

/** Page détail d'un pass (remplace PassDetailModal). */
export const PassDetailPage: React.FC = () => {
  const { passNumber = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const {
    data: pass,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pass", passNumber],
    queryFn: () => subscriptionService.getPass(passNumber),
    enabled: !!passNumber,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["pass-events", passNumber],
    queryFn: () => subscriptionService.getPassEvents(passNumber),
    enabled: !!passNumber && activeTab === "events",
  });

  const { data: history = [] } = useQuery({
    queryKey: ["pass-history", passNumber],
    queryFn: () => subscriptionService.getPassStatusHistory(passNumber),
    enabled: !!passNumber && activeTab === "history",
  });

  const { data: renewal } = useQuery({
    queryKey: ["pass-renewal", passNumber],
    queryFn: () => subscriptionService.getPassRenewalSchedule(passNumber),
    enabled: !!passNumber && activeTab === "renewal",
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["passes"] });
    queryClient.invalidateQueries({ queryKey: ["pass", passNumber] });
    queryClient.invalidateQueries({ queryKey: ["pass-history", passNumber] });
    queryClient.invalidateQueries({ queryKey: ["pass-events", passNumber] });
  };

  const activateMutation = useMutation({
    mutationFn: () => subscriptionService.activatePass(passNumber),
    onSuccess: () => {
      refresh();
      toast.success("Pass activé");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur activation pass.")),
  });

  // Annulation : toast de confirmation, l'erreur de l'API y est affichée
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelPass(passNumber, "Annulé par admin"),
    onSuccess: refresh,
  });

  const askCancel = () =>
    toast.confirm({
      message: "Annuler ce pass ?",
      detail: pass?.name ?? passNumber,
      confirmLabel: "Annuler le pass",
      pendingLabel: "Annulation en cours",
      successMessage: "Pass annulé",
      errorMessage: "L'annulation a échoué",
      onConfirm: () => cancelMutation.mutateAsync(),
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

  if (error || !pass) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Pass introuvable" onBack={() => navigate("/subscriptions/passes")} backLabel="Pass" />
          <ErrorBlock message="Ce pass n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const st = statusOf(PASS_STATUS, pass.status);
  const anyPending = activateMutation.isPending || cancelMutation.isPending;
  const hasAmount = pass.totalAmount !== null && pass.totalAmount !== undefined;

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={pass.name}
          subtitle={<span className="font-mono">{pass.passNumber}</span>}
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          actions={
            <>
              {pass.status === "PENDING_ACTIVATION" && (
                <ActionButton
                  icon={Play}
                  pending={activateMutation.isPending}
                  disabled={anyPending}
                  onClick={() => activateMutation.mutate()}
                >
                  Activer manuellement
                </ActionButton>
              )}
              {!["CANCELLED", "EXPIRED"].includes(pass.status) && (
                <ActionButton variant="danger" icon={XCircle} disabled={anyPending} onClick={askCancel}>
                  Annuler
                </ActionButton>
              )}
            </>
          }
          onBack={() => navigate("/subscriptions/passes")}
          backLabel="Pass"
        />

        <div className="mb-5">
          <Tabs variant="soft" items={TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "details" && (
          <div className="space-y-4">
            <Section title="Détails" icon={TagIcon}>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Type">{PASS_TYPE_LABELS[pass.passType] ?? pass.passType}</Detail>
                <Detail label="Propriétaire">
                  <span>{SUBSCRIBER_TYPE_LABELS[pass.ownerType] ?? pass.ownerType}</span>
                  <span className="block font-mono text-xs font-normal text-gray-400">{pass.ownerCode}</span>
                </Detail>
                <Detail label="Plan">
                  {pass.planCode ? (
                    <>
                      <span>{pass.planName ?? pass.planCode}</span>
                      <span className="block font-mono text-xs font-normal text-gray-400">
                        {pass.planCode}
                        {pass.planVersion ? ` · v${pass.planVersion}` : ""}
                      </span>
                    </>
                  ) : (
                    "Ad-hoc"
                  )}
                </Detail>
                <Detail label="Montant">
                  {hasAmount && (
                    <span className="font-bold text-emerald-700">
                      {formatMoney(pass.totalAmount, pass.currency ?? "XAF")}
                    </span>
                  )}
                </Detail>
                <Detail label="Valide du">{formatDateTime(pass.validFrom)}</Detail>
                <Detail label="Jusqu'au">{formatDateTime(pass.validUntil)}</Detail>
                <Detail label="Utilisations">{`${pass.usedCount ?? 0} / ${pass.maxUses ?? "illimité"}`}</Detail>
                <Detail label="Renouvellement auto">{pass.autoRenew ? "Oui" : "Non"}</Detail>
                <Detail label="Transférable">{pass.transferable ? "Oui" : "Non"}</Detail>
                <Detail label="Partageable">{pass.shareable ? "Oui" : "Non"}</Detail>
                <Detail label="Souscription liée" mono>
                  {pass.subscriptionNumber}
                </Detail>
                <Detail label="Contrat lié" mono>
                  {pass.contractCode ?? undefined}
                </Detail>
              </div>
              {pass.description && <p className="mt-5 text-sm text-gray-600">{pass.description}</p>}
            </Section>

            {pass.entitlements && pass.entitlements.length > 0 && (
              <Section title="Droits inclus" icon={TagIcon}>
                <div className="space-y-2">
                  {pass.entitlements.map((ent, i) => (
                    <ItemRow key={i}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-sm font-semibold text-gray-800">{ent.entitlementCode}</p>
                        <span className="text-sm font-bold text-gray-950">
                          {ent.unlimited ? "Illimité" : ent.quantity}
                        </span>
                      </div>
                    </ItemRow>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {activeTab === "credentials" && <CredentialsPanel passNumber={pass.passNumber} />}

        {activeTab === "transfers" && <PassTransfersTab passNumber={pass.passNumber} transferable={!!pass.transferable} />}

        {activeTab === "events" && (
          <Section title="Événements" icon={Activity}>
            <div className="space-y-2">
              {events.map((e) => (
                <ItemRow key={e.id}>
                  <p className="font-semibold text-gray-900">{e.eventType}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(e.occurredAt)}</p>
                  {e.payloadJson && (
                    <pre className="mt-2 overflow-auto rounded-xl bg-gray-50 p-2 text-xs text-gray-700">
                      {e.payloadJson}
                    </pre>
                  )}
                </ItemRow>
              ))}
              {events.length === 0 && <Empty text="Aucun événement." />}
            </div>
          </Section>
        )}

        {activeTab === "history" && (
          <Section title="Historique des statuts" icon={History}>
            <div className="space-y-2">
              {history.map((h) => (
                <ItemRow key={h.id}>
                  <p className="font-semibold text-gray-900">
                    {h.fromStatus
                      ? `${statusOf(PASS_STATUS, h.fromStatus).label} → ${statusOf(PASS_STATUS, h.toStatus).label}`
                      : statusOf(PASS_STATUS, h.toStatus).label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(h.changedAt)} · {h.changedBy ?? "SYSTEM"}
                  </p>
                  {h.reason && <p className="mt-1 text-sm text-gray-600">{h.reason}</p>}
                </ItemRow>
              ))}
              {history.length === 0 && <Empty text="Aucun changement de statut." />}
            </div>
          </Section>
        )}

        {activeTab === "renewal" && (
          <Section title="Renouvellement automatique" icon={RefreshCcw}>
            {renewal ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Detail label="Statut">{renewal.status}</Detail>
                <Detail label="Durée">{`${renewal.duration} ${renewal.durationUnit}`}</Detail>
                <Detail label="Prochain">{formatDateTime(renewal.nextRenewalDate)}</Detail>
                <Detail label="Début de période">{formatDateTime(renewal.currentPeriodStart)}</Detail>
                <Detail label="Fin de période">{formatDateTime(renewal.currentPeriodEnd)}</Detail>
                <Detail label="Tentatives">{String(renewal.retryCount ?? 0)}</Detail>
              </div>
            ) : (
              <Empty text="Aucun renouvellement automatique." />
            )}
          </Section>
        )}
      </div>
      <Toaster />
    </AdminLayout>
  );
};
