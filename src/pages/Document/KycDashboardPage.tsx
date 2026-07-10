import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { kycService } from "../../services/document.service";

const panelClass =
  "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100";

const formatDateTime = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatHours = (value?: number) => {
  const safeValue = Math.max(0, Number(value ?? 0));

  if (safeValue < 1) {
    return `${Math.round(safeValue * 60)} min`;
  }

  return `${safeValue.toFixed(1)} h`;
};

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Non commencés",
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  APPROVED: "Approuvés",
  REJECTED: "Rejetés",
  PENDING_CORRECTION: "Corrections demandées",
  RENEWAL_REQUIRED: "Renouvellements requis",
  EXPIRED: "Expirés",
};

const ownerTypeLabels: Record<string, string> = {
  MEMBER: "Membres",
  CUSTOMER: "Clients",
  BUSINESS: "Entreprises",
};

const ownerTypeIcons: Record<string, React.ElementType> = {
  MEMBER: UserRound,
  CUSTOMER: Users,
  BUSINESS: Building2,
};

const activityLabels: Record<string, string> = {
  APPROVED: "Dossiers approuvés",
  REJECTED: "Dossiers rejetés",
  SUBMITTED: "Dossiers soumis",
  UNDER_REVIEW: "Dossiers pris en revue",
  PENDING_CORRECTION: "Corrections demandées",
};

const periodLabels: Record<string, string> = {
  LAST_7_DAYS: "7 derniers jours",
  LAST_30_DAYS: "30 derniers jours",
  TODAY: "Aujourd’hui",
};

export const KycDashboardPage: React.FC = () => {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["kyc-dashboard"],
    queryFn: () => kycService.getKycDashboard(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-3 animate-spin text-primary-600"
            size={30}
          />
          <p className="text-sm text-gray-500">
            Chargement du tableau de bord KYC…
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
        <h2 className="font-semibold text-gray-900">
          Tableau de bord indisponible
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Les métriques KYC n’ont pas pu être chargées.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <RefreshCw size={15} />
          Réessayer
        </button>
      </div>
    );
  }

  const summary = data.summary ?? {};

  const totalCases = Number(summary.totalCases ?? 0);
  const notStarted = Number(summary.NOT_STARTED ?? 0);
  const inProgress = Number(summary.IN_PROGRESS ?? 0);
  const submitted = Number(summary.SUBMITTED ?? 0);
  const underReview = Number(summary.UNDER_REVIEW ?? 0);
  const approved = Number(summary.APPROVED ?? 0);
  const rejected = Number(summary.REJECTED ?? 0);
  const pendingCorrection = Number(summary.PENDING_CORRECTION ?? 0);
  const renewalRequired = Number(summary.RENEWAL_REQUIRED ?? 0);
  const expired = Number(summary.EXPIRED ?? 0);

  const pendingReviewByOwnerType = (data.byOwnerType ?? []).reduce(
    (total, item) => total + Number(item.pendingReview ?? 0),
    0,
  );

  const reviewWorkload =
    underReview > 0 ? underReview : pendingReviewByOwnerType;

  const approvedRate =
    totalCases > 0 ? Math.round((approved / totalCases) * 100) : 0;

  const overdueSla = Number(data.sla?.casesExceeding48h ?? 0);
  const reviewedWithin24h = Number(
    data.sla?.casesReviewedWithin24h ?? 0,
  );
  const avgReviewTimeHours = Math.max(
    0,
    Number(data.sla?.avgReviewTimeHours ?? 0),
  );

  const expiring7Days = Number(data.expiringSoon?.within7Days ?? 0);
  const expiring30Days = Number(data.expiringSoon?.within30Days ?? 0);
  const expiring60Days = Number(data.expiringSoon?.within60Days ?? 0);

  const statusCards = [
    {
      key: "NOT_STARTED",
      value: notStarted,
      icon: FileText,
    },
    {
      key: "IN_PROGRESS",
      value: inProgress,
      icon: Activity,
    },
    {
      key: "SUBMITTED",
      value: submitted,
      icon: FileClock,
    },
    {
      key: "UNDER_REVIEW",
      value: underReview,
      icon: Clock3,
    },
    {
      key: "APPROVED",
      value: approved,
      icon: CheckCircle2,
    },
    {
      key: "REJECTED",
      value: rejected,
      icon: XCircle,
    },
    {
      key: "PENDING_CORRECTION",
      value: pendingCorrection,
      icon: AlertTriangle,
    },
    {
      key: "RENEWAL_REQUIRED",
      value: renewalRequired,
      icon: TimerReset,
    },
    {
      key: "EXPIRED",
      value: expired,
      icon: CalendarClock,
    },
  ];

  const mainMetrics = [
    {
      label: "Total dossiers",
      value: totalCases,
      description: "Tous statuts confondus",
      icon: FileText,
      iconClass: "bg-gray-100 text-gray-700",
    },
    {
      label: "En revue",
      value: reviewWorkload,
      description: "Dossiers actuellement traités",
      icon: Clock3,
      iconClass: "bg-orange-50 text-orange-600",
    },
    {
      label: "Approuvés",
      value: approved,
      description: `${approvedRate}% du total`,
      icon: ShieldCheck,
      iconClass: "bg-green-50 text-green-600",
    },
    {
      label: "SLA dépassé",
      value: overdueSla,
      description: "Dossiers au-delà de 48 h",
      icon: AlertTriangle,
      iconClass:
        overdueSla > 0
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-600",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
            <ShieldCheck size={17} />
            Conformité et vérification
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Tableau de bord KYC
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Suivi des dossiers, délais de traitement, expirations et activité
            récente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Dernière synchronisation
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700">
              {formatDateTime(data.generatedAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw
              size={17}
              className={isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mainMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
                    {metric.value.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {metric.description}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.iconClass}`}
                >
                  <Icon size={19} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className={panelClass}>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Répartition par statut
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Lecture directe de la propriété <code>summary</code> renvoyée
              par le backend.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statusCards.map(({ key, value, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-100">
                    <Icon size={17} />
                  </div>
                  <p className="truncate text-sm font-medium text-gray-700">
                    {statusLabels[key] || key}
                  </p>
                </div>

                <span className="ml-3 text-lg font-bold text-gray-950">
                  {value.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TimerReset size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Performance SLA
              </h2>
              <p className="text-sm text-gray-500">
                Délais de traitement des dossiers
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <MetricRow
              label="Temps moyen de revue"
              value={formatHours(avgReviewTimeHours)}
            />
            <MetricRow
              label="Traités sous 24 h"
              value={reviewedWithin24h.toLocaleString("fr-FR")}
            />
            <MetricRow
              label="Au-delà de 48 h"
              value={overdueSla.toLocaleString("fr-FR")}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={panelClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Par type de propriétaire
              </h2>
              <p className="text-sm text-gray-500">
                Volume total et dossiers en attente de revue
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(data.byOwnerType ?? []).length === 0 ? (
              <EmptyState label="Aucune répartition disponible." />
            ) : (
              (data.byOwnerType ?? []).map((item) => {
                const Icon = ownerTypeIcons[item.ownerType] || Users;

                return (
                  <div
                    key={item.ownerType}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-100">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {ownerTypeLabels[item.ownerType] || item.ownerType}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {Number(item.pendingReview ?? 0)} en revue
                        </p>
                      </div>
                    </div>

                    <span className="text-lg font-bold text-gray-950">
                      {Number(item.count ?? 0).toLocaleString("fr-FR")}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Expirations à venir
              </h2>
              <p className="text-sm text-gray-500">
                Documents arrivant à échéance
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <ExpirationMetric label="7 jours" value={expiring7Days} />
            <ExpirationMetric label="30 jours" value={expiring30Days} />
            <ExpirationMetric label="60 jours" value={expiring60Days} />
          </div>
        </section>
      </div>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <Activity size={19} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Activité récente
            </h2>
            <p className="text-sm text-gray-500">
              Décisions enregistrées sur la période
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {(data.recentActivity ?? []).length === 0 ? (
            <EmptyState label="Aucune activité récente disponible." />
          ) : (
            (data.recentActivity ?? []).map((item, index) => {
              const isApproved = item.action === "APPROVED";
              const Icon = isApproved ? CheckCircle2 : XCircle;

              return (
                <div
                  key={`${item.action}-${item.period}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isApproved
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <Icon size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {activityLabels[item.action] || item.action}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {periodLabels[item.period] ||
                          item.period?.replaceAll("_", " ") ||
                          "Période récente"}
                      </p>
                    </div>
                  </div>

                  <span className="text-lg font-bold text-gray-950">
                    {Number(item.count ?? 0).toLocaleString("fr-FR")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const MetricRow: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-gray-950">{value}</span>
  </div>
);

const ExpirationMetric: React.FC<{
  label: string;
  value: number;
}> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 px-3 py-4 text-center">
    <p className="text-2xl font-bold text-gray-950">
      {value.toLocaleString("fr-FR")}
    </p>
    <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
    {label}
  </div>
);
