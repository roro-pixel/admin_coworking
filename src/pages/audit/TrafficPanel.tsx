import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Field, ListHeader, Pagination, Section } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { auditService } from "../../services/audit.service";
import type { TrafficPoint } from "../../services/audit.service";
import { Async, Status, Table, TL, Td, dt, iso, num } from "./auditUtils";

const STEP: Record<string, number> = { MINUTE: 60_000, HOUR: 3_600_000, DAY: 86_400_000 };
const lt = (ms?: number) => (ms == null ? "—" : `moins de ${num(ms)} ms`);
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Complète à zéro les périodes sans trafic (l'API ne renvoie que celles avec du trafic). */
const fill = (pts: TrafficPoint[], gran: string, from: Date, to: Date): TrafficPoint[] => {
  const step = STEP[gran]; if (!step) return pts;
  const map = new Map(pts.map((p) => [Math.floor(new Date(p.period).getTime() / step), p]));
  const out: TrafficPoint[] = [];
  for (let k = Math.floor(from.getTime() / step); k <= Math.floor(to.getTime() / step) && out.length < 2000; k++) out.push(map.get(k) ?? { period: new Date(k * step).toISOString(), requests: 0, clientErrors: 0, serverErrors: 0 });
  return out;
};

const Chart: React.FC<{ pts: TrafficPoint[]; gran: string }> = ({ pts, gran }) => {
  const W = 800, H = 200, P = 28;
  const max = Math.max(1, ...pts.map((p) => p.requests ?? 0));
  const maxMs = Math.max(1, ...pts.map((p) => p.p95Ms ?? 0));
  const bw = (W - P * 2) / Math.max(1, pts.length);
  const line = pts.map((p, i) => (p.p95Ms != null ? `${P + i * bw + bw / 2},${H - P - (p.p95Ms / maxMs) * (H - P * 2)}` : null)).filter(Boolean).join(" ");
  const fmt = (iso: string) => { const d = new Date(iso); return gran === "DAY" ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-white p-2 shadow-sm" role="img" aria-label="Requêtes par période">
      <text x={4} y={12} fontSize="9" fill="#9ca3af">{num(max)}</text><text x={W - 4} y={12} fontSize="9" fill="#d97706" textAnchor="end">p95 max : {lt(maxMs)}</text>
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#e5e7eb" />
      {pts.map((p, i) => {
        const ok = Math.max(0, (p.requests ?? 0) - (p.clientErrors ?? 0) - (p.serverErrors ?? 0));
        const x = P + i * bw + 1, w = Math.max(1, bw - 2);
        let top = H - P;
        const seg = (v: number, c: string) => { const h = (v / max) * (H - P * 2); top -= h; return <rect key={c} x={x} y={top} width={w} height={h} fill={c} />; };
        return <g key={p.period}><title>{`${dt(p.period)} : ${num(p.requests)} requêtes, 4xx ${num(p.clientErrors)}, 5xx ${num(p.serverErrors)}${p.p95Ms != null ? `, p95 ${lt(p.p95Ms)}` : ""}`}</title>{seg(ok, "#3b82f6")}{seg(p.clientErrors ?? 0, "#f59e0b")}{seg(p.serverErrors ?? 0, "#dc2626")}</g>;
      })}
      {line && <polyline points={line} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 2" />}
      {pts.length > 0 && <><text x={P} y={H - 8} fontSize="9" fill="#9ca3af">{fmt(pts[0].period)}</text><text x={W - P} y={H - 8} fontSize="9" fill="#9ca3af" textAnchor="end">{fmt(pts[pts.length - 1].period)}</text></>}
      <g fontSize="9"><rect x={P + 120} y={4} width={8} height={8} fill="#3b82f6" /><text x={P + 132} y={12} fill="#6b7280">OK</text><rect x={P + 160} y={4} width={8} height={8} fill="#f59e0b" /><text x={P + 172} y={12} fill="#6b7280">4xx</text><rect x={P + 200} y={4} width={8} height={8} fill="#dc2626" /><text x={P + 212} y={12} fill="#6b7280">5xx</text></g>
    </svg>
  );
};

const Series: React.FC = () => {
  const now = useMemo(() => new Date(), []);
  const [f, setF] = useState({ from: toLocalInput(new Date(now.getTime() - 24 * 3_600_000)), to: toLocalInput(now), gran: "HOUR", route: "", method: "" });
  const q = useQuery({ queryKey: ["audit", "traffic", f], queryFn: () => auditService.traffic({ from: iso(f.from), to: iso(f.to), granularity: f.gran, route: f.route, method: f.method }) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pts = useMemo(() => fill(q.data ?? [], f.gran, new Date(f.from), new Date(f.to)), [q.data, f]);
  const tot = (q.data ?? []).reduce((a, p) => ({ r: a.r + (p.requests ?? 0), c: a.c + (p.clientErrors ?? 0), s: a.s + (p.serverErrors ?? 0) }), { r: 0, c: 0, s: 0 });
  return (
    <Section title="Série" description="Les données sont écrites chaque minute : la minute en cours apparaît à la suivante. Les p50 / p95 sont des bornes de tranche.">
      <div className="mb-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Du"><input type="datetime-local" className={FIELD} value={f.from} onChange={set("from")} /></Field>
        <Field label="Au"><input type="datetime-local" className={FIELD} value={f.to} onChange={set("to")} /></Field>
        <Field label="Granularité" hint="Minutes : 7 jours au plus"><select className={FIELD} value={f.gran} onChange={set("gran")}><option value="MINUTE">Minute</option><option value="HOUR">Heure</option><option value="DAY">Jour</option></select></Field>
        <Field label="Route" hint="Gabarit exact"><input className={FIELD} value={f.route} onChange={set("route")} /></Field>
        <Field label="Méthode"><select className={FIELD} value={f.method} onChange={set("method")}><option value="">Toutes</option>{["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}</select></Field>
      </div>
      <Async q={q} isEmpty={(q.data ?? []).length === 0} empty="Aucun trafic sur la période">
        <p className="mb-2 text-xs text-gray-500">{num(tot.r)} requêtes · 4xx {num(tot.c)} · 5xx {num(tot.s)}</p>
        <Chart pts={pts} gran={f.gran} />
      </Async>
    </Section>
  );
};

const Routes: React.FC = () => {
  const [sort, setSort] = useState("requests");
  const q = useQuery({ queryKey: ["audit", "traffic-routes", sort], queryFn: () => auditService.trafficRoutes({ sort }) });
  const rows = q.data ?? [];
  return (
    <Section title="Routes" description="100 routes au plus. « (refusee avant la route) » : refus de la sécurité ; « (sans route) » : adresse inconnue.">
      <div className="mb-3 max-w-xs"><Field label="Tri"><select className={FIELD} value={sort} onChange={(e) => setSort(e.target.value)}><option value="requests">Plus appelées</option><option value="errors">Plus d'erreurs</option><option value="slow">Plus lentes</option></select></Field></div>
      <Async q={q} isEmpty={rows.length === 0} empty="Aucune route">
        <Table head={["Méthode", "Route", "Requêtes", "4xx", "5xx", "Moyenne", "p50", "p95", "Max"]}>
          {rows.map((r, i) => <tr key={i} className="border-t border-gray-100"><Td mono>{r.method}</Td><Td mono>{r.route}</Td><Td>{num(r.requests)}</Td><Td>{num(r.clientErrors)}</Td><Td>{num(r.serverErrors)}</Td><Td>{r.averageMs != null ? `${num(Math.round(r.averageMs))} ms` : "—"}</Td><Td>{lt(r.p50Ms)}</Td><Td>{lt(r.p95Ms)}</Td><Td>{r.maxMs != null ? `${num(r.maxMs)} ms` : "—"}</Td></tr>)}
        </Table>
      </Async>
    </Section>
  );
};

const Kept: React.FC = () => {
  const [f, setF] = useState({ reason: "", route: "", user: "", requestId: "", minStatus: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["audit", "kept", f, page], queryFn: () => auditService.trafficRequests({ reason: f.reason, route: f.route, user: f.user, requestId: f.requestId, minStatus: f.minStatus ? Number(f.minStatus) : undefined, from: iso(f.from), to: iso(f.to, true), page }) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPage(0); };
  const rows = q.data?.content ?? [];
  return (
    <Section title="Requêtes gardées" description="Requêtes lentes (SLOW) et en erreur serveur (ERROR), gardées 30 jours.">
      <div className="mb-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Field label="Motif"><select className={FIELD} value={f.reason} onChange={set("reason")}><option value="">Tous</option><option>SLOW</option><option>ERROR</option></select></Field>
        <Field label="Route (contient)"><input className={FIELD} value={f.route} onChange={set("route")} /></Field>
        <Field label="Utilisateur (contient)"><input className={FIELD} value={f.user} onChange={set("user")} /></Field>
        <Field label="Requête"><input className={FIELD} value={f.requestId} onChange={set("requestId")} /></Field>
        <Field label="Statut min."><input type="number" className={FIELD} value={f.minStatus} onChange={set("minStatus")} /></Field>
        <Field label="Du"><input type="datetime-local" className={FIELD} value={f.from} onChange={set("from")} /></Field>
        <Field label="Au"><input type="datetime-local" className={FIELD} value={f.to} onChange={set("to")} /></Field>
      </div>
      <Async q={q} isEmpty={rows.length === 0} empty="Aucune requête gardée">
        <Table head={["Date", "Motif", "Méthode", "Chemin", "Statut", "Durée", "Utilisateur", "IP", "Requête"]}>
          {rows.map((r, i) => <tr key={r.id ?? i} className="border-t border-gray-100"><Td>{dt(r.createdAt)}</Td><Td>{r.reason}</Td><Td mono>{r.method}</Td><Td mono wrap>{r.path}</Td><Td><Status s={r.status} /></Td><Td>{r.durationMs != null ? `${num(r.durationMs)} ms` : "—"}</Td><Td>{r.userEmail && <TL user={r.userEmail}>{r.userEmail}</TL>}</Td><Td>{r.clientIp}</Td><Td>{r.requestId && <TL requestId={r.requestId}>{r.requestId.slice(0, 8)}</TL>}</Td></tr>)}
        </Table>
        {q.data && <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.totalElements} noun="requête" onChange={setPage} />}
      </Async>
    </Section>
  );
};

export const TrafficPanel: React.FC = () => (
  <div className="space-y-6"><ListHeader title="Trafic" subtitle="Chaque requête de l'API est mesurée, refus 401, 403 et 429 compris (pas les WebSocket)." /><Series /><Routes /><Kept /></div>
);
