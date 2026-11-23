import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageResult } from "./pagination";

// Centre d'audit. Droit unique : SYSTEM:AUDIT (SUPER_ADMIN, ADMIN, AUDITOR). Le centre s'audite lui-même.
// Les réglages (seuils, destinataires, conservation) sont des paramètres du domaine AUDIT (SUPER_ADMIN, écran des paramètres).

const A = `${API}/admin/audit`;
const enc = encodeURIComponent;
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;

export interface Indicator { value?: number; threshold?: number; detail?: string | null }
export interface Dashboard {
  checkedAt?: string; indicators?: Record<string, Indicator>;
  trafficLastHour?: { requests?: number; client_errors?: number; server_errors?: number; requests_per_minute?: number };
  lockedAccounts?: number; failedLogins24h?: number; openAlerts?: number;
}
export interface AlertRule { code: string; settingKey?: string; threshold?: number; enabled?: boolean; severity?: string; title?: string; currentValue?: number; detail?: string }
export interface AuditAlert {
  id: number; ruleCode?: string; severity?: string; status?: string; title?: string; message?: string; metricValue?: number; threshold?: number; openedAt?: string; lastSeenAt?: string;
  resolvedAt?: string; acknowledgedAt?: string; acknowledgedBy?: string; acknowledgeNote?: string; notifications?: string;
}
export interface TimelineItem { occurredAt?: string; source?: string; refId?: string; kind?: string; actor?: string; entityType?: string; entityCode?: string; summary?: string; requestId?: string; ipAddress?: string; status?: string }
export interface TimelineFilter { user?: string; entityCode?: string; entityType?: string; requestId?: string; sources?: string; from?: string; to?: string; limit?: number; cursor?: string }
export interface FieldChange { before?: unknown; after?: unknown }
export interface DiffChange { entityType?: string; entityCode?: string; operation?: string; fields?: Record<string, FieldChange> }
export interface ActionLog {
  id?: number; createdAt?: string; actorEmail?: string; actorId?: string; module?: string; action?: string; ressource?: string; entityType?: string; entityCode?: string; auditStatus?: string;
  ipAddress?: string; userAgent?: string; sessionId?: string; requestId?: string; errorCode?: string; errorMessage?: string; metadata?: unknown; diff?: { changes?: DiffChange[]; omitted?: number } | null;
}
export interface ActionFilter { module?: string; action?: string; actorEmail?: string; status?: string; createdFrom?: string; createdTo?: string; entityType?: string; entityCode?: string; requestId?: string; ressource?: string; page?: number }
export interface Health {
  status?: string; components?: Record<string, { status?: string; durationMs?: number; error?: string }>; outbox?: Record<string, number>;
  integrations?: Record<string, unknown>; scheduledTasks?: { tracked?: number; failing?: number; failingTasks?: string[] }; errors?: { lastHour?: number; last24Hours?: number; lastAt?: string };
}
export interface Job { taskName: string; lastStartedAt?: string; lastFinishedAt?: string; lastDurationMs?: number; lastOutcome?: string; lastError?: string; lastFailureAt?: string; runCount?: number; failureCount?: number; consecutiveFailures?: number; averageDurationMs?: number; maxDurationMs?: number; instance?: string; updatedAt?: string }
export interface JobRun { id?: number; taskName?: string; startedAt?: string; finishedAt?: string; durationMs?: number; outcome?: string; reason?: string; error?: string; instance?: string }
export interface ServerError { id: number; createdAt?: string; traceId?: string; requestId?: string; httpMethod?: string; path?: string; status?: number; errorCode?: string; exceptionClass?: string; message?: string; rootCause?: string; userEmail?: string; clientIp?: string; stackTrace?: string }
export interface TrafficPoint { period: string; requests?: number; clientErrors?: number; serverErrors?: number; averageMs?: number; p50Ms?: number; p95Ms?: number; maxMs?: number }
export interface TrafficRoute { method?: string; route?: string; requests?: number; clientErrors?: number; serverErrors?: number; averageMs?: number; p50Ms?: number; p95Ms?: number; maxMs?: number }
export interface KeptRequest { id?: number; createdAt?: string; requestId?: string; method?: string; path?: string; route?: string; status?: number; durationMs?: number; userEmail?: string; clientIp?: string; reason?: string }
export interface IntegrityReport { journal: string; checked?: number; firstSeq?: number; lastSeq?: number; unchained?: number; intact?: boolean; breaks?: { chainSeq?: number; kind?: string }[] }
export interface Retention { name: string; table?: string; settingKey?: string; days?: number; rows?: number; oldest?: string }

export const TIMELINE_SOURCES = ["ACTION", "SECURITY", "ERROR", "REQUEST", "FISCAL", "CONTRACT", "COMPLIANCE", "WALLET", "DOCUMENT_ACCESS", "APPROVAL", "SETTING", "EMAIL", "WHATSAPP", "OUTBOX", "NOTIFICATION", "WEBHOOK", "PAWAPAY", "JOB"];

const fileName = (cd: unknown, fallback: string) => /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(cd ?? ""))?.[1] ?? fallback;

export const auditService = {
  async dashboard(): Promise<Dashboard> { return (await apiClient.get(`${A}/dashboard`)).data; },
  async rules(): Promise<AlertRule[]> { return toList<AlertRule>((await apiClient.get(`${A}/alerts/rules`)).data); },
  async evaluate(): Promise<AlertRule[]> { return toList<AlertRule>((await apiClient.post(`${A}/alerts/evaluate`)).data); },
  async alerts(f: { status?: string; rule?: string; from?: string; to?: string; page?: number; size?: number }): Promise<PageResult<AuditAlert>> { return toPage<AuditAlert>((await apiClient.get(`${A}/alerts`, { params: clean({ size: 50, ...f }) })).data, 50); },
  async alert(id: number): Promise<AuditAlert> { return (await apiClient.get(`${A}/alerts/${id}`)).data; },
  async acknowledge(id: number, note?: string): Promise<AuditAlert> { return (await apiClient.post(`${A}/alerts/${id}/acknowledge`, note ? { note } : {})).data; },

  async timeline(f: TimelineFilter): Promise<{ items: TimelineItem[]; nextCursor?: string | null }> { const d = (await apiClient.get(`${A}/timeline`, { params: clean(f) })).data; return { items: d?.items ?? [], nextCursor: d?.nextCursor ?? null }; },
  async timelineSources(): Promise<string[]> { const d = (await apiClient.get(`${A}/timeline/sources`)).data; return Array.isArray(d) ? d : toList<string>(d); },
  async timelineExport(f: TimelineFilter): Promise<{ blob: Blob; name: string }> { const { cursor, limit, ...p } = f; void cursor; void limit; const r = await apiClient.get(`${A}/timeline/export`, { params: clean(p), responseType: "blob" }); return { blob: r.data, name: fileName(r.headers?.["content-disposition"], "chronologie.csv") }; },

  async actions(f: ActionFilter): Promise<PageResult<ActionLog>> { return toPage<ActionLog>((await apiClient.get(`${API}/admin/audit-logs`, { params: clean({ size: 20, ...f }) })).data, 20); },
  async actionsExport(f: ActionFilter): Promise<{ blob: Blob; name: string; rows?: number; truncated: boolean }> {
    const { page, ...p } = f; void page;
    const r = await apiClient.get(`${API}/admin/audit-logs/export`, { params: clean(p), responseType: "blob" });
    const h = r.headers ?? {};
    return { blob: r.data, name: fileName(h["content-disposition"], "journal-actions.csv"), rows: h["x-export-rows"] ? Number(h["x-export-rows"]) : undefined, truncated: String(h["x-export-truncated"]) === "true" };
  },

  async health(): Promise<Health> { return (await apiClient.get(`${A}/health`)).data; },
  async jobs(): Promise<Job[]> { return toList<Job>((await apiClient.get(`${A}/jobs`)).data); },
  async jobRuns(f: { task?: string; outcome?: string; from?: string; to?: string; page?: number; size?: number }): Promise<PageResult<JobRun>> { return toPage<JobRun>((await apiClient.get(`${A}/jobs/runs`, { params: clean({ size: 50, ...f }) })).data, 50); },
  async errors(f: { from?: string; to?: string; path?: string; exception?: string; requestId?: string; page?: number; size?: number }): Promise<PageResult<ServerError>> { return toPage<ServerError>((await apiClient.get(`${A}/errors`, { params: clean({ size: 50, ...f }) })).data, 50); },
  async error(id: number): Promise<ServerError> { return (await apiClient.get(`${A}/errors/${id}`)).data; },

  async traffic(f: { from?: string; to?: string; granularity?: string; route?: string; method?: string }): Promise<TrafficPoint[]> { return toList<TrafficPoint>((await apiClient.get(`${A}/traffic`, { params: clean(f) })).data); },
  async trafficRoutes(f: { from?: string; to?: string; sort?: string }): Promise<TrafficRoute[]> { return toList<TrafficRoute>((await apiClient.get(`${A}/traffic/routes`, { params: clean(f) })).data); },
  async trafficRequests(f: { from?: string; to?: string; reason?: string; route?: string; user?: string; requestId?: string; minStatus?: number; page?: number; size?: number }): Promise<PageResult<KeptRequest>> { return toPage<KeptRequest>((await apiClient.get(`${A}/traffic/requests`, { params: clean({ size: 50, ...f }) })).data, 50); },

  async integrity(): Promise<IntegrityReport[]> { return toList<IntegrityReport>((await apiClient.get(`${A}/integrity`)).data); },
  async retention(): Promise<Retention[]> { return toList<Retention>((await apiClient.get(`${A}/retention`)).data); },
  async runRetention(): Promise<Record<string, number>> { return (await apiClient.post(`${A}/retention/run`)).data; },
  enc,
};
