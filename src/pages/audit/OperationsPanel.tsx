import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActionButton, Field, ListHeader, Pagination, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { auditService } from "../../services/audit.service";
import type { Job } from "../../services/audit.service";
import { Async, Status, Table, TL, Td, dt, iso, num } from "./auditUtils";

const Health: React.FC = () => {
  const q = useQuery({ queryKey: ["audit", "health"], queryFn: auditService.health, refetchInterval: 60_000 });
  const h = q.data;
  const kv = (o?: Record<string, unknown>) => Object.entries(o ?? {}).map(([k, v]) => <span key={k} className="mr-3 whitespace-nowrap text-xs text-gray-600">{k} <b>{typeof v === "object" ? JSON.stringify(v) : String(v)}</b></span>);
  return (
    <Section title="Santé" description="Vérifiée à chaque ouverture puis chaque minute." action={<ActionButton variant="ghost" onClick={() => q.refetch()}>Actualiser</ActionButton>}>
      <Async q={q}>
        <div className="space-y-3">
          <p>Statut global : <Status s={h?.status} /></p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(h?.components ?? {}).map(([k, c]) => (
              <div key={k} className="rounded-xl bg-white p-2.5 shadow-sm"><p className="flex items-center justify-between text-sm font-semibold">{k}<Status s={c.status} /></p><p className="text-[11px] text-gray-400">{c.durationMs != null ? `${c.durationMs} ms` : ""}</p>{c.error && <p className="text-[11px] text-red-600">{c.error}</p>}</div>
            ))}
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-500">Boîte d'envoi</p><p className="mt-1">{kv(h?.outbox)}</p></div>
          {Object.entries(h?.integrations ?? {}).map(([k, v]) => <div key={k} className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-500">{k} (24 h)</p><p className="mt-1">{kv(v as Record<string, unknown>)}</p></div>)}
          <div className="rounded-xl bg-white p-3 text-xs text-gray-600 shadow-sm">Tâches : {num(h?.scheduledTasks?.tracked)} suivies, {num(h?.scheduledTasks?.failing)} en échec{h?.scheduledTasks?.failingTasks?.length ? ` (${h.scheduledTasks.failingTasks.join(", ")})` : ""} · Erreurs serveur : {num(h?.errors?.lastHour)} sur 1 h, {num(h?.errors?.last24Hours)} sur 24 h{h?.errors?.lastAt ? `, dernière ${dt(h.errors.lastAt)}` : ""}</div>
        </div>
      </Async>
    </Section>
  );
};

const JobRuns: React.FC<{ task: string; onClose: () => void }> = ({ task, onClose }) => {
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["audit", "job-runs", task, page], queryFn: () => auditService.jobRuns({ task, page }) });
  const rows = q.data?.content ?? [];
  return (
    <Section title={`Exécutions de ${task}`} action={<ActionButton variant="ghost" onClick={onClose}>Fermer</ActionButton>}>
      <Async q={q} isEmpty={rows.length === 0} empty="Aucune exécution gardée">
        <Table head={["Début", "Durée", "Résultat", "Motif", "Instance", "Erreur"]}>
          {rows.map((r, i) => <tr key={r.id ?? i} className="border-t border-gray-100"><Td>{dt(r.startedAt)}</Td><Td>{r.durationMs != null ? `${num(r.durationMs)} ms` : "—"}</Td><Td><Status s={r.outcome} /></Td><Td>{r.reason}</Td><Td>{r.instance}</Td><Td wrap>{r.error}</Td></tr>)}
        </Table>
        {q.data && <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.totalElements} noun="exécution" onChange={setPage} />}
      </Async>
    </Section>
  );
};

const Jobs: React.FC = () => {
  const q = useQuery({ queryKey: ["audit", "jobs"], queryFn: auditService.jobs });
  const [sel, setSel] = useState<Job | null>(null);
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <Section title="Tâches planifiées" description="Les tâches en échec d'abord. Cliquez une ligne pour l'historique. L'état est écrit chaque minute.">
        <Async q={q} isEmpty={rows.length === 0} empty="Aucune tâche suivie">
          <Table head={["", "Tâche", "Dernier début", "Durée", "Résultat", "Exéc.", "Échecs", "De suite", "Moy.", "Max", "Instance"]}>
            {rows.map((j) => (
              <tr key={j.taskName} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => setSel(j)}>
                <Td><span className={`inline-block h-2.5 w-2.5 rounded-full ${(j.consecutiveFailures ?? 0) > 0 ? "bg-red-500" : "bg-emerald-500"}`} /></Td>
                <Td mono>{j.taskName}{j.lastError && <span className="block max-w-xs truncate text-red-600" title={j.lastError}>{j.lastError}</span>}</Td>
                <Td>{dt(j.lastStartedAt)}</Td><Td>{j.lastDurationMs != null ? `${num(j.lastDurationMs)} ms` : "—"}</Td><Td><Status s={j.lastOutcome} /></Td>
                <Td>{num(j.runCount)}</Td><Td>{num(j.failureCount)}</Td><Td>{num(j.consecutiveFailures)}</Td><Td>{num(j.averageDurationMs)}</Td><Td>{num(j.maxDurationMs)}</Td><Td>{j.instance}</Td>
              </tr>
            ))}
          </Table>
        </Async>
      </Section>
      {sel && <JobRuns task={sel.taskName} onClose={() => setSel(null)} />}
    </div>
  );
};

const Errors: React.FC = () => {
  const [f, setF] = useState({ path: "", exception: "", requestId: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const q = useQuery({ queryKey: ["audit", "errors", f, page], queryFn: () => auditService.errors({ path: f.path, exception: f.exception, requestId: f.requestId, from: iso(f.from), to: iso(f.to, true), page }) });
  const det = useQuery({ queryKey: ["audit", "error", sel], queryFn: () => auditService.error(sel as number), enabled: sel != null });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setPage(0); };
  const rows = q.data?.content ?? [];
  return (
    <Section title="Erreurs serveur" description="Une rafale de la même erreur sur la même route n'apparaît qu'une fois toutes les dix secondes.">
      <div className="mb-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Chemin (contient)"><input className={FIELD} value={f.path} onChange={set("path")} /></Field>
        <Field label="Exception (contient)"><input className={FIELD} value={f.exception} onChange={set("exception")} /></Field>
        <Field label="Requête"><input className={FIELD} value={f.requestId} onChange={set("requestId")} /></Field>
        <Field label="Du"><input type="datetime-local" className={FIELD} value={f.from} onChange={set("from")} /></Field>
        <Field label="Au"><input type="datetime-local" className={FIELD} value={f.to} onChange={set("to")} /></Field>
      </div>
      <Async q={q} isEmpty={rows.length === 0} empty="Aucune erreur">
        <div className="space-y-1.5">
          {rows.map((e) => (
            <div key={e.id} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
              <button type="button" className="w-full text-left" onClick={() => setSel(sel === e.id ? null : e.id)}>
                <span className="flex flex-wrap items-center gap-2"><StatusChip tone="danger">{e.status}</StatusChip><span className="font-mono text-xs font-semibold">{e.httpMethod} {e.path}</span><span className="text-[11px] text-gray-400">{dt(e.createdAt)}</span></span>
                <span className="block text-xs text-gray-600">{e.exceptionClass}{e.message ? ` : ${e.message}` : ""}</span>
              </button>
              {sel === e.id && (
                <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 text-xs">
                  <p className="flex flex-wrap gap-x-4 text-gray-500">{e.userEmail && <TL user={e.userEmail}>{e.userEmail}</TL>}{e.requestId && <TL requestId={e.requestId}>Chronologie de la requête</TL>}{e.traceId && <span>Référence : <b className="font-mono">{e.traceId}</b></span>}{e.clientIp && <span>{e.clientIp}</span>}</p>
                  {e.rootCause && <p className="text-gray-600">Cause : {e.rootCause}</p>}
                  {det.isLoading ? <p className="text-gray-400">Chargement de la trace…</p> : <pre className="max-h-80 overflow-auto rounded-lg bg-gray-900 p-3 font-mono text-[11px] leading-relaxed text-gray-100">{det.data?.stackTrace ?? "Pas de trace."}</pre>}
                </div>
              )}
            </div>
          ))}
        </div>
        {q.data && <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.totalElements} noun="erreur" onChange={setPage} />}
      </Async>
    </Section>
  );
};

export const OperationsPanel: React.FC = () => (
  <div className="space-y-6">
    <ListHeader title="Exploitation" subtitle="Santé des services, tâches planifiées et erreurs serveur." />
    <Health /><Jobs /><Errors />
  </div>
);
