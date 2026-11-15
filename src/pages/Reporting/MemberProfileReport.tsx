import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone, Search, UserRound } from "lucide-react";
import { paymentMethodLabels, reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { Avatar } from "../../components/operations/opsKit";
import { ActionButton, EmptyState, ErrorBlock, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, formatDate } from "../../components/subscription/kitUtils";
import { ExportButton, RefreshButton, ReportHead, ReportSkeleton, ReportTable, Sub } from "../../components/reporting/reportKit";
import { fmtInt, frLabel, humanize, money, statusTone, useExport } from "../../components/reporting/reportUtils";

type View = "subscriptions" | "bookings" | "invoices" | "payments" | "contracts" | "tickets";

const chip = (status?: string | null) => <StatusChip tone={statusTone(status)}>{frLabel(status)}</StatusChip>;

export const MemberProfileReport: React.FC = () => {
  const [memberId, setMemberId] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [view, setView] = useState<View>("subscriptions");
  const exporter = useExport();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["member-profile", submitted],
    queryFn: () => reportingService.getMemberProfile(submitted),
    enabled: !!submitted,
  });

  const load = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberId.trim()) setSubmitted(memberId.trim());
  };

  const tabs: TabItem<View>[] = data
    ? [
        { id: "subscriptions", label: "Abonnements", count: data.subscriptions.length },
        { id: "bookings", label: "Réservations", count: data.bookings.length },
        { id: "invoices", label: "Factures", count: data.invoices.length },
        { id: "payments", label: "Paiements", count: data.payments.length },
        { id: "contracts", label: "Contrats", count: data.contracts.length },
        { id: "tickets", label: "Tickets", count: data.tickets.length },
      ]
    : [];

  return (
    <div className="space-y-6">
      <ReportHead title="Fiche membre 360" subtitle="Le dossier complet d'un membre : abonnements, réservations, factures, paiements, contrats et tickets">
        <form onSubmit={load} className="flex items-center gap-2">
          <div className="w-44">
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="MBR-000012"
              aria-label="Code membre"
              className={FIELD}
            />
          </div>
          <ActionButton type="submit" icon={Search} disabled={!memberId.trim()}>
            Charger
          </ActionButton>
        </form>
        <ExportButton
          label="PDF"
          busy={exporter.busy === "pdf"}
          disabled={!data}
          onClick={() => exporter.run("pdf", () => reportingService.exportMemberProfilePdf(submitted), `fiche-membre-${submitted}.pdf`)}
        />
        <RefreshButton fetching={isFetching} disabled={!submitted} onClick={() => refetch()} />
      </ReportHead>

      {!submitted && (
        <EmptyState icon={UserRound} title="Saisissez un code membre" hint="Exemple : MBR-000012. La fiche s'affiche ici avec tout son historique." />
      )}
      {submitted && isLoading && <ReportSkeleton />}
      {submitted && isError && (
        <ErrorBlock message={`Aucune fiche trouvée pour le code ${submitted}.`} onRetry={() => refetch()} />
      )}

      {data && (
        <>
          <ChartCard title={`${data.member.firstname} ${data.member.lastname}`.trim()} subtitle={data.member.memberCode}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={`${data.member.firstname} ${data.member.lastname}`} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                {chip(data.member.status)}
                {data.member.email && (
                  <span className="inline-flex items-center gap-2"><Mail size={14} className="text-gray-400" />{data.member.email}</span>
                )}
                {data.member.phone && (
                  <span className="inline-flex items-center gap-2"><Phone size={14} className="text-gray-400" />{data.member.phone}</span>
                )}
                {(data.member.city || data.member.country) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    {[data.member.city, data.member.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {data.member.customerName && <span>Client : <b className="text-gray-900">{data.member.customerName}</b></span>}
                {data.member.jobTitle && <span>{data.member.jobTitle}</span>}
              </div>
            </div>
          </ChartCard>

          <KpiRow
            items={[
              { label: "Réservations", value: fmtInt(data.bookings.length) },
              { label: "Factures", value: fmtInt(data.invoices.length) },
              { label: "Paiements reçus", value: money(data.payments.reduce((s, p) => s + (p.amount ?? 0), 0)), tone: "pink" },
              {
                label: "Solde du portefeuille",
                value: data.wallet ? money(data.wallet.availableBalance) : "Aucun portefeuille",
                hint: data.wallet && data.wallet.heldBalance > 0 ? `${money(data.wallet.heldBalance)} réservés` : undefined,
              },
            ]}
          />

          <Tabs variant="soft" items={tabs} active={view} onChange={setView} />

          <ChartCard title={tabs.find((t) => t.id === view)?.label ?? ""}>
            {view === "subscriptions" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Abonnement", width: "minmax(0,1.5fr)" },
                  { key: "s", label: "Statut" },
                  { key: "c", label: "Cycle" },
                  { key: "end", label: "Fin de période" },
                  { key: "a", label: "Montant", align: "right" },
                ]}
                rows={data.subscriptions.map((s) => ({
                  id: s.subscriptionNumber,
                  cells: {
                    n: (<><span className="block truncate font-semibold text-gray-950">{s.planName}</span><Sub>{s.subscriptionNumber}</Sub></>),
                    s: chip(s.status),
                    c: frLabel(s.billingCycle),
                    end: formatDate(s.currentPeriodEnd),
                    a: money(s.totalAmount),
                  },
                }))}
              />
            )}
            {view === "bookings" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Réservation", width: "minmax(0,1.5fr)" },
                  { key: "s", label: "Statut" },
                  { key: "d", label: "Date" },
                  { key: "t", label: "Durée", align: "right" },
                  { key: "a", label: "Montant", align: "right" },
                ]}
                rows={data.bookings.map((x) => ({
                  id: x.bookingNumber,
                  cells: {
                    n: (<><span className="block truncate font-semibold text-gray-950">{x.resourceName}</span><Sub>{x.bookingNumber}</Sub></>),
                    s: chip(x.status),
                    d: formatDate(x.startDate),
                    t: x.durationMinutes ? `${fmtInt(x.durationMinutes)} min` : "",
                    a: money(x.totalAmount),
                  },
                }))}
              />
            )}
            {view === "invoices" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Facture", width: "minmax(0,1.4fr)" },
                  { key: "s", label: "Statut" },
                  { key: "due", label: "Échéance" },
                  { key: "t", label: "Total", align: "right" },
                  { key: "r", label: "Reste dû", align: "right" },
                ]}
                rows={data.invoices.map((i) => ({
                  id: i.documentNumber,
                  cells: {
                    n: <span className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{i.documentNumber}</span>,
                    s: chip(i.status),
                    due: formatDate(i.dueDate),
                    t: money(i.totalAmount),
                    r: <b className={i.balanceDue > 0 ? "text-red-600" : "text-gray-950"}>{money(i.balanceDue)}</b>,
                  },
                }))}
              />
            )}
            {view === "payments" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Transaction", width: "minmax(0,1.4fr)" },
                  { key: "m", label: "Moyen" },
                  { key: "s", label: "Statut" },
                  { key: "d", label: "Date" },
                  { key: "a", label: "Montant", align: "right" },
                ]}
                rows={data.payments.map((p) => ({
                  id: p.transactionNumber,
                  cells: {
                    n: <span className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{p.transactionNumber}</span>,
                    m: (paymentMethodLabels[p.paymentMethod] ?? humanize(p.paymentMethod)),
                    s: chip(p.status),
                    d: formatDate(p.paidAt),
                    a: <b className="text-gray-950">{money(p.amount)}</b>,
                  },
                }))}
              />
            )}
            {view === "contracts" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Contrat", width: "minmax(0,1.6fr)" },
                  { key: "s", label: "Statut" },
                  { key: "start", label: "Début" },
                  { key: "end", label: "Fin" },
                  { key: "sg", label: "Signé le" },
                ]}
                rows={data.contracts.map((c) => ({
                  id: c.contractCode,
                  cells: {
                    n: (<><span className="block truncate font-semibold text-gray-950">{c.title}</span><Sub>{c.contractCode}</Sub></>),
                    s: chip(c.status),
                    start: formatDate(c.startDate),
                    end: formatDate(c.endDate),
                    sg: formatDate(c.signedAt) || "Non signé",
                  },
                }))}
              />
            )}
            {view === "tickets" && (
              <ReportTable
                cols={[
                  { key: "n", label: "Ticket", width: "minmax(0,1.6fr)" },
                  { key: "s", label: "Statut" },
                  { key: "p", label: "Priorité" },
                  { key: "c", label: "Catégorie" },
                  { key: "d", label: "Créé le" },
                ]}
                rows={data.tickets.map((t) => ({
                  id: t.ticketNumber,
                  cells: {
                    n: (<><span className="block truncate font-semibold text-gray-950">{t.title}</span><Sub>{t.ticketNumber}</Sub></>),
                    s: chip(t.status),
                    p: frLabel(t.priority),
                    c: frLabel(t.category),
                    d: formatDate(t.createdAt),
                  },
                }))}
              />
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};
