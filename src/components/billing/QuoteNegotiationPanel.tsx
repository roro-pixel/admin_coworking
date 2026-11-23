import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, History } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import { FIELD_SOFT, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { LINE_CHANGE_LABEL, LINE_CHANGE_TONE, NEGOTIATION_ORIGIN_LABEL, STATUS_LABEL } from "./billingLabels";
import type { BillingDocumentStatus } from "../../services/billing.service";

/** Réactivation d'un devis expiré : nouvelle date de validité + motif. */
const RevalidateForm: React.FC<{ quoteNumber: string; onDone: () => void; onCancel: () => void }> = ({ quoteNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => billingService.revalidateQuote(quoteNumber, { validUntil, reason: reason.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-document", quoteNumber] });
      qc.invalidateQueries({ queryKey: ["billing-documents"] });
      qc.invalidateQueries({ queryKey: ["billing-quote-negotiation", quoteNumber] });
      toast.success("Devis réactivé.");
      onDone();
    },
    onError: (e: unknown) => setError(billingError(e, "Impossible de réactiver le devis.")),
  });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  return (
    <PanelForm title="Réactiver le devis" submitLabel="Réactiver" pending={m.isPending} submitDisabled={!validUntil || !reason.trim()} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Valable jusqu'au" required hint="Postérieure à aujourd'hui"><input type="date" min={tomorrow} className={FIELD_SOFT} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
        <Field label="Motif" required><input className={FIELD_SOFT} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Le client confirme son intérêt" /></Field>
      </div>
    </PanelForm>
  );
};

/** Frise de négociation d'un devis : une entrée par version, écart de prix, lignes changées. */
export const QuoteNegotiationPanel: React.FC<{ quoteNumber: string; currency: string; status?: string }> = ({ quoteNumber, currency, status }) => {
  const cur = currencyLabel(currency);
  const [reviving, setReviving] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-quote-negotiation", quoteNumber], queryFn: () => billingService.getQuoteNegotiation(quoteNumber) });
  const rounds = data?.rounds ?? [];

  return (
    <Section title="Négociation" icon={History} description={data?.currentRevision != null ? `Version courante : ${data.currentRevision}` : undefined}
      action={status === "EXPIRED" && !reviving ? <ActionButton variant="ghost" icon={CalendarClock} className="!px-4 !py-2" onClick={() => setReviving(true)}>Réactiver</ActionButton> : undefined}>
      {reviving && <RevalidateForm quoteNumber={quoteNumber} onDone={() => setReviving(false)} onCancel={() => setReviving(false)} />}
      {isLoading ? <Skeleton className="h-20 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger la négociation." onRetry={() => refetch()} />
        : rounds.length === 0 ? <EmptyState icon={History} title="Aucune révision" hint="Chaque révision du devis apparaît ici avec son motif et l'écart de prix." />
        : (
          <ol className="space-y-3">
            {[...rounds].reverse().map((r) => (
              <li key={r.version}>
                <ItemRow className={r.current ? "ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)]" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        Version {r.version}{r.current ? " (courante)" : ""}
                        {r.origin && <span className="font-normal text-gray-400"> · {NEGOTIATION_ORIGIN_LABEL[r.origin] ?? r.origin}</span>}
                      </p>
                      {r.reason && <p className="mt-0.5 text-sm text-gray-600">{r.reason}</p>}
                      <p className="mt-0.5 text-xs text-gray-400">{r.authorName ?? "—"} · {formatDateTime(r.changedAt)}{r.sentToCustomerAt ? ` · transmis ${formatDateTime(r.sentToCustomerAt)}` : ""}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-gray-900">{formatMoney(r.totalAmount, cur)}</p>
                      {r.totalDelta != null && r.totalDelta !== 0 && (
                        <p className={`text-xs font-semibold tabular-nums ${r.totalDelta < 0 ? "text-emerald-600" : "text-red-600"}`}>{r.totalDelta > 0 ? "+" : ""}{formatMoney(r.totalDelta, cur)}</p>
                      )}
                      {r.status && <div className="mt-1"><Tag>{STATUS_LABEL[r.status as BillingDocumentStatus] ?? r.status}</Tag></div>}
                    </div>
                  </div>
                  {(r.lineChanges ?? []).length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-500">{r.lineChanges!.length} ligne{r.lineChanges!.length > 1 ? "s" : ""} changée{r.lineChanges!.length > 1 ? "s" : ""}</summary>
                      <ul className="mt-2 space-y-1.5">
                        {r.lineChanges!.map((c, i) => (
                          <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            <StatusChip tone={LINE_CHANGE_TONE[c.change ?? ""] ?? "neutral"}>{LINE_CHANGE_LABEL[c.change ?? ""] ?? c.change}</StatusChip>
                            <span className="font-semibold text-gray-800">{c.description}</span>
                            {c.quantityBefore !== c.quantityAfter && <span>qté {c.quantityBefore ?? "—"} → {c.quantityAfter ?? "—"}</span>}
                            {c.unitPriceBefore !== c.unitPriceAfter && <span>prix {c.unitPriceBefore ?? "—"} → {c.unitPriceAfter ?? "—"}</span>}
                            {c.discountBefore !== c.discountAfter && <span>remise {c.discountBefore ?? "—"} → {c.discountAfter ?? "—"}</span>}
                            {c.totalBefore !== c.totalAfter && <span>total {c.totalBefore ?? "—"} → {c.totalAfter ?? "—"}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </ItemRow>
              </li>
            ))}
          </ol>
        )}
    </Section>
  );
};
