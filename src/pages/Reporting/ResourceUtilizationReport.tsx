import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const formatFCFA = (amount?: number | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} XAF`;
// const formatDate = (value?: string | null) =>
//   value ? new Date(value).toLocaleDateString("fr-FR") : "—";
const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { from: format(firstDay), to: format(lastDay) };
};
const Loading = ({ title }: { title: string }) => (
  <div className="py-16 text-center">
    <RefreshCw className="mx-auto mb-3 animate-spin text-primary-500" />
    <p className="text-gray-500">{title}</p>
  </div>
);
const ButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-100 disabled:opacity-50";

export const ResourceUtilizationReport: React.FC = () => {
  const [range, setRange] = useState(getCurrentMonthRange());
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["resource-utilization", range.from, range.to],
    queryFn: () =>
      reportingService.getResourceUtilizationReport({
        from: range.from,
        to: range.to,
      }),
  });
  const download = async () => {
    const blob = await reportingService.exportResourceUtilizationPdf({
      from: range.from,
      to: range.to,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rapport-utilisation-ressources.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading)
    return <Loading title="Chargement utilisation ressources..." />;
  return (
    <div className="space-y-6">
      <Header
        title="Utilisation des ressources"
        range={range}
        setRange={setRange}
        onRefresh={refetch}
        fetching={isFetching}
        onDownload={download}
      />
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <K
              label="Occupation"
              v={`${data.overallOccupancyRate.toFixed(1)}%`}
            />
            <K label="Période" v={`${data.periodDays} jours`} />
            <K label="Ressources" v={data.resources.length} />
            <K label="Sous-utilisées" v={data.underutilized.length} />
          </div>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-4 font-bold">Heatmap horaire</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-7 lg:grid-cols-14">
              {data.hourlyHeatmap.map((h) => (
                <div
                  key={h.hour}
                  className="rounded-xl bg-gray-50 p-3 text-center"
                >
                  <p className="text-xs text-gray-500">{h.hour}:00</p>
                  <p className="font-bold">{h.bookingCount}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-4 font-bold">Ressources</h3>
            <div className="space-y-2">
              {data.resources.map((r) => (
                <div
                  key={r.resourceCode}
                  className="grid grid-cols-4 gap-3 rounded-xl bg-gray-50 p-3 text-sm"
                >
                  <span className="font-semibold">{r.resourceName}</span>
                  <span>{r.occupancyRate.toFixed(1)}%</span>
                  <span>{formatFCFA(r.totalRevenue)}</span>
                  <span>{formatFCFA(r.revenuePerHour)}/h</span>
                </div>
              ))}
            </div>
          </section>
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
const Header = ({
  title,
  range,
  setRange,
  onRefresh,
  fetching,
  onDownload,
}: any) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">Heatmap, créneaux, revenu/heure.</p>
    </div>
    <div className="flex gap-2">
      <input
        type="date"
        value={range.from}
        onChange={(e) => setRange((p: any) => ({ ...p, from: e.target.value }))}
        className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-100"
      />
      <input
        type="date"
        value={range.to}
        onChange={(e) => setRange((p: any) => ({ ...p, to: e.target.value }))}
        className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-100"
      />
      <button className={ButtonClass} onClick={onDownload}>
        <Download size={15} />
        PDF
      </button>
      <button
        className="rounded-xl bg-white p-2 ring-1 ring-gray-100"
        onClick={onRefresh}
      >
        <RefreshCw size={16} className={fetching ? "animate-spin" : ""} />
      </button>
    </div>
  </div>
);
