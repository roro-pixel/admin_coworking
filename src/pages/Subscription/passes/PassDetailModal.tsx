import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  Clock,
  History,
  RefreshCcw,
  Tag,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Pass } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface PassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: Pass;
}
type Tab = "details" | "events" | "history" | "renewal";
const passTypeLabels: Record<string, string> = {
  DAY_PASS: "Pass journée",
  TIME_PACK: "Pack heures",
  VISITOR_PASS: "Pass visiteur",
  MEETING_ROOM_PACK: "Pack salle",
  PROMOTIONAL_PASS: "Promotionnel",
  SUBSCRIPTION_PASS: "Souscription",
  COMPANY_SHARED_PASS: "Entreprise",
  CUSTOM: "Personnalisé",
};
const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: "Actif",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={14} />,
  },
  PENDING_ACTIVATION: {
    label: "En attente paiement",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock size={14} />,
  },
  PARTIALLY_USED: {
    label: "Partiellement utilisé",
    color: "bg-blue-100 text-blue-700",
    icon: <Zap size={14} />,
  },
  CONSUMED: {
    label: "Consommé",
    color: "bg-indigo-100 text-indigo-700",
    icon: <CheckCircle size={14} />,
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-red-100 text-red-700",
    icon: <XCircle size={14} />,
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-500",
    icon: <Clock size={14} />,
  },
  SUSPENDED: {
    label: "Suspendu",
    color: "bg-orange-100 text-orange-700",
    icon: <XCircle size={14} />,
  },
};
const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const PassDetailModal: React.FC<PassDetailModalProps> = ({
  isOpen,
  onClose,
  pass,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const cancelMutation = useMutation({
    mutationFn: () =>
      subscriptionService.cancelPass(pass.passNumber, "Annulé par admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      onClose();
    },
    onError: (error: any) =>
      alert(error?.response?.data?.message ?? "Erreur annulation pass."),
  });
  const activateMutation = useMutation({
    mutationFn: () => subscriptionService.activatePass(pass.passNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      queryClient.invalidateQueries({ queryKey: ["pass", pass.passNumber] });
    },
  });
  const { data: events = [] } = useQuery({
    queryKey: ["pass-events", pass.passNumber],
    queryFn: () => subscriptionService.getPassEvents(pass.passNumber),
    enabled: isOpen && activeTab === "events",
  });
  const { data: history = [] } = useQuery({
    queryKey: ["pass-history", pass.passNumber],
    queryFn: () => subscriptionService.getPassStatusHistory(pass.passNumber),
    enabled: isOpen && activeTab === "history",
  });
  const { data: renewal } = useQuery({
    queryKey: ["pass-renewal", pass.passNumber],
    queryFn: () => subscriptionService.getPassRenewalSchedule(pass.passNumber),
    enabled: isOpen && activeTab === "renewal",
  });
  if (!isOpen) return null;
  const cfg = statusConfig[pass.status] ?? {
    label: pass.status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "details", label: "Détails", icon: Tag },
    { id: "events", label: "Événements", icon: Activity },
    { id: "history", label: "Historique", icon: History },
    { id: "renewal", label: "Renouvellement", icon: RefreshCcw },
  ];
  return (
    <ModalPortal onClose={onClose} size="3xl">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{pass.name}</h3>
          <p className="text-sm text-gray-500 font-mono">{pass.passNumber}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <div className="flex gap-2">
            {pass.status === "PENDING_ACTIVATION" && (
              <button
                onClick={() => activateMutation.mutate()}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white"
              >
                Activer manuellement
              </button>
            )}{" "}
            {!["CANCELLED", "EXPIRED"].includes(pass.status) && (
              <button
                onClick={() => cancelMutation.mutate()}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-gray-50 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${activeTab === t.id ? "bg-white text-gray-950 shadow-sm" : "text-gray-500"}`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
        {activeTab === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info
                label="Type"
                value={passTypeLabels[pass.passType] ?? pass.passType}
              />
              <Info
                label="Propriétaire"
                value={`${pass.ownerType} · ${pass.ownerCode}`}
              />
              <Info
                label="Plan"
                value={
                  pass.planCode
                    ? `${pass.planName ?? pass.planCode} v${pass.planVersion ?? ""}`
                    : "Ad-hoc"
                }
              />
              <Info
                label="Montant"
                value={
                  pass.totalAmount !== null && pass.totalAmount !== undefined
                    ? `${pass.totalAmount.toLocaleString("fr-FR")} ${pass.currency ?? ""}`
                    : "—"
                }
              />
              <Info label="Valide du" value={fmt(pass.validFrom)} />
              <Info label="Jusqu'au" value={fmt(pass.validUntil)} />
              <Info
                label="Usages"
                value={`${pass.usedCount ?? 0}/${pass.maxUses ?? "∞"}`}
              />
              <Info label="Auto-renew" value={pass.autoRenew ? "Oui" : "Non"} />
            </div>
            {pass.entitlements && pass.entitlements.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                  <Tag size={11} /> Droits inclus
                </p>
                <div className="space-y-2">
                  {pass.entitlements.map((ent, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                    >
                      <div className="flex justify-between">
                        <p className="font-mono text-sm font-medium">
                          {ent.entitlementCode}
                        </p>
                        <span className="text-sm font-medium">
                          {ent.unlimited ? "Illimité" : ent.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "events" && (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-2xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{e.eventType}</p>
                <p className="text-xs text-gray-500">{fmt(e.occurredAt)}</p>
                {e.payloadJson && (
                  <pre className="mt-2 overflow-auto rounded-xl bg-white p-2 text-xs">
                    {e.payloadJson}
                  </pre>
                )}
              </div>
            ))}
            {events.length === 0 && <Empty text="Aucun événement." />}
          </div>
        )}
        {activeTab === "history" && (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-2xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {h.fromStatus ?? "—"} → {h.toStatus}
                </p>
                <p className="text-xs text-gray-500">
                  {fmt(h.changedAt)} · {h.changedBy ?? "SYSTEM"}
                </p>
                {h.reason && (
                  <p className="mt-2 text-sm text-gray-600">{h.reason}</p>
                )}
              </div>
            ))}
            {history.length === 0 && (
              <Empty text="Aucun changement de statut." />
            )}
          </div>
        )}
        {activeTab === "renewal" && (
          <div>
            {renewal ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Info label="Statut" value={renewal.status} />
                <Info
                  label="Durée"
                  value={`${renewal.duration} ${renewal.durationUnit}`}
                />
                <Info label="Prochain" value={fmt(renewal.nextRenewalDate)} />
                <Info
                  label="Période début"
                  value={fmt(renewal.currentPeriodStart)}
                />
                <Info
                  label="Période fin"
                  value={fmt(renewal.currentPeriodEnd)}
                />
                <Info
                  label="Tentatives"
                  value={String(renewal.retryCount ?? 0)}
                />
              </div>
            ) : (
              <Empty text="Aucun renouvellement automatique." />
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-sm break-words">{value}</p>
  </div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500">
    {text}
  </div>
);
