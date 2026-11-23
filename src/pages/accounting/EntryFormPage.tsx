import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { accountingService } from "../../services/accounting.service";
import type { Entry } from "../../services/accounting.service";
import { useAuth } from "../../contexts/AuthContext";
import { AccountingShell } from "../../components/accounting/AccountingShell";
import { EntryLinesEditor, newLine, toInputLines, totals } from "../../components/accounting/EntryLinesEditor";
import type { LineDraft } from "../../components/accounting/EntryLinesEditor";
import { ActionButton, ErrorBanner, ErrorBlock, Field, PageHeader, Section } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ENTRIES_KEY } from "./EntriesPage";

const today = () => new Date().toISOString().slice(0, 10);

const Form: React.FC<{ existing?: Entry }> = ({ existing }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canValidate = hasPermission("ACCOUNTING_ENTRY:VALIDATE");
  const journals = useQuery({ queryKey: ["accounting-journals"], queryFn: accountingService.journals });
  const accounts = useQuery({ queryKey: ["accounting-accounts", "form"], queryFn: () => accountingService.accounts({}) });

  const [journalCode, setJournal] = useState(existing?.journalCode ?? "");
  const [entryDate, setDate] = useState(existing?.entryDate ?? today());
  const [documentDate, setDocDate] = useState(existing?.documentDate ?? "");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    existing?.lines?.length
      ? existing.lines.map((l) =>
          newLine({
            accountNumber: l.accountNumber,
            thirdPartyCode: l.thirdPartyCode ?? "",
            label: l.label ?? "",
            debit: l.debit ? String(l.debit) : "",
            credit: l.credit ? String(l.credit) : "",
            dueDate: l.dueDate ?? "",
            reference: l.reference ?? "",
          }),
        )
      : [newLine(), newLine()],
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (validate: boolean) => {
      const input = { journalCode, entryDate, documentDate: documentDate || undefined, label: label.trim(), lines: toInputLines(lines), validate };
      return existing?.entryNumber || existing?.provisionalNumber
        ? accountingService.updateEntry((existing.entryNumber || existing.provisionalNumber)!, input)
        : accountingService.createEntry(input);
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: [ENTRIES_KEY] });
      const ref = e.entryNumber || e.provisionalNumber || "";
      (e.messages ?? []).forEach((m) => toast.success(m));
      navigate(`/accounting/entries/${encodeURIComponent(ref)}`, { replace: true, state: { messages: e.messages } });
    },
    onError: (err) => setError(apiMessage(err, "Enregistrement impossible.")),
  });

  const t = totals(lines);
  const ready = !!journalCode && !!entryDate && !!label.trim() && toInputLines(lines).length >= 2;

  return (
    <>
      <PageHeader
        title={existing ? `Modifier ${existing.entryNumber || existing.provisionalNumber}` : "Nouvelle écriture"}
        subtitle="Un brouillon reste modifiable ; une écriture validée est figée."
        onBack={() => navigate(-1)}
      />
      <div className="space-y-5">
        <ErrorBanner message={error} />
        <Section title="En-tête">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Journal" required>
              <select className={FIELD} value={journalCode} onChange={(e) => setJournal(e.target.value)}>
                <option value="">Choisir…</option>
                {(journals.data ?? []).filter((j) => j.active !== false).map((j) => (
                  <option key={j.code} value={j.code}>{j.code} · {j.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date d'écriture" required>
              <input type="date" className={FIELD} value={entryDate} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Date de la pièce">
              <input type="date" className={FIELD} value={documentDate} onChange={(e) => setDocDate(e.target.value)} />
            </Field>
            <Field label="Libellé" required className="sm:col-span-3">
              <input className={FIELD} value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
          </div>
        </Section>
        <Section title="Lignes">
          <EntryLinesEditor lines={lines} onChange={setLines} accounts={accounts.data ?? []} />
        </Section>
        {t.diff !== 0 && (
          <p className="text-sm font-semibold text-amber-700">
            L'écriture est déséquilibrée : selon la politique du journal elle sera mise en attente d'équilibrage, ou refusée.
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={() => navigate(-1)} disabled={save.isPending}>Annuler</ActionButton>
          <ActionButton variant={canValidate ? "ghost" : "primary"} disabled={!ready} pending={save.isPending && save.variables === false} onClick={() => { setError(null); save.mutate(false); }}>
            Enregistrer en brouillon
          </ActionButton>
          {canValidate && (
            <ActionButton disabled={!ready} pending={save.isPending && save.variables === true} onClick={() => { setError(null); save.mutate(true); }}>
              Enregistrer et valider
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
};

export const EntryFormPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const query = useQuery({
    queryKey: [ENTRIES_KEY, "one", reference],
    queryFn: () => accountingService.entry(reference!),
    enabled: !!reference,
  });
  return (
    <AccountingShell>
      {!reference ? (
        <Form />
      ) : query.isLoading ? (
        <ListSkeleton rows={6} />
      ) : query.isError || !query.data ? (
        <ErrorBlock message={apiMessage(query.error, "Écriture introuvable.")} onRetry={() => query.refetch()} />
      ) : query.data.status === "VALIDATED" || query.data.status === "REVERSED" ? (
        <ErrorBlock message="Une écriture validée ne peut plus être modifiée : contrepassez-la." />
      ) : (
        <Form existing={query.data} />
      )}
    </AccountingShell>
  );
};
