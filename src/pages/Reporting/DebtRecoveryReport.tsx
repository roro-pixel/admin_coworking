import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const formatFCFA = (amount?: number | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} XAF`;
// const formatDate = (value?: string | null) =>
//   value ? new Date(value).toLocaleDateString("fr-FR") : "—";
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

const buckets = [
  "current",
  "days1to30",
  "days31to60",
  "days61to90",
  "days90plus",
] as const;
export const DebtRecoveryReport: React.FC = () => {
  const [sortBy, setSortBy] = useState("age");
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["debt-recovery", sortBy],
    queryFn: () => reportingService.getDebtRecoveryReport({ sortBy }),
  });
  const download = async (t: "pdf" | "csv") => {
    const blob =
      t === "pdf"
        ? await reportingService.exportDebtRecoveryPdf({ sortBy })
        : await reportingService.exportDebtRecoveryCsv({ sortBy });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      t === "pdf" ? "rapport-recouvrement.pdf" : "rapport-recouvrement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading) return <Loading title="Chargement du recouvrement..." />;
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Recouvrement des impayés
          </h2>
          <p className="text-sm text-gray-500">
            Factures ouvertes et aging détaillé.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-100"
          >
            <option value="age">Âge</option>
            <option value="amount">Montant</option>
            <option value="customer">Client</option>
          </select>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <K label="Total impayé" v={formatFCFA(data.totalOutstanding)} />
            <K label="Factures" v={data.totalInvoices} />
            <K
              label="90+ jours"
              v={formatFCFA(data.aging.days90plus.totalAmount)}
            />
          </div>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-4 font-bold">Aging</h3>
            <div className="grid gap-3 md:grid-cols-5">
              {buckets.map((k) => (
                <div key={k} className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500">
                    {data.aging[k].label}
                  </p>
                  <p className="mt-2 font-bold">
                    {formatFCFA(data.aging[k].totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.aging[k].invoiceCount} facture(s)
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-4 font-bold">Factures impayées</h3>
            <div className="space-y-2">
              {data.unpaidInvoices.map((i) => (
                <div
                  key={i.documentNumber}
                  className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm"
                >
                  <span className="font-mono">{i.documentNumber}</span>
                  <span>{i.customerName}</span>
                  <span className="font-bold">{formatFCFA(i.balanceDue)}</span>
                  <span>{i.agingDays} j</span>
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
