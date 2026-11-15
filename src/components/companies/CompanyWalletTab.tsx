import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, PenLine, ShieldPlus, Wallet } from "lucide-react";
import { companyService } from "../../services/company.service";
import type {
  CompanyResponse,
  CompanyTopUpMethod,
  CompanyWalletView,
  SpendOperation,
  SpendingAuthorization,
  SpendingAuthorizationStatus,
} from "../../services/company.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, CheckField, DataCard, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import type { Tone } from "../subscription/kitUtils";
import { FIELD, apiMessage, formatDate, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import { currencyLabel } from "../payment/paymentUtils";
import { COMPANIES_KEY } from "./companyLabels";
import { Stat, numText, toNumber } from "./companyTabKit";

const OPERATIONS: { value: SpendOperation; label: string }[] = [
  { value: "BOOKING", label: "Réservations" },
  { value: "SUBSCRIPTION", label: "Abonnements" },
  { value: "PASS", label: "Passes" },
  { value: "INVOICE_PAYMENT", label: "Règlement de factures" },
  { value: "MARKETPLACE", label: "Marketplace" },
];
const OP_LABEL: Record<string, string> = Object.fromEntries(OPERATIONS.map((o) => [o.value, o.label]));

const SPEND_STATUS: Record<string, { label: string; tone: Tone }> = {
  HELD: { label: "Réservée", tone: "info" },
  PENDING_APPROVAL: { label: "À valider", tone: "warn" },
  AWAITING_OTP: { label: "Code attendu", tone: "warn" },
  SETTLED: { label: "Réglée", tone: "success" },
  REJECTED: { label: "Refusée", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
};
const SPEND_FILTERS = ["", "PENDING_APPROVAL", "AWAITING_OTP", "HELD", "SETTLED", "REJECTED", "CANCELLED", "EXPIRED"];

const AUTH_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspendue", tone: "warn" },
  REVOKED: { label: "Révoquée", tone: "neutral" },
};

type Panel = { kind: "topup" } | { kind: "auth-new" } | { kind: "auth-edit"; a: SpendingAuthorization } | null;

const TopUpForm: React.FC<{ customerId: string; onDone: () => void }> = ({ customerId, onDone }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CompanyTopUpMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const value = toNumber(amount);
  const mutation = useMutation({
    mutationFn: () => companyService.topUpWallet(customerId, { amount: value ?? 0, method, reference: reference.trim() || undefined, reason: reason.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Rechargement enregistré");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Rechargement impossible.")),
  });
  return (
    <PanelForm
      title="Recharger le portefeuille"
      pending={mutation.isPending}
      submitLabel="Recharger"
      submitDisabled={!value || value <= 0 || reason.trim() === ""}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Montant (FCFA)" required>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Moyen" required>
          <select value={method} onChange={(e) => setMethod(e.target.value as CompanyTopUpMethod)} className={FIELD}>
            <option value="BANK_TRANSFER">Virement</option>
            <option value="CASH">Espèces</option>
          </select>
        </Field>
      </div>
      <Field label="Référence">
        <input value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Motif" required hint="Au-delà du seuil des actions d'administration, une seconde personne doit valider">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
    </PanelForm>
  );
};

interface LimitDraft {
  ops: SpendOperation[];
  perTx: string;
  perDay: string;
  perMonth: string;
  approval: string;
  from: string;
  until: string;
}

const LimitFields: React.FC<{ d: LimitDraft; set: (d: LimitDraft) => void }> = ({ d, set }) => (
  <>
    <Field label="Opérations autorisées" required>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPERATIONS.map((o) => (
          <CheckField
            key={o.value}
            checked={d.ops.includes(o.value)}
            label={o.label}
            onChange={(on) => set({ ...d, ops: on ? [...d.ops, o.value] : d.ops.filter((x) => x !== o.value) })}
          />
        ))}
      </div>
    </Field>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Plafond par opération">
        <input inputMode="decimal" value={d.perTx} onChange={(e) => set({ ...d, perTx: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Plafond par jour">
        <input inputMode="decimal" value={d.perDay} onChange={(e) => set({ ...d, perDay: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Plafond par mois">
        <input inputMode="decimal" value={d.perMonth} onChange={(e) => set({ ...d, perMonth: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Validation du gérant au-delà de" hint="Vide : jamais">
        <input inputMode="decimal" value={d.approval} onChange={(e) => set({ ...d, approval: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Valable dès le">
        <input type="date" value={d.from} onChange={(e) => set({ ...d, from: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Jusqu'au">
        <input type="date" value={d.until} onChange={(e) => set({ ...d, until: e.target.value })} className={FIELD} />
      </Field>
    </div>
  </>
);

const draftOf = (a?: SpendingAuthorization): LimitDraft => ({
  ops: (a?.operations as SpendOperation[] | undefined) ?? [],
  perTx: numText(a?.maxPerTransaction),
  perDay: numText(a?.maxPerDay),
  perMonth: numText(a?.maxPerMonth),
  approval: numText(a?.approvalAbove),
  from: a?.validFrom?.slice(0, 10) ?? "",
  until: a?.validUntil?.slice(0, 10) ?? "",
});

const limitsOf = (d: LimitDraft) => ({
  operations: d.ops,
  maxPerTransaction: toNumber(d.perTx) ?? null,
  maxPerDay: toNumber(d.perDay) ?? null,
  maxPerMonth: toNumber(d.perMonth) ?? null,
  approvalAbove: toNumber(d.approval) ?? null,
  validFrom: d.from || null,
  validUntil: d.until || null,
});

const AuthNewForm: React.FC<{ customerId: string; onDone: () => void }> = ({ customerId, onDone }) => {
  const queryClient = useQueryClient();
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [d, setD] = useState<LimitDraft>(draftOf());
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.createSpendingAuthorization(customerId, { memberId: member?.memberId ?? "", ...limitsOf(d) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Autorisation créée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Création impossible.")),
  });
  return (
    <PanelForm
      title="Autoriser un collaborateur à dépenser"
      pending={mutation.isPending}
      submitLabel="Autoriser"
      submitDisabled={!member || d.ops.length === 0}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Collaborateur" required hint="Il doit être rattaché à l'organisation">
        <MemberAutocomplete selectedMember={member} onSelect={setMember} />
      </Field>
      <LimitFields d={d} set={setD} />
    </PanelForm>
  );
};

const AuthEditForm: React.FC<{ customerId: string; a: SpendingAuthorization; onDone: () => void }> = ({ customerId, a, onDone }) => {
  const queryClient = useQueryClient();
  const [d, setD] = useState<LimitDraft>(draftOf(a));
  const [status, setStatus] = useState<SpendingAuthorizationStatus>(a.status as SpendingAuthorizationStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const changed = status !== a.status;
  const mutation = useMutation({
    mutationFn: () =>
      companyService.updateSpendingAuthorization(customerId, a.id, {
        ...limitsOf(d),
        status: changed ? status : undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Autorisation modifiée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible.")),
  });
  return (
    <PanelForm
      title={`Autorisation de ${a.memberName ?? a.memberId}`}
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={d.ops.length === 0}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Statut">
        <select value={status} onChange={(e) => setStatus(e.target.value as SpendingAuthorizationStatus)} className={FIELD}>
          {Object.entries(AUTH_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <LimitFields d={d} set={setD} />
      <Field label="Motif">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

const Balances: React.FC<{ wallet: CompanyWalletView }> = ({ wallet }) => {
  const cur = currencyLabel(wallet.currency);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Disponible" value={formatMoney(wallet.availableBalance ?? 0, cur)} />
      <Stat label="Réservé" value={formatMoney(wallet.heldBalance ?? 0, cur)} />
      <Stat label="Solde comptable" value={formatMoney(wallet.ledgerBalance ?? 0, cur)} />
    </div>
  );
};

/** Onglet Portefeuille : solde, rechargement, dépenses et autorisations des collaborateurs. */
export const CompanyWalletTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const [panel, setPanel] = useState<Panel>(null);
  const [spendStatus, setSpendStatus] = useState("");
  const close = () => setPanel(null);

  const wallet = useQuery({ queryKey: [COMPANIES_KEY, "wallet", id], queryFn: () => companyService.getWallet(id) });
  const spends = useQuery({ queryKey: [COMPANIES_KEY, "spends", id, spendStatus], queryFn: () => companyService.getWalletSpends(id, spendStatus || undefined) });
  const auths = useQuery({ queryKey: [COMPANIES_KEY, "authorizations", id], queryFn: () => companyService.getSpendingAuthorizations(id) });

  const askReset = (a: SpendingAuthorization) =>
    toast.confirm({
      message: `Réinitialiser le code de dépense de ${a.memberName ?? a.memberId} ?`,
      detail: "Il devra en choisir un nouveau avant sa prochaine dépense.",
      confirmLabel: "Réinitialiser",
      pendingLabel: "Réinitialisation",
      successMessage: "Code réinitialisé",
      errorMessage: "Réinitialisation impossible.",
      onConfirm: () => companyService.resetSpendingPin(id, a.id),
    });

  if (wallet.isLoading) return <ListSkeleton rows={4} />;
  if (wallet.isError || !wallet.data) return <ErrorBlock message="Impossible de charger le portefeuille." onRetry={() => wallet.refetch()} />;
  const w = wallet.data;
  const pending = w.pendingApprovals ?? [];

  return (
    <div className="space-y-5">
      <Balances wallet={w} />
      <div className="flex justify-end">
        <ActionButton icon={Wallet} disabled={panel !== null} onClick={() => setPanel({ kind: "topup" })}>
          Recharger
        </ActionButton>
      </div>
      {panel?.kind === "topup" && <TopUpForm customerId={id} onDone={close} />}
      {panel?.kind === "auth-new" && <AuthNewForm customerId={id} onDone={close} />}
      {panel?.kind === "auth-edit" && <AuthEditForm customerId={id} a={panel.a} onDone={close} />}

      {pending.length > 0 && (
        <Section title="Validations en attente" description="Dépenses qui attendent la décision du gérant">
          <div className="space-y-2">
            {pending.map((s) => (
              <ItemRow key={s.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-950">{s.memberName ?? s.memberId}</p>
                    <p className="truncate text-xs text-gray-500">
                      {OP_LABEL[s.operation] ?? s.operation}
                      {s.expiresAt ? ` · expire le ${formatDateTime(s.expiresAt)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{formatMoney(s.amount, currencyLabel(s.currency))}</p>
                </div>
              </ItemRow>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Autorisations de dépense"
        description="Ce que chaque collaborateur peut payer avec le portefeuille"
        action={
          <ActionButton variant="ghost" icon={ShieldPlus} disabled={panel !== null} onClick={() => setPanel({ kind: "auth-new" })}>
            Autoriser
          </ActionButton>
        }
      >
        {auths.isLoading ? (
          <ListSkeleton rows={2} />
        ) : auths.isError ? (
          <ErrorBlock message="Impossible de charger les autorisations." onRetry={() => auths.refetch()} />
        ) : (auths.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Personne n'est autorisé à dépenser.</p>
        ) : (
          <div className="space-y-2">
            {(auths.data ?? []).map((a) => {
              const st = AUTH_STATUS[a.status] ?? { label: a.status, tone: "neutral" as Tone };
              return (
                <ItemRow key={a.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-gray-950">{a.memberName ?? a.memberId}</p>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        {!a.pinSet && <Tag>Code non posé</Tag>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(a.operations ?? []).map((o) => (
                          <Tag key={o}>{OP_LABEL[o] ?? o}</Tag>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {a.maxPerTransaction != null ? `${formatMoney(a.maxPerTransaction, "FCFA")} par opération` : "Sans plafond par opération"}
                        {a.maxPerDay != null ? ` · ${formatMoney(a.maxPerDay, "FCFA")} par jour` : ""}
                        {a.maxPerMonth != null ? ` · ${formatMoney(a.maxPerMonth, "FCFA")} par mois` : ""}
                        {a.validUntil ? ` · jusqu'au ${formatDate(a.validUntil)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-1">
                      <IconButton icon={KeyRound} label="Réinitialiser le code de dépense" tone="neutral" disabled={panel !== null || a.status === "REVOKED"} onClick={() => askReset(a)} />
                      <IconButton icon={PenLine} label="Modifier l'autorisation" tone="pink" disabled={panel !== null} onClick={() => setPanel({ kind: "auth-edit", a })} />
                    </div>
                  </div>
                </ItemRow>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Dépenses">
        <div className="mb-3 flex flex-wrap gap-2">
          {SPEND_FILTERS.map((f) => {
            const on = spendStatus === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setSpendStatus(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"}`}
              >
                {f === "" ? "Toutes" : SPEND_STATUS[f].label}
              </button>
            );
          })}
        </div>
        {spends.isLoading ? (
          <ListSkeleton rows={3} />
        ) : spends.isError ? (
          <ErrorBlock message="Impossible de charger les dépenses." onRetry={() => spends.refetch()} />
        ) : (spends.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aucune dépense.</p>
        ) : (
          <DataCard>
            <div className="space-y-2">
              {(spends.data ?? []).map((s) => {
                const st = SPEND_STATUS[s.status] ?? { label: s.status, tone: "neutral" as Tone };
                return (
                  <div key={s.id} className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-950">
                        {s.memberName ?? s.memberId} · {OP_LABEL[s.operation] ?? s.operation}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {formatDateTime(s.createdAt)}
                        {s.documentNumber ? ` · ${s.documentNumber}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(s.amount, currencyLabel(s.currency))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DataCard>
        )}
      </Section>

      {(w.movements ?? []).length > 0 && (
        <Section title="Mouvements">
          <div className="space-y-2">
            {(w.movements ?? []).map((m, i) => (
              <ItemRow key={m.entryNumber ?? i}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {m.entryType}
                      {m.spentByMember ? ` · ${m.spentByMember}` : ""}
                    </p>
                    <p className="truncate text-xs text-gray-400">{formatDateTime(m.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${m.direction === "CREDIT" ? "text-emerald-600" : "text-gray-950"}`}>
                      {m.direction === "CREDIT" ? "+" : "-"}
                      {formatMoney(m.amount, currencyLabel(w.currency))}
                    </p>
                    <p className="text-xs text-gray-400">solde {formatMoney(m.balanceAfter, currencyLabel(w.currency))}</p>
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};
