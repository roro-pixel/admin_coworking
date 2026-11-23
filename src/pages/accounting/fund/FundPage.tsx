import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Plus } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { useAuth } from "../../../contexts/AuthContext";
import { FUND_STATUSES, fundService } from "../../../services/fund.service";
import type { AdvanceRow } from "../../../services/fund.service";
import { RequestList, StatusBadge, money } from "./fundUtils";
import { NeedsPanel } from "./NeedsPanel";

type Tab = "mine" | "approve" | "disburse" | "advances" | "justif" | "needs" | "delegations" | "all";

const MinePanel: React.FC = () => {
  const q = useQuery({ queryKey: ["fund", "mine"], queryFn: fundService.mine });
  return (
    <div className="space-y-4">
      <ListHeader title="Mes demandes" subtitle="Dépenses, avances, remboursements. Soumettez une demande pour lancer sa validation." action={<Link to="/accounting/fund/new"><ActionButton icon={Plus}>Nouvelle demande</ActionButton></Link>} />
      <RequestList q={q} empty="Aucune demande" />
    </div>
  );
};
const ApprovePanel: React.FC = () => {
  const q = useQuery({ queryKey: ["fund", "approve"], queryFn: fundService.toApprove });
  return <div className="space-y-4"><ListHeader title="À valider" subtitle="Demandes que vous pouvez décider à leur niveau courant, ou en avance." /><RequestList q={q} empty="Rien à valider" extra={(r) => <span className="text-xs text-gray-400">niveau {r.currentLevel ?? "?"}/{r.requiredLevels ?? "?"}</span>} /></div>;
};
const DisbursePanel: React.FC = () => {
  const [reg, setReg] = useState("");
  const q = useQuery({ queryKey: ["fund", "disburse", reg], queryFn: () => fundService.toDisburse(reg) });
  return (
    <div className="space-y-4">
      <ListHeader title="À décaisser" subtitle="File de la caisse, triée par date souhaitée. Le décaissement se fait depuis une session de caisse ouverte." />
      <Field label="Caisse" hint="Code du registre (facultatif)"><input className={FIELD} value={reg} onChange={(e) => setReg(e.target.value)} /></Field>
      <RequestList q={q} empty="Rien à décaisser" extra={(r) => <span className="text-xs text-gray-400">reste {money(r.remainingToDisburse)}</span>} />
    </div>
  );
};
const JustifPanel: React.FC = () => {
  const q = useQuery({ queryKey: ["fund", "justif"], queryFn: fundService.justificationsToValidate });
  return <div className="space-y-4"><ListHeader title="Justifications à valider" subtitle="Avances dont des lignes de dépense attendent la validation du comptable." /><RequestList q={q} empty="Aucune justification en attente" /></div>;
};
const AllPanel: React.FC = () => {
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["fund", "all", status], queryFn: () => fundService.all(status) });
  return (
    <div className="space-y-4">
      <ListHeader title="Toutes les demandes" />
      <Field label="Statut"><select className={FIELD} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous</option>{FUND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
      <RequestList q={q} empty="Aucune demande" />
    </div>
  );
};

const AdvancesPanel: React.FC = () => {
  const q = useQuery({ queryKey: ["fund", "advances"], queryFn: fundService.advances });
  const rows: AdvanceRow[] = q.data ?? [];
  return (
    <div className="space-y-4">
      <ListHeader title="Avances ouvertes" subtitle="Suivi jusqu'au solde : justifié, rendu, reste à justifier et retard." />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState icon={Inbox} title="Aucune avance ouverte" /> : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500">{["Demande", "Bénéficiaire", "Décaissé", "Justifié", "Rendu", "Reste", "Échéance", "Retard", "Statut"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.number} className="border-t border-gray-100">
                  <td className="px-3 py-2"><Link className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]" to={`/accounting/fund/${encodeURIComponent(r.number)}`}>{r.number}</Link></td>
                  <td className="px-3 py-2">{r.beneficiaryName ?? r.beneficiaryCode}</td>
                  <td className="px-3 py-2 font-mono">{money(r.disbursed)}</td><td className="px-3 py-2 font-mono">{money(r.justified)}</td><td className="px-3 py-2 font-mono">{money(r.returned)}</td>
                  <td className="px-3 py-2 font-mono font-semibold">{money(r.remaining)}</td><td className="px-3 py-2">{formatDate(r.dueDate)}</td>
                  <td className={`px-3 py-2 font-semibold ${(r.daysOverdue ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}>{(r.daysOverdue ?? 0) > 0 ? `${r.daysOverdue} j` : "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DelegationsPanel: React.FC<{ canRead: boolean }> = ({ canRead }) => {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["fund", "delegations"], queryFn: fundService.delegations });
  const del = useMutation({ mutationFn: (id: number) => fundService.cancelDelegation(id), onSuccess: () => { toast.success("Délégation supprimée"); qc.invalidateQueries({ queryKey: ["fund", "delegations"] }); }, onError: (e) => toast.error(apiMessage(e, "Suppression impossible.")) });
  const legacy = useMutation({ mutationFn: fundService.importLegacy, onSuccess: (r) => toast.success(`Reprise terminée : ${Object.entries(r).map(([k, v]) => `${k} ${v}`).join(", ") || "rien à reprendre"}`), onError: (e) => toast.error(apiMessage(e, "Reprise impossible.")) });
  return (
    <div className="space-y-4">
      <ListHeader title="Délégations de validation" subtitle="Déléguez un niveau de validation à une personne pour une période (vous devez détenir ce niveau)." action={<ActionButton icon={Plus} onClick={() => setAdding(true)}>Déléguer</ActionButton>} />
      {adding && (
        <ActionForm title="Nouvelle délégation" submitLabel="Déléguer" onClose={() => setAdding(false)}
          fields={[{ key: "delegate", label: "Délégataire", required: true }, { key: "level", label: "Niveau (1, 2 ou 3)", type: "number", required: true }, { key: "startsOn", label: "Du", type: "date", required: true }, { key: "endsOn", label: "Au", type: "date", required: true }]}
          onSubmit={async (v) => { await fundService.delegate(v as { delegate: string; level: number; startsOn: string; endsOn: string }); qc.invalidateQueries({ queryKey: ["fund", "delegations"] }); }} />
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune délégation" /> : (
        <div className="space-y-1.5">
          {q.data!.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
              <span><b>{d.delegator}</b> → <b>{d.delegate}</b> · niveau {d.level} · {formatDate(d.startsOn)} au {formatDate(d.endsOn)}</span>
              <ActionButton variant="ghost" pending={del.isPending} onClick={() => del.mutate(d.id)}>Retirer</ActionButton>
            </div>
          ))}
        </div>
      )}
      {canRead && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Reprise de l'existant</p>
          <p className="mt-1 text-xs text-gray-500">Les anciennes demandes de caisse en attente deviennent des demandes en validation ; les avances exécutées deviennent des avances à justifier. Rejouable sans doublon.</p>
          <div className="mt-3"><ActionButton variant="ghost" pending={legacy.isPending} onClick={() => legacy.mutate()}>Lancer la reprise</ActionButton></div>
        </div>
      )}
    </div>
  );
};

export const FundPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const all: (TabItem<Tab> & { perm: string })[] = [
    { id: "mine", label: "Mes demandes", perm: "FUND_REQUEST:CREATE" },
    { id: "approve", label: "À valider", perm: "FUND_REQUEST:CREATE" },
    { id: "disburse", label: "À décaisser", perm: "FUND_REQUEST:DISBURSE" },
    { id: "advances", label: "Avances", perm: "FUND_REQUEST:READ" },
    { id: "justif", label: "Justifications", perm: "FUND_JUSTIFICATION:VALIDATE" },
    { id: "needs", label: "États de besoin", perm: "FUND_REQUEST:CREATE" },
    { id: "delegations", label: "Délégations", perm: "FUND_REQUEST:CREATE" },
    { id: "all", label: "Toutes", perm: "FUND_REQUEST:READ" },
  ];
  const tabs = all.filter((t) => hasPermission(t.perm)).map(({ perm, ...t }) => (void perm, t));
  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "mine");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Tabs items={tabs} active={tab} onChange={setTab} />
        {tab === "mine" && <MinePanel />}
        {tab === "approve" && <ApprovePanel />}
        {tab === "disburse" && <DisbursePanel />}
        {tab === "advances" && <AdvancesPanel />}
        {tab === "justif" && <JustifPanel />}
        {tab === "needs" && <NeedsPanel />}
        {tab === "delegations" && <DelegationsPanel canRead={hasPermission("FUND_REQUEST:READ")} />}
        {tab === "all" && <AllPanel />}
      </div>
    </AccountingShell>
  );
};
