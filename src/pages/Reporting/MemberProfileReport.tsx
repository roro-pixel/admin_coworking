import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Search, UserRound } from "lucide-react";
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

export const MemberProfileReport: React.FC = () => {
  const [memberId, setMemberId] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["member-profile", submitted],
    queryFn: () => reportingService.getMemberProfile(submitted),
    enabled: !!submitted,
  });
  const download = async () => {
    if (!submitted) return;
    const blob = await reportingService.exportMemberProfilePdf(submitted);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-membre-${submitted}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-bold">Fiche membre 360</h2>
          <p className="text-sm text-gray-500">Profil complet membre.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="MBR-000012"
            className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100"
          />
          <button
            onClick={() => setSubmitted(memberId.trim())}
            disabled={!memberId.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Search size={15} />
            Charger
          </button>
          <button disabled={!data} onClick={download} className={ButtonClass}>
            <Download size={15} />
            PDF
          </button>
          <button
            disabled={!submitted}
            onClick={() => refetch()}
            className="rounded-xl bg-white p-2 ring-1 ring-gray-100"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      {isLoading && <Loading title="Chargement fiche membre..." />}
      {!submitted && (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <UserRound className="mx-auto mb-3 text-gray-300" size={42} />
          <p className="text-sm text-gray-500">Saisis un code membre.</p>
        </div>
      )}
      {data && (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-bold">
              {data.member.firstname} {data.member.lastname}
            </h3>
            <p className="text-sm text-gray-500">
              {data.member.memberCode} · {data.member.email} ·{" "}
              {data.member.status}
            </p>
          </section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <K label="Bookings" v={data.bookings.length} />
            <K label="Factures" v={data.invoices.length} />
            <K
              label="Payé"
              v={formatFCFA(
                data.payments.reduce((s, p) => s + (p.amount ?? 0), 0),
              )}
            />
            <K label="Wallet" v={formatFCFA(data.wallet?.availableBalance)} />
          </div>
          <List
            title="Abonnements"
            rows={data.subscriptions.map((s) => [
              s.subscriptionNumber,
              `${s.planName} · ${s.status}`,
            ])}
          />
          <List
            title="Factures"
            rows={data.invoices.map((i) => [
              i.documentNumber,
              `${i.status} · ${formatFCFA(i.balanceDue)}`,
            ])}
          />
          <List
            title="Tickets"
            rows={data.tickets.map((t) => [
              t.ticketNumber,
              `${t.title} · ${t.status}`,
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
    {rows.length ? (
      <div className="space-y-2">
        {rows.map(([a, b]) => (
          <div
            key={a}
            className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm"
          >
            <span className="font-mono">{a}</span>
            <b>{b}</b>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500">Aucune donnée.</p>
    )}
  </section>
);
