import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { treasuryService } from "../../../services/treasury.service";
import type { RegisterReconciliation } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { JOURNAL_TYPE_LABEL, money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Tag } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const KEY = "treasury-cash";

const Register: React.FC<{ r: RegisterReconciliation }> = ({ r }) => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [j, setJ] = useState({ label: "", type: "CASH" });
  const [err, setErr] = useState<string | null>(null);
  const journals = useQuery({ queryKey: [KEY, "journals", r.registerCode], queryFn: () => treasuryService.registerJournals(r.registerCode), enabled: open && hasPermission("CASH_MOVEMENT:CREATE") });
  const balances = useQuery({ queryKey: [KEY, "balances", r.registerCode], queryFn: () => treasuryService.registerBalances(r.registerCode), enabled: open && hasPermission("CASH:READ") });
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] });
  const create = useMutation({
    mutationFn: () => treasuryService.createRegisterJournal(r.registerCode, j),
    onSuccess: () => { refresh(); setCreating(false); setJ({ label: "", type: "CASH" }); toast.success("Journal créé"); },
    onError: (e) => setErr(apiMessage(e, "Création impossible.")),
  });
  const revoke = (code: string) =>
    toast.confirm({ tone: "danger", message: `Retirer le journal ${code} de cette caisse ?`, confirmLabel: "Retirer", successMessage: "Journal retiré", errorMessage: "Action impossible", onConfirm: async () => { await treasuryService.revokeRegisterJournal(r.registerCode, code); refresh(); } });
  const gap = r.difference ?? 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{r.registerName || r.registerCode}</p>
          <p className="text-xs text-gray-400">{r.registerCode} · compte {r.treasuryAccount} · journal {r.journalCode}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Compta <span className="font-mono font-bold">{money(r.accountingBalance)}</span></span>
          <span>Caisse <span className="font-mono font-bold">{money(r.operationalBalance)}</span></span>
          <span className={gap ? "font-bold text-amber-700" : "text-emerald-700"}>{gap ? `Écart ${money(gap)}` : "Concordant"}</span>
          {!!r.movementsNotPosted && <Tag tone="pink">{r.movementsNotPosted} non comptabilisé(s)</Tag>}
        </div>
      </button>
      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {(balances.data ?? []).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold">Soldes par devise</h4>
              <div className="flex flex-wrap gap-2">
                {balances.data!.map((b) => <Tag key={b.currency}>{b.currency} {money(b.balance)} → {money(b.baseEquivalent)}</Tag>)}
              </div>
            </div>
          )}
          {hasPermission("CASH_MOVEMENT:CREATE") && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold">Journaux autorisés</h4>
                {hasPermission("ACCOUNTING_JOURNAL:CREATE") && !creating && <ActionButton variant="ghost" onClick={() => setCreating(true)}>Nouveau journal</ActionButton>}
              </div>
              {creating && (
                <PanelForm title="Nouveau journal de caisse" onSubmit={(e) => { e.preventDefault(); setErr(null); create.mutate(); }} onCancel={() => setCreating(false)} pending={create.isPending} submitLabel="Créer" submitDisabled={!j.label.trim()} error={err}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Libellé" required><input className={FIELD} value={j.label} onChange={(e) => setJ({ ...j, label: e.target.value })} /></Field>
                    <Field label="Type">
                      <select className={FIELD} value={j.type} onChange={(e) => setJ({ ...j, type: e.target.value })}>
                        {Object.entries(JOURNAL_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Field>
                  </div>
                </PanelForm>
              )}
              {(journals.data ?? []).map((x) => (
                <div key={x.code} className="mb-1.5 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <span><span className="font-mono text-xs font-bold">{x.code}</span> · {x.label} · {JOURNAL_TYPE_LABEL[x.type] ?? x.type}</span>
                  {hasPermission("ACCOUNTING_JOURNAL:MANAGE") && <ActionButton variant="ghost" onClick={() => revoke(x.code)}>Retirer</ActionButton>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CashPanel: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const query = useQuery({ queryKey: [KEY, "reconciliation"], queryFn: treasuryService.cashReconciliation });
  const feed = useMutation({
    mutationFn: treasuryService.feedCash,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${r.succeeded ?? 0} mouvement(s) comptabilisé(s) sur ${r.processed ?? 0}`);
      (r.errors ?? []).slice(0, 3).forEach((m) => toast.error(m));
    },
    onError: (e) => toast.error(apiMessage(e, "Alimentation impossible.")),
  });
  return (
    <div className="space-y-5">
      <ListHeader
        title="Caisses"
        subtitle="Solde comptable face au solde de la caisse opérationnelle."
        action={hasPermission("ACCOUNTING_POSTING:REPLAY") ? <ActionButton pending={feed.isPending} onClick={() => feed.mutate()}>Comptabiliser les mouvements</ActionButton> : undefined}
      />
      {query.isLoading ? <ListSkeleton rows={3} /> : query.isError ? (
        <ErrorBlock message={apiMessage(query.error, "Caisses indisponibles.")} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune caisse" />
      ) : (
        <div className="space-y-3">{query.data!.map((r) => <Register key={r.registerCode} r={r} />)}</div>
      )}
    </div>
  );
};
