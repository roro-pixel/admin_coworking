import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, Detail, ErrorBlock, Section, StatusChip } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { toast } from "../../../components/ui/toastStore";
import { useAuth } from "../../../contexts/AuthContext";
import { fundService } from "../../../services/fund.service";
import type { ExpenseInput, ExpenseLine, FundRequest, Money } from "../../../services/fund.service";
import { StatusBadge, fundTone, money, typeLabel } from "./fundUtils";

type Act = null | "approve" | "reject" | "sendBack" | "cancel" | "disburse" | "return" | "complement" | "transfer" | "expense" | { reject: string | number };

const CASH_FIELDS: FieldDef[] = [
  { key: "sessionNumber", label: "Session de caisse", required: true }, { key: "amount", label: "Montant", type: "number", hint: "Vide = tout le reste" },
  { key: "signedByName", label: "Nom du signataire" }, { key: "signature", label: "Signature", hint: "Image encodée (tablette) ou nom" },
];
const EXPENSE_FIELDS: FieldDef[] = [
  { key: "expenseDate", label: "Date", type: "date", required: true }, { key: "natureCode", label: "Nature", required: true }, { key: "designation", label: "Désignation", required: true },
  { key: "amount", label: "Montant TTC", type: "number", required: true }, { key: "vatAmount", label: "TVA", type: "number" }, { key: "supplier", label: "Fournisseur" },
  { key: "supplierCode", label: "Code fournisseur" }, { key: "section", label: "Section" }, { key: "documentReference", label: "Pièce (référence GED)" },
  { key: "honourStatement", label: "Attestation sur l'honneur (sans pièce)", type: "bool" }, { key: "requestLineNo", label: "N° de ligne de la demande", type: "number" },
];

export const RequestDetailPage: React.FC = () => {
  const { number = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCash = hasPermission("FUND_REQUEST:DISBURSE");
  const canValidate = hasPermission("FUND_JUSTIFICATION:VALIDATE");
  const [act, setAct] = useState<Act>(null);
  const key = ["fund-request", number];
  const q = useQuery({ queryKey: key, queryFn: () => fundService.get(number) });
  const r = q.data;
  const draft = r?.status === "DRAFT";
  const insightQ = useQuery({ queryKey: ["fund-insight", number, r?.status], queryFn: () => fundService.insight(number), enabled: !!r && (draft || r.status === "SUBMITTED" || r.status === "IN_APPROVAL") });
  const insight = insightQ.data ?? r?.insight;

  const refresh = (x?: FundRequest) => { if (x) qc.setQueryData(key, x); else qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["fund"] }); qc.invalidateQueries({ queryKey: ["fund-insight", number] }); };
  const run = async (fn: () => Promise<FundRequest>, ok: string) => { try { refresh(await fn()); toast.success(ok); } catch (e) { toast.error(apiMessage(e, "Action impossible.")); } };
  const open = async (fn: () => Promise<Blob>, name: string) => { try { const b = await fn(); const url = URL.createObjectURL(b); const w = window.open(url, "_blank"); if (!w) saveBlob(b, name); } catch (e) { toast.error(apiMessage(e, "PDF indisponible.")); } };
  const cashAction = (fn: (n: string, b: Money) => Promise<FundRequest>, openVoucher = false) => async (v: Record<string, unknown>) => {
    const before = new Set((r?.disbursements ?? []).map((d) => d.movementNumber));
    const res = await fn(number, v as unknown as Money);
    refresh(res);
    const fresh = (res.disbursements ?? []).find((d) => d.movementNumber && !before.has(d.movementNumber));
    if (openVoucher && fresh?.movementNumber) void open(() => fundService.disbursementPdf(number, fresh.movementNumber!), `bon-${fresh.movementNumber}.pdf`);
  };

  const status = r?.status ?? "";
  const inApproval = status === "IN_APPROVAL" || status === "SUBMITTED";
  const toDisburse = ["APPROVED", "PARTIALLY_DISBURSED"].includes(status);
  const advance = r?.type === "ADVANCE" || r?.type === "STAFF_ADVANCE";
  const justifiable = advance && ["DISBURSED", "TO_JUSTIFY", "PARTIALLY_JUSTIFIED", "JUSTIFIED", "PARTIALLY_DISBURSED"].includes(status);
  const transferType = r?.type === "CASH_SUPPLY" || r?.type === "FUND_REMITTANCE";

  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/fund" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Demandes de fonds</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !r ? <ErrorBlock message="Demande introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{r.number} <span className="font-normal text-gray-500">· {typeLabel(r.type)}</span> <StatusBadge status={r.status} /></h2>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="ghost" onClick={() => open(() => fundService.requestPdf(number), `demande-${number}.pdf`)}>Imprimer</ActionButton>
                <ActionButton variant="ghost" onClick={async () => { try { const d = await fundService.duplicate(number); toast.success(`Copie ${d.number} créée`); nav(`/accounting/fund/${encodeURIComponent(d.number)}`); } catch (e) { toast.error(apiMessage(e, "Duplication impossible.")); } }}>Dupliquer</ActionButton>
                {draft && <Link to={`/accounting/fund/${encodeURIComponent(number)}/edit`}><ActionButton variant="ghost">Modifier</ActionButton></Link>}
                {draft && <ActionButton onClick={() => run(() => fundService.submit(number), "Demande envoyée")}>Envoyer</ActionButton>}
                {(draft || inApproval || toDisburse) && <ActionButton variant="ghost" onClick={() => setAct("cancel")}>Annuler</ActionButton>}
              </div>
            </div>

            {inApproval && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                <span className="mr-2 text-sm text-gray-600">Validation niveau {r.currentLevel ?? "?"} sur {r.requiredLevels ?? "?"} :</span>
                <ActionButton onClick={() => setAct("approve")}>Approuver</ActionButton>
                <ActionButton variant="ghost" onClick={() => setAct("sendBack")}>Renvoyer pour correction</ActionButton>
                <ActionButton variant="danger" onClick={() => setAct("reject")}>Rejeter</ActionButton>
              </div>
            )}
            {canCash && (toDisburse || justifiable) && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                <span className="mr-2 text-sm text-gray-600">Caisse :</span>
                {toDisburse && !transferType && <ActionButton onClick={() => setAct("disburse")}>Décaisser</ActionButton>}
                {toDisburse && transferType && <ActionButton onClick={() => setAct("transfer")}>Lier l'ordre de transfert</ActionButton>}
                {advance && <ActionButton variant="ghost" onClick={() => setAct("return")}>Retour du reliquat</ActionButton>}
                {advance && <ActionButton variant="ghost" onClick={() => setAct("complement")}>Complément</ActionButton>}
              </div>
            )}

            {act === "approve" && <ActionForm title="Approuver" submitLabel="Approuver" onClose={() => setAct(null)} fields={[{ key: "reducedAmount", label: "Montant réduit", type: "number", hint: "Facultatif ; motif alors obligatoire" }, { key: "comment", label: "Commentaire / motif" }]} onSubmit={async (v) => { refresh(await fundService.approve(number, v)); }} />}
            {act === "reject" && <ActionForm title="Rejeter la demande" submitLabel="Rejeter" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Motif", required: true }]} onSubmit={async (v) => { refresh(await fundService.reject(number, v)); }} />}
            {act === "sendBack" && <ActionForm title="Renvoyer pour correction" submitLabel="Renvoyer" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Commentaire", required: true }]} onSubmit={async (v) => { refresh(await fundService.sendBack(number, v)); }} />}
            {act === "cancel" && <ActionForm title="Annuler la demande" submitLabel="Annuler la demande" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Motif" }]} onSubmit={async (v) => { refresh(await fundService.cancel(number, v)); }} />}
            {act === "disburse" && <ActionForm title="Décaissement" submitLabel="Décaisser" onClose={() => setAct(null)} fields={CASH_FIELDS} onSubmit={cashAction(fundService.disburse, true)} />}
            {act === "return" && <ActionForm title="Retour du reliquat" submitLabel="Enregistrer le retour" onClose={() => setAct(null)} fields={CASH_FIELDS} onSubmit={cashAction(fundService.returnRemainder)} />}
            {act === "complement" && <ActionForm title="Complément versé" submitLabel="Verser" onClose={() => setAct(null)} fields={CASH_FIELDS} onSubmit={cashAction(fundService.complement)} />}
            {act === "transfer" && <ActionForm title="Ordre de transfert" submitLabel="Lier" onClose={() => setAct(null)} fields={[{ key: "transferOrderNumber", label: "N° de l'ordre de transfert", required: true }]} onSubmit={async (v) => { refresh(await fundService.linkTransfer(number, String(v.transferOrderNumber))); }} />}
            {act === "expense" && <ActionForm title="Ajouter une dépense justifiée" onClose={() => setAct(null)} fields={EXPENSE_FIELDS} onSubmit={async (v) => { refresh(await fundService.addExpense(number, v as unknown as ExpenseInput)); }} />}
            {typeof act === "object" && act && "reject" in act && <ActionForm title="Rejeter la ligne de justification" submitLabel="Rejeter" onClose={() => setAct(null)} fields={[{ key: "reason", label: "Motif", required: true }]} onSubmit={async (v) => { refresh(await fundService.rejectExpense(number, act.reject, String(v.reason))); }} />}

            {insight && (
              <Section title="Ce que la demande deviendra">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Detail label="Niveaux requis">{insight.levelLabels?.length ? insight.levelLabels.map((l, i) => `${i + 1}. ${l}`).join(" · ") : insight.requiredLevels}</Detail>
                  <Detail label="Solde de la caisse" mono>{insight.registerBalance != null ? `${money(insight.registerBalance)} — ${insight.registerCanCover ? "couvre la demande" : "ne couvre pas"}` : undefined}</Detail>
                  <Detail label="Avances ouvertes du bénéficiaire">{insight.openAdvances?.join(", ")}</Detail>
                  <Detail label="Niveau budgétaire">{insight.budgetApproval}</Detail>
                </div>
                {insight.warning && <p className={`mt-3 rounded-xl p-2.5 text-sm font-semibold ${insight.blockedByOverdueAdvance ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{insight.warning}</p>}
                {insight.budget?.budgetActive && (
                  <div className="mt-3 space-y-1">
                    {insight.budget.blocked && <p className="text-sm font-semibold text-red-700">Dépassement bloquant d'une ligne de budget.</p>}
                    {(insight.budget.messages ?? []).map((m, i) => <p key={i} className="text-xs text-gray-600">{m}</p>)}
                    {(insight.budget.lines ?? []).map((l, i) => (
                      <p key={i} className="flex flex-wrap justify-between gap-2 text-xs text-gray-600">
                        <span>{l.itemLabel ?? l.itemCode}{l.sectionCode ? ` · ${l.sectionCode}` : ""}</span>
                        <span className="flex items-center gap-2 font-mono">budget {money(l.budgeted)} · disponible {money(l.available)} → {money(l.availableAfter)}{l.status && <StatusChip tone={l.status === "RED" ? "danger" : l.status === "ORANGE" ? "warn" : "success"}>{l.status}</StatusChip>}</span>
                      </p>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section title="Informations">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Objet">{r.subject}</Detail>
                <Detail label="Demandeur">{[r.requester, r.requesterDepartment, r.requesterPhone].filter(Boolean).join(" · ")}</Detail>
                <Detail label="Bénéficiaire">{[r.beneficiaryName ?? r.beneficiaryCode, r.beneficiaryIdNumber, r.beneficiaryPhone].filter(Boolean).join(" · ")}</Detail>
                <Detail label="Caisse / remise">{[r.registerCode, r.deliveryMode].filter(Boolean).join(" · ")}</Detail>
                <Detail label="Date souhaitée">{formatDate(r.wantedDate)}</Detail>
                <Detail label="État de besoin">{r.needStatementNumber}</Detail>
                <Detail label="Mission">{r.missionDestination ? `${r.missionDestination} (${formatDate(r.missionStart)} au ${formatDate(r.missionEnd)})` : undefined}</Detail>
                <Detail label="Dépense non prévue">{r.unplanned ? r.unplannedReason ?? "Oui" : undefined}</Detail>
                <Detail label="Ordre de transfert">{r.transferOrderNumber}</Detail>
                <Detail label="Total demandé" mono>{money(r.totalAmount)}</Detail>
                <Detail label="Approuvé" mono>{money(r.approvedAmount)}</Detail>
                <Detail label="Décaissé" mono>{money(r.disbursedAmount)}</Detail>
                <Detail label="Reste à décaisser" mono>{money(r.remainingToDisburse)}</Detail>
                <Detail label="Justifié" mono>{money(r.justifiedAmount)}</Detail>
                <Detail label="Rendu" mono>{money(r.returnedAmount)}</Detail>
                <Detail label="Complément" mono>{money(r.complementAmount)}</Detail>
                <Detail label="Reste à justifier" mono>{money(r.remainingToJustify)}</Detail>
                <Detail label="Échéance de justification">{formatDate(r.justificationDueDate)}</Detail>
                <Detail label="Envoyée">{formatDateTime(r.submittedAt)}</Detail>
                <Detail label="Expire">{formatDateTime(r.expiresAt)}</Detail>
                <Detail label="Dernier commentaire" wide>{r.lastComment}</Detail>
              </div>
              {r.totalInWords && <p className="mt-2 text-xs italic text-gray-400">{r.totalInWords}</p>}
            </Section>

            <Section title={`Lignes (${r.lines?.length ?? 0})`}>
              <div className="space-y-1.5">
                {(r.lines ?? []).map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                    <span><span className="font-medium text-gray-900">{l.designation}</span><span className="block text-xs text-gray-400">{[l.natureCode, l.supplier, l.section].filter(Boolean).join(" · ")}</span></span>
                    <span className="font-mono">{money(l.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Circuit de validation">
              {(r.timeline ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucune étape.</p> : (
                <ol className="space-y-2">
                  {r.timeline!.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                      <span><StatusChip tone={fundTone(a.decision === "APPROVED" || a.decision === "REDUCED" ? "VALIDATED" : a.decision === "REJECTED" || a.decision === "CANCELLED" || a.decision === "EXPIRED" ? "REJECTED" : "PENDING")}>{a.decision}</StatusChip> <span className="ml-1 font-medium">{a.level ? `Niveau ${a.level}` : "Demande"}</span> <span className="text-gray-500">{a.approver}{a.delegatedFrom ? ` (délégué de ${a.delegatedFrom})` : ""}</span>
                        {a.comment && <span className="block text-xs text-gray-500">{a.comment}</span>}
                        {a.amountBefore != null && a.amountAfter != null && a.amountBefore !== a.amountAfter && <span className="block text-xs text-gray-500">{money(a.amountBefore)} → {money(a.amountAfter)}</span>}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(a.decidedAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            {(r.disbursements ?? []).length > 0 && (
              <Section title="Mouvements de caisse">
                <div className="space-y-1.5">
                  {r.disbursements!.map((d, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                      <span><b>{{ DISBURSEMENT: "Décaissement", COMPLEMENT: "Complément", RETURN: "Retour" }[d.kind ?? ""] ?? d.kind}</b> · {d.movementNumber} · session {d.sessionNumber}<span className="block text-xs text-gray-400">{[d.signedByName && `signé par ${d.signedByName}`, d.createdBy, formatDateTime(d.createdAt)].filter(Boolean).join(" · ")}</span></span>
                      <span className="flex items-center gap-2"><span className="font-mono">{money(d.amount)}</span>{d.movementNumber && <ActionButton variant="ghost" onClick={() => open(() => fundService.disbursementPdf(number, d.movementNumber!), `bon-${d.movementNumber}.pdf`)}>Bon</ActionButton>}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(justifiable || (r.justification ?? []).length > 0) && (
              <Section title="Justification" action={<span className="flex gap-2">{justifiable && <ActionButton onClick={() => setAct("expense")}>Ajouter une dépense</ActionButton>}<ActionButton variant="ghost" onClick={() => open(() => fundService.justificationPdf(number), `justification-${number}.pdf`)}>Fiche PDF</ActionButton></span>}>
                <p className="mb-2 text-sm text-gray-600">Reste à justifier : <b className="font-mono">{money(r.remainingToJustify)}</b>{r.justificationDueDate ? ` · échéance ${formatDate(r.justificationDueDate)}` : ""}</p>
                <div className="space-y-1.5">
                  {(r.justification ?? []).map((l: ExpenseLine, i) => (
                    <div key={l.number ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                      <span className="min-w-0"><span className="font-medium text-gray-900">{l.designation}</span><span className="block text-xs text-gray-400">{[l.number, formatDate(l.expenseDate), l.natureCode, l.supplier, l.documentReference ?? (l.honourStatement ? "attestation sur l'honneur" : "sans pièce"), l.vatAmount ? `TVA ${money(l.vatAmount)}` : undefined, l.rejectReason && `rejet : ${l.rejectReason}`].filter(Boolean).join(" · ")}</span></span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{money(l.amount)}</span><StatusBadge status={l.status} />
                        {canValidate && l.status === "PENDING" && <><ActionButton variant="ghost" onClick={() => run(() => fundService.validateExpense(number, l.number ?? l.lineNo!), "Ligne validée")}>Valider</ActionButton><ActionButton variant="ghost" onClick={() => setAct({ reject: l.number ?? l.lineNo! })}>Rejeter</ActionButton></>}
                        {l.status !== "VALIDATED" && <ActionButton variant="ghost" onClick={() => run(() => fundService.deleteExpense(number, l.number ?? l.lineNo!), "Ligne supprimée")}>Supprimer</ActionButton>}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(inApproval || toDisburse) && (r.lines ?? []).length > 0 && (
              <SuggestionsBox number={number} />
            )}
          </>
        )}
      </div>
    </AccountingShell>
  );
};

const SuggestionsBox: React.FC<{ number: string }> = ({ number }) => {
  const [rows, setRows] = useState<{ ligne?: number; désignation?: string; fournisseur?: string; code?: string; score?: number }[] | null>(null);
  return (
    <Section title="Fournisseurs suggérés" action={<ActionButton variant="ghost" onClick={async () => { try { const d = await fundService.requestSuggestions(number, 3); setRows(d.flatMap((l) => (l.result?.suggestions ?? []).map((s) => ({ ligne: l.lineNo, désignation: l.designation, fournisseur: s.supplierName, code: s.supplierCode, score: s.score })))); } catch (e) { toast.error(apiMessage(e, "Suggestions indisponibles.")); } }}>Afficher</ActionButton>}>
      {rows ? (rows.length === 0 ? <p className="text-sm text-gray-400">Aucune suggestion.</p> : <div className="space-y-1">{rows.map((s, i) => <p key={i} className="flex justify-between text-xs text-gray-600"><span>Ligne {s.ligne} · {s.désignation}</span><span>{s.fournisseur} ({s.code}) · score {s.score}</span></p>)}</div>) : <p className="text-sm text-gray-400">Suggestions de fournisseurs selon la nature de chaque ligne.</p>}
    </Section>
  );
};
