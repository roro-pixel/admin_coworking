import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActionButton, Field, ListHeader, Pagination } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { saveBlob } from "../../components/payment/paymentUtils";
import { toast } from "../../components/ui/toastStore";
import { auditService } from "../../services/audit.service";
import type { ActionFilter, ActionLog, DiffChange } from "../../services/audit.service";
import { Async, Status, TL, dt, iso } from "./auditUtils";

const show = (v: unknown): string => (v === "***" ? "modifié (masqué)" : v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

const Diff: React.FC<{ log: ActionLog }> = ({ log }) => {
  const changes: DiffChange[] = log.diff?.changes ?? [];
  if (changes.length === 0) return <p className="text-xs text-gray-400">{log.auditStatus === "FAILURE" ? "Action en échec : rien n'a été écrit." : "Aucun avant / après enregistré pour cette action."}</p>;
  return (
    <div className="space-y-3">
      {changes.map((c, i) => (
        <div key={i}>
          <p className="text-xs font-semibold text-gray-700"><span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{c.operation}</span>{c.entityType} <TL entityCode={c.entityCode} entityType={c.entityType} /></p>
          {c.fields && Object.keys(c.fields).length > 0 && (
            <table className="mt-1 w-full text-xs"><thead><tr className="text-left text-gray-400"><th className="py-1 pr-3">Champ</th><th className="pr-3">Avant</th><th>Après</th></tr></thead>
              <tbody>{Object.entries(c.fields).map(([k, v]) => <tr key={k} className="border-t border-gray-100"><td className="py-1 pr-3 font-mono">{k}</td><td className="pr-3 text-red-700">{show(v.before)}</td><td className="text-emerald-700">{show(v.after)}</td></tr>)}</tbody></table>
          )}
        </div>
      ))}
      {!!log.diff?.omitted && <p className="text-xs text-gray-400">+ {log.diff.omitted} élément(s) non listé(s)</p>}
    </div>
  );
};

export const ActionsPanel: React.FC = () => {
  const [f, setF] = useState({ module: "", action: "", actorEmail: "", status: "", entityType: "", entityCode: "", requestId: "", ressource: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const filt = (): ActionFilter => ({ module: f.module, action: f.action, actorEmail: f.actorEmail, status: f.status, entityType: f.entityType, entityCode: f.entityCode, requestId: f.requestId, ressource: f.ressource, createdFrom: iso(f.from), createdTo: iso(f.to, true) });
  const q = useQuery({ queryKey: ["audit", "actions", f, page], queryFn: () => auditService.actions({ ...filt(), page }) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPage(0); };
  const exp = async () => {
    try {
      const r = await auditService.actionsExport(filt()); saveBlob(r.blob, r.name);
      if (r.truncated) toast.error(`Fichier coupé à ${r.rows ?? "10 000"} lignes : réduisez la période.`); else toast.success(`${r.rows ?? ""} ligne(s) exportée(s)`);
    } catch (e) { toast.error(apiMessage(e, "Export impossible.")); }
  };
  const rows = q.data?.content ?? [];
  const inp = (k: keyof typeof f, label: string, type = "text") => <Field label={label}><input type={type} className={FIELD} value={f[k]} onChange={set(k)} /></Field>;
  return (
    <div className="space-y-4">
      <ListHeader title="Journal des actions" subtitle="Qui a fait quoi, avec l'avant / après. Une action toute récente peut prendre un instant à apparaître." action={<span className="flex gap-2"><ActionButton variant="ghost" onClick={() => q.refetch()}>Actualiser</ActionButton><ActionButton variant="ghost" onClick={exp}>Exporter en CSV</ActionButton></span>} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {inp("module", "Module")}{inp("action", "Action")}{inp("actorEmail", "Acteur (contient)")}
        <Field label="Résultat"><select className={FIELD} value={f.status} onChange={set("status")}><option value="">Tous</option><option>SUCCESS</option><option>FAILURE</option></select></Field>
        {inp("ressource", "Ressource (contient)")}{inp("entityType", "Type d'élément")}{inp("entityCode", "Code de l'élément")}{inp("requestId", "Requête")}{inp("from", "Du", "datetime-local")}{inp("to", "Au", "datetime-local")}
      </div>
      <Async q={q} isEmpty={rows.length === 0} empty="Aucune action">
        <div className="space-y-1.5">
          {rows.map((a, i) => (
            <div key={a.id ?? i} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
              <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="text-[11px] text-gray-400">{dt(a.createdAt)}</span>
                <span className="font-mono text-xs font-semibold text-gray-900">{a.module} · {a.action}</span>
                <Status s={a.auditStatus} />
                <span className="text-xs text-gray-500">{a.actorEmail}</span>
                {a.entityCode && <span className="font-mono text-xs text-gray-400">{a.entityCode}</span>}
              </button>
              {open === i && (
                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    {a.actorEmail && <TL user={a.actorEmail}>Chronologie de l'utilisateur</TL>}
                    {a.entityCode && <TL entityCode={a.entityCode} entityType={a.entityType}>Chronologie de l'élément</TL>}
                    {a.requestId && <TL requestId={a.requestId}>Que s'est-il passé dans cette requête</TL>}
                  </p>
                  <p className="break-all text-[11px] text-gray-500">{[a.ressource, a.ipAddress, a.sessionId && `session ${a.sessionId}`, a.userAgent].filter(Boolean).join(" · ")}</p>
                  {a.errorCode && <p className="text-xs text-red-700">{a.errorCode} : {a.errorMessage}</p>}
                  <Diff log={a} />
                  {a.metadata != null && <details className="text-xs text-gray-500"><summary className="cursor-pointer">Métadonnées</summary><pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px]">{JSON.stringify(a.metadata, null, 2)}</pre></details>}
                </div>
              )}
            </div>
          ))}
        </div>
        {q.data && <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.totalElements} noun="action" onChange={setPage} />}
      </Async>
    </div>
  );
};
