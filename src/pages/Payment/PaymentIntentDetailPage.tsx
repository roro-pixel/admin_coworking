import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  ArrowLeftRight,
  Download,
  Receipt,
  Wallet,
  Banknote,
  Smartphone,
  X,
  AlertCircle,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  PaymentTransaction,
  CashSession,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { MobileMoneyModal } from "../../components/payment/MobileMoneyModal";

const intentStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  PROCESSING: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
  },
  AUTHORIZED: {
    label: "Autorisé",
    color: "bg-purple-100 text-purple-700",
    icon: CheckCircle,
  },
  SUCCEEDED: {
    label: "Réussi",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  FAILED: { label: "Échoué", color: "bg-red-100 text-red-700", icon: XCircle },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-500", icon: Ban },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500", icon: Clock },
  REFUNDED: {
    label: "Remboursé",
    color: "bg-orange-100 text-orange-700",
    icon: RefreshCw,
  },
  PARTIALLY_REFUNDED: {
    label: "Partiellement remboursé",
    color: "bg-orange-100 text-orange-700",
    icon: RefreshCw,
  },
  REVERSED: {
    label: "Inversé",
    color: "bg-red-100 text-red-700",
    icon: RotateCcw,
  },
};

const transactionStatusConfig: Record<
  string,
  { label: string; color: string }
> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  SUCCEEDED: { label: "Réussi", color: "bg-green-100 text-green-700" },
  FAILED: { label: "Échoué", color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Remboursé", color: "bg-orange-100 text-orange-700" },
  REVERSED: { label: "Inversé", color: "bg-red-100 text-red-700" },
};

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  WALLET: "Wallet",
  MOBILE_MONEY: "Mobile Money",
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const PaymentIntentDetailPage: React.FC = () => {
  const { intentNumber } = useParams<{ intentNumber: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  // ========== ÉTATS ACTIONS ==========
  const [actionError, setActionError] = useState<string | null>(null);
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: "" });
  const [reverseForm, setReverseForm] = useState({ amount: 0, reason: "" });
  const [refundingTxn, setRefundingTxn] = useState<string | null>(null);
  const [reversingTxn, setReversingTxn] = useState<string | null>(null);

  // ========== ÉTATS PAIEMENT CASH ==========
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashForm, setCashForm] = useState({
    cashSessionNumber: "",
    providerReference: "",
  });
  const [cashError, setCashError] = useState<string | null>(null);

  // ========== ÉTATS PAIEMENT WALLET ==========
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletNumber, setWalletNumber] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);

  // ========== ÉTATS MOBILE MONEY ==========
  const [isMobileMoneyOpen, setIsMobileMoneyOpen] = useState(false);

  // ========== ÉTATS REÇU ==========
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ========== QUERIES ==========
  const { data: intent, isLoading: intentLoading } = useQuery({
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
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content || [];

  // Historique des remboursements par transaction — nécessaire pour
  // plafonner un nouveau remboursement au solde restant (comportement
  // cumulé : plusieurs remboursements partiels possibles, plafonnés au
  // montant d'origine — voir payment-billing-wallet-phases-2-5).
  const succeededTransactions = (transactions as PaymentTransaction[]).filter(
    (t) => t.status === "SUCCEEDED",
  );
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
    refundedAmountByTxn[txn.transactionNumber] = refunds.reduce(
      (sum, r) => sum + (r.amount || 0),
      0,
    );
  });
  const remainingRefundable = (txn: PaymentTransaction) =>
    Math.max(0, txn.amount - (refundedAmountByTxn[txn.transactionNumber] ?? 0));

  // ========== INVALIDATION ==========
  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["payment-intent", intentNumber],
    });
    queryClient.invalidateQueries({
      queryKey: ["payment-transactions", intentNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
  };

  // ========== MUTATIONS ==========
  const payCashMutation = useMutation({
    mutationFn: () =>
      paymentService.payCash(intent!.intentNumber, {
        receivedBy: admin?.email || "admin",
        cashSessionNumber: cashForm.cashSessionNumber || undefined,
        providerReference: cashForm.providerReference || undefined,
      }),
    onSuccess: (data) => {
      invalidateAll();
      setIsCashModalOpen(false);
      setCashForm({ cashSessionNumber: "", providerReference: "" });
      setCashError(null);
      handleOpenReceipt(data.transactionNumber);
    },
    onError: (error: any) => {
      setCashError(
        error?.response?.data?.message || "Erreur lors du paiement cash.",
      );
    },
  });

  const payWalletMutation = useMutation({
    mutationFn: () =>
      paymentService.payWallet(intent!.intentNumber, {
        walletNumber,
        createdBy: admin?.email || "admin",
      }),
    onSuccess: (data) => {
      invalidateAll();
      setIsWalletModalOpen(false);
      setWalletNumber("");
      setWalletError(null);
      handleOpenReceipt(data.transactionNumber);
    },
    onError: (error: any) => {
      setWalletError(
        error?.response?.data?.message || "Erreur lors du paiement wallet.",
      );
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({
      txnNumber,
      amount,
      reason,
    }: {
      txnNumber: string;
      amount: number;
      reason: string;
    }) =>
      paymentService.refundTransaction(txnNumber, {
        amount,
        reason,
        processedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      invalidateAll();
      setRefundingTxn(null);
      setRefundForm({ amount: 0, reason: "" });
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message || "Erreur lors du remboursement.",
      );
    },
  });

  const reverseMutation = useMutation({
    mutationFn: ({
      txnNumber,
      amount,
      reason,
    }: {
      txnNumber: string;
      amount: number;
      reason: string;
    }) =>
      paymentService.reverseTransaction(txnNumber, {
        amount,
        reason,
        processedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      invalidateAll();
      setReversingTxn(null);
      setReverseForm({ amount: 0, reason: "" });
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message || "Erreur lors de l'inversion.",
      );
    },
  });

  // ========== HELPERS REÇU ==========
  const handleOpenReceipt = async (transactionNumber: string) => {
    setReceiptLoading(true);
    setIsReceiptOpen(true);
    try {
      const data = await paymentService.getReceipt(transactionNumber);
      setReceiptData(data);
    } catch {
      setReceiptData(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleDownloadReceiptPdf = async (transactionNumber: string) => {
    try {
      const blob = await paymentService.getReceiptPdf(transactionNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu_${transactionNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  // ========== ÉTATS DE CHARGEMENT ==========
  if (intentLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement de l'intention...</p>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Intention non trouvée</p>
        <button
          onClick={() => navigate("/payments")}
          className="mt-4 text-primary-600 hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const statusCfg = intentStatusConfig[intent.status];
  const StatusIcon = statusCfg?.icon;
  const isPending = intent.status === "PENDING";

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/payments")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={18} />
        Retour aux intentions
      </button>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
        {/* ========== HEADER ========== */}
        <div className="border-b p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {intent.intentNumber}
              </h1>
              <p className="text-gray-500 mt-1">
                {intent.purpose} · {intent.sourceType}
              </p>
            </div>
            {statusCfg && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusCfg.color}`}
              >
                <StatusIcon size={14} />
                {statusCfg.label}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span>
              Créé le {new Date(intent.createdAt).toLocaleString("fr-FR")}
            </span>
            <span>Expire le {formatDateTime(intent.expiresAt)}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                {actionError}
              </span>
              <button
                onClick={() => setActionError(null)}
                className="underline ml-2 flex-shrink-0"
              >
                Fermer
              </button>
            </div>
          )}

          {/* ========== INFORMATIONS INTENTION ========== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-medium">
                {intent.customerName || intent.customerCode}
              </p>
              <p className="text-xs text-gray-400">{intent.customerType}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Montant</p>
              <p className="font-bold text-xl">
                {intent.amount.toLocaleString("fr-FR")} {intent.currency}
              </p>
            </div>
            {intent.sourceCode && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-500">Source</p>
                <p className="font-mono text-sm text-blue-700">
                  {intent.sourceType} / {intent.sourceCode}
                </p>
              </div>
            )}
          </div>

          {/* ========== ACTIONS PAIEMENT ========== */}
          {isPending && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Effectuer un paiement
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setCashError(null);
                    setCashForm({
                      cashSessionNumber: "",
                      providerReference: "",
                    });
                    setIsCashModalOpen(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Banknote size={16} /> Payer en cash
                </button>
                <button
                  onClick={() => {
                    setWalletError(null);
                    setWalletNumber("");
                    setIsWalletModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Wallet size={16} /> Payer avec wallet
                </button>
                <button
                  onClick={() => setIsMobileMoneyOpen(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Smartphone size={16} /> Mobile Money
                </button>
              </div>
            </div>
          )}

          {/* ========== TRANSACTIONS ========== */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Transactions
              {transactions.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  ({transactions.length})
                </span>
              )}
            </h3>

            {txLoading ? (
              <div className="text-center py-4 text-gray-400">
                Chargement...
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <ArrowLeftRight
                  size={32}
                  className="mx-auto text-gray-300 mb-2"
                />
                <p className="text-gray-500">Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(transactions as PaymentTransaction[]).map((txn) => {
                  const txStatus = transactionStatusConfig[txn.status];
                  const remaining = remainingRefundable(txn);
                  const alreadyRefunded =
                    refundedAmountByTxn[txn.transactionNumber] ?? 0;
                  const canRefund = txn.status === "SUCCEEDED" && remaining > 0;
                  const canReverse = txn.status === "SUCCEEDED";
                  const isRefunding = refundingTxn === txn.transactionNumber;
                  const isReversing = reversingTxn === txn.transactionNumber;

                  return (
                    <div
                      key={txn.transactionNumber}
                      className="ring-1 ring-gray-100 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-mono font-medium">
                            {txn.transactionNumber}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {txStatus && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${txStatus.color}`}
                              >
                                {txStatus.label}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {methodLabels[
                                txn.method ?? txn.paymentMethod ?? ""
                              ] ||
                                txn.method ||
                                txn.paymentMethod ||
                                "—"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(txn.processedAt ?? txn.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="font-bold">
                          {txn.amount.toLocaleString("fr-FR")} {intent.currency}
                        </p>
                      </div>

                      {txn.providerReference && (
                        <p className="text-xs text-gray-400 font-mono mb-2">
                          Réf: {txn.providerReference}
                        </p>
                      )}

                      {alreadyRefunded > 0 && (
                        <p className="text-xs text-orange-600 mb-2">
                          Déjà remboursé : {alreadyRefunded.toLocaleString("fr-FR")}{" "}
                          {intent.currency} — reste remboursable :{" "}
                          {remaining.toLocaleString("fr-FR")} {intent.currency}
                        </p>
                      )}

                      {/* Bouton reçu */}
                      {txn.status === "SUCCEEDED" && (
                        <div className="flex gap-2 pt-2 border-t mb-2">
                          <button
                            onClick={() =>
                              handleOpenReceipt(txn.transactionNumber)
                            }
                            className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs flex items-center gap-1"
                          >
                            <Receipt size={11} /> Voir le reçu
                          </button>
                        </div>
                      )}

                      {/* Actions refund / reverse */}
                      {(canRefund || canReverse) &&
                        !isRefunding &&
                        !isReversing && (
                          <div className="flex gap-2 pt-2 border-t">
                            {canRefund && (
                              <button
                                onClick={() => {
                                  setRefundingTxn(txn.transactionNumber);
                                  setRefundForm({
                                    amount: remaining,
                                    reason: "",
                                  });
                                }}
                                className="px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs flex items-center gap-1"
                              >
                                <RefreshCw size={11} /> Rembourser
                              </button>
                            )}
                            {canReverse && (
                              <button
                                onClick={() => {
                                  setReversingTxn(txn.transactionNumber);
                                  setReverseForm({
                                    amount: txn.amount,
                                    reason: "",
                                  });
                                }}
                                className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs flex items-center gap-1"
                              >
                                <RotateCcw size={11} /> Inverser
                              </button>
                            )}
                          </div>
                        )}

                      {/* Formulaire remboursement */}
                      {isRefunding && (
                        <div className="pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-orange-700">
                            Remboursement
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Montant (FCFA) — max {remaining.toLocaleString("fr-FR")}
                              </label>
                              <input
                                type="number"
                                max={remaining}
                                value={refundForm.amount || ""}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value) || 0;
                                  setRefundForm({
                                    ...refundForm,
                                    amount: num > remaining ? remaining : num,
                                  });
                                }}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Motif
                              </label>
                              <input
                                type="text"
                                value={refundForm.reason}
                                onChange={(e) =>
                                  setRefundForm({
                                    ...refundForm,
                                    reason: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRefundingTxn(null)}
                              className="flex-1 px-3 py-1.5 border rounded-lg text-xs"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() =>
                                refundMutation.mutate({
                                  txnNumber: txn.transactionNumber,
                                  amount: refundForm.amount,
                                  reason: refundForm.reason,
                                })
                              }
                              disabled={
                                refundMutation.isPending ||
                                refundForm.amount <= 0 ||
                                !refundForm.reason
                              }
                              className="flex-1 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {refundMutation.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                "Confirmer"
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Formulaire inversion */}
                      {isReversing && (
                        <div className="pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-red-700">
                            Inversion
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Montant (FCFA)
                              </label>
                              <input
                                type="number"
                                value={reverseForm.amount || ""}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value) || 0;
                                  setReverseForm({
                                    ...reverseForm,
                                    amount: num > txn.amount ? txn.amount : num,
                                  });
                                }}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Motif
                              </label>
                              <input
                                type="text"
                                value={reverseForm.reason}
                                onChange={(e) =>
                                  setReverseForm({
                                    ...reverseForm,
                                    reason: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReversingTxn(null)}
                              className="flex-1 px-3 py-1.5 border rounded-lg text-xs"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() =>
                                reverseMutation.mutate({
                                  txnNumber: txn.transactionNumber,
                                  amount: reverseForm.amount,
                                  reason: reverseForm.reason,
                                })
                              }
                              disabled={
                                reverseMutation.isPending ||
                                reverseForm.amount <= 0 ||
                                !reverseForm.reason
                              }
                              className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {reverseMutation.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                "Inverser"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== MODAL PAIEMENT CASH ========== */}
      {isCashModalOpen && (
        <ModalPortal onClose={() => setIsCashModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Paiement en cash</h3>
            <button
              onClick={() => setIsCashModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {cashError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {cashError}
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>
                Intention :{" "}
                <span className="font-mono font-medium">
                  {intent.intentNumber}
                </span>
              </p>
              <p>
                Montant :{" "}
                <span className="font-bold">
                  {intent.amount.toLocaleString("fr-FR")} {intent.currency}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session de caisse
              </label>
              <select
                value={cashForm.cashSessionNumber}
                onChange={(e) =>
                  setCashForm({
                    ...cashForm,
                    cashSessionNumber: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Aucune (paiement hors session)</option>
                {openSessions.map((s) => (
                  <option key={s.sessionNumber} value={s.sessionNumber}>
                    {s.sessionNumber} — {s.registerCode}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Si sélectionné, crée un mouvement PAYMENT dans la session
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence reçu
              </label>
              <input
                type="text"
                value={cashForm.providerReference}
                onChange={(e) =>
                  setCashForm({
                    ...cashForm,
                    providerReference: e.target.value,
                  })
                }
                placeholder="RECU-001 (optionnel)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsCashModalOpen(false)}
                disabled={payCashMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => payCashMutation.mutate()}
                disabled={payCashMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payCashMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Banknote size={14} /> Encaisser
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL PAIEMENT WALLET ========== */}
      {isWalletModalOpen && (
        <ModalPortal onClose={() => setIsWalletModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Paiement par wallet</h3>
            <button
              onClick={() => setIsWalletModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {walletError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {walletError}
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>
                Intention :{" "}
                <span className="font-mono font-medium">
                  {intent.intentNumber}
                </span>
              </p>
              <p>
                Montant :{" "}
                <span className="font-bold">
                  {intent.amount.toLocaleString("fr-FR")} {intent.currency}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Wallet *
              </label>
              <input
                type="text"
                value={walletNumber}
                onChange={(e) => setWalletNumber(e.target.value)}
                placeholder="WAL-000001"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Le wallet doit appartenir au client et avoir un solde suffisant
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsWalletModalOpen(false)}
                disabled={payWalletMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => payWalletMutation.mutate()}
                disabled={payWalletMutation.isPending || !walletNumber}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payWalletMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Wallet size={14} /> Payer
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL MOBILE MONEY ========== */}
      {isMobileMoneyOpen && (
        <MobileMoneyModal
          isOpen={isMobileMoneyOpen}
          onClose={() => setIsMobileMoneyOpen(false)}
          intent={intent}
          onPaymentSuccess={(txNumber) => {
            setIsMobileMoneyOpen(false);
            handleOpenReceipt(txNumber);
          }}
        />
      )}

      {/* ========== MODAL REÇU ========== */}
      {isReceiptOpen && (
        <ModalPortal onClose={() => setIsReceiptOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Reçu de paiement</h3>
            <button
              onClick={() => setIsReceiptOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {receiptLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-500">Chargement du reçu...</p>
              </div>
            ) : receiptData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Reçu</p>
                    <p className="font-mono font-bold">
                      {receiptData.receiptNumber}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Transaction</p>
                    <p className="font-mono font-bold">
                      {receiptData.transactionNumber}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Montant payé</p>
                    <p className="font-bold text-lg">
                      {receiptData.paidAmount?.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Méthode</p>
                    <p className="font-medium">
                      {receiptData.paymentMethod}
                      {receiptData.provider ? ` · ${receiptData.provider}` : ""}
                    </p>
                  </div>
                  {receiptData.allocatedAmount > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Alloué</p>
                      <p className="font-medium">
                        {receiptData.allocatedAmount?.toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </div>
                  )}
                  {receiptData.advanceAmount > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600">Avance créditée</p>
                      <p className="font-medium text-amber-700">
                        {receiptData.advanceAmount?.toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm">
                      {new Date(receiptData.paidAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Encaissé par</p>
                    <p className="text-sm">{receiptData.receivedBy}</p>
                  </div>
                </div>
                {receiptData.customerName && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-500">Client</p>
                    <p className="font-medium text-blue-800">
                      {receiptData.customerName}
                    </p>
                  </div>
                )}
                {receiptData.allocations &&
                  receiptData.allocations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Allocations
                      </h4>
                      <div className="space-y-1">
                        {(receiptData.allocations as any[]).map(
                          (a: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs bg-gray-50 p-2 rounded"
                            >
                              <span className="font-mono">
                                {a.documentNumber || a.referenceCode}
                              </span>
                              <span className="font-medium">
                                {a.amount?.toLocaleString("fr-FR")} FCFA
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() =>
                      handleDownloadReceiptPdf(receiptData.transactionNumber)
                    }
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Télécharger PDF
                  </button>
                  <button
                    onClick={() => setIsReceiptOpen(false)}
                    className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Reçu introuvable
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
