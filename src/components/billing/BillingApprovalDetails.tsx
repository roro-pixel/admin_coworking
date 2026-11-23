import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { ActionButton, Detail, Section, StatusChip } from "../subscription/kit";
import { formatMoney } from "../subscription/kitUtils";
import { saveBlob } from "../payment/paymentUtils";
import { toast } from "../ui/toastStore";
import { billingService } from "../../services/billing.service";
import type { ApprovalRequest } from "../../services/approval.service";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : v != null && typeof v !== "object" ? String(v) : undefined);
const nbr = (v: unknown): number | undefined => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);
const cur = (c?: string) => (!c || c === "XAF" ? "FCFA" : c);
const money = (n: number | undefined, c?: string) => (n == null ? undefined : formatMoney(n, cur(c)));

export const VIOLATION_LABEL: Record<string, string> = {
  MAX_DISCOUNT_RATE: "Remise de la ligne au-delà du plafond de l'article",
  FLOOR_PRICE: "Prix unitaire net sous le prix plancher",
  LINE_MIN_NET_RATE: "Ligne nette sous le % minimal du prix catalogue",
  LINE_MIN_NET_AMOUNT: "Ligne nette sous le montant minimal",
  DOCUMENT_DISCOUNT_RATE: "Remise globale au-delà du taux permis",
  DOCUMENT_DISCOUNT_AMOUNT: "Remise globale au-delà du montant permis",
};
const isRate = (t?: string) => !!t && t.endsWith("_RATE");

const CHANGE_STATUS: Record<string, { label: string; tone: "success" | "danger" | "neutral" | "warn" }> = {
  APPLIED: { label: "Appliquée", tone: "success" },
  REJECTED: { label: "Refusée", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  PENDING: { label: "En attente", tone: "warn" },
};
const CHANGE_RESULT: Record<string, string> = { NEW_VERSION: "Nouvelle version de la facture", CORRECTIVE_INVOICE: "Facture rectificative" };

/** Référence de la pièce : toujours `subjectRef` quand `subjectType` vaut BILLING_DOCUMENT (jamais title ni detailsJson). */
export const billingSubject = (r: ApprovalRequest): string | undefined =>
  r.subjectType === "BILLING_DOCUMENT" && r.subjectRef ? r.subjectRef : undefined;

/** Boutons « Ouvrir le document » et « PDF » d'une demande de la facturation. */
export const BillingDocumentLinks: React.FC<{ documentNumber: string }> = ({ documentNumber }) => {
  const [busy, setBusy] = useState(false);
  const pdf = async () => {
    setBusy(true);
    try { saveBlob(await billingService.getPdf(documentNumber), `${documentNumber}.pdf`); }
    catch { toast.error("PDF indisponible."); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <Link className="inline-flex items-center gap-1 font-semibold text-[color:var(--logo-pink-dark)]" to={`/billing/documents/${encodeURIComponent(documentNumber)}`}><FileText size={14} /> Ouvrir le document {documentNumber}</Link>
      <ActionButton variant="ghost" disabled={busy} onClick={pdf}>{busy ? "Téléchargement…" : "PDF"}</ActionButton>
    </div>
  );
};

const ChangeOutcome: React.FC<{ invoiceNumber: string; r: ApprovalRequest; changeRequestId?: string }> = ({ invoiceNumber, r, changeRequestId }) => {
  const q = useQuery({ queryKey: ["invoice-changes", invoiceNumber], queryFn: () => billingService.listInvoiceChanges(invoiceNumber), enabled: r.status !== "PENDING" });
  const c = (q.data ?? []).find((x) => x.approvalNumber === r.number || (changeRequestId && String(x.id) === changeRequestId));
  if (!c) return null;
  const st = CHANGE_STATUS[String(c.status)] ?? { label: String(c.status ?? "—"), tone: "neutral" as const };
  return (
    <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">Suite donnée à la demande <StatusChip tone={st.tone}>{st.label}</StatusChip></p>
      {c.result && <p className="mt-1 text-gray-700">{CHANGE_RESULT[c.result] ?? c.result}{c.resultDocumentNumber && <> : <Link className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline" to={`/billing/documents/${encodeURIComponent(c.resultDocumentNumber)}`}>{c.resultDocumentNumber}</Link></>}</p>}
    </div>
  );
};

const InvoiceChange: React.FC<{ r: ApprovalRequest; d: Rec }> = ({ r, d }) => {
  const c = str(d.currency) ?? r.currency;
  const diff = nbr(d.difference) ?? (nbr(d.totalAfter) != null && nbr(d.totalBefore) != null ? (nbr(d.totalAfter) as number) - (nbr(d.totalBefore) as number) : undefined);
  const changes = rec(d.changes);
  const lines = Array.isArray(changes.lines) ? (changes.lines as Rec[]) : [];
  const discounts = Array.isArray(changes.discounts) ? (changes.discounts as Rec[]) : [];
  const invoice = str(d.invoiceNumber) ?? r.subjectRef;
  return (
    <Section title="Modification demandée" description="Total TTC actuel et total après modification">
      {d.sealed === true && <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Facture certifiée : l'accord produira une facture rectificative, pas une nouvelle version.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Detail label="Facture" mono>{invoice}</Detail>
        <Detail label="Type de pièce">{str(d.documentType)}</Detail>
        <Detail label="Client">{str(d.customer)}</Detail>
        <Detail label="Total avant" mono>{money(nbr(d.totalBefore), c)}</Detail>
        <Detail label="Total après" mono>{money(nbr(d.totalAfter) ?? r.amount, c)}</Detail>
        <Detail label="Écart" mono>{diff == null ? undefined : <span className={diff < 0 ? "text-emerald-700" : diff > 0 ? "text-red-600" : ""}>{diff > 0 ? "+" : ""}{money(diff, c)}</span>}</Detail>
        <Detail label="Motif" wide>{str(d.reason)}</Detail>
        <Detail label="Demandée par">{str(d.requestedByName) ?? str(d.requestedBy)}</Detail>
        <Detail label="Motif de dérogation" wide>{str(d.discountOverrideReason)}</Detail>
      </div>
      {(lines.length > 0 || discounts.length > 0) && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Modifications proposées</p>
          {lines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
              <span className="min-w-0"><b>{str(l.description) ?? str(l.itemCode) ?? `Ligne ${i + 1}`}</b>{str(l.itemCode) && <span className="ml-2 font-mono text-xs text-gray-400">{str(l.itemCode)}</span>}</span>
              <span className="tabular-nums text-gray-700">{nbr(l.quantity) ?? "—"} {str(l.unit) ?? ""} × {money(nbr(l.unitPrice), c) ?? "—"}{nbr(l.discountRate) ? ` · remise ${nbr(l.discountRate)} %` : ""}</span>
            </div>
          ))}
          {discounts.map((x, i) => (
            <div key={`d${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
              <span><b>Remise globale</b> {str(x.description) ?? str(x.label) ?? str(x.type) ?? ""}</span>
              <span className="tabular-nums text-gray-700">{nbr(x.rate) != null ? `${nbr(x.rate)} %` : nbr(x.value) != null ? String(nbr(x.value)) : money(nbr(x.amount), c) ?? ""}</span>
            </div>
          ))}
        </div>
      )}
      {invoice && <ChangeOutcome invoiceNumber={invoice} r={r} changeRequestId={str(d.changeRequestId)} />}
    </Section>
  );
};

const DiscountOverride: React.FC<{ r: ApprovalRequest; d: Rec }> = ({ r, d }) => {
  const c = str(d.currency) ?? r.currency;
  const violations = Array.isArray(d.violations) ? (d.violations as Rec[]) : [];
  return (
    <Section title="Dérogation demandée" description="Limites dépassées par l'offre soumise">
      <div className="grid gap-4 sm:grid-cols-3">
        <Detail label="Pièce" mono>{str(d.documentNumber) ?? r.subjectRef}</Detail>
        <Detail label="Type de pièce">{str(d.documentType)}</Detail>
        <Detail label="Client">{str(d.customer)}</Detail>
        <Detail label="Total de l'offre" mono>{money(nbr(d.totalAmount) ?? r.amount, c)}</Detail>
        <Detail label="Motif du demandeur" wide>{str(d.reason)}</Detail>
      </div>
      {violations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Limites dépassées</p>
          {violations.map((v, i) => {
            const t = str(v.type);
            const fmt = (n?: number) => (n == null ? "—" : isRate(t) ? `${n} %` : formatMoney(n, cur(c)));
            return (
              <div key={i} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{(t && VIOLATION_LABEL[t]) ?? t ?? "Limite"}</span>
                  {str(v.severity) === "BLOCK" ? <StatusChip tone="danger">Bloque l'émission</StatusChip> : str(v.severity) && <StatusChip tone="warn">{str(v.severity)}</StatusChip>}
                </div>
                {(str(v.lineDescription) || str(v.itemCode)) ? <p className="mt-0.5 text-xs text-gray-500">{[str(v.lineDescription), str(v.itemCode)].filter(Boolean).join(" · ")}</p> : <p className="mt-0.5 text-xs text-gray-500">Toute la pièce</p>}
                <p className="mt-1 tabular-nums text-gray-700">Constaté <b>{fmt(nbr(v.observed))}</b> · limite <b>{fmt(nbr(v.limit))}</b></p>
                {str(v.message) && <p className="mt-1 text-xs text-gray-500">{str(v.message)}</p>}
              </div>
            );
          })}
        </div>
      )}
      {r.status === "APPROVED" && <p className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">Après l'accord, le demandeur émet la pièce normalement. Si l'offre est modifiée, une nouvelle demande part.</p>}
    </Section>
  );
};

/** Détails propres à une demande du centre BILLING, selon `requestType`. Rend `null` si le type n'est pas connu. */
export const BillingApprovalDetails: React.FC<{ request: ApprovalRequest; details: unknown }> = ({ request, details }) => {
  const d = rec(details);
  if (request.requestType === "INVOICE_CHANGE") return <InvoiceChange r={request} d={d} />;
  if (request.requestType === "DISCOUNT_OVERRIDE") return <DiscountOverride r={request} d={d} />;
  return null;
};

