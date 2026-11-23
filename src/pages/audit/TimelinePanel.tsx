import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ActionButton, Field, ListHeader } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { saveBlob } from "../../components/payment/paymentUtils";
import { toast } from "../../components/ui/toastStore";
import { TIMELINE_SOURCES, auditService } from "../../services/audit.service";
import type { TimelineFilter } from "../../services/audit.service";
import { Async, SOURCE_COLOR, Status, TL, dt, iso } from "./auditUtils";

export const TimelinePanel: React.FC = () => {
  const [sp, setSp] = useSearchParams();
  const fromUrl = () => ({ user: sp.get("user") ?? "", entityCode: sp.get("entityCode") ?? "", entityType: sp.get("entityType") ?? "", requestId: sp.get("requestId") ?? "", from: "", to: "" });
  const [f, setF] = useState(fromUrl);
  const [sources, setSources] = useState<string[]>([]);
  const key = sp.toString();
  useEffect(() => { setF(fromUrl()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
  const srcQ = useQuery({ queryKey: ["audit", "tl-sources"], queryFn: auditService.timelineSources, staleTime: Infinity });
  const all = srcQ.data?.length ? srcQ.data : TIMELINE_SOURCES;

  const params = (): TimelineFilter => ({ user: f.user, entityCode: f.entityCode, entityType: f.entityType, requestId: f.requestId, sources: sources.join(","), from: iso(f.from), to: iso(f.to, true) });
  const q = useInfiniteQuery({
    queryKey: ["audit", "timeline", f, sources],
    queryFn: ({ pageParam }) => auditService.timeline({ ...params(), limit: 50, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const apply = () => { const n = new URLSearchParams({ tab: "timeline" }); (["user", "entityCode", "entityType", "requestId"] as const).forEach((k) => f[k] && n.set(k, f[k])); setSp(n); };
  const exp = async () => { try { const r = await auditService.timelineExport(params()); saveBlob(r.blob, r.name); } catch (e) { toast.error(apiMessage(e, "Export impossible.")); } };

  return (
    <div className="space-y-4">
      <ListHeader title="Chronologie" subtitle="Tous les journaux sous une seule forme, du plus récent au plus ancien. 7 derniers jours par défaut, 366 jours au plus." action={<ActionButton variant="ghost" onClick={exp}>Exporter en CSV</ActionButton>} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Utilisateur" hint="E-mail ou USR-…"><input className={FIELD} value={f.user} onChange={set("user")} /></Field>
        <Field label="Élément" hint="INV-…, BKG-…"><input className={FIELD} value={f.entityCode} onChange={set("entityCode")} /></Field>
        <Field label="Type d'élément"><input className={FIELD} value={f.entityType} onChange={set("entityType")} /></Field>
        <Field label="Requête"><input className={FIELD} value={f.requestId} onChange={set("requestId")} /></Field>
        <Field label="Du"><input type="datetime-local" className={FIELD} value={f.from} onChange={set("from")} /></Field>
        <Field label="Au"><input type="datetime-local" className={FIELD} value={f.to} onChange={set("to")} /></Field>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {all.map((s) => { const on = sources.includes(s); return <button key={s} type="button" onClick={() => setSources(on ? sources.filter((x) => x !== s) : [...sources, s])} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${on ? "text-white" : "bg-white text-gray-600 shadow-sm"}`} style={on ? { background: SOURCE_COLOR[s] ?? "#6b7280" } : undefined}><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_COLOR[s] ?? "#6b7280" }} />{s}</button>; })}
        {sources.length > 0 && <button type="button" className="px-2 text-xs text-gray-500 underline" onClick={() => setSources([])}>Toutes les sources</button>}
      </div>
      <ActionButton variant="ghost" onClick={apply}>Garder ces filtres dans l'adresse</ActionButton>
      <Async q={q} isEmpty={items.length === 0} empty="Aucun événement">
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <li key={`${it.source}-${it.refId}-${i}`} className="flex gap-3 rounded-xl bg-white p-2.5 text-sm shadow-sm">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_COLOR[it.source ?? ""] ?? "#6b7280" }} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold" style={{ color: SOURCE_COLOR[it.source ?? ""] ?? "#6b7280" }}>{it.source}</span><span className="font-medium text-gray-900">{it.kind}</span><Status s={it.status} /></span>
                {it.summary && <span className="block break-words text-xs text-gray-600">{it.summary}</span>}
                <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                  <span>{dt(it.occurredAt)}</span>
                  {it.actor && <TL user={it.actor}>{it.actor}</TL>}
                  {it.entityCode && <TL entityCode={it.entityCode} entityType={it.entityType}>{it.entityType ? `${it.entityType} ` : ""}{it.entityCode}</TL>}
                  {it.requestId && <TL requestId={it.requestId}>req {it.requestId.slice(0, 8)}</TL>}
                  {it.ipAddress && <span>{it.ipAddress}</span>}
                </span>
              </span>
            </li>
          ))}
        </ol>
        {q.hasNextPage && <div className="text-center"><ActionButton variant="ghost" pending={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Voir plus</ActionButton></div>}
      </Async>
    </div>
  );
};
