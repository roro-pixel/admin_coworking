import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { analyticService } from "../../../services/analytic.service";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { money } from "../../../components/accounting/accountingLabels";
import { EmptyState, ErrorBlock, Field, ListHeader, Section, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";

type R = "result" | "dashboard" | "item" | "balance" | "control";
const TABS: TabItem<R>[] = [{ id: "result", label: "Résultat" }, { id: "dashboard", label: "Tableau de bord" }, { id: "item", label: "Analyse d'un poste" }, { id: "balance", label: "Balance" }, { id: "control", label: "Contrôle" }];
const year = new Date().getFullYear();

const State: React.FC<{ q: { isLoading: boolean; isError: boolean; refetch: () => unknown }; children: React.ReactNode }> = ({ q, children }) =>
  q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : <>{children}</>;

const Breakdowns: React.FC<{ title: string; rows: { key?: string; label?: string; amount?: number }[] }> = ({ title, rows }) => (
  <Section title={title}>{rows.length === 0 ? <p className="text-sm text-gray-400">Aucune donnée.</p> : rows.map((r, i) => <p key={i} className="flex justify-between text-sm"><span>{r.label ?? r.key}</span><span className="font-mono">{money(r.amount)}</span></p>)}</Section>
);

export const AnalyticReportsPanel: React.FC = () => {
  const [tab, setTab] = useState<R>("result");
  const [axis, setAxis] = useState("ACTIVITE");
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [item, setItem] = useState("");
  const r = { from, to };
  const ok = !!from && !!to;
  const result = useQuery({ queryKey: ["an-result", axis, from, to], queryFn: () => analyticService.result(axis, r), enabled: ok && tab === "result" });
  const dash = useQuery({ queryKey: ["an-dash", from, to], queryFn: () => analyticService.dashboard(r), enabled: ok && tab === "dashboard" });
  const bal = useQuery({ queryKey: ["an-bal", axis, from, to], queryFn: () => analyticService.balance(axis, r), enabled: ok && tab === "balance" });
  const ctl = useQuery({ queryKey: ["an-ctl", axis, from, to], queryFn: () => analyticService.control(axis, r), enabled: ok && tab === "control" });
  const it = useQuery({ queryKey: ["an-item", item, from, to], queryFn: () => analyticService.item(item, r), enabled: ok && tab === "item" && !!item });
  const a = it.data;
  return (
    <div className="space-y-4">
      <ListHeader title="États analytiques" subtitle="Résultat par section, dépenses par poste, balance et contrôle face à la comptabilité générale." />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Axe"><input className={FIELD} value={axis} onChange={(e) => setAxis(e.target.value)} /></Field>
        <Field label="Du"><input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <Tabs items={TABS} active={tab} onChange={setTab} variant="soft" />
      {tab === "result" && <State q={result}>{(result.data?.sections ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune donnée sur la période" /> : <GenericResult data={[...(result.data!.sections), ...(result.data!.total ? [{ ...result.data!.total, section: "TOTAL" }] : [])]} />}</State>}
      {tab === "dashboard" && <State q={dash}>{(dash.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune donnée" /> : <GenericResult data={dash.data} title="Triés par dérive : les premiers dérivent le plus" />}</State>}
      {tab === "balance" && <State q={bal}><GenericResult data={bal.data} /></State>}
      {tab === "control" && <State q={ctl}><GenericResult data={ctl.data} title="Montant ventilé face aux classes 6 et 7" /></State>}
      {tab === "item" && (
        <>
          <Field label="Poste de dépense" hint="Code du poste"><input className={FIELD} value={item} onChange={(e) => setItem(e.target.value)} /></Field>
          {item && <State q={it}>{a && (
            <div className="space-y-3">
              {a.alerts.map((x, i) => <div key={i} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{x}</div>)}
              <Section title={`${a.label ?? a.item} · ${formatDate(a.from)} → ${formatDate(a.to)}`}>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <p>Période<br /><b className="font-mono">{money(a.period)}</b></p><p>Cumul de l'exercice<br /><b className="font-mono">{money(a.yearToDate)}</b></p>
                  <p>Même période N-1<br /><b className="font-mono">{money(a.previousYearSamePeriod)}</b> {a.variancePercent != null && <span className="text-xs text-gray-500">({a.variancePercent} %)</span>}</p>
                  <p>Projection fin d'exercice<br /><b className="font-mono">{money(a.projectionYearEnd)}</b></p><p>Famille<br />{a.family}</p><p>Nature du coût<br />{a.costBehavior}</p>
                </div>
              </Section>
              <Breakdowns title="12 mois glissants" rows={a.monthly.map((m) => ({ key: m.month, amount: m.amount }))} />
              <div className="grid gap-3 lg:grid-cols-2"><Breakdowns title="Par site" rows={a.bySite} /><Breakdowns title="Par centre" rows={a.byCentre} /><Breakdowns title="Par fournisseur" rows={a.bySupplier} /><Breakdowns title="Par journal" rows={a.byJournal} /></div>
              <GenericResult data={a.detail} title="Détail des pièces" />
            </div>
          )}</State>}
        </>
      )}
    </div>
  );
};
