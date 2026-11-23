import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { budgetService } from "../../../services/budget.service";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, Section, StatusChip, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { useFiscalYear } from "./BudgetsPanel";

type V = "follow" | "commitments" | "planned" | "forecasts" | "reserve" | "check";
const TABS: TabItem<V>[] = [{ id: "follow", label: "Suivi" }, { id: "commitments", label: "Engagements" }, { id: "planned", label: "Prévu / non prévu" }, { id: "forecasts", label: "Prévisions échues" }, { id: "reserve", label: "Réserve" }, { id: "check", label: "Simulation" }];
const bar = (p?: number) => (p == null ? "bg-gray-300" : p > 100 ? "bg-red-500" : p > 75 ? "bg-amber-500" : "bg-emerald-500");
const lamp = (s?: string) => (s === "RED" ? "danger" : s === "ORANGE" ? "warn" : "success");

const Q: React.FC<{ q: { isLoading: boolean; isError: boolean; refetch: () => unknown }; children: React.ReactNode }> = ({ q, children }) => q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : <>{children}</>;

export const FollowUpPanel: React.FC = () => {
  const [v, setV] = useState<V>("follow");
  const fy = useFiscalYear();
  const [month, setMonth] = useState("");
  const [spend, setSpend] = useState({ natureCode: "", accountNumber: "", sectionCode: "", amount: "" });
  const follow = useQuery({ queryKey: ["bu-follow", fy.code, month], queryFn: () => budgetService.followUp(fy.code, month || undefined), enabled: !!fy.code && v === "follow" });
  const com = useQuery({ queryKey: ["bu-com"], queryFn: budgetService.commitments, enabled: v === "commitments" });
  const pl = useQuery({ queryKey: ["bu-planned"], queryFn: budgetService.planned, enabled: v === "planned" });
  const fc = useQuery({ queryKey: ["bu-fc"], queryFn: budgetService.forecastReport, enabled: v === "forecasts" });
  const rs = useQuery({ queryKey: ["bu-reserve", fy.code], queryFn: () => budgetService.reserve(fy.code), enabled: !!fy.code && v === "reserve" });
  const chk = useMutation({
    mutationFn: () => budgetService.check([{ natureCode: spend.natureCode || undefined, accountNumber: spend.accountNumber || undefined, sectionCode: spend.sectionCode || undefined, amount: Number(spend.amount.replace(",", ".")) }]),
    onError: (e) => toast.error(apiMessage(e, "Simulation impossible.")),
  });
  const imp = chk.data;
  return (
    <div className="space-y-4">
      <ListHeader title="Suivi budgétaire" subtitle="Consommation, engagements, prévisions et simulation d'une dépense." />
      <Tabs items={TABS} active={v} onChange={setV} variant="soft" />
      {(v === "follow" || v === "reserve") && <div className="flex flex-wrap items-end gap-3">{fy.select}{v === "follow" && <Field label="Jusqu'au mois" hint="AAAA-MM, facultatif"><input className={FIELD} value={month} onChange={(e) => setMonth(e.target.value)} /></Field>}</div>}

      {v === "follow" && <Q q={follow}>{(follow.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune ligne" /> : (
        <div className="space-y-2">
          {follow.data!.map((r) => (
            <div key={r.line.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-gray-900">{r.line.itemLabel ?? r.line.itemCode}{r.line.sectionCode ? <span className="font-normal text-gray-400"> · {r.line.sectionCode}</span> : null}</span><span className="font-mono text-xs">{r.line.consumptionPct != null ? `${r.line.consumptionPct} %` : ""}</span></div>
              <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${bar(r.line.consumptionPct)}`} style={{ width: `${Math.min(100, Math.max(0, r.line.consumptionPct ?? 0))}%` }} /></div>
              <p className="text-xs text-gray-500">Budget {money(r.line.annualAmount)} · engagé {money(r.line.committed)} · réalisé {money(r.line.realized)} · disponible {money(r.line.available)} · projection {money(r.projection)} · écart projeté <b className={(r.projectedVariance ?? 0) > 0 ? "text-red-600" : ""}>{money(r.projectedVariance)}</b></p>
            </div>
          ))}
        </div>
      )}</Q>}
      {v === "commitments" && <Q q={com}><GenericResult data={com.data} /></Q>}
      {v === "planned" && <Q q={pl}><GenericResult data={pl.data} /></Q>}
      {v === "forecasts" && <Q q={fc}><GenericResult data={(fc.data ?? []).map((r) => ({ prévision: r.forecast.number, poste: r.forecast.itemCode, objet: r.forecast.subject, mois: r.forecast.plannedMonth, montant: r.forecast.amount, échue: r.overdue ? "oui" : "", écart: r.gap }))} /></Q>}
      {v === "reserve" && <Q q={rs}><GenericResult data={rs.data} title="Réserve pour imprévus : budget non couvert par une prévision" /></Q>}
      {v === "check" && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Nature"><input className={FIELD} value={spend.natureCode} onChange={(e) => setSpend({ ...spend, natureCode: e.target.value })} /></Field>
            <Field label="Compte"><input className={FIELD} value={spend.accountNumber} onChange={(e) => setSpend({ ...spend, accountNumber: e.target.value })} /></Field>
            <Field label="Section"><input className={FIELD} value={spend.sectionCode} onChange={(e) => setSpend({ ...spend, sectionCode: e.target.value })} /></Field>
            <Field label="Montant" required><input className={FIELD} inputMode="decimal" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: e.target.value })} /></Field>
            <ActionButton pending={chk.isPending} disabled={!spend.amount.trim()} onClick={() => chk.mutate()}>Simuler</ActionButton>
          </div>
          {imp && (
            <Section title={imp.budgetActive === false ? "Aucun budget actif" : imp.blocked ? "Dépense bloquée par le budget" : "Impact sur le budget"}>
              {imp.messages.map((m, i) => <p key={i} className="text-sm text-amber-700">{m}</p>)}
              {imp.unbudgeted.length > 0 && <p className="text-sm text-amber-700">Sans budget : {imp.unbudgeted.join(", ")}</p>}
              {imp.lines.map((l, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
                  <span>{l.itemLabel ?? l.itemCode}{l.sectionCode ? ` · ${l.sectionCode}` : ""} <span className="text-xs text-gray-400">disponible {money(l.available)} → {money(l.availableAfter)}</span></span>
                  <span className="flex items-center gap-2">{l.controlLevel && <span className="text-xs text-gray-400">{l.controlLevel}</span>}<StatusChip tone={lamp(l.status)}>{l.status}</StatusChip></span>
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
};
