import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareWarning } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { billingService } from "../../services/billing.service";
import type { Claim } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { CLAIM_STATUS_LABEL, CLAIM_STATUS_TONE } from "./billingLabels";

/** Ouverture d'une réclamation sur un document. */
export const OpenClaimPanel: React.FC<{ documentNumber: string; currency: string; onCancel: () => void; onOpened: (c: Claim) => void }> = ({ documentNumber, currency, onCancel, onOpened }) => {
  const qc = useQueryClient();
  const reasons = useQuery({ queryKey: ["billing-claim-reasons"], queryFn: () => billingService.listClaimReasons() });
  const [reasonCode, setReasonCode] = useState("");
  const [description, setDescription] = useState("");
  const [lineOrders, setLineOrders] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => {
      const orders = lineOrders.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n));
      return billingService.openClaim(documentNumber, { reasonCode, description: description.trim() || undefined, lineOrders: orders.length ? orders : undefined, requestedAmount: amount ? Number(amount) : undefined });
    },
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ["billing-claims"] }); toast.success(`Réclamation ${c.claimNumber} ouverte.`); onOpened(c); },
    onError: (e: unknown) => setError(billingError(e, "Impossible d'ouvrir la réclamation.")),
  });
  return (
    <PanelForm title="Ouvrir une réclamation" submitLabel="Ouvrir" pending={m.isPending} submitDisabled={!reasonCode} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Motif" required>
          <select className={FIELD_SOFT} value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
            <option value="">Choisir…</option>
            {(reasons.data ?? []).filter((r) => r.active !== false).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </Field>
        <Field label={`Montant contesté (${currencyLabel(currency)})`} hint="Vide : toute la facture"><input type="number" min={0} className={FIELD_SOFT} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Lignes concernées" hint="Numéros séparés par une virgule" className="sm:col-span-2"><input className={FIELD_SOFT} value={lineOrders} onChange={(e) => setLineOrders(e.target.value)} placeholder="1,3" /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea rows={3} className={`${FIELD_SOFT} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
    </PanelForm>
  );
};

/** Réclamations d'un document (ou d'un client) avec décision : accepter (avoir), rejeter, retirer. */
export const ClaimsPanel: React.FC<{ documentNumber?: string; customerType?: string; customerCode?: string; currency: string; canDecide: boolean; canOpen?: boolean }> = ({ documentNumber, customerType, customerCode, currency, canDecide, canOpen }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cur = currencyLabel(currency);
  const [opening, setOpening] = useState(false);
  const [deciding, setDeciding] = useState<{ claim: Claim; kind: "accept" | "reject" } | null>(null);
  const [granted, setGranted] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-claims", documentNumber ?? `${customerType}/${customerCode}`],
    queryFn: () => billingService.listClaims({ documentNumber, customerType, customerCode }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["billing-claims"] });

  const decide = useMutation({
    mutationFn: () => deciding!.kind === "accept"
      ? billingService.acceptClaim(deciding!.claim.claimNumber, { grantedAmount: granted ? Number(granted) : undefined, comment: comment.trim() || undefined })
      : billingService.rejectClaim(deciding!.claim.claimNumber, comment.trim()),
    onSuccess: (c) => { refresh(); setDeciding(null); setGranted(""); setComment(""); toast.success(c.creditNoteNumber ? `Réclamation acceptée : avoir ${c.creditNoteNumber}.` : "Décision enregistrée."); },
    onError: (e: unknown) => setError(billingError(e, "Décision impossible.")),
  });
  const withdraw = useMutation({
    mutationFn: (n: string) => billingService.withdrawClaim(n),
    onSuccess: () => { refresh(); toast.success("Réclamation retirée."); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible de retirer la réclamation.")),
  });

  return (
    <Section title="Réclamations" icon={MessageSquareWarning}
      action={canOpen && documentNumber && !opening ? <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => setOpening(true)}>Ouvrir une réclamation</ActionButton> : undefined}>
      {opening && documentNumber && <OpenClaimPanel documentNumber={documentNumber} currency={currency} onCancel={() => setOpening(false)} onOpened={() => setOpening(false)} />}
      {deciding && (
        <PanelForm title={`${deciding.kind === "accept" ? "Accepter" : "Rejeter"} ${deciding.claim.claimNumber}`} submitLabel={deciding.kind === "accept" ? "Accepter (avoir)" : "Rejeter"} pending={decide.isPending}
          submitDisabled={deciding.kind === "reject" && !comment.trim()} error={error} onCancel={() => { setDeciding(null); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); decide.mutate(); }}>
          {deciding.kind === "accept" && (
            <Field label={`Montant accordé (${cur})`} hint={`Vide : montant demandé${deciding.claim.requestedAmount != null ? ` (${formatMoney(deciding.claim.requestedAmount, cur)})` : ""}. Un avoir est créé.`}>
              <input type="number" min={0.01} step="any" className={FIELD_SOFT} value={granted} onChange={(e) => setGranted(e.target.value)} />
            </Field>
          )}
          <Field label="Commentaire" required={deciding.kind === "reject"}><textarea rows={3} maxLength={2000} className={`${FIELD_SOFT} resize-none`} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        </PanelForm>
      )}
      {isLoading ? <Skeleton className="h-14 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les réclamations." onRetry={() => refetch()} />
        : (data ?? []).length === 0 ? <EmptyState icon={MessageSquareWarning} title="Aucune réclamation" />
        : (
          <div className="space-y-2">
            {(data ?? []).map((c) => (
              <ItemRow key={c.claimNumber}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.reasonLabel ?? c.reasonCode} <span className="font-mono text-xs font-normal text-gray-400">{c.claimNumber}</span></p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {!documentNumber && c.documentNumber && <><button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${c.documentNumber}`)}>{c.documentNumber}</button> · </>}
                      {c.requestedAmount != null ? `${formatMoney(c.requestedAmount, cur)} demandés` : "Toute la facture"}
                      {c.grantedAmount != null ? ` · ${formatMoney(c.grantedAmount, cur)} accordés` : ""} · {formatDateTime(c.createdAt)}{c.channel === "PORTAL" ? " · espace client" : ""}
                    </p>
                    {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
                    {c.decisionComment && <p className="mt-1 text-xs text-gray-500">« {c.decisionComment} »{c.decidedBy ? ` · ${c.decidedBy}` : ""}</p>}
                    {c.creditNoteNumber && <p className="mt-1 text-xs text-gray-500">Avoir <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${c.creditNoteNumber}`)}>{c.creditNoteNumber}</button></p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone={CLAIM_STATUS_TONE[c.status ?? ""] ?? "neutral"}>{CLAIM_STATUS_LABEL[c.status ?? ""] ?? c.status}</StatusChip>
                    {c.status === "OPEN" && canDecide && (
                      <>
                        <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setDeciding({ claim: c, kind: "accept" }); setError(null); }}>Accepter</ActionButton>
                        <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setDeciding({ claim: c, kind: "reject" }); setError(null); }}>Rejeter</ActionButton>
                      </>
                    )}
                    {c.status === "OPEN" && <ActionButton variant="ghost" className="!px-4 !py-2" pending={withdraw.isPending && withdraw.variables === c.claimNumber} onClick={() => withdraw.mutate(c.claimNumber)}>Retirer</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};
