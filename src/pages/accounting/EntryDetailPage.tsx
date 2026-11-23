import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, Pencil, Trash2, Undo2, X } from "lucide-react";
import { accountingService } from "../../services/accounting.service";
import type { Entry } from "../../services/accounting.service";
import { useAuth } from "../../contexts/AuthContext";
import { AccountingShell } from "../../components/accounting/AccountingShell";
import { EntryLinesEditor, newLine, toInputLines, totals } from "../../components/accounting/EntryLinesEditor";
import type { LineDraft } from "../../components/accounting/EntryLinesEditor";
import { ENTRY_STATUS, ORIGIN_LABEL, PENDING_REASON_LABEL, money } from "../../components/accounting/accountingLabels";
import { statusOf } from "../../components/subscription/labels";
import { ActionButton, Detail, ErrorBanner, ErrorBlock, Field, PageHeader, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ENTRIES_KEY } from "./EntriesPage";

type Mode = null | "reverse" | "reject" | "regularize";

const LinkEntry: React.FC<{ label: string; reference?: string | null }> = ({ label, reference }) => {
  const navigate = useNavigate();
  if (!reference) return null;
  return (
    <Detail label={label}>
      <button type="button" className="font-mono text-xs font-bold text-[color:var(--logo-pink-dark)] underline" onClick={() => navigate(`/accounting/entries/${encodeURIComponent(reference)}`)}>
        {reference}
      </button>
    </Detail>
  );
};

const Body: React.FC<{ entry: Entry; serverMessages: string[] }> = ({ entry, serverMessages }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const ref = entry.entryNumber || entry.provisionalNumber || "";
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState(`Régularisation ${ref}`);
  const [lines, setLines] = useState<LineDraft[]>([newLine(), newLine()]);
  const [error, setError] = useState<string | null>(null);
  const accounts = useQuery({ queryKey: ["accounting-accounts", "form"], queryFn: () => accountingService.accounts({}), enabled: mode === "regularize" });

  const open = entry.status === "DRAFT" || entry.status === "PENDING_BALANCE";
  const canCreate = hasPermission("ACCOUNTING_ENTRY:CREATE");
  const canValidate = hasPermission("ACCOUNTING_ENTRY:VALIDATE");
  const canReverse = hasPermission("ACCOUNTING_ENTRY:REVERSE");
  const canBalance = hasPermission("ACCOUNTING_ENTRY:BALANCE");
  const st = statusOf(ENTRY_STATUS, entry.status);

  const done = (e: Entry | void, msg: string, goTo?: string) => {
    qc.invalidateQueries({ queryKey: [ENTRIES_KEY] });
    toast.success(msg);
    if (e) (e.messages ?? []).forEach((m) => toast.success(m));
    setMode(null);
    setError(null);
    if (goTo) navigate(goTo);
  };
  const fail = (e: unknown) => setError(apiMessage(e, "Action impossible."));

  const validate = useMutation({ mutationFn: () => accountingService.validateEntry(ref), onSuccess: (e) => done(e, "Écriture validée"), onError: fail });
  const reverse = useMutation({
    mutationFn: () => accountingService.reverseEntry(ref, { reason, date }),
    onSuccess: (e) => done(e, "Écriture contrepassée"),
    onError: fail,
  });
  const reject = useMutation({ mutationFn: () => accountingService.rejectEntry(ref, reason), onSuccess: (e) => done(e, "Écriture rejetée"), onError: fail });
  const regularize = useMutation({
    mutationFn: () => accountingService.regularizeEntry(ref, { label: label.trim(), lines: toInputLines(lines) }),
    onSuccess: (e) => done(e, "Écriture de régularisation créée", e?.entryNumber ? `/accounting/entries/${encodeURIComponent(e.entryNumber)}` : undefined),
    onError: fail,
  });

  const remove = () =>
    toast.confirm({
      tone: "danger",
      message: `Supprimer l'écriture ${ref} ?`,
      detail: "Seul un brouillon peut être supprimé.",
      confirmLabel: "Supprimer",
      successMessage: "Écriture supprimée",
      errorMessage: "Suppression impossible",
      onConfirm: async () => {
        await accountingService.deleteEntry(ref);
        qc.invalidateQueries({ queryKey: [ENTRIES_KEY] });
        navigate("/accounting/entries");
      },
    });

  const t = totals(
    (entry.lines ?? []).map((l) => newLine({ debit: String(l.debit ?? ""), credit: String(l.credit ?? "") })),
  );

  return (
    <>
      <PageHeader
        title={ref}
        subtitle={entry.label}
        onBack={() => navigate("/accounting/entries")}
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        actions={
          <>
            {open && canCreate && <ActionButton variant="ghost" icon={Pencil} onClick={() => navigate(`/accounting/entries/${encodeURIComponent(ref)}/edit`)}>Modifier</ActionButton>}
            {open && canValidate && <ActionButton icon={Check} pending={validate.isPending} onClick={() => { setError(null); validate.mutate(); }}>Valider</ActionButton>}
            {entry.status === "VALIDATED" && canReverse && <ActionButton variant="ghost" icon={Undo2} onClick={() => { setMode("reverse"); setReason(""); }}>Contrepasser</ActionButton>}
            {entry.status === "PENDING_BALANCE" && canBalance && (
              <>
                <ActionButton variant="ghost" onClick={() => setMode("regularize")}>Régulariser</ActionButton>
                <ActionButton variant="danger" icon={X} onClick={() => { setMode("reject"); setReason(""); }}>Rejeter</ActionButton>
              </>
            )}
            {entry.status === "DRAFT" && canCreate && <ActionButton variant="danger" icon={Trash2} onClick={remove}>Supprimer</ActionButton>}
          </>
        }
      />

      <div className="space-y-5">
        <ErrorBanner message={mode ? null : error} />

        {serverMessages.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            {serverMessages.map((m, i) => <p key={i}>{m}</p>)}
          </div>
        )}
        {entry.status === "PENDING_BALANCE" && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              En attente d'équilibrage{entry.pendingReason ? ` : ${PENDING_REASON_LABEL[entry.pendingReason] ?? entry.pendingReason}` : ""}
            </p>
            {entry.pendingDetail && <p className="mt-1">{entry.pendingDetail}</p>}
            {!!entry.unbalancedAmount && <p className="mt-1">Écart : {money(entry.unbalancedAmount)}</p>}
          </div>
        )}

        {mode === "reverse" && (
          <PanelForm title="Contrepasser l'écriture" onSubmit={(e) => { e.preventDefault(); reverse.mutate(); }} onCancel={() => setMode(null)} pending={reverse.isPending} submitLabel="Contrepasser" submitDisabled={!reason.trim()} error={error}>
            <Field label="Motif" required><input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Field label="Date de la contrepassation" hint="Par défaut : date du jour"><input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </PanelForm>
        )}
        {mode === "reject" && (
          <PanelForm title="Rejeter l'écriture" onSubmit={(e) => { e.preventDefault(); reject.mutate(); }} onCancel={() => setMode(null)} pending={reject.isPending} submitLabel="Rejeter" error={error}>
            <Field label="Motif"><input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          </PanelForm>
        )}
        {mode === "regularize" && (
          <PanelForm title="Écriture de régularisation" onSubmit={(e) => { e.preventDefault(); regularize.mutate(); }} onCancel={() => setMode(null)} pending={regularize.isPending} submitLabel="Créer la régularisation" submitDisabled={!label.trim() || toInputLines(lines).length < 1} error={error}>
            <Field label="Libellé" required><input className={FIELD} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
            <EntryLinesEditor lines={lines} onChange={setLines} accounts={accounts.data ?? []} />
          </PanelForm>
        )}

        <Section title="Informations">
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Journal">{entry.journalCode}</Detail>
            <Detail label="Date d'écriture">{formatDate(entry.entryDate)}</Detail>
            <Detail label="Date de la pièce">{formatDate(entry.documentDate)}</Detail>
            <Detail label="Date d'origine">{entry.originalDate && entry.originalDate !== entry.entryDate ? formatDate(entry.originalDate) : undefined}</Detail>
            <Detail label="Exercice">{entry.fiscalYearCode}</Detail>
            <Detail label="Période">{entry.periodCode}</Detail>
            <Detail label="Origine">{entry.origin && ORIGIN_LABEL[entry.origin]}</Detail>
            <Detail label="Source" mono>{entry.sourceType ? `${entry.sourceType} ${entry.sourceCode ?? ""}` : undefined}</Detail>
            <Detail label="N° provisoire" mono>{entry.provisionalNumber && entry.provisionalNumber !== entry.entryNumber ? entry.provisionalNumber : undefined}</Detail>
            <Detail label="Créée par">{entry.createdBy && `${entry.createdBy} · ${formatDateTime(entry.createdAt)}`}</Detail>
            <Detail label="Validée par">{entry.validatedBy && `${entry.validatedBy} · ${formatDateTime(entry.validatedAt)}`}</Detail>
            <Detail label="Rejetée par">{entry.rejectedBy}</Detail>
            <Detail label="Motif du rejet" wide>{entry.rejectionReason}</Detail>
            <Detail label="Motif de contrepassation" wide>{entry.reversalReason}</Detail>
            <LinkEntry label="Contrepassation de" reference={entry.reversalOf} />
            <LinkEntry label="Contrepassée par" reference={entry.reversedByEntry} />
            <LinkEntry label="Régularise" reference={entry.regularizationOf} />
            <LinkEntry label="Régularisée par" reference={entry.regularizedBy} />
            <Detail label="Empreinte" mono wide>{entry.contentHash}</Detail>
          </div>
        </Section>

        <Section title="Lignes">
          <div className="space-y-2">
            {(entry.lines ?? []).map((l, i) => (
              <div key={l.id ?? i} className="grid gap-2 rounded-2xl bg-white p-3 text-sm shadow-sm sm:grid-cols-[8rem_1fr_8rem_8rem]">
                <div>
                  <p className="font-mono text-xs font-bold text-gray-900">{l.accountNumber}</p>
                  {l.thirdPartyCode && <p className="font-mono text-xs text-gray-400">{l.thirdPartyCode}</p>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-gray-800">{l.label || l.accountLabel}</p>
                  <p className="truncate text-xs text-gray-400">
                    {[l.accountLabel, l.reference, l.dueDate ? `éch. ${formatDate(l.dueDate)}` : null, l.letteringCode ? `lettrage ${l.letteringCode}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-mono sm:text-right">{l.debit ? money(l.debit) : ""}</p>
                <p className="font-mono sm:text-right">{l.credit ? money(l.credit) : ""}</p>
              </div>
            ))}
            <div className="grid gap-2 px-3 pt-1 text-sm font-bold sm:grid-cols-[8rem_1fr_8rem_8rem]">
              <span />
              <span className="text-gray-500">Total{t.diff !== 0 ? ` · écart ${money(Math.abs(t.diff))}` : ""}</span>
              <span className="font-mono sm:text-right">{money(entry.totalDebit)}</span>
              <span className="font-mono sm:text-right">{money(entry.totalCredit)}</span>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export const EntryDetailPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const location = useLocation();
  const messages = ((location.state as { messages?: string[] } | null)?.messages ?? []).filter(Boolean);
  const query = useQuery({ queryKey: [ENTRIES_KEY, "one", reference], queryFn: () => accountingService.entry(reference!), enabled: !!reference });
  return (
    <AccountingShell>
      {query.isLoading ? (
        <DetailsSkeleton />
      ) : query.isError || !query.data ? (
        <ErrorBlock message={apiMessage(query.error, "Écriture introuvable.")} onRetry={() => query.refetch()} />
      ) : (
        <Body entry={query.data} serverMessages={messages} />
      )}
    </AccountingShell>
  );
};
