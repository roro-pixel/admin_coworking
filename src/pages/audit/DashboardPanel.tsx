import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionButton, Field, ListHeader, Pagination, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ActionForm } from "../../components/accounting/ActionForm";
import { toast } from "../../components/ui/toastStore";
import { SettingEditor } from "../../components/settings/SettingEditor";
import { auditService } from "../../services/audit.service";
import type { AuditAlert } from "../../services/audit.service";
import { Async, Status, Table, Td, dt, iso, num, sevTone } from "./auditUtils";

const ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];

export const DashboardPanel: React.FC = () => {
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["audit", "dashboard"], queryFn: auditService.dashboard, refetchInterval: 60_000 });
  const rules = useQuery({ queryKey: ["audit", "rules"], queryFn: auditService.rules });
  const evalM = useMutation({ mutationFn: auditService.evaluate, onSuccess: (r) => { qc.setQueryData(["audit", "rules"], r); qc.invalidateQueries({ queryKey: ["audit"] }); toast.success("Évaluation effectuée"); }, onError: (e) => toast.error(apiMessage(e, "Évaluation impossible.")) });
  const [f, setF] = useState({ status: "", rule: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  // Seuil en cours de modification (clé du paramètre) : édité ici même, sans quitter l'audit
  const [editKey, setEditKey] = useState<string | null>(null);
  const [ack, setAck] = useState<AuditAlert | null>(null);
  const alerts = useQuery({ queryKey: ["audit", "alerts", f, page], queryFn: () => auditService.alerts({ status: f.status, rule: f.rule, from: iso(f.from), to: iso(f.to, true), page }) });
  const d = dash.data;
  const tr = d?.trafficLastHour;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPage(0); };

  return (
    <div className="space-y-6">
      <ListHeader title="Tableau de bord" subtitle={d?.checkedAt ? `Mesuré le ${dt(d.checkedAt)} · rafraîchi chaque minute` : "Indicateurs en direct"} action={<ActionButton variant="ghost" pending={evalM.isPending} onClick={() => evalM.mutate()}>Évaluer maintenant</ActionButton>} />
      <Async q={dash}>
        {d?.openAlerts ? <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{d.openAlerts} alerte{d.openAlerts > 1 ? "s" : ""} ouverte{d.openAlerts > 1 ? "s" : ""}</div> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(d?.indicators ?? {}).map(([code, i]) => {
            const off = !i.threshold; const ratio = off ? 0 : Math.min(1, (i.value ?? 0) / (i.threshold ?? 1));
            return (
              <div key={code} className={`rounded-2xl bg-white p-3 shadow-sm ${off ? "opacity-50" : ""}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{code}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{num(i.value)} <span className="text-xs font-normal text-gray-400">/ {off ? "règle coupée" : num(i.threshold)}</span></p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${ratio >= 1 ? "bg-red-500" : ratio >= 0.7 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio * 100}%` }} /></div>
                {i.detail && <p className="mt-1 text-xs text-gray-500">{i.detail}</p>}
              </div>
            );
          })}
          <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Trafic (1 h)</p><p className="mt-1 text-xl font-bold">{num(tr?.requests)}</p><p className="text-xs text-gray-500">{num(tr?.requests_per_minute)}/min · 4xx {num(tr?.client_errors)} · 5xx {num(tr?.server_errors)}</p></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Comptes verrouillés</p><p className="mt-1 text-xl font-bold">{num(d?.lockedAccounts)}</p></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Échecs de connexion (24 h)</p><p className="mt-1 text-xl font-bold">{num(d?.failedLogins24h)}</p></div>
        </div>
      </Async>

      <Section title="Règles d'alerte" description="Un seuil à 0 coupe la règle. Cliquez sur une clé pour modifier son seuil ici (super administrateur).">
        {editKey && <div className="mb-3"><SettingEditor settingKey={editKey} onSaved={() => qc.invalidateQueries({ queryKey: ["audit"] })} /></div>}
        <Async q={rules} isEmpty={(rules.data ?? []).length === 0}>
          <Table head={["Règle", "Titre", "Gravité", "Valeur", "Seuil", "Active", "Paramètre"]}>
            {(rules.data ?? []).map((r) => (
              <tr key={r.code} className="border-t border-gray-100">
                <Td mono>{r.code}</Td><Td wrap>{r.title}{r.detail && <span className="block text-gray-400">{r.detail}</span>}</Td>
                <Td><StatusChip tone={sevTone(r.severity)}>{r.severity}</StatusChip></Td><Td mono>{num(r.currentValue)}</Td><Td mono>{num(r.threshold)}</Td><Td>{r.enabled === false || !r.threshold ? "Non" : "Oui"}</Td>
                <Td>{r.settingKey && <button type="button" onClick={() => setEditKey(editKey === r.settingKey ? null : r.settingKey!)} className="font-mono text-[color:var(--logo-pink-dark)] hover:underline" title="Modifier le seuil">{r.settingKey}</button>}</Td>
              </tr>
            ))}
          </Table>
        </Async>
      </Section>

      <Section title="Alertes" description="OPEN, puis ACKNOWLEDGED après accusé de lecture ; RESOLVED toute seule quand la mesure redescend.">
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <Field label="Statut"><select className={FIELD} value={f.status} onChange={set("status")}><option value="">Tous</option>{ALERT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Règle"><select className={FIELD} value={f.rule} onChange={set("rule")}><option value="">Toutes</option>{(rules.data ?? []).map((r) => <option key={r.code}>{r.code}</option>)}</select></Field>
          <Field label="Du"><input type="date" className={FIELD} value={f.from} onChange={set("from")} /></Field>
          <Field label="Au"><input type="date" className={FIELD} value={f.to} onChange={set("to")} /></Field>
        </div>
        {ack && <div className="mb-3"><ActionForm title={`Accusé de lecture ALR-${ack.id}`} submitLabel="Accuser réception" onClose={() => setAck(null)} fields={[{ key: "note", label: "Note", hint: "Facultatif" }]} onSubmit={async (v) => { await auditService.acknowledge(ack.id, v.note as string | undefined); qc.invalidateQueries({ queryKey: ["audit"] }); }} /></div>}
        <Async q={alerts} isEmpty={(alerts.data?.content ?? []).length === 0} empty="Aucune alerte">
          <div className="space-y-2">
            {(alerts.data?.content ?? []).map((a) => (
              <div key={a.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">ALR-{a.id} · {a.title ?? a.ruleCode} <StatusChip tone={sevTone(a.severity)}>{a.severity}</StatusChip></span>
                  <span className="flex items-center gap-2"><Status s={a.status} />{a.status === "OPEN" && <ActionButton variant="ghost" onClick={() => setAck(a)}>Accuser réception</ActionButton>}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{a.message}</p>
                <p className="mt-1 text-xs text-gray-400">{[`ouverte ${dt(a.openedAt)}`, `vue ${dt(a.lastSeenAt)}`, a.resolvedAt && `résolue ${dt(a.resolvedAt)}`, a.metricValue != null && `mesure ${num(a.metricValue)} / seuil ${num(a.threshold)}`, a.acknowledgedBy && `accusée par ${a.acknowledgedBy}${a.acknowledgeNote ? ` : ${a.acknowledgeNote}` : ""}`].filter(Boolean).join(" · ")}</p>
                {a.notifications && <p className="mt-1 font-mono text-[11px] text-gray-400">{a.notifications}</p>}
              </div>
            ))}
          </div>
          {alerts.data && <Pagination page={alerts.data.page} totalPages={alerts.data.totalPages} total={alerts.data.totalElements} noun="alerte" onChange={setPage} />}
        </Async>
      </Section>
    </div>
  );
};
