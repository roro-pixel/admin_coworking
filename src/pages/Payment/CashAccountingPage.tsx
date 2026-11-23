import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashJournal } from "../../services/cashRegister.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, Section, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { RegisterSelect } from "../../components/cash/cashPickers";
import { JOURNAL_TYPE } from "../../components/cash/cashLabels";

type View = "reconciliation" | "journals";
const fmt = (n?: number | null) => (n == null ? "—" : formatMoney(n, "FCFA"));

// ───────────────────────── Rapprochement ─────────────────────────

const Reconciliation: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const canRead = hasPermission("ACCOUNTING_REPORT:READ");
  const canReplay = hasPermission("ACCOUNTING_POSTING:REPLAY");
  const q = useQuery({ queryKey: ["cash-reconciliation"], queryFn: () => cashRegisterService.getCashReconciliation(), enabled: canRead });
  const feed = useMutation({
    mutationFn: () => cashRegisterService.feedCashAccounting(),
    onSuccess: (r) => {
      toast.success(`${r.succeeded ?? 0} comptabilisé(s) sur ${r.processed ?? 0}${r.failed ? `, ${r.failed} en échec` : ""}`);
      if (r.errors?.length) toast.error(r.errors.slice(0, 3).join(" · "));
      queryClient.invalidateQueries({ queryKey: ["cash-reconciliation"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Rejeu impossible")),
  });
  if (!canRead) return <EmptyState icon={BookOpen} title="Droit manquant" hint="Il faut ACCOUNTING_REPORT:READ." />;
  const rows = q.data ?? [];
  const pendingTotal = rows.reduce((t, r) => t + Number(r.movementsNotPosted ?? 0), 0);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Rapprochement caisse et comptabilité"
        subtitle="Le solde de chaque caisse comparé au solde de son compte de trésorerie."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />
            {canReplay && isAdmin() && (
              <ActionButton icon={RefreshCw} pending={feed.isPending} onClick={() => toast.confirm({ message: "Comptabiliser les mouvements en attente ?", detail: `${pendingTotal.toLocaleString("fr-FR")} mouvement(s) non comptabilisé(s) sont rejoués.`, confirmLabel: "Rejouer", pendingLabel: "Comptabilisation", onConfirm: () => feed.mutateAsync() })}>
                Rejouer la comptabilisation
              </ActionButton>
            )}
          </div>
        }
      />
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorBlock message="Le rapprochement n'a pas pu être chargé." onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucune caisse à rapprocher" />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {rows.map((r) => {
              const gap = Number(r.difference ?? 0);
              return (
                <div key={r.registerCode} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                      {r.registerName || r.registerCode} <span className="font-mono text-xs font-normal text-gray-400">{r.registerCode}</span>
                      <StatusChip tone={gap === 0 ? "success" : "danger"}>{gap === 0 ? "Rapprochée" : "Écart"}</StatusChip>
                      {Number(r.movementsNotPosted ?? 0) > 0 && <StatusChip tone="warn">{Number(r.movementsNotPosted)} non comptabilisé(s)</StatusChip>}
                    </p>
                    <p className="text-xs text-gray-500">
                      Compte {r.treasuryAccount || "—"} · journal {r.journalCode || "—"}
                      {r.operationalSource ? ` · source : ${r.operationalSource}` : ""}
                    </p>
                  </div>
                  <dl className="grid shrink-0 grid-cols-3 gap-6 text-right text-sm">
                    <div>
                      <dt className="text-xs text-gray-400">Comptabilité</dt>
                      <dd className="font-semibold tabular-nums">{fmt(r.accountingBalance)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Caisse</dt>
                      <dd className="font-semibold tabular-nums">{fmt(r.operationalBalance)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Écart</dt>
                      <dd className={`font-bold tabular-nums ${gap === 0 ? "text-gray-950" : "text-red-600"}`}>{fmt(gap)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Journaux ─────────────────────────

const Journals: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canList = hasPermission("CASH_MOVEMENT:CREATE");
  const canCreate = hasPermission("ACCOUNTING_JOURNAL:CREATE");
  const canManage = hasPermission("ACCOUNTING_JOURNAL:MANAGE");
  const [registerCode, setRegisterCode] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ label: "", type: "CASH" });
  const [error, setError] = useState<string | null>(null);

  const key = ["cash-journals", registerCode];
  const q = useQuery({ queryKey: key, queryFn: () => cashRegisterService.getCashJournals(registerCode), enabled: !!registerCode && canList });
  const create = useMutation({
    mutationFn: () => cashRegisterService.createCashJournal(registerCode, { label: f.label.trim(), type: f.type }),
    onSuccess: () => {
      toast.success("Journal créé");
      setOpen(false);
      setF({ label: "", type: "CASH" });
      setError(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const toggleActive = useMutation({
    mutationFn: (j: CashJournal) => cashRegisterService.updateCashJournal(registerCode, j.code, { ...j, active: !(j.active !== false) }),
    onSuccess: (list) => {
      queryClient.setQueryData(key, list);
      toast.success("Journal mis à jour");
    },
    onError: (e) => toast.error(apiMessage(e, "Modification impossible")),
  });
  const remove = useMutation({
    mutationFn: (code: string) => cashRegisterService.deleteCashJournal(registerCode, code),
    onSuccess: (list) => {
      queryClient.setQueryData(key, list);
      toast.success("Journal supprimé");
    },
    onError: (e) => toast.error(apiMessage(e, "Suppression impossible")),
  });

  const journals = q.data ?? [];
  return (
    <div className="space-y-4">
      <ListHeader
        title="Journaux comptables de la caisse"
        subtitle="Les écritures des mouvements d'une caisse partent dans ses journaux."
        action={canCreate && registerCode ? <ActionButton icon={Plus} onClick={() => { setOpen(true); setError(null); }}>Nouveau journal</ActionButton> : undefined}
      />
      <div className="max-w-md">
        <RegisterSelect label="Caisse" value={registerCode} onChange={setRegisterCode} />
      </div>
      {open && (
        <PanelForm title="Nouveau journal" onSubmit={(e) => { e.preventDefault(); create.mutate(); }} onCancel={() => setOpen(false)} pending={create.isPending} submitLabel="Créer" submitDisabled={!f.label.trim()} error={error}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Libellé" required>
              <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Type" required>
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={FIELD_SOFT}>
                {Object.entries(JOURNAL_TYPE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </PanelForm>
      )}
      {!registerCode ? (
        <EmptyState icon={BookOpen} title="Choisissez une caisse" />
      ) : !canList ? (
        <EmptyState icon={BookOpen} title="Droit manquant" hint="Il faut CASH_MOVEMENT:CREATE pour lister les journaux." />
      ) : q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorBlock message="Les journaux n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : journals.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun journal" hint="Cette caisse n'a pas encore de journal." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {journals.map((j) => (
              <div key={j.code} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                    <span className="font-mono text-xs text-[color:var(--logo-pink-dark)]">{j.code}</span>
                    {j.label}
                    <StatusChip tone={j.active === false ? "neutral" : "success"}>{j.active === false ? "Inactif" : "Actif"}</StatusChip>
                  </p>
                  <p className="text-xs text-gray-500">
                    {JOURNAL_TYPE[j.type] ?? j.type}
                    {j.treasuryAccountNumber ? ` · compte ${j.treasuryAccountNumber}` : ""}
                    {j.numberingReset ? ` · numérotation par ${j.numberingReset === "YEAR" ? "année" : "période"}` : ""}
                    {j.autoValidate ? " · validation automatique" : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionButton variant="ghost" pending={toggleActive.isPending && toggleActive.variables?.code === j.code} onClick={() => toggleActive.mutate(j)}>
                      {j.active === false ? "Réactiver" : "Désactiver"}
                    </ActionButton>
                    <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => toast.confirm({ message: `Supprimer le journal ${j.code} ?`, detail: "Un journal déjà utilisé par des écritures peut être refusé.", confirmLabel: "Supprimer", pendingLabel: "Suppression", tone: "danger", onConfirm: () => remove.mutateAsync(j.code) })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DataCard>
      )}
      <Section title="À vérifier">
        <p className="text-sm text-gray-600">Le corps de la modification d'un journal n'est pas documenté : l'activation/désactivation renvoie le journal complet.</p>
      </Section>
    </div>
  );
};

export const CashAccountingPage: React.FC = () => {
  const [view, setView] = useState<View>("reconciliation");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={[{ id: "reconciliation" as View, label: "Rapprochement" }, { id: "journals" as View, label: "Journaux" }]} active={view} onChange={setView} />
      {view === "reconciliation" && <Reconciliation />}
      {view === "journals" && <Journals />}
    </div>
  );
};
