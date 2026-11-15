import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileSignature, Send, X } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { SubscriptionQuoteView } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, Detail, ErrorBlock, PageHeader, Section, StatusChip, Tag } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { statusOf } from "../../../components/subscription/labels";
import { LifecycleShell } from "../../../components/subscription/lifecycle/LifecycleShell";
import { ReasonPanel } from "../../../components/subscription/lifecycle/ReasonPanel";
import { BILLING_CYCLE_OPTIONS, QUOTE_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";

/** Fiche d'un devis : perspective de prix, envoi, acceptation (création de l'abonnement) ou refus. */
export const QuoteDetailPage: React.FC = () => {
  const { number = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const { data: q, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-quote", number],
    queryFn: () => subscriptionLifecycleService.getQuote(number),
    enabled: !!number,
  });
  const open = q ? ["DRAFT", "SENT"].includes(q.status) : false;
  const outlook = useQuery({
    queryKey: ["subscription-quote", number, "outlook"],
    queryFn: () => subscriptionLifecycleService.getQuoteOutlook(number),
    enabled: !!number && open,
  });

  const update = (msg: string) => (v: SubscriptionQuoteView) => {
    if (msg) toast.success(msg);
    setRejecting(false);
    qc.setQueryData(["subscription-quote", number], v);
    qc.invalidateQueries({ queryKey: ["subscription-quotes"] });
    qc.invalidateQueries({ queryKey: ["subscription-quote", number, "outlook"] });
  };
  const send = useMutation({ mutationFn: () => subscriptionLifecycleService.sendQuote(number), onSuccess: update("Devis envoyé au souscripteur"), onError: (e) => toast.error(apiMessage(e, "Envoi impossible.")) });
  const reject = useMutation({ mutationFn: (r: string) => subscriptionLifecycleService.rejectQuote(number, r), onSuccess: update("Devis refusé"), onError: (e) => toast.error(apiMessage(e, "Refus impossible.")) });
  const accept = () =>
    toast.confirm({
      message: "Accepter ce devis ?",
      detail: "L'abonnement est créé. Le paiement l'activera.",
      confirmLabel: "Accepter",
      pendingLabel: "Acceptation",
      successMessage: "Devis accepté, abonnement créé",
      errorMessage: "Acceptation impossible",
      onConfirm: async () => update("")(await subscriptionLifecycleService.acceptQuote(number)),
    });

  return (
    <LifecycleShell>
      <div className="mx-auto w-full max-w-4xl">
        {isLoading ? (
          <DetailsSkeleton />
        ) : isError || !q ? (
          <ErrorBlock message="Devis introuvable." onRetry={() => refetch()} />
        ) : (
          (() => {
            const st = statusOf(QUOTE_STATUS, q.status);
            const o = outlook.data;
            const cycle = BILLING_CYCLE_OPTIONS.find((c) => c.value === q.billingCycle)?.label ?? q.billingCycle;
            return (
              <>
                <PageHeader
                  title={q.quoteNumber}
                  subtitle={q.subscriberCode ? `Pour ${q.subscriberCode}` : undefined}
                  onBack={() => navigate("/subscriptions/quotes")}
                  backLabel="Retour aux devis"
                  badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
                  actions={
                    open && !rejecting && (
                      <div className="flex flex-wrap gap-2">
                        {q.status === "DRAFT" && <ActionButton variant="ghost" icon={Send} pending={send.isPending} onClick={() => send.mutate()}>Envoyer</ActionButton>}
                        <ActionButton icon={Check} onClick={accept} disabled={!!o?.blockingReason}>Accepter</ActionButton>
                        <ActionButton variant="danger" icon={X} onClick={() => setRejecting(true)}>Refuser</ActionButton>
                      </div>
                    )
                  }
                />
                <div className="space-y-5">
                  {rejecting && <ReasonPanel title="Refuser le devis" submitLabel="Refuser" pending={reject.isPending} onSubmit={(r) => reject.mutate(r)} onCancel={() => setRejecting(false)} />}

                  {open && (
                    <Section title="Perspective de prix" description="Ce que le devis change par rapport au catalogue">
                      {outlook.isLoading ? (
                        <Skeleton className="h-20 w-full rounded-2xl" />
                      ) : outlook.isError || !o ? (
                        <ErrorBlock message="Perspective indisponible." onRetry={() => outlook.refetch()} />
                      ) : (
                        <div className="space-y-3">
                          {o.blockingReason && <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"><span className="font-semibold">Refusé : </span>{o.blockingReason}</div>}
                          {!o.blockingReason && o.requiresApproval && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Ce prix demandera le second visa d'une autre personne à l'acceptation.</div>}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-400">Prix catalogue</p><p className="mt-1 text-base font-bold text-gray-900">{formatMoney(o.cataloguePrice, "FCFA")}</p></div>
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-400">Prix proposé</p><p className="mt-1 text-base font-bold text-[color:var(--logo-pink-dark)]">{formatMoney(o.quotedPrice, "FCFA")}</p></div>
                            <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-400">Remise</p><p className="mt-1 text-base font-bold text-gray-900">{o.discountPercent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</p></div>
                          </div>
                        </div>
                      )}
                    </Section>
                  )}

                  <Section title="Devis" icon={FileSignature}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Souscripteur" mono>{q.subscriberCode}</Detail>
                      <Detail label="Type">{q.subscriberType}</Detail>
                      <Detail label="Plan" mono>{q.planCode}</Detail>
                      <Detail label="Cycle">{cycle}</Detail>
                      <Detail label="Prix proposé">{q.quotedPrice != null ? formatMoney(q.quotedPrice, "FCFA") : "Prix du catalogue"}</Detail>
                      <Detail label="Valable jusqu'au">{q.validUntil ? formatDate(q.validUntil) : undefined}</Detail>
                      <Detail label="Prix négocié">{q.negotiated ? <Tag tone="pink">Oui</Tag> : "Non"}</Detail>
                      <Detail label="Abonnement créé">
                        {q.convertedSubscriptionNumber ? <button type="button" onClick={() => navigate(`/subscriptions/${q.convertedSubscriptionNumber}`)} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">{q.convertedSubscriptionNumber}</button> : undefined}
                      </Detail>
                      <Detail label="Prix négocié posé">
                        {q.derivationCode ? <button type="button" onClick={() => navigate(`/subscriptions/derivations/${q.derivationCode}`)} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">{q.derivationCode}</button> : undefined}
                      </Detail>
                    </div>
                  </Section>
                </div>
              </>
            );
          })()
        )}
      </div>
    </LifecycleShell>
  );
};
