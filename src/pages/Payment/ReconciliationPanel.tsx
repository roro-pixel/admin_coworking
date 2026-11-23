import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Smartphone } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { MobileMoneyDeposit, MobileMoneyDiscrepancy, MobileMoneyOperationDetail } from "../../services/payment.service";
import {
  ActionButton,
  Detail,
  EmptyState,
  ErrorBlock,
  Field,
  ItemRow,
  ListHeader,
  Pagination,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { DISCREPANCY_SEVERITY, MM_OUTCOME, MM_RESOLVE_ACTION, MM_STATUS } from "../../components/payment/paymentLabels";
import { currencyLabel, endOfDayIso, isoDay, startOfDayIso } from "../../components/payment/paymentUtils";

const PAGE_SIZE = 20;
type View = "operations" | "reconciliation" | "callbacks";

const VIEWS: { value: View; label: string }[] = [
  { value: "operations", label: "Opérations" },
  { value: "reconciliation", label: "Rapprochement" },
  { value: "callbacks", label: "Callbacks" },
];

const STATUS_FILTERS = [{ value: "", label: "Tous" }, ...Object.entries(MM_STATUS).map(([value, s]) => ({ value, label: s.label }))];

const Discrepancies: React.FC<{ items?: MobileMoneyDiscrepancy[] }> = ({ items }) =>
  !items || items.length === 0 ? (
    <p className="text-sm text-gray-500">Aucun écart avec PawaPay.</p>
  ) : (
    <ul className="space-y-2">
      {items.map((d, i) => {
        const sev = statusOf(DISCREPANCY_SEVERITY, d.severity);
        return (
          <li key={`${d.code}-${i}`} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={sev.tone}>{sev.label}</StatusChip>
              <span className="font-mono text-xs">{d.code}</span>
            </div>
            <p className="mt-1.5">{d.message}</p>
            {d.suggestedAction && <p className="mt-1 text-xs font-semibold">Suggestion : {d.suggestedAction}</p>}
          </li>
        );
      })}
    </ul>
  );

/** Détail d'un dépôt comparé à PawaPay, avec les actions de résolution. */
const OperationDetail: React.FC<{ depositId: string; onClose: () => void }> = ({ depositId, onClose }) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const canForce = isAdmin();
  const [action, setAction] = useState<"SYNC" | "MARK_SUCCEEDED" | "MARK_FAILED">("SYNC");
  const [reason, setReason] = useState("");
  const [providerTx, setProviderTx] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ["mm-operation", depositId],
    queryFn: () => paymentService.getMobileMoneyOperation(depositId),
  });

  const forcing = action !== "SYNC";
  const invalid = forcing && (reason.trim().length < 10 || (action === "MARK_SUCCEEDED" && !providerTx.trim()));

  const mutation = useMutation({
    mutationFn: () =>
      paymentService.resolveMobileMoneyOperation(depositId, {
        action,
        reason: reason.trim() || undefined,
        providerTransactionId: action === "MARK_SUCCEEDED" ? providerTx.trim() : undefined,
      }),
    onSuccess: (detail: MobileMoneyOperationDetail) => {
      setError(null);
      queryClient.setQueryData(["mm-operation", depositId], detail);
      queryClient.invalidateQueries({ queryKey: ["mm-operations"] });
      queryClient.invalidateQueries({ queryKey: ["mm-summary"] });
      toast.success("Opération mise à jour.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Résolution refusée.")),
  });

  if (isLoading) return <ListSkeleton rows={2} />;
  if (isError || !data) return <ErrorBlock message={apiMessage(loadError, "Détail indisponible.")} onRetry={() => refetch()} />;

  const dep = data.deposit;
  const st = statusOf(MM_STATUS, dep.status);
  const prov = data.provider;
  const cur = currencyLabel(dep.currency);

  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Dépôt" mono>{dep.depositId}</Detail>
        <Detail label="Statut chez nous"><StatusChip tone={st.tone}>{st.label}</StatusChip></Detail>
        <Detail label="Montant">{formatMoney(dep.amount, cur)}</Detail>
        <Detail label="Intention" mono>{dep.intentNumber}</Detail>
        <Detail label="Statut de l'intention">{data.intentStatus}</Detail>
        <Detail label="Statut de la transaction">{data.transactionStatus}</Detail>
        <Detail label="Téléphone" mono>{dep.payer?.accountDetails?.phoneNumber}</Detail>
        <Detail label="Message affiché au payeur" wide>{dep.userMessage}</Detail>
      </div>

      <Section title="Côté PawaPay">
        {!prov || !prov.available ? (
          <p className="text-sm text-gray-500">{prov?.error || "PawaPay n'a pas pu être interrogé."}</p>
        ) : prov.found === false ? (
          <p className="text-sm text-gray-500">PawaPay ne connaît pas ce dépôt.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Statut PawaPay">{prov.status}</Detail>
            <Detail label="Montant">{prov.amount !== undefined ? formatMoney(prov.amount, currencyLabel(prov.currency)) : undefined}</Detail>
            <Detail label="Transaction opérateur" mono>{prov.providerTransactionId}</Detail>
            <Detail label="Code d'échec">{prov.failureCode}</Detail>
            <Detail label="Message d'échec" wide>{prov.failureMessage}</Detail>
          </div>
        )}
      </Section>

      <Section title="Écarts">
        <Discrepancies items={data.discrepancies} />
      </Section>

      {(data.callbacks ?? []).length > 0 && (
        <Section title="Callbacks reçus">
          <ul className="space-y-1.5 text-sm">
            {data.callbacks!.map((c) => {
              const o = statusOf(MM_OUTCOME, c.outcome);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={o.tone}>{o.label}</StatusChip>
                  <span className="text-gray-600">{c.reportedStatus}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(c.receivedAt)}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Résoudre">
        {error && (
          <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <PillChoice<"SYNC" | "MARK_SUCCEEDED" | "MARK_FAILED">
          label="Action"
          value={action}
          onChange={setAction}
          options={[
            { value: "SYNC", label: MM_RESOLVE_ACTION.SYNC },
            ...(canForce
              ? [
                  { value: "MARK_SUCCEEDED" as const, label: MM_RESOLVE_ACTION.MARK_SUCCEEDED },
                  { value: "MARK_FAILED" as const, label: MM_RESOLVE_ACTION.MARK_FAILED },
                ]
              : []),
          ]}
        />
        {forcing && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Motif" required hint="10 caractères minimum" className={action === "MARK_FAILED" ? "sm:col-span-2" : ""}>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
            </Field>
            {action === "MARK_SUCCEEDED" && (
              <Field label="Identifiant de transaction opérateur" required>
                <input value={providerTx} onChange={(e) => setProviderTx(e.target.value)} className={`${FIELD_SOFT} font-mono`} />
              </Field>
            )}
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-2">
              Forcer le statut ne contacte pas l'opérateur : à n'utiliser qu'après vérification sur son tableau de bord.
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={onClose}>
            Fermer
          </ActionButton>
          <ActionButton
            variant={forcing ? "danger" : "primary"}
            icon={RefreshCw}
            pending={mutation.isPending}
            disabled={invalid}
            onClick={() => mutation.mutate()}
          >
            {MM_RESOLVE_ACTION[action]}
          </ActionButton>
        </div>
      </Section>
    </div>
  );
};

const Operations: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const [status, setStatus] = useState("");
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const params = {
    from: startOfDayIso(from),
    to: endOfDayIso(to),
    status: status || undefined,
    reference: reference.trim() || undefined,
    phone: phone.trim() || undefined,
  };

  const summary = useQuery({
    queryKey: ["mm-summary", params.from, params.to],
    queryFn: () => paymentService.getMobileMoneyOperationsSummary({ from: params.from, to: params.to }),
  });
  const list = useQuery({
    queryKey: ["mm-operations", params, page],
    queryFn: () => paymentService.getMobileMoneyOperations({ ...params, page, size: PAGE_SIZE }),
  });
  const items: MobileMoneyDeposit[] = list.data?.content ?? [];

  return (
    <div className="space-y-4">
      {(summary.data ?? []).length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summary.data!.map((t) => {
            const s = statusOf(MM_STATUS, t.status);
            return (
              <div key={`${t.status}-${t.currency}`} className="rounded-2xl bg-white p-3 shadow-sm">
                <StatusChip tone={s.tone}>{s.label}</StatusChip>
                <p className="mt-2 text-xl font-bold tabular-nums text-gray-950">{t.count}</p>
                <p className="text-xs text-gray-500">{formatMoney(t.amount, currencyLabel(t.currency))}</p>
              </div>
            );
          })}
        </div>
      )}

      <PillChoice<string>
        label="Statut"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(0);
        }}
        options={STATUS_FILTERS}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Référence (numéro d'intention)">
          <input value={reference} onChange={(e) => { setReference(e.target.value); setPage(0); }} className={`${FIELD_SOFT} font-mono`} />
        </Field>
        <Field label="Téléphone">
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(0); }} className={`${FIELD_SOFT} font-mono`} />
        </Field>
      </div>

      {list.isLoading ? (
        <ListSkeleton rows={4} />
      ) : list.isError ? (
        <ErrorBlock message={apiMessage(list.error, "Impossible de charger les opérations.")} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Smartphone} title="Aucune opération" hint="Élargissez la période ou changez le filtre." />
      ) : (
        <div className="space-y-3">
          {items.map((d) => {
            const s = statusOf(MM_STATUS, d.status);
            return (
              <ItemRow key={d.depositId}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={s.tone}>{s.label}</StatusChip>
                      <span className="text-xs font-semibold text-gray-500">{d.provider}</span>
                      <span className="font-mono text-xs text-gray-400">{d.intentNumber}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {d.payer?.accountDetails?.phoneNumber ?? "—"} · {formatDateTime(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold tabular-nums text-gray-950">{formatMoney(d.amount, currencyLabel(d.currency))}</p>
                    <ActionButton variant="ghost" onClick={() => setOpen(open === d.depositId ? null : d.depositId)}>
                      {open === d.depositId ? "Masquer" : "Examiner"}
                    </ActionButton>
                  </div>
                </div>
                {open === d.depositId && <OperationDetail depositId={d.depositId} onClose={() => setOpen(null)} />}
              </ItemRow>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={list.data?.totalPages ?? 0} total={list.data?.totalElements ?? 0} noun="opération" onChange={setPage} />
    </div>
  );
};

const Reconciliation: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const [run, setRun] = useState(false);
  const query = useQuery({
    queryKey: ["mm-reconciliation", from, to],
    queryFn: () => paymentService.getMobileMoneyReconciliation({ from: startOfDayIso(from), to: endOfDayIso(to) }),
    enabled: run,
  });
  const data = query.data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Compare chaque dépôt de la période avec PawaPay et ne remonte que les écarts.</p>
      <ActionButton icon={RefreshCw} pending={query.isFetching} onClick={() => (run ? query.refetch() : setRun(true))}>
        Lancer le rapprochement
      </ActionButton>
      {query.isError && <ErrorBlock message={apiMessage(query.error, "Rapprochement impossible.")} onRetry={() => query.refetch()} />}
      {data && (
        <>
          {data.truncated && (
            <p className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <AlertTriangle size={18} className="shrink-0" />
              Période trop large : seuls {data.checked} dépôts ont été vérifiés. Réduisez les dates pour tout couvrir.
            </p>
          )}
          <p className="text-sm text-gray-600">
            {data.checked} dépôt{data.checked > 1 ? "s" : ""} vérifié{data.checked > 1 ? "s" : ""} · {data.discrepancies.length} écart
            {data.discrepancies.length > 1 ? "s" : ""}
          </p>
          {data.discrepancies.length === 0 ? (
            <EmptyState icon={Smartphone} title="Aucun écart" hint="Nos dépôts concordent avec PawaPay." />
          ) : (
            <div className="space-y-3">
              {data.discrepancies.map((l) => (
                <ItemRow key={l.deposit.depositId}>
                  <p className="mb-2 text-sm font-bold text-gray-950">
                    <span className="font-mono text-xs">{l.deposit.intentNumber}</span> · {formatMoney(l.deposit.amount, currencyLabel(l.deposit.currency))}
                  </p>
                  <Discrepancies items={l.discrepancies} />
                </ItemRow>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Callbacks: React.FC = () => {
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["mm-callbacks", outcome, page],
    queryFn: () => paymentService.getMobileMoneyCallbacks({ outcome: outcome || undefined, page, size: PAGE_SIZE, sort: "receivedAt,desc" }),
  });
  const items = list.data?.content ?? [];
  return (
    <div className="space-y-4">
      <PillChoice<string>
        label="Résultat"
        value={outcome}
        onChange={(v) => {
          setOutcome(v);
          setPage(0);
        }}
        options={[{ value: "", label: "Tous" }, ...Object.entries(MM_OUTCOME).map(([value, s]) => ({ value, label: s.label }))]}
      />
      {list.isLoading ? (
        <ListSkeleton rows={4} />
      ) : list.isError ? (
        <ErrorBlock message={apiMessage(list.error, "Impossible de charger les callbacks.")} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Smartphone} title="Aucun callback" hint="Aucun appel reçu pour ce filtre." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const o = statusOf(MM_OUTCOME, c.outcome);
            return (
              <ItemRow key={c.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={o.tone}>{o.label}</StatusChip>
                  <span className="text-xs font-semibold text-gray-500">{c.kind}</span>
                  <span className="font-mono text-xs text-gray-400">{c.referenceId}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(c.receivedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Statut annoncé : {c.reportedStatus ?? "—"} · signature {c.signaturePresent ? "présente" : "absente"}
                  {c.verifiedVia ? ` · vérifié par ${c.verifiedVia}` : ""}
                </p>
                {c.detail && <p className="mt-1 text-sm text-gray-600">{c.detail}</p>}
              </ItemRow>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={list.data?.totalPages ?? 0} total={list.data?.totalElements ?? 0} noun="callback" onChange={setPage} />
    </div>
  );
};

/** Supervision mobile money : opérations, rapprochement avec PawaPay, journal des callbacks. */
export const ReconciliationPanel: React.FC = () => {
  const [view, setView] = useState<View>("operations");
  const [from, setFrom] = useState(() => isoDay(-6));
  const [to, setTo] = useState(() => isoDay(0));

  return (
    <div className="space-y-5">
      <ListHeader title="Mobile money" subtitle="Supervision des dépôts, écarts avec PawaPay et callbacks reçus." />
      <PillChoice<View> label="Vue" value={view} onChange={setView} options={VIEWS} />
      {view !== "callbacks" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Du">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={FIELD_SOFT} />
          </Field>
          <Field label="Au">
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={FIELD_SOFT} />
          </Field>
        </div>
      )}
      {view === "operations" && <Operations from={from} to={to} />}
      {view === "reconciliation" && <Reconciliation from={from} to={to} />}
      {view === "callbacks" && <Callbacks />}
    </div>
  );
};
