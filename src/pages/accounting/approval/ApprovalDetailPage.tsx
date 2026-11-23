import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, Detail, ErrorBlock, Section } from "../../../components/subscription/kit";
import { formatDateTime } from "../../../components/subscription/kitUtils";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { approvalService } from "../../../services/approval.service";
import type { ApprovalRequest } from "../../../services/approval.service";
import { Chip, money } from "./approvalUtils";
import { BillingApprovalDetails, BillingDocumentLinks, billingSubject } from "../../../components/billing/BillingApprovalDetails";

type Act = null | "approve" | "reject" | "sendBack";

const parseDetails = (s?: string): unknown => { if (!s) return undefined; try { return JSON.parse(s); } catch { return undefined; } };

export const ApprovalRequestView: React.FC<{ basePath: string; backLabel?: string }> = ({ basePath, backLabel = "Approbations" }) => {
  const { number = "" } = useParams();
  const qc = useQueryClient();
  const [act, setAct] = useState<Act>(null);
  const key = ["approval-request", number];
  const q = useQuery({ queryKey: key, queryFn: () => approvalService.get(number) });
  const r = q.data;
  const done = (x: ApprovalRequest) => { qc.setQueryData(key, x); qc.invalidateQueries({ queryKey: ["approval"] }); };
  const details = parseDetails(r?.detailsJson);
  const doc = r && r.center === "BILLING" ? billingSubject(r) : undefined;
  return (
      <div className="space-y-5">
        <Link to={basePath} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> {backLabel}</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !r ? <ErrorBlock message="Demande introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{r.number} <span className="font-normal text-gray-500">· {r.title ?? r.requestType}</span> <Chip s={r.status} /></h2>
              {r.canDecide && r.status === "PENDING" && (
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={() => setAct("approve")}>Approuver</ActionButton>
                  <ActionButton variant="ghost" onClick={() => setAct("sendBack")}>Renvoyer</ActionButton>
                  <ActionButton variant="danger" onClick={() => setAct("reject")}>Refuser</ActionButton>
                </div>
              )}
            </div>
            {act === "approve" && <ActionForm title="Approuver" submitLabel="Approuver" onClose={() => setAct(null)} fields={[...(r?.center === "CASH" ? [{ key: "reducedAmount", label: "Montant réduit", type: "number" as const, hint: "Positif, inférieur au montant demandé ; motif obligatoire" }] : []), { key: "comment", label: "Commentaire / motif" }]} onSubmit={async (v) => done(await approvalService.approve(number, v))} />}
            {act === "reject" && <ActionForm title="Refuser" submitLabel="Refuser" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Motif", required: true }]} onSubmit={async (v) => done(await approvalService.reject(number, v))} />}
            {act === "sendBack" && <ActionForm title="Renvoyer pour correction" submitLabel="Renvoyer" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Ce qu'il faut corriger", required: true }]} onSubmit={async (v) => done(await approvalService.sendBack(number, v))} />}

            <Section title="Informations">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Centre">{r.center}</Detail><Detail label="Type">{r.requestType}</Detail>
                <Detail label="Objet">{[r.subjectType, r.subjectRef].filter(Boolean).join(" ")}</Detail>
                <Detail label="Montant" mono>{money(r.amount, r.currency)}</Detail>
                <Detail label="Demandeur">{r.requesterName ?? r.requester}</Detail>
                <Detail label="Soumise">{formatDateTime(r.submittedAt)}</Detail>
                <Detail label="Niveau courant">{r.currentLabel ? `${r.currentLevel}/${r.requiredLevels} · ${r.currentLabel}` : undefined}</Detail>
                <Detail label="En attente de">{r.waitingFor}</Detail>
                <Detail label="Depuis">{formatDateTime(r.levelSince)}</Detail>
                <Detail label="Décision">{r.decidedAt ? `${formatDateTime(r.decidedAt)}${r.decidedBy ? ` par ${r.decidedBy}` : ""}` : undefined}</Detail>
                <Detail label="Dernier commentaire" wide>{r.lastComment}</Detail>
              </div>
              {r.subjectType && /FUND/i.test(r.subjectType) && r.subjectRef && <p className="mt-3 text-sm"><Link className="font-semibold text-[color:var(--logo-pink-dark)]" to={`/accounting/fund/${encodeURIComponent(r.subjectRef)}`}>Ouvrir la demande de fonds {r.subjectRef}</Link></p>}
              {doc && <BillingDocumentLinks documentNumber={doc} />}
            </Section>

            {r.center === "BILLING" && <BillingApprovalDetails request={r} details={details} />}

            <Section title="Niveaux">
              <div className="space-y-1.5">
                {(r.steps ?? []).map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
                    <span><b>Niveau {s.level}</b> · {s.label}<span className="block text-xs text-gray-500">{[s.expectedApproverName ?? s.expectedApprover, s.permission && `droit ${s.permission}`, s.decidedByName && `décidé par ${s.decidedByName}${s.delegatedFrom ? ` (délégué de ${s.delegatedFrom})` : ""}`, s.decidedAt && formatDateTime(s.decidedAt), s.comment].filter(Boolean).join(" · ")}</span></span>
                    <Chip s={s.status} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Frise">
              {(r.timeline ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucun événement.</p> : (
                <ol className="space-y-2">
                  {r.timeline!.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                      <span><Chip s={e.event} /> <span className="ml-1 font-medium">{e.level ? `Niveau ${e.level}` : ""}</span> <span className="text-gray-500">{e.actorName ?? e.actor}{e.delegatedFrom ? ` (délégué de ${e.delegatedFrom})` : ""}</span>
                        {e.comment && <span className="block text-xs text-gray-500">{e.comment}</span>}
                        {e.amountBefore != null && e.amountAfter != null && e.amountBefore !== e.amountAfter && <span className="block text-xs text-gray-500">{money(e.amountBefore, r.currency)} → {money(e.amountAfter, r.currency)}</span>}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(e.occurredAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
            {details !== undefined && !(r.center === "BILLING" && (r.requestType === "INVOICE_CHANGE" || r.requestType === "DISCOUNT_OVERRIDE")) && <GenericResult data={details} title="Détails de la demande" />}
          </>
        )}
      </div>
  );
};

export const ApprovalDetailPage: React.FC = () => (
  <AccountingShell>
    <ApprovalRequestView basePath="/accounting/approvals" />
  </AccountingShell>
);
