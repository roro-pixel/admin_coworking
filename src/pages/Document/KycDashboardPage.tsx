import React from "react";
import { useQuery } from "@tanstack/react-query";
import { kycService } from "../../services/document.service";
import { ListHeader } from "../../components/subscription/kit";
import { dateTime, ACTIVITY_LABEL, KYC_STATUS_LABEL, OWNER_LABEL, PERIOD_LABEL, STATUS_COLOR, fmtHours, fmtInt, label } from "../../components/documents/docUtils";
import { ChartCard, ChartSkeleton, ColumnChart, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { ErrorBlock } from "../../components/subscription/kit";

const STATUS_ORDER = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PENDING_CORRECTION",
  "RENEWAL_REQUIRED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

export const KycDashboardPage: React.FC = () => {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["kyc-dashboard"],
    queryFn: () => kycService.getKycDashboard(),
    refetchInterval: 30000,
  });

  const header = (
    <ListHeader
      title="Tableau de bord KYC"
      subtitle={data?.generatedAt ? `Mis à jour le ${dateTime(data.generatedAt)}` : "Suivi des dossiers, des délais et des expirations"}
      action={<RefreshButton fetching={isFetching} onClick={() => refetch()} />}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <KpiRowSkeleton count={4} columns={4} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorBlock message="Les indicateurs KYC n'ont pas pu être chargés." onRetry={() => refetch()} />
      </div>
    );
  }

  const summary = data.summary ?? ({} as Record<string, number>);
  const num = (k: string) => Number(summary[k] ?? 0);
  const total = Number(summary.totalCases ?? 0);
  const approved = num("APPROVED");
  const underReview = num("UNDER_REVIEW");
  const pendingByOwner = (data.byOwnerType ?? []).reduce((t, i) => t + Number(i.pendingReview ?? 0), 0);
  const inReview = underReview > 0 ? underReview : pendingByOwner;
  const overdue = Number(data.sla?.casesExceeding48h ?? 0);
  const within24 = Number(data.sla?.casesReviewedWithin24h ?? 0);
  const avgHours = Math.max(0, Number(data.sla?.avgReviewTimeHours ?? 0));

  const statusSlices = STATUS_ORDER.map((k) => ({
    key: k,
    label: label(KYC_STATUS_LABEL, k),
    value: num(k),
    color: STATUS_COLOR[k] ?? "#B8BCC6",
  }));

  const expiring = data.expiringSoon;
  const expirySlices = [
    { key: "7", label: "7 jours", value: Number(expiring?.within7Days ?? 0), color: "#D6455D" },
    { key: "30", label: "30 jours", value: Number(expiring?.within30Days ?? 0), color: "#E5A23B" },
    { key: "60", label: "60 jours", value: Number(expiring?.within60Days ?? 0), color: "#E0529C" },
  ];

  return (
    <div className="space-y-6">
      {header}
      <KpiRow
        items={[
          { label: "Dossiers", value: fmtInt(total), hint: "Tous statuts" },
          { label: "En revue", value: fmtInt(inReview), tone: "pink", hint: "Traités en ce moment" },
          { label: "Approuvés", value: fmtInt(approved), tone: "success", hint: `${total > 0 ? Math.round((approved / total) * 100) : 0} % du total` },
          { label: "SLA dépassé", value: fmtInt(overdue), tone: overdue > 0 ? "danger" : "default", hint: "Au-delà de 48 h" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Répartition par statut" subtitle="Tous les dossiers, par étape du parcours">
          <ValueDonut data={statusSlices} centerLabel="dossiers" format={fmtInt} />
        </ChartCard>

        <ChartCard title="Délais de traitement" subtitle={`Temps moyen de revue : ${fmtHours(avgHours)}`}>
          <RankBars
            format={fmtInt}
            items={[
              { key: "24", label: "Traités en moins de 24 h", value: within24, color: "#2E9E6B" },
              { key: "48", label: "En retard (plus de 48 h)", value: overdue, color: "#D6455D" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Par type de propriétaire" subtitle="Volume total et dossiers à revoir">
          <RankBars
            format={fmtInt}
            items={(data.byOwnerType ?? []).map((o) => ({
              key: o.ownerType,
              label: label(OWNER_LABEL, o.ownerType),
              value: Number(o.count ?? 0),
              sub: `${fmtInt(Number(o.pendingReview ?? 0))} à revoir`,
            }))}
          />
        </ChartCard>

        <ChartCard title="Expirations à venir" subtitle="Documents arrivant à échéance">
          <ColumnChart data={expirySlices} height={180} />
        </ChartCard>
      </div>

      <ChartCard title="Activité récente" subtitle="Décisions enregistrées sur la période">
        <RankBars
          format={fmtInt}
          items={(data.recentActivity ?? []).map((a, i) => ({
            key: `${a.action}-${a.period}-${i}`,
            label: label(ACTIVITY_LABEL, a.action),
            value: Number(a.count ?? 0),
            sub: PERIOD_LABEL[a.period] ?? a.period?.replace(/_/g, " ").toLowerCase(),
            color: STATUS_COLOR[a.action],
          }))}
        />
      </ChartCard>
    </div>
  );
};
