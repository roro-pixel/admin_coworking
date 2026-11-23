import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { salesAccountingService } from "../../../services/purchase.service";
import type { BatchResult } from "../../../services/purchase.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ListHeader, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const evTone = (s?: string) => (s === "POSTED" ? "success" : s === "FAILED" ? "danger" : s === "UNBALANCED" || s === "PENDING" ? "warn" : "neutral");

export const SalesControlPage: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canReplay = hasPermission("ACCOUNTING_POSTING:REPLAY");
  const canLetter = hasPermission("ACCOUNTING_LETTERING:MANUAL");
  const [acc, setAcc] = useState("411");
  const [ref, setRef] = useState("");
  const [lookup, setLookup] = useState("");
  const [last, setLast] = useState<{ title: string; r: BatchResult } | null>(null);

  const checks = useQuery({ queryKey: ["sales-checks"], queryFn: () => salesAccountingService.checks() });
  const props = useQuery({ queryKey: ["sales-proposals", acc], queryFn: () => salesAccountingService.letteringProposals({ accountNumber: acc || undefined }) });
  const events = useQuery({ queryKey: ["sales-status", lookup], queryFn: () => salesAccountingService.status(lookup), enabled: !!lookup });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["sales-checks"] }); qc.invalidateQueries({ queryKey: ["sales-proposals"] }); };

  const run = (title: string, fn: () => Promise<BatchResult>) => useMutation({
    mutationFn: fn,
    onSuccess: (r) => { setLast({ title, r }); toast.success(`${title} : ${r.succeeded ?? 0} réussi(s), ${r.failed ?? 0} échec(s)`); refresh(); },
    onError: (e) => toast.error(apiMessage(e, `${title} impossible.`)),
  });
  const feed = run("Alimentation comptable", salesAccountingService.feed);
  const letter = run("Lettrage automatique", salesAccountingService.autoLetter);

  const c = checks.data;
  return (
    <AccountingShell>
      <div className="space-y-6">
        <ListHeader title="Contrôle des ventes" subtitle="Cohérence entre la facturation, le portefeuille et la comptabilité."
          action={<div className="flex gap-2">
            {canReplay && <ActionButton variant="ghost" pending={feed.isPending} onClick={() => feed.mutate()}>Comptabiliser les ventes</ActionButton>}
            {canLetter && <ActionButton variant="ghost" pending={letter.isPending} onClick={() => letter.mutate()}>Lettrer automatiquement</ActionButton>}
          </div>} />

        {last && (
          <Section title={`${last.title} : ${last.r.processed ?? 0} traité(s)`}>
            {(last.r.errors ?? []).length === 0 ? <p className="text-sm text-gray-500">Aucune erreur.</p> : last.r.errors!.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
          </Section>
        )}

        <Section title="Contrôles">
          {checks.isLoading ? <ListSkeleton /> : checks.isError || !c ? <ErrorBlock message="Chargement impossible." onRetry={() => checks.refetch()} /> : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Total des portefeuilles" mono>{money(c.walletTotal)}</Detail>
                <Detail label="Solde du compte 4191" mono>{money(c.account4191Balance)}</Detail>
                <Detail label="Écart" mono>{money(c.walletDifference)}</Detail>
                <Detail label="Factures non comptabilisées">{c.invoicesNotPosted}</Detail>
                <Detail label="Paiements non comptabilisés">{c.paymentsNotPosted}</Detail>
                <Detail label="Mouvements de portefeuille non comptabilisés">{c.walletEntriesNotPosted}</Detail>
              </div>
              <p className="mb-1 mt-4 text-xs font-semibold text-gray-500">Écarts facture / comptabilité ({c.invoiceGaps.length})</p>
              {c.invoiceGaps.length === 0 ? <p className="text-sm text-gray-400">Aucun écart.</p> : c.invoiceGaps.map((g) => (
                <div key={g.documentNumber} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                  <span>{g.documentNumber} · {g.customerCode}</span>
                  <span className="font-mono text-xs text-gray-600">dû {money(g.balanceDue)} · compta {money(g.accountingOpen)} · <b className="text-red-600">{money(g.difference)}</b></span>
                </div>
              ))}
            </>
          )}
        </Section>

        <Section title="Propositions de lettrage">
          <Field label="Compte" hint="411 par défaut"><input className={FIELD} value={acc} onChange={(e) => setAcc(e.target.value)} /></Field>
          <div className="mt-3 space-y-1.5">
            {props.isLoading ? <ListSkeleton /> : props.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => props.refetch()} /> : (props.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucune proposition" /> : props.data!.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-white p-2.5 text-xs shadow-sm sm:grid-cols-2">
                <span>Débit : {p.debit?.entryNumber} · {formatDate(p.debit?.entryDate)} · {p.debit?.label} · <b className="font-mono">{money(p.debit?.remaining)}</b></span>
                <span>Crédit : {p.credit?.entryNumber} · {formatDate(p.credit?.entryDate)} · {p.credit?.label} · <b className="font-mono">{money(p.credit?.remaining)}</b></span>
                <span className="text-gray-400 sm:col-span-2">Tiers {p.thirdPartyCode} · compte {p.accountNumber}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Suivi d'une vente">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setLookup(ref.trim()); }}>
            <Field label="Référence (facture, paiement…)"><input className={FIELD} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
            <ActionButton type="submit" disabled={!ref.trim()}>Voir</ActionButton>
          </form>
          {lookup && (
            <div className="mt-3 space-y-1.5">
              {events.isLoading ? <ListSkeleton /> : events.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => events.refetch()} /> : (events.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucun événement" /> : events.data!.map((e, i) => (
                <div key={e.id ?? i} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{e.eventType} <span className="font-normal text-gray-400">· {formatDate(e.eventDate)}{e.family ? ` · ${e.family}` : ""}</span></span>
                    {e.status && <StatusChip tone={evTone(e.status)}>{e.status}</StatusChip>}
                  </div>
                  <p className="text-xs text-gray-400">{[e.entryNumber && `écriture ${e.entryNumber}`, e.ruleCode && `règle ${e.ruleCode}${e.ruleVersion != null ? ` v${e.ruleVersion}` : ""}`, e.attempts != null && `${e.attempts} essai(s)`, e.postedAt && formatDateTime(e.postedAt)].filter(Boolean).join(" · ")}</p>
                  {e.failureReason && <p className="text-xs text-red-600">{e.failureReason}</p>}
                  {e.shiftedNote && <p className="text-xs text-amber-600">{e.shiftedNote}</p>}
                  {e.ignoredReason && <p className="text-xs text-gray-500">Ignoré{e.ignoredBy ? ` par ${e.ignoredBy}` : ""} : {e.ignoredReason}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AccountingShell>
  );
};
