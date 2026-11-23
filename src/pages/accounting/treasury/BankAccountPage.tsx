import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { treasuryService } from "../../../services/treasury.service";
import type { ManualLine, Reconciliation, StatementLine } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Section, StatusChip, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));

// ─── Relevés ───
const StatementsPanel: React.FC<{ code: string }> = ({ code }) => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canImport = hasPermission("BANK_STATEMENT:IMPORT");
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ openingBalance: "", closingBalance: "", replace: "" });
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ periodFrom: "", periodTo: "", openingBalance: "", closingBalance: "" });
  const [lines, setLines] = useState<{ date: string; label: string; reference: string; amount: string }[]>([{ date: "", label: "", reference: "", amount: "" }]);
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["treasury-statements", code], queryFn: () => treasuryService.statements(code) });

  const done = (r: { lines?: number; duplicates?: number; autoMatched?: number; warnings?: string[] }) => {
    qc.invalidateQueries({ queryKey: ["treasury-statements", code] });
    qc.invalidateQueries({ queryKey: ["treasury-matching", code] });
    qc.invalidateQueries({ queryKey: ["treasury-banks"] });
    toast.success(`Relevé importé${r.lines != null ? ` : ${r.lines} ligne(s)` : ""}${r.duplicates ? `, ${r.duplicates} doublon(s)` : ""}${r.autoMatched ? `, ${r.autoMatched} rapprochée(s)` : ""}`);
    (r.warnings ?? []).forEach((w) => toast.success(w));
    setFile(null); setManual(false); setErr(null);
  };
  const imp = useMutation({
    mutationFn: () => treasuryService.importStatement(code, file!, { openingBalance: num(f.openingBalance), closingBalance: num(f.closingBalance), replace: f.replace.trim() || undefined }),
    onSuccess: done, onError: (e) => setErr(apiMessage(e, "Import impossible.")),
  });
  const man = useMutation({
    mutationFn: () => treasuryService.importManual(code, {
      periodFrom: m.periodFrom || undefined, periodTo: m.periodTo || undefined, openingBalance: num(m.openingBalance), closingBalance: num(m.closingBalance),
      lines: lines.filter((l) => l.label.trim() && l.amount.trim()).map((l): ManualLine => ({ date: l.date || undefined, label: l.label, reference: l.reference || undefined, amount: num(l.amount) })),
    }),
    onSuccess: done, onError: (e) => setErr(apiMessage(e, "Saisie impossible.")),
  });

  return (
    <div className="space-y-4">
      {canImport && (
        <Section title="Importer un relevé">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(null); imp.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Fichier"><input type="file" className={FIELD} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
              <Field label="Solde d'ouverture"><input className={FIELD} inputMode="decimal" value={f.openingBalance} onChange={(e) => setF({ ...f, openingBalance: e.target.value })} /></Field>
              <Field label="Solde de clôture"><input className={FIELD} inputMode="decimal" value={f.closingBalance} onChange={(e) => setF({ ...f, closingBalance: e.target.value })} /></Field>
              <Field label="Remplace le relevé" hint="Numéro, si correction"><input className={FIELD} value={f.replace} onChange={(e) => setF({ ...f, replace: e.target.value })} /></Field>
            </div>
            {err && !manual && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <ActionButton type="submit" disabled={!file || imp.isPending}>{imp.isPending ? "Import…" : "Importer"}</ActionButton>
              <ActionButton variant="ghost" onClick={() => setManual((v) => !v)}>{manual ? "Fermer la saisie manuelle" : "Saisie manuelle"}</ActionButton>
            </div>
          </form>
          {manual && (
            <div className="mt-4">
              <PanelForm title="Saisie manuelle d'un relevé" onSubmit={(e) => { e.preventDefault(); setErr(null); man.mutate(); }} onCancel={() => setManual(false)} pending={man.isPending} submitLabel="Enregistrer" submitDisabled={!lines.some((l) => l.label.trim() && l.amount.trim())} error={manual ? err : null}>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Du"><input type="date" className={FIELD} value={m.periodFrom} onChange={(e) => setM({ ...m, periodFrom: e.target.value })} /></Field>
                  <Field label="Au"><input type="date" className={FIELD} value={m.periodTo} onChange={(e) => setM({ ...m, periodTo: e.target.value })} /></Field>
                  <Field label="Solde d'ouverture"><input className={FIELD} inputMode="decimal" value={m.openingBalance} onChange={(e) => setM({ ...m, openingBalance: e.target.value })} /></Field>
                  <Field label="Solde de clôture"><input className={FIELD} inputMode="decimal" value={m.closingBalance} onChange={(e) => setM({ ...m, closingBalance: e.target.value })} /></Field>
                </div>
                <p className="text-xs text-gray-400">Montant positif = crédit en banque, négatif = débit.</p>
                {lines.map((l, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[9rem_1fr_9rem_9rem]">
                    <input type="date" className={FIELD} value={l.date} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                    <input className={FIELD} placeholder="Libellé" value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input className={FIELD} placeholder="Référence" value={l.reference} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)))} />
                    <input className={FIELD} placeholder="Montant" inputMode="decimal" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  </div>
                ))}
                <ActionButton variant="ghost" onClick={() => setLines([...lines, { date: "", label: "", reference: "", amount: "" }])}>Ajouter une ligne</ActionButton>
              </PanelForm>
            </div>
          )}
        </Section>
      )}

      <Section title="Relevés importés">
        {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={FileText} title="Aucun relevé" /> : (
          <div className="space-y-2">
            {q.data!.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.number ?? `#${s.id}`} · {formatDate(s.periodFrom)} → {formatDate(s.periodTo)}</p>
                  <p className="text-xs text-gray-400">Ouverture {money(s.openingBalance)} · clôture {money(s.closingBalance)}{s.fileName ? ` · ${s.fileName}` : ""}{s.importedAt ? ` · ${formatDateTime(s.importedAt)}` : ""}</p>
                  {s.missingBefore && <p className="text-xs text-amber-600">Il manque un relevé avant celui-ci.</p>}
                  {s.replacedBy && <p className="text-xs text-gray-400">Remplacé par {s.replacedBy}</p>}
                </div>
                {s.status && <StatusChip tone="neutral">{s.status}</StatusChip>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

// ─── Rapprochement des lignes ───
const MatchingPanel: React.FC<{ code: string }> = ({ code }) => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("BANK_RECONCILIATION:MANAGE");
  const [sel, setSel] = useState<number[]>([]);
  const [bsel, setBsel] = useState<number[]>([]);
  const [unm, setUnm] = useState<{ code: string; reason: string } | null>(null);
  const [posting, setPosting] = useState<StatementLine | null>(null);
  const [post, setPost] = useState({ accountNumber: "", thirdParty: "", label: "", invoiceNumber: "" });
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["treasury-matching", code], queryFn: () => treasuryService.matching(code) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["treasury-matching", code] }); qc.invalidateQueries({ queryKey: ["treasury-banks"] }); };
  const fail = (e: unknown) => toast.error(apiMessage(e, "Action impossible."));

  const stTotal = useMemo(() => (q.data?.statementLines ?? []).filter((l) => sel.includes(l.id)).reduce((a, l) => a + (l.amount ?? 0), 0), [q.data, sel]);
  const bkTotal = useMemo(() => (q.data?.bookLines ?? []).filter((l) => bsel.includes(l.id)).reduce((a, l) => a + (l.amount ?? 0), 0), [q.data, bsel]);
  const gap = Math.round((stTotal - bkTotal) * 100) / 100;

  const match = useMutation({ mutationFn: () => treasuryService.match(code, sel, bsel), onSuccess: () => { toast.success("Lignes rapprochées"); setSel([]); setBsel([]); refresh(); }, onError: fail });
  const auto = useMutation({ mutationFn: () => treasuryService.autoMatch(code), onSuccess: (n) => { toast.success(`${n} rapprochement(s) automatique(s)`); refresh(); }, onError: fail });
  const unmatch = useMutation({ mutationFn: () => treasuryService.unmatch(code, unm!.code, unm!.reason), onSuccess: () => { toast.success("Rapprochement défait"); setUnm(null); refresh(); }, onError: fail });
  const postLine = useMutation({
    mutationFn: () => treasuryService.postLine(code, posting!.id, post),
    onSuccess: () => { toast.success("Ligne comptabilisée"); setPosting(null); setErr(null); refresh(); qc.invalidateQueries({ queryKey: ["accounting-entries"] }); },
    onError: (e) => setErr(apiMessage(e, "Comptabilisation impossible.")),
  });

  const tog = (arr: number[], id: number, set: (v: number[]) => void) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const useProposal = (st: number[], bk: number[]) => { setSel(st); setBsel(bk); };

  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !q.data) return <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <ListHeader title="Rapprochement des lignes" subtitle={`${d.statementLines.length} ligne(s) de relevé et ${d.bookLines.length} ligne(s) comptable(s) à rapprocher.`}
        action={canManage ? <ActionButton variant="ghost" onClick={() => auto.mutate()} disabled={auto.isPending}>{auto.isPending ? "Calcul…" : "Rapprochement automatique"}</ActionButton> : undefined} />

      {canManage && (sel.length > 0 || bsel.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-900 p-4 text-sm text-white">
          <span>Relevé {money(stTotal)} · compta {money(bkTotal)} · écart <b>{money(gap)}</b></span>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={() => { setSel([]); setBsel([]); }}>Vider</ActionButton>
            <ActionButton onClick={() => match.mutate()} disabled={!sel.length || !bsel.length || match.isPending}>Rapprocher</ActionButton>
          </div>
        </div>
      )}

      {d.proposals.length > 0 && (
        <Section title={`Propositions (${d.proposals.length})`}>
          <div className="space-y-2">
            {d.proposals.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm shadow-sm">
                <span className="text-gray-700">{p.statementLineIds.length} ligne(s) relevé ↔ {p.entryLineIds.length} ligne(s) compta · {money(p.amount)}{p.kind ? ` · ${p.kind}` : ""}{p.confidence != null ? ` · ${Math.round(p.confidence * 100)} %` : ""}</span>
                {canManage && <ActionButton variant="ghost" onClick={() => useProposal(p.statementLineIds, p.entryLineIds)}>Sélectionner</ActionButton>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {unm && (
        <PanelForm title={`Défaire le rapprochement ${unm.code}`} onSubmit={(e) => { e.preventDefault(); unmatch.mutate(); }} onCancel={() => setUnm(null)} pending={unmatch.isPending} submitLabel="Défaire" submitDisabled={!unm.reason.trim()}>
          <Field label="Motif" required><input className={FIELD} value={unm.reason} onChange={(e) => setUnm({ ...unm, reason: e.target.value })} /></Field>
        </PanelForm>
      )}
      {posting && (
        <PanelForm title={`Comptabiliser : ${posting.label ?? ""} (${money(posting.amount)})`} onSubmit={(e) => { e.preventDefault(); setErr(null); postLine.mutate(); }} onCancel={() => setPosting(null)} pending={postLine.isPending} submitLabel="Comptabiliser" error={err}>
          <p className="text-xs text-gray-400">Laissez vide pour appliquer les règles d'affectation.</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Compte"><input className={FIELD} value={post.accountNumber} onChange={(e) => setPost({ ...post, accountNumber: e.target.value })} /></Field>
            <Field label="Tiers"><input className={FIELD} value={post.thirdParty} onChange={(e) => setPost({ ...post, thirdParty: e.target.value })} /></Field>
            <Field label="Libellé"><input className={FIELD} value={post.label} onChange={(e) => setPost({ ...post, label: e.target.value })} /></Field>
            <Field label="N° de facture"><input className={FIELD} value={post.invoiceNumber} onChange={(e) => setPost({ ...post, invoiceNumber: e.target.value })} /></Field>
          </div>
        </PanelForm>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Relevé bancaire">
          {d.statementLines.length === 0 ? <p className="text-sm text-gray-400">Rien à rapprocher.</p> : (
            <div className="space-y-1.5">
              {d.statementLines.map((l) => (
                <div key={l.id} className={`rounded-xl p-2.5 text-sm ${sel.includes(l.id) ? "bg-gray-100 ring-1 ring-gray-900" : "bg-white shadow-sm"}`}>
                  <label className="flex cursor-pointer items-start gap-2">
                    {canManage && !l.matchingCode && <input type="checkbox" className="mt-1" checked={sel.includes(l.id)} onChange={() => tog(sel, l.id, setSel)} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{l.label}</span>
                      <span className="text-xs text-gray-400">{formatDate(l.date)}{l.reference ? ` · ${l.reference}` : ""}{l.awaitingPayment ? ` · attend ${l.awaitingPayment}` : ""}</span>
                    </span>
                    <span className={`font-mono text-sm ${(l.amount ?? 0) < 0 ? "text-red-600" : "text-gray-900"}`}>{money(l.amount)}</span>
                  </label>
                  <div className="mt-1 flex items-center gap-2 pl-6 text-xs">
                    {l.matchingCode && <>
                      <span className="text-gray-500">Rapprochée {l.matchingCode}</span>
                      {canManage && <button className="font-semibold text-gray-700 underline" onClick={() => setUnm({ code: l.matchingCode!, reason: "" })}>Défaire</button>}
                    </>}
                    {l.postedEntry && <Link className="font-semibold text-gray-700 underline" to={`/accounting/entries/${encodeURIComponent(l.postedEntry)}`}>{l.postedEntry}</Link>}
                    {canManage && !l.matchingCode && !l.postedEntry && <button className="font-semibold text-gray-700 underline" onClick={() => { setPosting(l); setErr(null); }}>Comptabiliser</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Comptabilité">
          {d.bookLines.length === 0 ? <p className="text-sm text-gray-400">Rien à rapprocher.</p> : (
            <div className="space-y-1.5">
              {d.bookLines.map((l) => (
                <label key={l.id} className={`flex cursor-pointer items-start gap-2 rounded-xl p-2.5 text-sm ${bsel.includes(l.id) ? "bg-gray-100 ring-1 ring-gray-900" : "bg-white shadow-sm"}`}>
                  {canManage && !l.matchingCode && <input type="checkbox" className="mt-1" checked={bsel.includes(l.id)} onChange={() => tog(bsel, l.id, setBsel)} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900">{l.label}</span>
                    <span className="text-xs text-gray-400">{formatDate(l.date)} · {l.entryNumber}{l.reference ? ` · ${l.reference}` : ""}</span>
                  </span>
                  <span className={`font-mono text-sm ${(l.amount ?? 0) < 0 ? "text-red-600" : "text-gray-900"}`}>{money(l.amount)}</span>
                </label>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

// ─── États de rapprochement ───
const ReconciliationsPanel: React.FC<{ code: string }> = ({ code }) => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("BANK_RECONCILIATION:MANAGE");
  const canValidate = hasPermission("BANK_RECONCILIATION:VALIDATE");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState<Reconciliation | null>(null);
  const q = useQuery({ queryKey: ["treasury-recs", code], queryFn: () => treasuryService.reconciliations(code) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["treasury-recs", code] });
  const prep = useMutation({ mutationFn: () => treasuryService.prepareReconciliation(code, date), onSuccess: (r) => { toast.success("État préparé"); setOpen(r); refresh(); }, onError: (e) => toast.error(apiMessage(e, "Préparation impossible.")) });
  const val = useMutation({ mutationFn: (id: number) => treasuryService.validateReconciliation(id), onSuccess: (r) => { toast.success("État validé"); setOpen(r); refresh(); qc.invalidateQueries({ queryKey: ["treasury-banks"] }); }, onError: (e) => toast.error(apiMessage(e, "Validation impossible.")) });
  const pdf = async (r: Reconciliation) => {
    if (r.id == null) return;
    try { saveBlob(await treasuryService.reconciliationPdf(r.id), `rapprochement-${code}-${r.date ?? r.reconciliationDate ?? r.id}.pdf`); }
    catch (e) { toast.error(apiMessage(e, "PDF indisponible.")); }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Section title="Préparer un état de rapprochement">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="À la date du"><input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <ActionButton onClick={() => prep.mutate()} disabled={!date || prep.isPending}>{prep.isPending ? "Préparation…" : "Préparer"}</ActionButton>
          </div>
        </Section>
      )}

      {open && (
        <Section title={`État du ${formatDate(open.date ?? open.reconciliationDate)}`} action={<ActionButton variant="ghost" onClick={() => setOpen(null)}>Fermer</ActionButton>}>
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <p>Solde relevé<br /><b>{money(open.statementBalance)}</b></p>
            <p>Solde comptable<br /><b>{money(open.bookBalance)}</b></p>
            <p>Solde rapproché<br /><b>{money(open.reconciledBalance)}</b></p>
            <p>Écart<br /><b className={open.difference ? "text-red-600" : ""}>{money(open.difference)}</b></p>
          </div>
          {[["En attente côté compta", open.bookOutstanding], ["En attente côté banque", open.statementOutstanding]].map(([t, rows]) => (
            <div key={t as string} className="mt-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">{t as string}</p>
              {((rows as { id: number; label?: string; date?: string; amount?: number }[]) ?? []).length === 0 ? <p className="text-xs text-gray-400">Aucune.</p> :
                (rows as { id: number; label?: string; date?: string; amount?: number }[]).map((l) => <p key={l.id} className="flex justify-between text-xs text-gray-600"><span>{formatDate(l.date)} · {l.label}</span><span className="font-mono">{money(l.amount)}</span></p>)}
            </div>
          ))}
          <div className="mt-4 flex gap-2">
            <ActionButton variant="ghost" onClick={() => pdf(open)}>PDF</ActionButton>
            {canValidate && open.id != null && !open.validatedAt && <ActionButton onClick={() => val.mutate(open.id!)} disabled={val.isPending}>{val.isPending ? "Validation…" : "Valider"}</ActionButton>}
          </div>
        </Section>
      )}

      <Section title="États préparés">
        {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={FileText} title="Aucun état" /> : (
          <div className="space-y-2">
            {q.data!.map((r, i) => (
              <button key={r.id ?? i} onClick={() => setOpen(r)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
                <span className="text-sm font-semibold text-gray-900">{formatDate(r.date ?? r.reconciliationDate)}{r.number ? ` · ${r.number}` : ""}</span>
                <span className="flex items-center gap-3 text-xs text-gray-500">
                  Écart {money(r.difference)}
                  {r.validatedAt ? <StatusChip tone="success">Validé</StatusChip> : <StatusChip tone="warn">{r.status ?? "Préparé"}</StatusChip>}
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

type Tab = "statements" | "matching" | "recs";
const TABS: TabItem<Tab>[] = [
  { id: "matching", label: "Rapprochement" },
  { id: "statements", label: "Relevés" },
  { id: "recs", label: "États" },
];

export const BankAccountPage: React.FC = () => {
  const { code = "" } = useParams();
  const [tab, setTab] = useState<Tab>("matching");
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/treasury" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Trésorerie</Link>
        <h2 className="text-lg font-bold text-gray-900">Compte bancaire {code}</h2>
        <Tabs items={TABS} active={tab} onChange={setTab} />
        {tab === "matching" && <MatchingPanel code={code} />}
        {tab === "statements" && <StatementsPanel code={code} />}
        {tab === "recs" && <ReconciliationsPanel code={code} />}
      </div>
    </AccountingShell>
  );
};
