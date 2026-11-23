import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ActionButton, CheckField, Field, ListHeader } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { GenericResult } from "./GenericResult";
import { accountingCall } from "../../services/accountingCall.service";
import type { HttpMethod } from "../../services/accountingCall.service";
import { useAuth } from "../../contexts/AuthContext";
import { saveBlob } from "../payment/paymentUtils";
import { toast } from "../ui/toastStore";

export interface EpField {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "bool" | "textarea" | "list" | "json" | "file";
  in?: "query" | "body"; // défaut : query pour GET / DELETE, body sinon (les {param} du chemin sont détectés)
  required?: boolean;
  hint?: string;
  def?: string | boolean;
}
export interface Endpoint {
  id: string;
  label: string;
  method: HttpMethod;
  path: string; // relatif à /sni/api/v1, avec {param} éventuels
  perm?: string;
  fields?: EpField[];
  group?: string;
  blob?: string; // nom du fichier téléchargé (PDF / CSV)
  confirm?: string;
  help?: string;
  auto?: boolean; // lancé à l'ouverture (lecture sans paramètre obligatoire)
}

const pathKeys = (p: string) => Array.from(p.matchAll(/\{(\w+)\}/g)).map((m) => m[1]);

const Runner: React.FC<{ ep: Endpoint }> = ({ ep }) => {
  const fields = ep.fields ?? [];
  const init = () => Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "bool" ? false : "")])) as Record<string, string | boolean>;
  const [v, setV] = useState<Record<string, string | boolean>>(init);
  const [file, setFile] = useState<File | null>(null);
  const pk = pathKeys(ep.path);
  const isRead = ep.method === "GET";

  const run = useMutation({
    mutationFn: async () => {
      let path = ep.path;
      const query: Record<string, unknown> = {};
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.type === "file") continue;
        const raw = v[f.key];
        let val: unknown;
        if (f.type === "bool") val = !!raw;
        else {
          const s = String(raw ?? "").trim();
          if (!s) continue;
          val = f.type === "number" ? Number(s.replace(",", ".")) : f.type === "list" ? s.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean) : f.type === "json" ? JSON.parse(s) : s;
        }
        if (f.key === "$body") Object.assign(body, val as object);
        else if (pk.includes(f.key)) path = path.replace(`{${f.key}}`, encodeURIComponent(String(val)));
        else if ((f.in ?? (isRead || ep.method === "DELETE" ? "query" : "body")) === "query") query[f.key] = val;
        else body[f.key] = val;
      }
      const hasFile = fields.some((f) => f.type === "file");
      const fmt = String(v.format ?? "").trim().toLowerCase();
      const asFile = !!ep.blob || (fields.some((f) => f.key === "format") && !!fmt && fmt !== "json");
      const res = await accountingCall({ method: ep.method, path, query, body: Object.keys(body).length ? body : undefined, file: hasFile ? file : undefined, blob: asFile });
      if (asFile) {
        const ext = ["csv", "pdf", "xls", "xlsx", "zip"].includes(fmt) ? fmt : "txt";
        const name = ep.blob ?? `${ep.path.split("/").filter((x) => !x.startsWith("{")).pop() ?? "export"}.${ext}`;
        saveBlob(res as Blob, name);
        return { fichier: name, statut: "téléchargé" };
      }
      return res;
    },
    onSuccess: () => { if (!isRead) toast.success("Action effectuée."); },
    onError: (e) => toast.error(e instanceof SyntaxError ? "JSON invalide." : apiMessage(e, "Action impossible.")),
  });

  const missing = fields.some((f) => f.required && (f.type === "file" ? !file : f.type !== "bool" && !String(v[f.key] ?? "").trim()));
  const { mutate } = run;
  useEffect(() => { if (ep.auto && !missing) mutate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ep.id]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{ep.label} <span className="ml-1 font-mono text-[11px] font-normal text-gray-400">{ep.method} {ep.path}</span></p>
        {ep.help && <p className="mt-1 text-xs text-gray-500">{ep.help}</p>}
        {fields.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {fields.filter((f) => f.type !== "bool").map((f) => (
              <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
                {f.type === "file" ? (
                  <input type="file" className={FIELD} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                ) : f.type === "textarea" || f.type === "json" ? (
                  <textarea className={`${FIELD} ${f.type === "json" ? "font-mono text-xs" : ""}`} rows={f.type === "json" ? 4 : 2} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                ) : (
                  <input className={FIELD} type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        )}
        {fields.filter((f) => f.type === "bool").map((f) => <CheckField key={f.key} checked={!!v[f.key]} onChange={(c) => setV({ ...v, [f.key]: c })} label={f.label} />)}
        <div className="mt-3">
          <ActionButton
            pending={run.isPending}
            disabled={missing}
            onClick={() => { if (ep.confirm && !window.confirm(ep.confirm)) return; run.mutate(); }}
          >
            {isRead ? (ep.blob ? "Télécharger" : "Afficher") : ep.blob ? "Télécharger" : "Exécuter"}
          </ActionButton>
        </div>
      </div>
      {run.data !== undefined && <GenericResult data={run.data} />}
    </div>
  );
};

/** Console de routes : liste d'opérations (lectures et actions) avec formulaire généré et résultat affiché. Les droits masquent les opérations non permises. */
export const EndpointConsole: React.FC<{ title: string; subtitle?: string; endpoints: Endpoint[] }> = ({ title, subtitle, endpoints }) => {
  const { hasPermission } = useAuth();
  const allowed = useMemo(() => endpoints.filter((e) => !e.perm || hasPermission(e.perm)), [endpoints, hasPermission]);
  const [sel, setSel] = useState<string | null>(allowed[0]?.id ?? null);
  const groups = useMemo(() => {
    const m = new Map<string, Endpoint[]>();
    for (const e of allowed) m.set(e.group ?? "Opérations", [...(m.get(e.group ?? "Opérations") ?? []), e]);
    return Array.from(m.entries());
  }, [allowed]);
  const cur = allowed.find((e) => e.id === sel) ?? allowed[0];
  return (
    <div className="space-y-4">
      <ListHeader title={title} subtitle={subtitle} />
      {allowed.length === 0 ? <p className="text-sm text-gray-500">Aucune opération autorisée avec vos droits.</p> : (
        <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
          <nav className="space-y-3">
            {groups.map(([g, list]) => (
              <div key={g}>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g}</p>
                <div className="space-y-1">
                  {list.map((e) => (
                    <button key={e.id} type="button" onClick={() => setSel(e.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${cur?.id === e.id ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"}`}>
                      <span>{e.label}</span>
                      <span className={`text-[10px] font-semibold ${cur?.id === e.id ? "text-white/80" : e.method === "GET" ? "text-emerald-600" : "text-amber-600"}`}>{e.method}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {cur && <Runner key={cur.id} ep={cur} />}
        </div>
      )}
    </div>
  );
};
