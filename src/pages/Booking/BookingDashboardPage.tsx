import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileDown, Star, Wrench } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { LookupItem } from "../../services/booking.service";
import { ActionButton, ErrorBlock, Field, ItemRow, ListHeader, Section } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatNumber } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { useAuth } from "../../contexts/AuthContext";
import { CHANNEL_LABEL, OwnerPicker, addDays, label, money, todayIso } from "../../components/bookings/bookingKit";

const Stat: React.FC<{ title: string; value: React.ReactNode; hint?: string }> = ({ title, value, hint }) => (
  <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const BookingDashboardPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BOOKING:CREATE");
  const [from, setFrom] = useState(addDays(todayIso(), -29));
  const [to, setTo] = useState(todayIso());
  const [owner, setOwner] = useState<LookupItem | null>(null);

  const range = { from, to };
  const metrics = useQuery({ queryKey: ["booking-metrics"], queryFn: () => bookingService.getMetrics(), staleTime: 60_000 });
  const dashboard = useQuery({ queryKey: ["booking-dashboard", from, to], queryFn: () => bookingService.getDashboard(range) });
  const reviews = useQuery({ queryKey: ["booking-reviews", from, to], queryFn: () => bookingService.getReviews(range) });

  const report = useMutation({
    mutationFn: async () => {
      const blob = await bookingService.getClientReportPdf({ ownerType: owner!.type, ownerCode: owner!.code, from, to });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-client-${owner!.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    onError: (e) => toast.error(apiMessage(e, "Rapport impossible")),
  });

  const tool = (name: string, run: () => Promise<unknown>, done: (r: never) => string) => ({
    name,
    run: async () => {
      try {
        const r = await run();
        toast.success(done(r as never));
      } catch (e) {
        toast.error(apiMessage(e, "Action impossible"));
      }
    },
  });
  const [busy, setBusy] = useState<string | null>(null);
  const tools = [
    tool("Réparer les réservations incohérentes", () => bookingService.repair(), (r: { inspected: number; repaired: number; failed: number }) => `${r.inspected} vérifiée(s), ${r.repaired} réparée(s), ${r.failed} en échec`),
    tool("Envoyer les notifications dues", () => bookingService.dispatchDueNotifications(), (n: number) => `${n} notification(s) envoyée(s)`),
    tool("Expirer les blocages échus", () => bookingService.expireDueHolds(), (n: number) => `${n} blocage(s) expiré(s)`),
  ];

  const d = dashboard.data;
  const m = metrics.data;
  return (
    <div className="space-y-5">
      <ListHeader title="Tableau de bord" subtitle="Activité des réservations sur la période." action={<RefreshButton fetching={dashboard.isFetching} onClick={() => { dashboard.refetch(); reviews.refetch(); metrics.refetch(); }} />} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Du"><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={FIELD} /></Field>
        <Field label="Au"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={FIELD} /></Field>
      </div>

      {dashboard.isError ? (
        <ErrorBlock message="Impossible de charger le tableau de bord." onRetry={() => dashboard.refetch()} />
      ) : d ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat title="Réservations" value={formatNumber(Number(d.bookings))} />
            <Stat title="Confirmées" value={formatNumber(Number(d.confirmed))} />
            <Stat title="Terminées" value={formatNumber(Number(d.completed))} />
            <Stat title="Chiffre d'affaires" value={money(d.revenue, "XAF")} />
            <Stat title="Annulées" value={formatNumber(Number(d.cancelled))} hint={`dont ${d.lateCancellations} tardive(s)`} />
            <Stat title="Absences" value={formatNumber(Number(d.noShows))} hint={`${(d.noShowRate * 100).toFixed(1)} % des réservations`} />
            <Stat title="Expirées" value={formatNumber(Number(d.expired))} />
            <Stat title="Délai moyen de réservation" value={`${Math.round(d.averageLeadHours)} h`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Par canal">
              <div className="space-y-2">
                {d.channels.map((c) => (
                  <ItemRow key={c.channel} className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{label(CHANNEL_LABEL, c.channel)}</p>
                    <p className="text-sm text-gray-700">{formatNumber(Number(c.bookings))} · {money(c.revenue, "XAF")}</p>
                  </ItemRow>
                ))}
                {d.channels.length === 0 && <p className="text-sm text-gray-500">Aucune donnée.</p>}
              </div>
            </Section>
            <Section title="Ressources les plus réservées">
              <div className="space-y-2">
                {d.topResources.map((r) => (
                  <ItemRow key={r.resourceCode} className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{r.resourceName || r.resourceCode}</p>
                    <p className="shrink-0 text-sm text-gray-700">{formatNumber(Number(r.bookings))} · {money(r.revenue, "XAF")}</p>
                  </ItemRow>
                ))}
                {d.topResources.length === 0 && <p className="text-sm text-gray-500">Aucune donnée.</p>}
              </div>
            </Section>
          </div>
        </>
      ) : null}

      <Section title="Avis des clients" icon={Star} description="Notes laissées après l'utilisation, par ressource.">
        {reviews.isError ? (
          <ErrorBlock message="Impossible de charger les avis." onRetry={() => reviews.refetch()} />
        ) : (reviews.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aucun avis sur la période.</p>
        ) : (
          <div className="space-y-2">
            {reviews.data!.map((r) => (
              <ItemRow key={r.resourceCode} className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-gray-900">{r.resourceName || r.resourceCode}</p>
                <p className="shrink-0 text-sm text-gray-700">
                  {r.averageScore.toFixed(1)} / 5 · {formatNumber(Number(r.reviews))} avis
                  {Number(r.lowScores) > 0 && <span className="ml-2 font-semibold text-red-600">{formatNumber(Number(r.lowScores))} basse(s) note(s)</span>}
                </p>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      <Section title="Rapport d'un client" icon={FileDown} description="PDF des réservations du client sur la période choisie.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <OwnerPicker value={owner} onChange={setOwner} />
          <ActionButton icon={FileDown} disabled={!owner} pending={report.isPending} onClick={() => report.mutate()}>Télécharger</ActionButton>
        </div>
      </Section>

      {m && (
        <Section title="Situation actuelle">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat title="Brouillons" value={m.draftBookings} />
            <Stat title="En attente d'approbation" value={m.pendingApprovalBookings} />
            <Stat title="Confirmées" value={m.confirmedBookings} hint={money(m.confirmedAmount, "XAF")} />
            <Stat title="Blocages actifs" value={m.activeHolds} />
          </div>
        </Section>
      )}

      {canCreate && (
        <Section title="Maintenance" icon={Wrench} description="Ces traitements tournent déjà automatiquement. Les lancer à la main sert au dépannage.">
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <ActionButton key={t.name} variant="ghost" pending={busy === t.name} onClick={async () => { setBusy(t.name); await t.run(); setBusy(null); }}>
                {t.name}
              </ActionButton>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default BookingDashboardPage;
