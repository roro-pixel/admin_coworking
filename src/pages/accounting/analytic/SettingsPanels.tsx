import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { analyticService } from "../../../services/analytic.service";
import type { AllocKey, Rule } from "../../../services/analytic.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const def = (fields: FieldDef[], o?: object): FieldDef[] => fields.map((f) => ({ ...f, def: o ? (f.type === "bool" ? !!(o as unknown as Record<string, unknown>)[f.key] : String((o as unknown as Record<string, unknown>)[f.key] ?? "")) : f.type === "bool" && f.key === "active" ? true : f.def }));

const AXIS_FIELDS: FieldDef[] = [
  { key: "code", label: "Code", required: true }, { key: "label", label: "Libellé", required: true }, { key: "requiredOn", label: "Obligatoire sur", hint: "NONE, CHARGE, PRODUCT ou BOTH" },
  { key: "defaultSection", label: "Section par défaut", hint: "Sans section par défaut, un axe obligatoire impose la ventilation" }, { key: "sortOrder", label: "Ordre", type: "number" }, { key: "active", label: "Actif", type: "bool" },
];
const RULE_FIELDS: FieldDef[] = [
  { key: "priority", label: "Priorité", type: "number" }, { key: "axisCode", label: "Axe", required: true }, { key: "label", label: "Libellé" }, { key: "accountPrefix", label: "Préfixe de compte" }, { key: "journalCode", label: "Journal" },
  { key: "sourceType", label: "Type de fait" }, { key: "thirdParty", label: "Tiers" }, { key: "sectionCode", label: "Section cible" }, { key: "keyCode", label: "Clé de répartition cible" }, { key: "active", label: "Règle active", type: "bool" },
];

export const AxesPanel: React.FC = () => {
  const qc = useQueryClient();
  const canAdmin = useAuth().hasPermission("ANALYTIC_SETTINGS:MANAGE");
  const [form, setForm] = useState<string | "new" | null>(null);
  const q = useQuery({ queryKey: ["an-axes"], queryFn: analyticService.axes });
  const cur = q.data?.find((a) => a.code === form);
  return (
    <div className="space-y-4">
      <ListHeader title="Axes" subtitle="Axes de ventilation, obligation et section par défaut." action={canAdmin && !form ? <ActionButton onClick={() => setForm("new")}>Nouvel axe</ActionButton> : undefined} />
      {form && <ActionForm title={form === "new" ? "Nouvel axe" : `Modifier ${form}`} fields={def(AXIS_FIELDS, cur)} onSubmit={async (v) => { await analyticService.saveAxis(v); qc.invalidateQueries({ queryKey: ["an-axes"] }); toast.success("Axe enregistré"); }} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (
        <div className="space-y-2">
          {(q.data ?? []).map((a) => (
            <div key={a.code} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div><p className="text-sm font-semibold text-gray-900">{a.label} <span className="font-normal text-gray-400">· {a.code}</span></p><p className="text-xs text-gray-400">{[a.requiredOn && `obligatoire : ${a.requiredOn}`, a.defaultSection && `défaut ${a.defaultSection}`, `${a.sections ?? 0} section(s)`].filter(Boolean).join(" · ")}</p></div>
              <div className="flex items-center gap-2">{a.active === false && <StatusChip tone="neutral">Inactif</StatusChip>}{canAdmin && <ActionButton variant="ghost" onClick={() => setForm(a.code)}>Modifier</ActionButton>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RulesPanel: React.FC = () => {
  const qc = useQueryClient();
  const canAdmin = useAuth().hasPermission("ANALYTIC_SETTINGS:MANAGE");
  const [form, setForm] = useState<Rule | "new" | null>(null);
  const q = useQuery({ queryKey: ["an-rules"], queryFn: analyticService.rules });
  const refresh = () => qc.invalidateQueries({ queryKey: ["an-rules"] });
  const del = (r: Rule) => toast.confirm({ tone: "danger", message: `Supprimer la règle « ${r.label ?? r.id} » ?`, confirmLabel: "Supprimer", successMessage: "Règle supprimée", errorMessage: "Suppression impossible", onConfirm: async () => { await analyticService.deleteRule(r.id!); refresh(); } });
  return (
    <div className="space-y-4">
      <ListHeader title="Règles de ventilation" subtitle="Appliquées par priorité : préfixe de compte, journal, type de fait, tiers, vers une section ou une clé." action={canAdmin && !form ? <ActionButton onClick={() => setForm("new")}>Nouvelle règle</ActionButton> : undefined} />
      {form && <ActionForm title={form === "new" ? "Nouvelle règle" : "Modifier la règle"} fields={def(RULE_FIELDS, form === "new" ? undefined : form)} onSubmit={async (v) => { if (form === "new") await analyticService.createRule(v); else await analyticService.updateRule(form.id!, v); refresh(); toast.success("Règle enregistrée"); }} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune règle" /> : (
        <div className="space-y-2">
          {q.data!.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{r.label ?? `Règle ${r.id}`} <span className="font-normal text-gray-400">· priorité {r.priority}</span></p>
                <p className="truncate text-xs text-gray-400">{[r.axisCode, r.accountPrefix && `compte ${r.accountPrefix}*`, r.journalCode && `journal ${r.journalCode}`, r.sourceType, r.thirdParty && `tiers ${r.thirdParty}`, r.sectionCode ? `→ ${r.sectionCode}` : null, r.keyCode ? `→ clé ${r.keyCode}` : null].filter(Boolean).join(" · ")}</p></div>
              <div className="flex items-center gap-2">{r.active === false && <StatusChip tone="neutral">Inactive</StatusChip>}{canAdmin && <><ActionButton variant="ghost" onClick={() => setForm(r)}>Modifier</ActionButton><ActionButton variant="ghost" onClick={() => del(r)}>Supprimer</ActionButton></>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KeyForm: React.FC<{ initial?: AllocKey; onClose: () => void }> = ({ initial, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: initial?.code ?? "", label: initial?.label ?? "", axisCode: initial?.axisCode ?? "", effectiveFrom: initial?.effectiveFrom ?? "" });
  const [lines, setLines] = useState<{ sectionCode: string; percentage: string }[]>(initial?.lines?.map((l) => ({ sectionCode: l.sectionCode, percentage: String(l.percentage) })) ?? [{ sectionCode: "", percentage: "" }]);
  const [err, setErr] = useState<string | null>(null);
  const total = lines.reduce((a, l) => a + (Number(l.percentage.replace(",", ".")) || 0), 0);
  const save = useMutation({
    mutationFn: () => analyticService.saveKey({ ...f, lines: lines.filter((l) => l.sectionCode.trim()).map((l) => ({ sectionCode: l.sectionCode.trim(), percentage: Number(l.percentage.replace(",", ".")) })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["an-keys"] }); toast.success("Clé enregistrée"); onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  return (
    <PanelForm title={initial ? `Nouvelle version de ${initial.code}` : "Nouvelle clé de répartition"} onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.code || !f.axisCode || Math.round(total * 100) !== 10000} error={err}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Code" required><input className={FIELD} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Libellé"><input className={FIELD} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <Field label="Axe" required><input className={FIELD} value={f.axisCode} onChange={(e) => setF({ ...f, axisCode: e.target.value })} /></Field>
        <Field label="En vigueur depuis"><input type="date" className={FIELD} value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></Field>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem]">
          <input className={FIELD} placeholder="Section" value={l.sectionCode} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, sectionCode: e.target.value } : x)))} />
          <input className={FIELD} placeholder="Part %" inputMode="decimal" value={l.percentage} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, percentage: e.target.value } : x)))} />
        </div>
      ))}
      <div className="flex items-center justify-between"><ActionButton variant="ghost" onClick={() => setLines([...lines, { sectionCode: "", percentage: "" }])}>Ajouter une part</ActionButton><span className={`text-sm ${Math.round(total * 100) === 10000 ? "text-gray-500" : "text-red-600"}`}>Total {total.toLocaleString("fr-FR")} % (doit faire 100)</span></div>
    </PanelForm>
  );
};

export const KeysPanel: React.FC = () => {
  const canAdmin = useAuth().hasPermission("ANALYTIC_SETTINGS:MANAGE");
  const [form, setForm] = useState<AllocKey | "new" | null>(null);
  const q = useQuery({ queryKey: ["an-keys"], queryFn: analyticService.keys });
  return (
    <div className="space-y-4">
      <ListHeader title="Clés de répartition" subtitle="Versions datées, parts à 100 %. Le dernier reçoit l'arrondi." action={canAdmin && !form ? <ActionButton onClick={() => setForm("new")}>Nouvelle clé</ActionButton> : undefined} />
      {form && <KeyForm initial={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune clé" /> : (
        <div className="space-y-2">
          {q.data!.map((k, i) => (
            <div key={`${k.code}-${i}`} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-gray-900">{k.label ?? k.code} <span className="font-normal text-gray-400">· {k.code} · {k.axisCode} · depuis {formatDate(k.effectiveFrom)}</span></p>{canAdmin && <ActionButton variant="ghost" onClick={() => setForm(k)}>Nouvelle version</ActionButton>}</div>
              <p className="text-xs text-gray-500">{(k.lines ?? []).map((l) => `${l.sectionCode} ${l.percentage} %`).join(" · ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DistributionPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("ANALYTIC_SETTINGS:MANAGE");
  const canReclass = hasPermission("ANALYTIC:RECLASS");
  const [p, setP] = useState({ periodCode: "", axisCode: "", keyCode: "" });
  const [out, setOut] = useState<unknown>(null);
  const [ref, setRef] = useState("");
  const [lookup, setLookup] = useState("");
  const [reclass, setReclass] = useState(false);
  const run = useMutation({ mutationFn: () => analyticService.distribute(p), onSuccess: (r) => { setOut(r); toast.success("Répartition passée"); }, onError: (e) => toast.error(apiMessage(e, "Répartition impossible.")) });
  const alloc = useQuery({ queryKey: ["an-alloc", lookup], queryFn: () => analyticService.allocations(lookup), enabled: !!lookup });
  return (
    <div className="space-y-6">
      {canAdmin && (
        <Section title="Répartition secondaire d'une période">
          <p className="mb-2 text-xs text-gray-500">Déverse les charges des sections auxiliaires sur les autres sections selon une clé. Rejouable : remplace la précédente de la période.</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Période" required><input className={FIELD} value={p.periodCode} onChange={(e) => setP({ ...p, periodCode: e.target.value })} /></Field>
            <Field label="Axe" required><input className={FIELD} value={p.axisCode} onChange={(e) => setP({ ...p, axisCode: e.target.value })} /></Field>
            <Field label="Clé" required><input className={FIELD} value={p.keyCode} onChange={(e) => setP({ ...p, keyCode: e.target.value })} /></Field>
            <ActionButton pending={run.isPending} disabled={!p.periodCode || !p.axisCode || !p.keyCode} onClick={() => run.mutate()}>Passer la répartition</ActionButton>
          </div>
          {out !== null && <div className="mt-3"><GenericResult data={out} /></div>}
        </Section>
      )}
      <Section title="Ventilation d'une écriture">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setLookup(ref.trim()); }}>
          <Field label="N° d'écriture"><input className={FIELD} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <ActionButton type="submit" disabled={!ref.trim()}>Voir</ActionButton>
          {canReclass && <ActionButton variant="ghost" onClick={() => setReclass(true)}>Reclasser</ActionButton>}
        </form>
        {lookup && <div className="mt-3">{alloc.isLoading ? <ListSkeleton /> : alloc.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => alloc.refetch()} /> : (alloc.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune ventilation" /> : alloc.data!.map((a, i) => <p key={i} className="flex justify-between text-sm"><span>ligne {a.entryLineId} · {a.axisCode} · {a.sectionCode} · {a.percentage} % · {a.origin}</span><span className="font-mono">{money(a.amount)}</span></p>)}</div>}
        {reclass && (
          <div className="mt-3">
            <ActionForm title="Reclasser une ventilation" submitLabel="Reclasser" onClose={() => setReclass(false)}
              fields={[{ key: "entryLineId", label: "ID de la ligne d'écriture", type: "number", required: true }, { key: "axisCode", label: "Axe", required: true }, { key: "fromSection", label: "De la section", required: true }, { key: "toSection", label: "Vers la section", required: true }, { key: "amount", label: "Montant", type: "number", hint: "Tout si vide" }, { key: "reason", label: "Motif", required: true }]}
              onSubmit={async (v) => { await analyticService.reclass(v as never); toast.success("Ventilation reclassée"); if (lookup) alloc.refetch(); }} />
          </div>
        )}
      </Section>
    </div>
  );
};
