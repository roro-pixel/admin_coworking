import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { accountingService } from "../../services/accounting.service";
import type { Account, CreateAccountInput, ThirdPartyType, TreasuryType } from "../../services/accounting.service";
import { useAuth } from "../../contexts/AuthContext";
import { AccountingShell } from "../../components/accounting/AccountingShell";
import {
  ACCOUNT_STATUS,
  CLASS_LABEL,
  NATURE_LABEL,
  SIDE_LABEL,
  THIRD_PARTY_LABEL,
  TREASURY_LABEL,
} from "../../components/accounting/accountingLabels";
import { statusOf } from "../../components/subscription/labels";
import {
  ActionButton,
  CheckField,
  DataCard,
  Detail,
  EmptyState,
  ErrorBlock,
  Field,
  ListHeader,
  PanelForm,
  SearchField,
  Section,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";

const KEY = "accounting-accounts";

type Panel = { mode: "create" } | { mode: "edit"; account: Account } | { mode: "detail"; account: Account } | null;

const emptyForm = {
  parentNumber: "",
  number: "",
  label: "",
  reconcilable: false,
  thirdPartyType: "" as ThirdPartyType | "",
  treasuryType: "" as TreasuryType | "",
  analyticRequired: false,
  taxCode: "",
  statementLineCode: "",
  reason: "",
};

const AccountForm: React.FC<{ panel: Exclude<Panel, null | { mode: "detail" }>; onClose: () => void }> = ({ panel, onClose }) => {
  const qc = useQueryClient();
  const editing = panel.mode === "edit" ? panel.account : null;
  const [f, setF] = useState(
    editing
      ? {
          ...emptyForm,
          label: editing.label,
          reconcilable: !!editing.reconcilable,
          thirdPartyType: (editing.thirdPartyType ?? "") as ThirdPartyType | "",
          treasuryType: (editing.treasuryType ?? "") as TreasuryType | "",
          analyticRequired: !!editing.analyticRequired,
          taxCode: editing.taxCode ?? "",
          statementLineCode: editing.statementLineCode ?? "",
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  // Numéro proposé par le serveur quand on choisit un compte parent.
  const proposal = useQuery({
    queryKey: [KEY, "proposal", f.parentNumber],
    queryFn: () => accountingService.accountProposal(f.parentNumber),
    enabled: !editing && f.parentNumber.trim().length > 0,
    retry: false,
  });

  const save = useMutation({
    mutationFn: () => {
      const common = {
        reconcilable: f.reconcilable,
        thirdPartyType: f.thirdPartyType || null,
        treasuryType: f.treasuryType || null,
        analyticRequired: f.analyticRequired,
        taxCode: f.taxCode,
        statementLineCode: f.statementLineCode,
        reason: f.reason,
      };
      if (editing) return accountingService.updateAccount(editing.number, { ...common, label: f.label });
      const input: CreateAccountInput = { ...common, label: f.label, parentNumber: f.parentNumber, number: f.number };
      return accountingService.createAccount(input);
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        a?.status === "PENDING_APPROVAL" ? "Compte créé, en attente d'approbation" : editing ? "Compte modifié" : "Compte créé",
      );
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible.")),
  });

  const p = proposal.data;
  return (
    <PanelForm
      title={editing ? `Modifier le compte ${editing.number}` : "Nouveau compte"}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
      onCancel={onClose}
      pending={save.isPending}
      submitLabel={editing ? "Enregistrer" : "Créer le compte"}
      submitDisabled={!f.label.trim() || (!editing && !f.parentNumber.trim() && !f.number.trim())}
      error={error}
    >
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Compte parent" hint="Ex. 411 pour créer un sous-compte client">
            <input className={FIELD} value={f.parentNumber} onChange={(e) => set("parentNumber", e.target.value)} />
          </Field>
          <Field
            label="Numéro"
            hint={p?.proposedNumber ? `Proposé : ${p.proposedNumber}` : "Laissez vide pour accepter la proposition"}
          >
            <input className={FIELD} value={f.number} placeholder={p?.proposedNumber ?? ""} onChange={(e) => set("number", e.target.value)} />
          </Field>
          {p?.needsApproval && (
            <p className="sm:col-span-2 text-xs font-semibold text-amber-700">
              Ce compte devra être approuvé avant d'être utilisable.
            </p>
          )}
        </div>
      )}
      <Field label="Libellé" required>
        <input className={FIELD} value={f.label} onChange={(e) => set("label", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de tiers">
          <select className={FIELD} value={f.thirdPartyType} onChange={(e) => set("thirdPartyType", e.target.value as ThirdPartyType | "")}>
            <option value="">Aucun</option>
            {Object.entries(THIRD_PARTY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Type de trésorerie">
          <select className={FIELD} value={f.treasuryType} onChange={(e) => set("treasuryType", e.target.value as TreasuryType | "")}>
            <option value="">Aucun</option>
            {Object.entries(TREASURY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Code taxe">
          <input className={FIELD} value={f.taxCode} onChange={(e) => set("taxCode", e.target.value)} />
        </Field>
        <Field label="Ligne d'état financier">
          <input className={FIELD} value={f.statementLineCode} onChange={(e) => set("statementLineCode", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckField checked={f.reconcilable} onChange={(v) => set("reconcilable", v)} label="Lettrable" />
        <CheckField checked={f.analyticRequired} onChange={(v) => set("analyticRequired", v)} label="Analytique obligatoire" />
      </div>
      <Field label="Motif" hint="Conservé dans l'historique du compte">
        <input className={FIELD} value={f.reason} onChange={(e) => set("reason", e.target.value)} />
      </Field>
    </PanelForm>
  );
};

const AccountDetail: React.FC<{
  account: Account;
  canCreate: boolean;
  canManage: boolean;
  onEdit: () => void;
  onClose: () => void;
}> = ({ account, canCreate, canManage, onEdit, onClose }) => {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const history = useQuery({ queryKey: [KEY, "history", account.number], queryFn: () => accountingService.accountHistory(account.number) });
  const parties = useQuery({
    queryKey: [KEY, "parties", account.number],
    queryFn: () => accountingService.accountThirdParties(account.number),
    enabled: !!account.thirdPartyType,
  });
  const st = statusOf(ACCOUNT_STATUS, account.status);
  const active = account.status === "ACTIVE";

  const toggle = useMutation({
    mutationFn: () => (active ? accountingService.deactivateAccount(account.number, reason) : accountingService.activateAccount(account.number)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(active ? "Compte désactivé" : "Compte activé");
      onClose();
    },
    onError: (e) => toast.error(apiMessage(e, "Action impossible.")),
  });

  return (
    <Section
      title={`${account.number} · ${account.label}`}
      icon={BookOpen}
      action={
        <div className="flex gap-2">
          {canCreate && <ActionButton variant="ghost" onClick={onEdit}>Modifier</ActionButton>}
          <ActionButton variant="ghost" onClick={onClose}>Fermer</ActionButton>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Detail label="Statut"><StatusChip tone={st.tone}>{st.label}</StatusChip></Detail>
        <Detail label="Classe">{account.classCode && (CLASS_LABEL[account.classCode] ?? account.classCode)}</Detail>
        <Detail label="Nature">{account.nature && NATURE_LABEL[account.nature]}</Detail>
        <Detail label="Sens normal">{account.normalSide && SIDE_LABEL[account.normalSide]}</Detail>
        <Detail label="Compte parent" mono>{account.parentNumber}</Detail>
        <Detail label="Sous-comptes">{account.childCount ? String(account.childCount) : undefined}</Detail>
        <Detail label="Type de tiers">{account.thirdPartyType && THIRD_PARTY_LABEL[account.thirdPartyType]}</Detail>
        <Detail label="Trésorerie">{account.treasuryType && TREASURY_LABEL[account.treasuryType]}</Detail>
        <Detail label="Code taxe">{account.taxCode}</Detail>
        <Detail label="Ligne d'état">{account.statementLineCode}</Detail>
        <Detail label="Fusionné dans" mono>{account.mergedInto}</Detail>
        <Detail label="Créé par">{account.createdBy && `${account.createdBy} · ${formatDateTime(account.createdAt)}`}</Detail>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {account.reconcilable && <Tag>Lettrable</Tag>}
        {account.analyticRequired && <Tag>Analytique obligatoire</Tag>}
        {account.hasPostings && <Tag tone="pink">Mouvementé</Tag>}
      </div>

      {canManage && (account.status === "ACTIVE" || account.status === "INACTIVE") && (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          {active && (
            <Field label="Motif de désactivation" className="min-w-[14rem] flex-1">
              <input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
          <ActionButton variant={active ? "danger" : "primary"} pending={toggle.isPending} onClick={() => toggle.mutate()}>
            {active ? "Désactiver" : "Réactiver"}
          </ActionButton>
        </div>
      )}

      {parties.data && parties.data.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-bold text-gray-900">Tiers rattachés</h4>
          <div className="space-y-1.5">
            {parties.data.map((p) => (
              <div key={`${p.partyType}-${p.partyCode}`} className="flex justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                <span className="font-mono text-xs">{p.partyCode}</span>
                <span className="text-gray-600">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-bold text-gray-900">Historique</h4>
        {history.isLoading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (history.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Aucune modification.</p>
        ) : (
          <div className="space-y-1.5">
            {history.data!.map((h, i) => (
              <div key={i} className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                <p className="font-semibold text-gray-800">
                  {h.field} : <span className="text-gray-400 line-through">{h.oldValue || "—"}</span> → {h.newValue || "—"}
                </p>
                <p className="text-xs text-gray-400">
                  {h.changedBy} · {formatDateTime(h.changedAt)}
                  {h.reason ? ` · ${h.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
};

export const AccountsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("ACCOUNTING_ACCOUNT:CREATE");
  const canManage = hasPermission("ACCOUNTING_ACCOUNT:MANAGE");
  const [q, setQ] = useState("");
  const [classCode, setClassCode] = useState("");
  const [inactive, setInactive] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);

  const query = useQuery({
    queryKey: [KEY, q, classCode, inactive],
    queryFn: () => accountingService.accounts({ search: q.trim(), classCode, includeInactive: inactive }),
  });

  const rows = useMemo(() => [...(query.data ?? [])].sort((a, b) => a.number.localeCompare(b.number, "fr", { numeric: true })), [query.data]);

  return (
    <AccountingShell>
      <div className="space-y-5">
        <ListHeader
          title="Plan de comptes"
          subtitle="Référentiel SYSCOHADA révisé. Un compte mouvementé ne se supprime pas : on le désactive."
          action={
            canCreate && !panel ? (
              <ActionButton icon={Plus} onClick={() => setPanel({ mode: "create" })}>Nouveau compte</ActionButton>
            ) : undefined
          }
        />

        {panel && panel.mode !== "detail" && <AccountForm key={panel.mode === "edit" ? panel.account.number : "new"} panel={panel} onClose={() => setPanel(null)} />}
        {panel?.mode === "detail" && (
          <AccountDetail
            key={panel.account.number}
            account={panel.account}
            canCreate={canCreate}
            canManage={canManage}
            onEdit={() => setPanel({ mode: "edit", account: panel.account })}
            onClose={() => setPanel(null)}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SearchField className="min-w-[16rem] flex-1" value={q} onChange={setQ} placeholder="Numéro ou libellé" />
          <select className={`${FIELD} w-auto`} value={classCode} onChange={(e) => setClassCode(e.target.value)} aria-label="Classe">
            <option value="">Toutes les classes</option>
            {Object.entries(CLASS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <CheckField checked={inactive} onChange={setInactive} label="Inclure les inactifs" />
        </div>

        {query.isLoading ? (
          <ListSkeleton rows={8} />
        ) : query.isError ? (
          <ErrorBlock message={apiMessage(query.error, "Plan de comptes indisponible.")} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucun compte" hint={q || classCode ? "Aucun résultat pour ces critères." : undefined} />
        ) : (
          <DataCard>
            <div className="space-y-1">
              {rows.map((a) => {
                const st = statusOf(ACCOUNT_STATUS, a.status);
                return (
                  <button
                    key={a.number}
                    type="button"
                    onClick={() => setPanel({ mode: "detail", account: a })}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition ${ROW_HOVER}`}
                  >
                    <div className="min-w-0" style={{ paddingLeft: `${Math.max(0, a.number.length - 2) * 10}px` }}>
                      <span className="font-mono text-sm font-bold text-gray-900">{a.number}</span>
                      <span className="ml-3 truncate text-sm text-gray-700">{a.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.thirdPartyType && <Tag>{THIRD_PARTY_LABEL[a.thirdPartyType]}</Tag>}
                      {a.status !== "ACTIVE" && <StatusChip tone={st.tone}>{st.label}</StatusChip>}
                    </div>
                  </button>
                );
              })}
            </div>
          </DataCard>
        )}
      </div>
    </AccountingShell>
  );
};
