import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Ban,
  Banknote,
  FileText,
  Hourglass,
  Landmark,
  Link2,
  Receipt,
  RotateCcw,
  Smartphone,
  Undo2,
  Wallet,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentIntent, PaymentTransaction } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  Detail,
  EmptyState,
  ErrorBlock,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  PanelForm,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { DetailsSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { MobileMoneyModal } from "../../components/payment/MobileMoneyModal";
import { ReceiptModal } from "../../components/payment/ReceiptModal";
import { CashPayPanel, intentChangePreview } from "../../components/payment/CashPayPanel";
import { OfflinePayPanel } from "../../components/payment/OfflinePayPanel";
import { PaymentLinkPanel } from "../../components/payment/PaymentLinkPanel";
import { RefundPanel } from "../../components/payment/RefundPanel";
import type { RefundMode } from "../../components/payment/RefundPanel";
import {
  CHANNEL_LABEL,
  CUSTOMER_TYPE_LABEL,
  INTENT_STATUS,
  PURPOSE_LABEL,
  TXN_STATUS,
  methodText,
  sourceLabel,
} from "../../components/payment/paymentLabels";
import { currencyLabel, isPayableNow, payableOf, saveBlob } from "../../components/payment/paymentUtils";

type PayPanel = null | "cash" | "offline" | "wallet" | "mobile" | "link" | "cancel" | "relaunch";

/** Montant mis en avant dans le résumé d'une intention. */
const Figure: React.FC<{ label: string; value: string; tone?: "default" | "success" | "warn" }> = ({
  label,
  value,
  tone = "default",
}) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{label}</p>
    <p
      className={`mt-1 text-lg font-bold tabular-nums ${
        tone === "success" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-gray-950"
      }`}
    >
      {value}
    </p>
  </div>
);

export const PaymentIntentDetailPage: React.FC = () => {
  const { intentNumber } = useParams<{ intentNumber: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canProcess = hasPermission("PAYMENT:PROCESS");
  const canRefund = hasPermission("PAYMENT:REFUND");

  const [panel, setPanel] = useState<PayPanel>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [relaunchAt, setRelaunchAt] = useState("");
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [refunding, setRefunding] = useState<{ txn: string; mode: RefundMode } | null>(null);
  const [receiptTxn, setReceiptTxn] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: intent, isLoading: intentLoading, isError, refetch } = useQuery({
    queryKey: ["payment-intent", intentNumber],
    queryFn: () => paymentService.getPaymentIntent(intentNumber!),
    enabled: !!intentNumber,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["payment-transactions", intentNumber],
    queryFn: () => paymentService.getTransactions(intentNumber!),
    enabled: !!intentNumber,
  });

  // Reste remboursable par transaction : montant d'origine - remboursements REFUNDED, REVERSED ou PROCESSING.
  const succeededTransactions = (transactions as PaymentTransaction[]).filter((t) => t.status === "SUCCEEDED");
  const refundsQueries = useQueries({
    queries: succeededTransactions.map((txn) => ({
      queryKey: ["transaction-refunds", txn.transactionNumber],
      queryFn: () => paymentService.getTransactionRefunds(txn.transactionNumber),
      enabled: !!txn.transactionNumber && canRefund,
    })),
  });
  const refundedByTxn: Record<string, number> = {};
  succeededTransactions.forEach((txn, idx) => {
    const refunds = refundsQueries[idx]?.data ?? [];
    refundedByTxn[txn.transactionNumber] = refunds
      .filter((r) => ["REFUNDED", "REVERSED", "PROCESSING"].includes(String(r.status)))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  });
  const remainingRefundable = (txn: PaymentTransaction) =>
    Math.max(0, txn.amount - (refundedByTxn[txn.transactionNumber] ?? 0));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-intent", intentNumber] });
    queryClient.invalidateQueries({ queryKey: ["payment-transactions", intentNumber] });
    queryClient.invalidateQueries({ queryKey: ["transaction-refunds"] });
    queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
    queryClient.invalidateQueries({ queryKey: ["cash-sessions-open-select"] });
  };

  /** Après annulation ou relance, l'intention affichée est remplacée par la réponse. */
  const adoptIntent = (data: PaymentIntent) => {
    queryClient.setQueryData(["payment-intent", intentNumber], data);
    queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
  };

  const payWalletMutation = useMutation({
    mutationFn: () => paymentService.payWallet(intent!.intentNumber, { walletNumber: walletNumber.trim() }),
    onSuccess: (data) => {
      invalidateAll();
      setPanel(null);
      setWalletNumber("");
      setWalletError(null);
      toast.success("Paiement par portefeuille enregistré");
      setReceiptTxn(data.transactionNumber);
    },
    onError: (error: unknown) => setWalletError(apiMessage(error, "Erreur lors du paiement par portefeuille.")),
  });

  const cancelMutation = useMutation({
    mutationFn: () => paymentService.cancelPaymentIntent(intent!.intentNumber, cancelReason),
    onSuccess: (data) => {
      adoptIntent(data);
      setPanel(null);
      setCancelReason("");
      setLifecycleError(null);
      toast.success("Intention annulée");
    },
    onError: (e: unknown) => setLifecycleError(apiMessage(e, "Annulation impossible.")),
  });

  const relaunchMutation = useMutation({
    mutationFn: () =>
      paymentService.relaunchPaymentIntent(intent!.intentNumber, relaunchAt ? new Date(relaunchAt).toISOString() : undefined),
    onSuccess: (data) => {
      adoptIntent(data);
      setPanel(null);
      setRelaunchAt("");
      setLifecycleError(null);
      toast.success("Intention relancée");
    },
    onError: (e: unknown) => setLifecycleError(apiMessage(e, "Relance impossible.")),
  });

  const downloadReceipt = async (transactionNumber: string) => {
    setDownloading(true);
    try {
      saveBlob(await paymentService.getReceiptPdf(transactionNumber), `recu_${transactionNumber}.pdf`);
    } catch {
      toast.error("Téléchargement impossible");
    } finally {
      setDownloading(false);
    }
  };

  const togglePanel = (p: Exclude<PayPanel, null>) => {
    setWalletError(null);
    setLifecycleError(null);
    setPanel(panel === p ? null : p);
  };

  // La mise en page (AdminLayout, marque, toasts) est fournie par PaymentMaster.
  const shell = (children: React.ReactNode) => <div className="mx-auto w-full max-w-4xl">{children}</div>;

  if (intentLoading) return shell(<DetailsSkeleton />);

  if (isError || !intent) {
    return shell(
      <>
        <PageHeader title="Intention introuvable" onBack={() => navigate("/payments")} backLabel="Retour aux intentions" />
        <ErrorBlock message="Cette intention n'existe pas ou n'a pas pu être chargée." onRetry={() => refetch()} />
      </>,
    );
  }

  const st = statusOf(INTENT_STATUS, intent.status);
  const open = intent.status === "PENDING" || intent.status === "PROCESSING";
  const payable = payableOf(intent);
  const processing = intent.processingAmount ?? 0;
  const canPayNow = isPayableNow(intent);
  const money = (n?: number | null) => formatMoney(n, currencyLabel(intent.currency));

  const methodButtons = [
    { id: "cash", label: "Espèces", icon: Banknote },
    { id: "offline", label: "Chèque, virement, MoMo marchand", icon: Landmark },
    { id: "wallet", label: "Portefeuille", icon: Wallet },
    { id: "mobile", label: "Mobile money", icon: Smartphone },
  ] as const;

  return shell(
    <>
      <PageHeader
        title={intent.intentNumber}
        subtitle={`${PURPOSE_LABEL[intent.purpose] ?? intent.purpose} · ${sourceLabel(intent.sourceType) || intent.sourceType}`}
        onBack={() => navigate("/payments")}
        backLabel="Retour aux intentions"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
      />

      <div className="space-y-5">
        <Section
          title="Résumé"
          action={
            canProcess ? (
              <div className="flex flex-wrap justify-end gap-2">
                {open && (
                  <ActionButton variant="ghost" icon={Link2} onClick={() => togglePanel("link")}>
                    Lien de paiement
                  </ActionButton>
                )}
                {intent.relaunchable && (
                  <ActionButton variant="ghost" icon={RotateCcw} onClick={() => togglePanel("relaunch")}>
                    Relancer
                  </ActionButton>
                )}
                {intent.cancellable && (
                  <ActionButton variant="ghost" icon={Ban} onClick={() => togglePanel("cancel")}>
                    Annuler l'intention
                  </ActionButton>
                )}
              </div>
            ) : undefined
          }
        >
          <p className="text-3xl font-bold tracking-tight text-gray-950">{money(intent.amount)}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure label="Encaissé" value={money(intent.paidAmount ?? 0)} tone={(intent.paidAmount ?? 0) > 0 ? "success" : "default"} />
            <Figure label="En attente d'un opérateur" value={money(processing)} tone={processing > 0 ? "warn" : "default"} />
            <Figure label="Reste à payer" value={money(intent.remainingAmount ?? Math.max(0, intent.amount - (intent.paidAmount ?? 0)))} />
            <Figure label="Encaissable maintenant" value={money(payable)} />
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Client">{intent.customerName || intent.customerCode}</Detail>
            <Detail label="Type de client">{CUSTOMER_TYPE_LABEL[intent.customerType] ?? intent.customerType}</Detail>
            <Detail label="Code client" mono>{intent.customerCode}</Detail>
            <Detail label="E-mail">{intent.customerEmail}</Detail>
            <Detail label="Téléphone">{intent.customerPhone}</Detail>
            <Detail label="Source" mono>{intent.sourceCode ? `${intent.sourceType} / ${intent.sourceCode}` : undefined}</Detail>
            <Detail label="Document lié">{intent.resolvedSourceLabel}</Detail>
            <Detail label="Créée le">{formatDateTime(intent.createdAt)}</Detail>
            <Detail label="Expire le">{formatDateTime(intent.expiresAt)}</Detail>
            <Detail label="Lien de paiement jusqu'au">
              {intent.paymentLinkToken ? formatDateTime(intent.paymentLinkExpiresAt) || "Lien actif" : undefined}
            </Detail>
            <Detail label="Relances">
              {intent.relaunchCount
                ? `${intent.relaunchCount} · dernière le ${formatDateTime(intent.lastRelaunchedAt)}${intent.lastRelaunchedBy ? ` par ${intent.lastRelaunchedBy}` : ""}`
                : undefined}
            </Detail>
          </dl>

          {intent.status === "CANCELLED" && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-sm">
              <p className="font-bold text-gray-950">Intention annulée</p>
              <p className="mt-1">
                {intent.cancelledAt ? `Le ${formatDateTime(intent.cancelledAt)}` : ""}
                {intent.cancelledBy ? ` par ${intent.cancelledBy}` : ""}
                {intent.cancellationReason ? ` : ${intent.cancellationReason}` : ""}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Les paiements déjà reçus restent imputés sur leurs factures : l'annulation ferme seulement cette demande de paiement.
              </p>
            </div>
          )}
        </Section>

        {panel === "link" && <PaymentLinkPanel intent={intent} onClose={() => setPanel(null)} />}

        {panel === "cancel" && (
          <PanelForm
            title="Annuler l'intention"
            onSubmit={(e) => {
              e.preventDefault();
              setLifecycleError(null);
              cancelMutation.mutate();
            }}
            onCancel={() => setPanel(null)}
            pending={cancelMutation.isPending}
            submitLabel="Annuler l'intention"
            error={lifecycleError}
          >
            <p className="text-sm text-gray-500">
              Le lien de paiement envoyé au client sera fermé. Un dépôt mobile money encore en attente de l'opérateur empêche l'annulation.
            </p>
            <Field label="Motif" hint="Facultatif, 500 caractères au plus">
              <textarea
                rows={2}
                maxLength={500}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Le client paiera par chèque"
                className={FIELD}
              />
            </Field>
          </PanelForm>
        )}

        {panel === "relaunch" && (
          <PanelForm
            title="Relancer l'intention"
            onSubmit={(e) => {
              e.preventDefault();
              if (relaunchAt && new Date(relaunchAt).getTime() <= Date.now()) {
                setLifecycleError("La nouvelle échéance doit être dans le futur.");
                return;
              }
              setLifecycleError(null);
              relaunchMutation.mutate();
            }}
            onCancel={() => setPanel(null)}
            pending={relaunchMutation.isPending}
            submitLabel="Relancer"
            error={lifecycleError}
          >
            <p className="text-sm text-gray-500">
              L'intention est rouverte sous le même numéro et le même lien. Si des factures ont été payées en partie entre-temps, son montant
              est recalculé.
            </p>
            <Field label="Nouvelle échéance" hint="Facultatif : sinon la durée d'origine repart de maintenant (15 minutes à 30 jours)">
              <input type="datetime-local" value={relaunchAt} onChange={(e) => setRelaunchAt(e.target.value)} className={FIELD} />
            </Field>
          </PanelForm>
        )}

        {open && canProcess && (
          <Section
            title="Encaisser"
            description={canPayNow ? `Reste encaissable : ${money(payable)}` : "Aucun montant encaissable pour le moment."}
          >
            {processing > 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <Hourglass size={18} className="mt-0.5 shrink-0" />
                  <p>
                    Un paiement mobile money de <b>{money(processing)}</b> attend l'opérateur. Ne proposez pas de repayer ce montant tant qu'il
                    n'est pas confirmé ou refusé.
                  </p>
                </div>
                <ActionButton variant="ghost" icon={Smartphone} onClick={() => togglePanel("mobile")}>
                  Suivre ce paiement
                </ActionButton>
              </div>
            )}

            {canPayNow && (
              <div className="flex flex-wrap gap-2">
                {methodButtons.map(({ id, label, icon: Icon }) => (
                  <ActionButton key={id} icon={Icon} variant={panel === id ? "primary" : "ghost"} onClick={() => togglePanel(id)}>
                    {label}
                  </ActionButton>
                ))}
              </div>
            )}

            <div className="mt-4">
              {panel === "cash" && canPayNow && (
                <CashPayPanel
                  due={payable}
                  currency={intent.currency}
                  preview={intentChangePreview(intent.intentNumber)}
                  pay={(payload) => paymentService.payCash(intent.intentNumber, payload)}
                  onCancel={() => setPanel(null)}
                  onDone={(txn) => {
                    invalidateAll();
                    setPanel(null);
                    toast.success(
                      txn.changeAmount && txn.changeAmount > 0
                        ? `Paiement en espèces enregistré. Monnaie à rendre : ${money(txn.changeAmount)}`
                        : "Paiement en espèces enregistré",
                    );
                    setReceiptTxn(txn.transactionNumber);
                  }}
                />
              )}

              {panel === "offline" && canPayNow && (
                <OfflinePayPanel
                  due={payable}
                  currency={intent.currency}
                  pay={(payload) => paymentService.payOffline(intent.intentNumber, payload)}
                  onCancel={() => setPanel(null)}
                  onDone={(txn) => {
                    invalidateAll();
                    setPanel(null);
                    toast.success("Paiement enregistré");
                    setReceiptTxn(txn.transactionNumber);
                  }}
                />
              )}

              {panel === "wallet" && canPayNow && (
                <PanelForm
                  title="Paiement par portefeuille"
                  onSubmit={(e) => {
                    e.preventDefault();
                    payWalletMutation.mutate();
                  }}
                  onCancel={() => setPanel(null)}
                  pending={payWalletMutation.isPending}
                  submitLabel={`Payer ${money(payable)}`}
                  submitDisabled={!walletNumber.trim()}
                  error={walletError}
                >
                  <Field
                    label="Numéro de portefeuille"
                    required
                    hint="Le portefeuille doit appartenir au client de l'intention (un membre et son client personne comptent pour un seul), être actif et dans la même devise."
                  >
                    <input
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      placeholder="WAL-000001"
                      className={`${FIELD_SOFT} font-mono`}
                      autoFocus
                    />
                  </Field>
                </PanelForm>
              )}

              <MobileMoneyModal
                isOpen={panel === "mobile"}
                onClose={() => {
                  setPanel(null);
                  invalidateAll();
                }}
                intent={intent}
                onPaymentSuccess={(t) => {
                  invalidateAll();
                  setReceiptTxn(t);
                }}
              />
            </div>
          </Section>
        )}

        <Section
          title="Transactions"
          description={transactions.length > 0 ? `${transactions.length} transaction${transactions.length > 1 ? "s" : ""}` : undefined}
        >
          {txLoading ? (
            <ListSkeleton rows={2} />
          ) : transactions.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Aucune transaction" hint="Les règlements apparaîtront ici." />
          ) : (
            <div className="space-y-3">
              {(transactions as PaymentTransaction[]).map((txn) => {
                const ts = statusOf(TXN_STATUS, txn.status);
                const remaining = remainingRefundable(txn);
                const alreadyRefunded = refundedByTxn[txn.transactionNumber] ?? 0;
                const ok = txn.status === "SUCCEEDED";
                const refundOpen = refunding?.txn === txn.transactionNumber ? refunding.mode : null;
                const method = txn.paymentMethod ?? txn.method ?? "";
                const label = methodText(method, txn.paymentMethodLabel);
                return (
                  <ItemRow key={txn.transactionNumber}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{txn.transactionNumber}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StatusChip tone={ts.tone}>{ts.label}</StatusChip>
                          <span className="text-xs text-gray-500">
                            {label}
                            {txn.provider && method === "MOBILE_MONEY" && !label.includes(txn.provider) ? ` · ${txn.provider}` : ""}
                          </span>
                          {txn.channel && <span className="text-xs text-gray-400">· {CHANNEL_LABEL[txn.channel] ?? txn.channel}</span>}
                        </div>
                        <p className="mt-1.5 text-xs text-gray-400">
                          {formatDateTime(txn.paidAt ?? txn.processedAt ?? txn.createdAt)}
                          {txn.providerReference ? ` · Réf. ${txn.providerReference}` : ""}
                          {txn.bankName ? ` · ${txn.bankName}` : ""}
                          {txn.payerName ? ` · ${txn.payerName}` : ""}
                          {txn.cashSessionNumber ? ` · Session ${txn.cashSessionNumber}` : ""}
                        </p>
                        {txn.tenderedAmount != null && (
                          <p className="mt-1 text-xs text-gray-500">
                            Remis {money(txn.tenderedAmount)} · monnaie rendue {money(txn.changeAmount ?? 0)}
                          </p>
                        )}
                        {txn.status === "FAILED" && txn.failureReason && (
                          <p className="mt-1 text-xs text-red-600">{txn.failureReason}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold tabular-nums text-gray-950">{money(txn.amount)}</p>
                        {ok && (
                          <p className="text-xs text-gray-400">
                            {alreadyRefunded > 0 ? `${money(alreadyRefunded)} remboursé · ` : ""}
                            reste {money(remaining)}
                          </p>
                        )}
                      </div>
                    </div>

                    {ok && (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <IconButton icon={Receipt} label="Voir le reçu" onClick={() => setReceiptTxn(txn.transactionNumber)} />
                        {canRefund && remaining > 0 && (
                          <IconButton
                            icon={Undo2}
                            label="Rembourser"
                            onClick={() => setRefunding(refundOpen === "refund" ? null : { txn: txn.transactionNumber, mode: "refund" })}
                          />
                        )}
                        {canProcess && remaining > 0 && (
                          <IconButton
                            icon={RotateCcw}
                            label="Extourner"
                            tone="danger"
                            onClick={() => setRefunding(refundOpen === "reverse" ? null : { txn: txn.transactionNumber, mode: "reverse" })}
                          />
                        )}
                      </div>
                    )}

                    {refundOpen && (
                      <RefundPanel
                        key={`${txn.transactionNumber}-${refundOpen}`}
                        txn={txn}
                        mode={refundOpen}
                        remaining={remaining}
                        currency={intent.currency}
                        onClose={() => setRefunding(null)}
                        onDone={() => {
                          invalidateAll();
                          setRefunding(null);
                          toast.success(refundOpen === "refund" ? "Remboursement enregistré" : "Extourne enregistrée");
                        }}
                      />
                    )}
                  </ItemRow>
                );
              })}
            </div>
          )}
        </Section>

        {intent.sourceType === "BILLING_DOCUMENT" && intent.sourceCode && (
          <p className="flex items-center gap-2 px-2 text-xs text-gray-400">
            <FileText size={14} />
            Cette intention règle la facture {intent.sourceCode}.
          </p>
        )}
      </div>

      <ReceiptModal
        transactionNumber={receiptTxn}
        onClose={() => setReceiptTxn(null)}
        onDownload={downloadReceipt}
        downloading={downloading}
      />
    </>,
  );
};
