import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, RefreshCw } from "lucide-react";
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

const Kpi = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
  </div>
);
export const ActivityReport: React.FC = () => {
  const [range, setRange] = useState(getCurrentMonthRange());
  const [compare, setCompare] = useState(true);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["activity-report", range.from, range.to, compare],
    queryFn: () =>
      reportingService.getActivityReport({
        from: range.from,
        to: range.to,
        compareWithPrevious: compare,
      }),
  });
  const download = async (t: "pdf" | "csv") => {
    const blob =
      t === "pdf"
        ? await reportingService.exportActivityPdf({
            from: range.from,
            to: range.to,
            compareWithPrevious: compare,
          })
        : await reportingService.exportActivityCsv({
            from: range.from,
            to: range.to,
            compareWithPrevious: compare,
          });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t === "pdf" ? "rapport-activite.pdf" : "rapport-activite.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading) return <Loading title="Chargement du rapport d'activité..." />;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Rapport d'activité consolidé
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Vue cross-module des activités métier.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
            <Calendar size={15} />
            <input
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((p) => ({ ...p, from: e.target.value }))
              }
              className="text-sm outline-none"
            />
            <span>→</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))}
              className="text-sm outline-none"
            />
          </div>
          <label className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-100">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />{" "}
            Comparer
          </label>
          <button className={ButtonClass} onClick={() => download("pdf")}>
            <Download size={15} />
            PDF
          </button>
          <button className={ButtonClass} onClick={() => download("csv")}>
            <Download size={15} />
            CSV
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Kpi label="Réservations" value={data.bookings.totalCount} />
            <Kpi
              label="Facturé"
              value={formatFCFA(data.invoices.totalInvoiced)}
            />
            <Kpi
              label="Encaissé"
              value={formatFCFA(data.payments.totalReceived)}
            />
            <Kpi label="Membres actifs" value={data.members.totalActive} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              [
                "Réservations",
                [
                  ["Confirmées", data.bookings.confirmedCount],
                  ["Terminées", data.bookings.completedCount],
                  ["Annulées", data.bookings.cancelledCount],
                ],
              ],
              [
                "Facturation",
                [
                  ["Factures", data.invoices.totalCount],
                  ["Payé", formatFCFA(data.invoices.totalPaid)],
                  ["Restant dû", formatFCFA(data.invoices.totalOutstanding)],
                ],
              ],
              [
                "Paiements",
                [
                  ["Transactions", data.payments.transactionCount],
                  ["Espèces", formatFCFA(data.payments.cashAmount)],
                  ["Mobile Money", formatFCFA(data.payments.mobileMoneyAmount)],
                ],
              ],
              [
                "Opérations",
                [
                  ["Abonnements actifs", data.subscriptions.activeCount],
                  ["Contrats actifs", data.contracts.activeCount],
                  ["Tickets ouverts", data.support.openedCount],
                ],
              ],
            ].map(([title, rows]: any) => (
              <section
                key={title}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
              >
                <h3 className="mb-4 font-bold">{title}</h3>
                {rows.map(([k, v]: any) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-gray-100 py-2 last:border-0"
                  >
                    <span className="text-sm text-gray-500">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
