import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const formatFCFA = (amount?: number | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} XAF`;
const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "—";
// const getCurrentMonthRange = () => {
//   const now = new Date();
//   const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
//   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//   const format = (d: Date) => d.toISOString().split("T")[0];
//   return { from: format(firstDay), to: format(lastDay) };
// };
const Loading = ({ title }: { title: string }) => (
  <div className="py-16 text-center">
    <RefreshCw className="mx-auto mb-3 animate-spin text-primary-500" />
    <p className="text-gray-500">{title}</p>
  </div>
);
const ButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-100 disabled:opacity-50";

export const SubscriptionAnalyticsReport: React.FC = () => {
  const [months, setMonths] = useState(12);
  const [renewalDays, setRenewalDays] = useState(30);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["subscription-analytics", months, renewalDays],
    queryFn: () =>
      reportingService.getSubscriptionAnalytics({ months, renewalDays }),
  });
  const download = async () => {
    const blob = await reportingService.exportSubscriptionAnalyticsPdf({
      months,
      renewalDays,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rapport-abonnements.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading) return <Loading title="Chargement analytics abonnements..." />;
  const churn = data?.churnTrend?.[data.churnTrend.length - 1]?.churnRate ?? 0;
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-bold">Analytics abonnements</h2>
          <p className="text-sm text-gray-500">
            MRR, churn et renouvellements.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100"
          >
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
            <option value={24}>24 mois</option>
          </select>
          <select
            value={renewalDays}
            onChange={(e) => setRenewalDays(Number(e.target.value))}
            className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100"
          >
            <option value={15}>15 jours</option>
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
          </select>
          <button className={ButtonClass} onClick={download}>
            <Download size={15} />
            PDF
          </button>
          <button
            className="rounded-xl bg-white p-2 ring-1 ring-gray-100"
            onClick={() => refetch()}
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <K label="MRR" v={formatFCFA(data.currentMrr)} />
            <K label="Actifs" v={data.totalActive} />
            <K label="Churn" v={`${churn.toFixed(1)}%`} />
          </div>
          <List
            title="MRR trend"
            rows={data.mrrTrend.map((i) => [
              formatDate(i.month),
              `${formatFCFA(i.mrr)} · ${i.activeCount}`,
            ])}
          />
          <List
            title="Actifs par plan"
            rows={data.activeByPlan.map((i) => [
              i.planName,
              `${i.subscriptionCount} · ${formatFCFA(i.totalAmount)}`,
            ])}
          />
          <List
            title="Renouvellements"
            rows={data.upcomingRenewals.map((i) => [
              i.subscriptionNumber,
              `${i.planName} · ${i.daysUntilRenewal} j · ${formatFCFA(i.totalAmount)}`,
            ])}
          />
        </>
      )}
    </div>
  );
};
const K = ({ label, v }: { label: string; v: string | number }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-3 text-2xl font-bold">{v}</p>
  </div>
);
const List = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) => (
  <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <h3 className="mb-4 font-bold">{title}</h3>
    <div className="space-y-2">
      {rows.map(([a, b]) => (
        <div
          key={a}
          className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm"
        >
          <span>{a}</span>
          <b>{b}</b>
        </div>
      ))}
    </div>
  </section>
);
