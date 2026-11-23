import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Eye, Search } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashRegisterPosition } from "../../services/cashRegister.service";
import { paymentService } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, Section, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { ChartCard, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { RankBars } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { RegisterSelect } from "../../components/cash/cashPickers";
import { REGISTER_TYPE } from "../../components/cash/cashLabels";
import { SESSION_STATUS } from "../../components/payment/paymentLabels";
import { statusOf } from "../../components/subscription/labels";

type View = "position" | "stats" | "reports";
const fmt = (n?: number | null) => (n == null ? "—" : formatMoney(n, "FCFA"));
const num = (n?: number | string | null) => Number(n ?? 0).toLocaleString("fr-FR");
const TREND: Record<string, { label: string; tone: "success" | "neutral" | "danger" }> = { IMPROVING: { label: "En amélioration", tone: "success" }, STABLE: { label: "Stable", tone: "neutral" }, DEGRADING: { label: "Se dégrade", tone: "danger" } };

// ───────────────────────── Position ─────────────────────────

const Position: React.FC = () => {
  const [location, setLocation] = useState("");
  const q = useQuery({ queryKey: ["cash-position", location], queryFn: () => cashRegisterService.getPosition(location.trim() || undefined), refetchInterval: 120_000 });
  const d = q.data;
  const total = d?.total;
  const rows: CashRegisterPosition[] = d?.registers ?? [];

  return (
    <div className="space-y-4">
      <ListHeader title="Position de trésorerie" subtitle="Où se trouve l'argent maintenant, par caisse et par site." action={<RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />} />
      <Field label="Site" hint="Code du site. Vide : tous les sites.">
        <input value={location} onChange={(e) => setLocation(e.target.value)} className={`${FIELD_SOFT} w-56`} />
      </Field>
      {q.isLoading ? (
        <KpiRowSkeleton count={4} columns={4} />
      ) : q.isError || !d ? (
        <ErrorBlock message="La position n'a pas pu être chargée." onRetry={() => q.refetch()} />
      ) : (
        <>
          <KpiRow
            items={[
              { label: "Solde attendu", value: fmt(total?.expectedBalance), hint: `${num(total?.registers)} caisse(s)` },
              { label: "Dernier comptage", value: fmt(total?.lastCountTotal) },
              { label: "En transit", value: fmt(total?.inTransit), tone: (total?.inTransit ?? 0) > 0 ? "pink" : "default" },
              { label: "Revues en attente", value: num(total?.pendingReviews), tone: (total?.pendingReviews ?? 0) > 0 ? "danger" : "default", hint: `${num(total?.openSessions)} session(s) ouverte(s)` },
            ]}
          />
          {(d.sites ?? []).length > 1 && (
            <ChartCard title="Par site" subtitle="Solde attendu">
              <RankBars items={(d.sites ?? []).map((s) => ({ key: s.locationCode ?? "—", label: s.locationCode || "Sans site", value: s.expectedBalance ?? 0, sub: `${num(s.registers)} caisse(s)` }))} format={(n) => formatMoney(n, "FCFA")} />
            </ChartCard>
          )}
          {rows.length === 0 ? (
            <EmptyState icon={Eye} title="Aucune caisse" />
          ) : (
            <DataCard>
              <div className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const ss = r.sessionStatus ? statusOf(SESSION_STATUS, r.sessionStatus) : null;
                  return (
                    <div key={r.registerCode} className="space-y-2 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                            {r.name} <span className="font-mono text-xs font-normal text-gray-400">{r.registerCode}</span>
                            {r.registerType && <StatusChip tone="neutral">{REGISTER_TYPE[r.registerType] ?? r.registerType}</StatusChip>}
                            {ss && <StatusChip tone={ss.tone}>{ss.label}</StatusChip>}
                            {r.spotCheckOverdue && <StatusChip tone="warn">Contrôle inopiné en retard</StatusChip>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.cashier ? `Caissier ${r.cashier}` : "Sans session ouverte"}
                            {r.lastCountAt ? ` · compté le ${formatDateTime(r.lastCountAt)} (${fmt(r.lastCountAmount)})` : " · jamais compté"}
                            {r.daysSinceCount != null ? ` · il y a ${r.daysSinceCount} j` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums text-gray-950">{r.expectedHidden ? "Masqué" : fmt(r.expectedBalance)}</p>
                          {r.maxCashAmount ? (
                            <p className={`text-xs tabular-nums ${(r.occupancyPercent ?? 0) >= 90 ? "text-red-600" : "text-gray-500"}`}>
                              {Math.round(r.occupancyPercent ?? 0)} % du plafond {fmt(r.maxCashAmount)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {(r.transfersInCount || r.transfersOutCount || r.pendingReviews || r.pendingVisas) ? (
                        <p className="text-xs text-gray-500">
                          {r.transfersInCount ? `${r.transfersInCount} transfert(s) à recevoir (${fmt(r.transfersInAmount)}) · ` : ""}
                          {r.transfersOutCount ? `${r.transfersOutCount} transfert(s) en route (${fmt(r.transfersOutAmount)}) · ` : ""}
                          {r.pendingReviews ? `${r.pendingReviews} revue(s) · ` : ""}
                          {r.pendingVisas ? `${r.pendingVisas} visa(s) en attente` : ""}
                        </p>
                      ) : null}
                      {(r.alerts ?? []).map((a, i) => (
                        <p key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle size={12} /> {a}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </DataCard>
          )}
        </>
      )}
    </div>
  );
};

// ───────────────────────── Statistiques ─────────────────────────

const Stats: React.FC = () => {
  const [sessionNumber, setSessionNumber] = useState("");
  const [cashier, setCashier] = useState("");
  const [sessionKey, setSessionKey] = useState("");
  const [cashierKey, setCashierKey] = useState("");
  const session = useQuery({ queryKey: ["cash-stats-session", sessionKey], queryFn: () => paymentService.getCashSessionStatistics(sessionKey), enabled: !!sessionKey });
  const cashierQ = useQuery({ queryKey: ["cash-stats-cashier", cashierKey], queryFn: () => paymentService.getCashierStatistics(cashierKey), enabled: !!cashierKey });
  const s = session.data;
  const c = cashierQ.data;

  return (
    <div className="space-y-4">
      <ListHeader title="Statistiques" subtitle="Rythme d'une session et comportement d'un caissier. Les statistiques par caisse sont dans Métriques." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Une session">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSessionKey(sessionNumber.trim()); }}>
            <input value={sessionNumber} onChange={(e) => setSessionNumber(e.target.value)} placeholder="N° de session" className={`${FIELD_SOFT} font-mono`} />
            <ActionButton type="submit" icon={Search} disabled={!sessionNumber.trim()}>
              Voir
            </ActionButton>
          </form>
          {session.isFetching ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : session.isError ? (
            <p className="text-sm text-red-600">{apiMessage(session.error, "Session introuvable.")}</p>
          ) : s ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row k="Caisse" v={s.registerCode} />
              <Row k="Ouverte par" v={s.openedBy} />
              <Row k="Durée" v={`${num(s.durationMinutes)} min`} />
              <Row k="Inactivité" v={`${num(s.idleMinutes)} min`} />
              <Row k="Mouvements" v={num(s.movementCount)} />
              <Row k="Par heure" v={String(Math.round((s.transactionsPerHour ?? 0) * 10) / 10)} />
              <Row k="Entrées" v={fmt(s.totalInflow)} />
              <Row k="Sorties" v={fmt(s.totalOutflow)} />
              <Row k="Rapport entrées / sorties" v={s.inOutRatio == null ? "—" : String(Math.round(s.inOutRatio * 100) / 100)} />
              <Row k="Montant moyen" v={fmt(s.averageMovementAmount)} />
              <Row k="Écart" v={s.varianceAmount == null ? "—" : `${fmt(s.varianceAmount)}${s.variancePercentage != null ? ` (${Math.round(s.variancePercentage * 100) / 100} %)` : ""}`} />
            </dl>
          ) : null}
        </Section>

        <Section title="Un caissier">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setCashierKey(cashier.trim()); }}>
            <input value={cashier} onChange={(e) => setCashier(e.target.value)} placeholder="Code du caissier" className={FIELD_SOFT} />
            <ActionButton type="submit" icon={Search} disabled={!cashier.trim()}>
              Voir
            </ActionButton>
          </form>
          {cashierQ.isFetching ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : cashierQ.isError ? (
            <p className="text-sm text-red-600">{apiMessage(cashierQ.error, "Caissier introuvable.")}</p>
          ) : c ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Row k="Sessions" v={`${num(c.sessionCount)} (${num(c.closedSessionCount)} clôturées)`} />
                <Row k="Passées en revue" v={`${num(c.reviewSessionCount)} (${Math.round(c.reviewFrequencyPercentage ?? 0)} %)`} />
                <Row k="Écart moyen" v={fmt(c.averageVarianceAmount)} />
                <Row k="Dispersion des écarts" v={fmt(c.varianceStandardDeviation)} />
                <Row k="Durée moyenne" v={`${Math.round(c.averageSessionDurationMinutes ?? 0)} min`} />
                <Row k="Score de risque" v={String(Math.round((c.riskScore ?? 0) * 10) / 10)} />
              </dl>
              {c.varianceTrend && <StatusChip tone={(TREND[c.varianceTrend] ?? TREND.STABLE).tone}>Tendance des écarts : {(TREND[c.varianceTrend] ?? TREND.STABLE).label}</StatusChip>}
            </>
          ) : null}
        </Section>
      </div>
    </div>
  );
};

const Row: React.FC<{ k: string; v?: string }> = ({ k, v }) => (
  <div className="min-w-0">
    <dt className="text-xs text-gray-400">{k}</dt>
    <dd className="truncate font-semibold text-gray-900">{v || "—"}</dd>
  </div>
);

// ───────────────────────── Rapports ─────────────────────────

const Reports: React.FC = () => {
  const { hasPermission } = useAuth();
  const [kind, setKind] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState("pdf");
  const dl = useMutation({
    mutationFn: async () => {
      const blob = await cashRegisterService.getReport(kind.trim(), { registerCode: registerCode || undefined, from: from || undefined, to: to || undefined, format });
      saveBlob(blob, `rapport_caisse_${kind.trim()}.${format}`);
    },
    onError: async (e) => {
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      let message: string | undefined;
      try {
        message = data instanceof Blob ? JSON.parse(await data.text())?.message : undefined;
      } catch {
        message = undefined;
      }
      toast.error(message || apiMessage(e, "Rapport indisponible"));
    },
  });
  if (!hasPermission("CASH_REPORT:READ")) return <EmptyState icon={Download} title="Droit manquant" hint="Il faut CASH_REPORT:READ." />;
  return (
    <div className="space-y-4">
      <ListHeader title="Rapports de caisse" subtitle="Export d'un rapport sur une période." />
      <Section title="Générer">
        <p className="text-xs text-gray-500">Les types de rapport (« kind ») et formats disponibles ne figurent pas dans la fiche : saisissez le type attendu par le serveur.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Type de rapport" required>
            <input value={kind} onChange={(e) => setKind(e.target.value)} className={`${FIELD_SOFT} font-mono`} />
          </Field>
          <RegisterSelect label="Caisse" value={registerCode} onChange={setRegisterCode} emptyLabel="Toutes les caisses" />
          <Field label="Format">
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={FIELD_SOFT}>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </Field>
          <Field label="Du">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD_SOFT} />
          </Field>
          <Field label="Au">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_SOFT} />
          </Field>
        </div>
        <ActionButton icon={Download} pending={dl.isPending} disabled={!kind.trim()} onClick={() => dl.mutate()}>
          Télécharger
        </ActionButton>
      </Section>
    </div>
  );
};

export const CashPositionPage: React.FC = () => {
  const [view, setView] = useState<View>("position");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={[{ id: "position" as View, label: "Position" }, { id: "stats" as View, label: "Statistiques" }, { id: "reports" as View, label: "Rapports" }]} active={view} onChange={setView} />
      {view === "position" && <Position />}
      {view === "stats" && <Stats />}
      {view === "reports" && <Reports />}
    </div>
  );
};
