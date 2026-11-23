import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Plus } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, Pagination, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { useAuth } from "../../../contexts/AuthContext";
import { APPROVAL_STATUSES, approvalService } from "../../../services/approval.service";
import type { Circuit, HierarchyNode, LevelSpec } from "../../../services/approval.service";
import { CENTER_LABEL, LABEL, RequestRows, money } from "./approvalUtils";
import type { ApprovalCenter } from "./approvalUtils";

type Tab = "todo" | "mine" | "history" | "org" | "circuits" | "delegations";
const TABS: TabItem<Tab>[] = [
  { id: "todo", label: "À approuver" }, { id: "mine", label: "Mes demandes" }, { id: "history", label: "Historique" },
  { id: "org", label: "Organigramme" }, { id: "circuits", label: "Circuits" }, { id: "delegations", label: "Délégations" },
];

const Todo: React.FC<{ center: ApprovalCenter; basePath: string }> = ({ center: CENTER, basePath }) => {
  const q = useQuery({ queryKey: ["approval", CENTER, "todo"], queryFn: () => approvalService.toApprove(CENTER) });
  return <div className="space-y-4"><ListHeader title="À approuver" subtitle="Demandes qui attendent votre décision, à leur niveau courant ou en avance." /><RequestRows q={q} empty="Rien à approuver" waiting basePath={basePath} /></div>;
};
const Mine: React.FC<{ center: ApprovalCenter; basePath: string }> = ({ center: CENTER, basePath }) => {
  const q = useQuery({ queryKey: ["approval", CENTER, "mine"], queryFn: () => approvalService.mine(CENTER) });
  return <div className="space-y-4"><ListHeader title="Mes demandes" subtitle="Où en est chacune, qui doit agir et depuis quand." /><RequestRows q={q} empty="Aucune demande" waiting basePath={basePath} /></div>;
};

const History: React.FC<{ center: ApprovalCenter; basePath: string }> = ({ center: CENTER, basePath }) => {
  const [f, setF] = useState({ type: "", requester: "", approver: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["approval", CENTER, "history", f, page], queryFn: () => approvalService.history(CENTER, { ...f, page }) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPage(0); };
  return (
    <div className="space-y-4">
      <ListHeader title="Historique" subtitle="Sans le droit de gestion, seules vos demandes et vos décisions apparaissent." />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Type"><input className={FIELD} value={f.type} onChange={set("type")} /></Field>
        <Field label="Demandeur"><input className={FIELD} value={f.requester} onChange={set("requester")} /></Field>
        <Field label="Décideur"><input className={FIELD} value={f.approver} onChange={set("approver")} /></Field>
        <Field label="Statut"><select className={FIELD} value={f.status} onChange={set("status")}><option value="">Tous</option>{APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select></Field>
        <Field label="Du"><input type="date" className={FIELD} value={f.from} onChange={set("from")} /></Field>
        <Field label="Au"><input type="date" className={FIELD} value={f.to} onChange={set("to")} /></Field>
      </div>
      <RequestRows q={{ ...q, data: q.data?.content }} empty="Aucune demande" basePath={basePath} />
      {q.data && <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.totalElements} noun="demande" onChange={setPage} />}
    </div>
  );
};

const Org: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<HierarchyNode | null>(null);
  const q = useQuery({ queryKey: ["approval", "hierarchy"], queryFn: approvalService.hierarchy });
  return (
    <div className="space-y-4">
      <ListHeader title="Organigramme" subtitle="Chaque collaborateur et son supérieur direct (N+1). Même donnée que la fiche collaborateur." />
      {editing && (
        <ActionForm title={`Supérieur de ${editing.fullName ?? editing.userCode}`} onClose={() => setEditing(null)}
          fields={[{ key: "managerUserCode", label: "Code utilisateur du supérieur", hint: "Vide : retire le supérieur", def: editing.managerUserCode ?? "" }]}
          onSubmit={async (v) => { await approvalService.setManager(editing.userCode, v.managerUserCode as string | undefined); qc.invalidateQueries({ queryKey: ["approval", "hierarchy"] }); }} />
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucun collaborateur" /> : (
        <div className="space-y-1.5">
          {q.data!.map((n) => (
            <div key={n.userCode} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
              <span><b className="text-gray-900">{n.fullName ?? n.userCode}</b> <span className="text-gray-500">{[n.jobTitle, n.email].filter(Boolean).join(" · ")}</span></span>
              <span className="flex items-center gap-3 text-xs text-gray-500">{n.managerName ? `N+1 : ${n.managerName}` : "Pas de supérieur"}{canManage && <ActionButton variant="ghost" onClick={() => setEditing(n)}>Modifier</ActionButton>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BLANK_LEVEL: LevelSpec = { label: "", rule: "MANAGER", depth: 1 };
const Circuits: React.FC<{ canManage: boolean; center: ApprovalCenter }> = ({ canManage, center: CENTER }) => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Circuit | null>(null);
  const q = useQuery({ queryKey: ["approval", "circuits", CENTER], queryFn: () => approvalService.circuits(CENTER) });
  return (
    <div className="space-y-4">
      <ListHeader title="Circuits" subtitle={`Niveaux de validation du centre ${CENTER_LABEL[CENTER]}. Chaque niveau est requis à partir d'un montant.${CENTER === "CASH" ? " La caisse calcule aussi ses niveaux depuis ses paramètres." : ""}`} action={canManage ? <ActionButton icon={Plus} onClick={() => setEdit({ code: "", center: CENTER, requestType: "", label: "", active: true, levels: [{ ...BLANK_LEVEL }] })}>Nouveau circuit</ActionButton> : undefined} />
      {edit && <CircuitForm c={edit} onClose={() => setEdit(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["approval", "circuits"] })} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucun circuit pour ce centre" /> : q.data!.map((c) => (
        <div key={c.code} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-gray-900">{c.label} <span className="font-mono text-xs font-normal text-gray-400">{c.code} · {c.requestType}</span>{c.active === false && <span className="ml-2 text-xs text-gray-400">(inactif)</span>}</p>
            {canManage && <ActionButton variant="ghost" onClick={() => setEdit(structuredClone(c))}>Modifier</ActionButton>}
          </div>
          <ol className="mt-2 space-y-1 text-sm text-gray-600">
            {c.levels.map((l, i) => <li key={i}>{i + 1}. <b>{l.label}</b> — {l.rule === "MANAGER" ? `N+${l.depth ?? 1}` : l.rule === "PERMISSION" ? `droit ${l.permission}` : `personne ${l.userLogin}`}{l.permission && l.rule === "MANAGER" ? ` (droit ${l.permission})` : ""}{l.minAmount ? ` · à partir de ${money(l.minAmount)}` : ""}</li>)}
          </ol>
        </div>
      ))}
    </div>
  );
};

const CircuitForm: React.FC<{ c: Circuit; onClose: () => void; onSaved: () => void }> = ({ c, onClose, onSaved }) => {
  const [v, setV] = useState<Circuit>(c);
  const isNew = !c.code;
  const setLevel = (i: number, p: Partial<LevelSpec>) => setV({ ...v, levels: v.levels.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  const save = useMutation({
    mutationFn: () => approvalService.saveCircuit({ ...v, levels: v.levels.map((l) => Object.fromEntries(Object.entries(l).filter(([, x]) => x !== "" && x !== undefined && x !== null)) as unknown as LevelSpec) }),
    onSuccess: () => { toast.success("Circuit enregistré"); onSaved(); onClose(); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });
  const valid = v.code.trim() && v.requestType.trim() && v.label.trim() && v.levels.length > 0 && v.levels.every((l) => l.label.trim() && (l.rule !== "PERMISSION" || l.permission) && (l.rule !== "USER" || l.userLogin));
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{isNew ? "Nouveau circuit" : `Modifier ${c.code}`} <span className="font-normal text-gray-400">(remplace le circuit et ses niveaux)</span></p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Code" required><input className={FIELD} disabled={!isNew} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} /></Field>
        <Field label="Centre"><input className={FIELD} value={v.center} disabled /></Field>
        <Field label="Type de demande" required><input className={FIELD} value={v.requestType} onChange={(e) => setV({ ...v, requestType: e.target.value })} /></Field>
        <Field label="Libellé" required><input className={FIELD} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} /></Field>
      </div>
      {v.levels.map((l, i) => (
        <div key={i} className="grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-6">
          <Field label={`Niveau ${i + 1}`} required className="sm:col-span-2"><input className={FIELD} value={l.label} onChange={(e) => setLevel(i, { label: e.target.value })} /></Field>
          <Field label="Règle"><select className={FIELD} value={l.rule} onChange={(e) => setLevel(i, { rule: e.target.value as LevelSpec["rule"] })}><option value="MANAGER">Supérieur (N+x)</option><option value="PERMISSION">Droit</option><option value="USER">Personne</option></select></Field>
          {l.rule === "MANAGER" && <Field label="Profondeur"><input className={FIELD} inputMode="numeric" value={l.depth ?? ""} onChange={(e) => setLevel(i, { depth: Number(e.target.value) || undefined })} /></Field>}
          {(l.rule === "PERMISSION" || l.rule === "MANAGER") && <Field label="Droit" required={l.rule === "PERMISSION"}><input className={FIELD} value={l.permission ?? ""} onChange={(e) => setLevel(i, { permission: e.target.value })} /></Field>}
          {l.rule === "USER" && <Field label="Login" required><input className={FIELD} value={l.userLogin ?? ""} onChange={(e) => setLevel(i, { userLogin: e.target.value })} /></Field>}
          <Field label="Dès (montant)"><input className={FIELD} inputMode="decimal" value={l.minAmount ?? ""} onChange={(e) => setLevel(i, { minAmount: e.target.value ? Number(e.target.value.replace(",", ".")) : undefined })} /></Field>
          <div className="flex items-end"><ActionButton variant="ghost" disabled={v.levels.length < 2} onClick={() => setV({ ...v, levels: v.levels.filter((_, j) => j !== i) })}>Retirer</ActionButton></div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <ActionButton variant="ghost" icon={Plus} onClick={() => setV({ ...v, levels: [...v.levels, { ...BLANK_LEVEL }] })}>Ajouter un niveau</ActionButton>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={v.active !== false} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Actif</label>
        <span className="flex-1" />
        <ActionButton variant="ghost" onClick={onClose}>Annuler</ActionButton>
        <ActionButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Enregistrer</ActionButton>
      </div>
    </div>
  );
};

const Delegations: React.FC<{ center: ApprovalCenter }> = ({ center: CENTER }) => {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["approval", "delegations", CENTER], queryFn: () => approvalService.delegations(CENTER) });
  const del = useMutation({ mutationFn: (id: number) => approvalService.cancelDelegation(id), onSuccess: () => { toast.success("Délégation supprimée"); qc.invalidateQueries({ queryKey: ["approval", "delegations"] }); }, onError: (e) => toast.error(apiMessage(e, "Suppression impossible.")) });
  return (
    <div className="space-y-4">
      <ListHeader title="Délégations" subtitle="Absence, intérim : le délégué décide à la place du délégant. Sans centre ni niveau, il agit partout où le délégant est attendu." action={<ActionButton icon={Plus} onClick={() => setAdding(true)}>Déléguer</ActionButton>} />
      {adding && (
        <ActionForm title="Nouvelle délégation" submitLabel="Déléguer" onClose={() => setAdding(false)}
          fields={[{ key: "delegate", label: "Délégué (login)", required: true }, { key: "center", label: "Centre", def: CENTER, hint: "Vide : tous les centres" }, { key: "level", label: "Niveau", type: "number", hint: "Vide : tous" }, { key: "startsOn", label: "Du", type: "date", required: true }, { key: "endsOn", label: "Au", type: "date", required: true }, { key: "reason", label: "Motif" }]}
          onSubmit={async (v) => { await approvalService.delegate(v as { delegate: string; startsOn: string; endsOn: string }); qc.invalidateQueries({ queryKey: ["approval", "delegations"] }); }} />
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune délégation" /> : (
        <div className="space-y-1.5">
          {q.data!.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
              <span><b>{d.delegator}</b> → <b>{d.delegate}</b> · {d.center ?? "tous centres"}{d.level ? ` · niveau ${d.level}` : ""} · {formatDate(d.startsOn)} au {formatDate(d.endsOn)}{d.reason ? ` · ${d.reason}` : ""}</span>
              <ActionButton variant="ghost" pending={del.isPending} onClick={() => del.mutate(d.id)}>Retirer</ActionButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Centre d'approbation d'un centre donné : files, historique, organigramme, circuits, délégations. */
export const ApprovalCenterView: React.FC<{ center: ApprovalCenter; basePath: string }> = ({ center, basePath }) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("APPROVAL:MANAGE");
  const [tab, setTab] = useState<Tab>("todo");
  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-gray-900">Centre d'approbation</h2><p className="text-sm text-gray-500">{CENTER_LABEL[center]}</p></div>
      <Tabs items={TABS} active={tab} onChange={setTab} />
      {tab === "todo" && <Todo center={center} basePath={basePath} />}{tab === "mine" && <Mine center={center} basePath={basePath} />}{tab === "history" && <History center={center} basePath={basePath} />}
      {tab === "org" && <Org canManage={canManage} />}{tab === "circuits" && <Circuits canManage={canManage} center={center} />}{tab === "delegations" && <Delegations center={center} />}
    </div>
  );
};

export const ApprovalsPage: React.FC = () => (
  <AccountingShell>
    <ApprovalCenterView center="CASH" basePath="/accounting/approvals" />
  </AccountingShell>
);
