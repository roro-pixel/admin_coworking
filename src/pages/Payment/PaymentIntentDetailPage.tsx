import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Banknote, Receipt, RotateCcw, Smartphone, Undo2, Wallet } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentTransaction } from "../../services/payment.service";
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
import {
  CUSTOMER_TYPE_LABEL,
  INTENT_STATUS,
  METHOD_LABEL,
  PURPOSE_LABEL,
  TXN_STATUS,
} from "../../components/payment/paymentLabels";
import { currencyLabel, saveBlob } from "../../components/payment/paymentUtils";

type PayPanel = null | "cash" | "wallet" | "mobile";

export const PaymentIntentDetailPage: React.FC = () => {
  const { intentNumber } = useParams<{ intentNumber: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [panel, setPanel] = useState<PayPanel>(null);
  const [cashForm, setCashForm] = useState({ cashSessionNumber: "", providerReference: "" });
  const [cashError, setCashError] = useState<string | null>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);

  const [refundForm, setRefundForm] = useState({ amount: 0, reason: "" });
  const [reverseForm, setReverseForm] = useState({ amount: 0, reason: "" });
  const [refundingTxn, setRefundingTxn] = useState<string | null>(null);
  const [reversingTxn, setReversingTxn] = useState<string | null>(null);

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

  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions = openSessionsData?.content || [];

  // Historique des remboursements par transaction : sert à plafonner un nouveau remboursement
  // au solde restant (plusieurs remboursements partiels possibles, plafonnés au montant d'origine).
  const succeededTransactions = (transactions as PaymentTransaction[]).filter((t) => t.status === "SUCCEEDED");
  const refundsQueries = useQueries({
    queries: succeededTransactions.map((txn) => ({
      queryKey: ["transaction-refunds", txn.transactionNumber],
      queryFn: () => paymentService.getTransactionRefunds(txn.transactionNumber),
      enabled: !!txn.transactionNumber,
    })),
  });
  const refundedAmountByTxn: Record<string, number> = {};
  succeededTransactions.forEach((txn, idx) => {
    const refunds = refundsQueries[idx]?.data ?? [];
    refundedAmountByTxn[txn.transactionNumber] = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  });
  const remainingRefundable = (txn: PaymentTransaction) =>
    Math.max(0, txn.amount - (refundedAmountByTxn[txn.transactionNumber] ?? 0));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-intent", intentNumber] });
    queryClient.invalidateQueries({ queryKey: ["payment-transactions", intentNumber] });
    queryClient.invalidateQueries({ queryKey: ["transaction-refunds"] });
    queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
  };

  const payCashMutation = useMutation({
    mutationFn: () =>
      paymentService.payCash(intent!.intentNumber, {
        receivedBy: admin?.email || "admin",
        cashSessionNumber: cashForm.cashSessionNumber || undefined,
        providerReference: cashForm.providerReference || undefined,
      }),
    onSuccess: (data) => {
      invalidateAll();
      setPanel(null);
      setCashForm({ cashSessionNumber: "", providerReference: "" });
      setCashError(null);
      toast.success("Paiement en espèces enregistré");
      setReceiptTxn(data.transactionNumber);
    },
    onError: (error: unknown) => setCashError(apiMessage(error, "Erreur lors du paiement en espèces.")),
  });

  const payWalletMutation = useMutation({
    mutationFn: () =>
      paymentService.payWallet(intent!.intentNumber, {
        walletNumber,
        createdBy: admin?.email || "admin",
      }),
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

  const refundMutation = useMutation({
    mutationFn: ({ txnNumber, amount, reason }: { txnNumber: string; amount: number; reason: string }) =>
      paymentService.refundTransaction(txnNumber, { amount, reason, processedBy: admin?.email || "admin" }),
    onSuccess: () => {
      invalidateAll();
      setRefundingTxn(null);
      setRefundForm({ amount: 0, reason: "" });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: ({ txnNumber, amount, reason }: { txnNumber: string; amount: number; reason: string }) =>
      paymentService.reverseTransaction(txnNumber, { amount, reason, processedBy: admin?.email || "admin" }),
    onSuccess: () => {
      invalidateAll();
      setReversingTxn(null);
      setReverseForm({ amount: 0, reason: "" });
    },
  });

  const confirmRefund = (txn: PaymentTransaction) =>
    toast.confirm({
      message: `Rembourser ${formatMoney(refundForm.amount, currencyLabel(intent?.currency))} ?`,
      detail: `Transaction ${txn.transactionNumber}. Le remboursement est définitif.`,
      confirmLabel: "Rembourser",
      successMessage: "Remboursement effectué",
      errorMessage: "Remboursement refusé",
      onConfirm: () =>
        refundMutation.mutateAsync({ txnNumber: txn.transactionNumber, amount: refundForm.amount, reason: refundForm.reason }),
    });

  const confirmReverse = (txn: PaymentTransaction) =>
    toast.confirm({
      message: `Extourner ${formatMoney(reverseForm.amount, currencyLabel(intent?.currency))} ?`,
      detail: `Transaction ${txn.transactionNumber}. L'extourne annule le paiement.`,
      confirmLabel: "Extourner",
      successMessage: "Extourne effectuée",
      errorMessage: "Extourne refusée",
      onConfirm: () =>
        reverseMutation.mutateAsync({ txnNumber: txn.transactionNumber, amount: reverseForm.amount, reason: reverseForm.reason }),
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
  const isPending = intent.status === "PENDING";
  const money = (n: number) => formatMoney(n, currencyLabel(intent.currency));

  return shell(
    <>
      <PageHeader
        title={intent.intentNumber}
        subtitle={`${PURPOSE_LABEL[intent.purpose] ?? intent.purpose} · ${intent.sourceType}`}
        onBack={() => navigate("/payments")}
        backLabel="Retour aux intentions"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
      />

      <div className="space-y-5">
        <Section title="Résumé">
          <p className="text-3xl font-bold tracking-tight text-gray-950">{money(intent.amount)}</p>
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
          </dl>
        </Section>

        {isPending && (
          <Section title="Encaisser" description="Choisissez le mode de règlement.">
            <div className="flex flex-wrap gap-2">
              {([
                { id: "cash", label: "Espèces", icon: Banknote },
                { id: "wallet", label: "Portefeuille", icon: Wallet },
                { id: "mobile", label: "Mobile Money", icon: Smartphone },
              ] as const).map(({ id, label, icon: Icon }) => (
                <ActionButton
                  key={id}
                  icon={Icon}
                  variant={panel === id ? "primary" : "ghost"}
                  onClick={() => {
                    setCashError(null);
                    setWalletError(null);
                    setPanel(panel === id ? null : id);
                  }}
                >
                  {label}
                </ActionButton>
              ))}
            </div>

            <div className="mt-4">
              {panel === "cash" && (
                <PanelForm
                  title="Paiement en espèces"
                  onSubmit={(e) => {
                    e.preventDefault();
                    payCashMutation.mutate();
                  }}
                  onCancel={() => setPanel(null)}
                  pending={payCashMutation.isPending}
                  submitLabel={`Encaisser ${money(intent.amount)}`}
                  error={cashError}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Session de caisse">
                      <select
                        value={cashForm.cashSessionNumber}
                        onChange={(e) => setCashForm({ ...cashForm, cashSessionNumber: e.target.value })}
                        className={FIELD_SOFT}
                      >
                        <option value="">Sans session de caisse</option>
                        {openSessions.map((s) => (
                          <option key={s.sessionNumber} value={s.sessionNumber}>
                            {s.sessionNumber} · {s.registerCode}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Référence du reçu papier" hint="Facultatif">
                      <input
                        value={cashForm.providerReference}
                        onChange={(e) => setCashForm({ ...cashForm, providerReference: e.target.value })}
                        placeholder="RECU-001"
                        className={`${FIELD_SOFT} font-mono`}
                      />
                    </Field>
                  </div>
                </PanelForm>
              )}

              {panel === "wallet" && (
                <PanelForm
                  title="Paiement par portefeuille"
                  onSubmit={(e) => {
                    e.preventDefault();
                    payWalletMutation.mutate();
                  }}
                  onCancel={() => setPanel(null)}
                  pending={payWalletMutation.isPending}
                  submitLabel={`Payer ${money(intent.amount)}`}
                  submitDisabled={!walletNumber.trim()}
                  error={walletError}
                >
                  <Field label="Numéro de portefeuille" required>
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
                onClose={() => setPanel(null)}
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
                const alreadyRefunded = refundedAmountByTxn[txn.transactionNumber] ?? 0;
                const canRefund = txn.status === "SUCCEEDED" && remaining > 0;
                const canReverse = txn.status === "SUCCEEDED";
                const isRefunding = refundingTxn === txn.transactionNumber;
                const isReversing = reversingTxn === txn.transactionNumber;
                const method = txn.method ?? txn.paymentMethod ?? "";
                return (
                  <ItemRow key={txn.transactionNumber}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">
                          {txn.transactionNumber}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StatusChip tone={ts.tone}>{ts.label}</StatusChip>
                          <span className="text-xs text-gray-500">
                            {METHOD_LABEL[method] ?? method}
                            {txn.provider && method === "MOBILE_MONEY" ? ` · ${txn.provider}` : ""}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-400">
                          {formatDateTime(txn.processedAt ?? txn.createdAt)}
                          {txn.providerReference ? ` · Réf. ${txn.providerReference}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold tabular-nums text-gray-950">{money(txn.amount)}</p>
                        {txn.status === "SUCCEEDED" && (
                          <p className="text-xs text-gray-400">
                            {alreadyRefunded > 0 ? `${money(alreadyRefunded)} remboursé · ` : ""}
                            reste {money(remaining)}
                          </p>
                        )}
                      </div>
                    </div>

                    {txn.status === "SUCCEEDED" && (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <IconButton icon={Receipt} label="Voir le reçu" onClick={() => setReceiptTxn(txn.transactionNumber)} />
                        {canRefund && (
                          <IconButton
                            icon={Undo2}
                            label="Rembourser"
                            onClick={() => {
                              setReversingTxn(null);
                              setRefundingTxn(isRefunding ? null : txn.transactionNumber);
                              setRefundForm({ amount: remaining, reason: "" });
                            }}
                          />
                        )}
                        {canReverse && (
                          <IconButton
                            icon={RotateCcw}
                            label="Extourner"
                            tone="danger"
                            onClick={() => {
                              setRefundingTxn(null);
                              setReversingTxn(isReversing ? null : txn.transactionNumber);
                              setReverseForm({ amount: txn.amount, reason: "" });
                            }}
                          />
                        )}
                      </div>
                    )}

                    {isRefunding && (
                      <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                        <p className="mb-3 text-sm font-bold text-gray-950">Remboursement</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Montant" hint={`Maximum ${money(remaining)}`}>
                            <input
                              type="number"
                              min={1}
                              max={remaining}
                              value={refundForm.amount || ""}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value) || 0;
                                setRefundForm({ ...refundForm, amount: num > remaining ? remaining : num });
                              }}
                              className={FIELD}
                            />
                          </Field>
                          <Field label="Motif" required>
                            <input
                              value={refundForm.reason}
                              onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                              className={FIELD}
                            />
                          </Field>
                        </div>
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <ActionButton variant="ghost" onClick={() => setRefundingTxn(null)}>
                            Annuler
                          </ActionButton>
                          <ActionButton
                            disabled={refundForm.amount <= 0 || !refundForm.reason.trim()}
                            onClick={() => confirmRefund(txn)}
                          >
                            Rembourser
                          </ActionButton>
                        </div>
                      </div>
                    )}

                    {isReversing && (
                      <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                        <p className="mb-3 text-sm font-bold text-red-700">Extourne</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Montant" hint={`Maximum ${money(txn.amount)}`}>
                            <input
                              type="number"
                              min={1}
                              max={txn.amount}
                              value={reverseForm.amount || ""}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value) || 0;
                                setReverseForm({ ...reverseForm, amount: num > txn.amount ? txn.amount : num });
                              }}
                              className={FIELD}
                            />
                          </Field>
                          <Field label="Motif" required>
                            <input
                              value={reverseForm.reason}
                              onChange={(e) => setReverseForm({ ...reverseForm, reason: e.target.value })}
                              className={FIELD}
                            />
                          </Field>
                        </div>
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <ActionButton variant="ghost" onClick={() => setReversingTxn(null)}>
                            Annuler
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            disabled={reverseForm.amount <= 0 || !reverseForm.reason.trim()}
                            onClick={() => confirmReverse(txn)}
                          >
                            Extourner
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </ItemRow>
                );
              })}
            </div>
          )}
        </Section>
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
