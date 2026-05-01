import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, RefreshCw, RotateCcw, CheckCircle, XCircle,
  Clock, Ban, ArrowLeftRight, Download, Receipt
} from 'lucide-react';
import { paymentService } from '../../services/payment.service';
import type { PaymentIntent, PaymentTransaction } from '../../services/payment.service';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentIntentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: PaymentIntent;
  onRefresh: () => void;
}

const intentStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:            { label: 'En attente',              color: 'bg-yellow-100 text-yellow-700', icon: Clock       },
  PROCESSING:         { label: 'En cours',                color: 'bg-blue-100 text-blue-700',    icon: RefreshCw   },
  AUTHORIZED:         { label: 'Autorisé',                color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  SUCCEEDED:          { label: 'Réussi',                  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  FAILED:             { label: 'Échoué',                  color: 'bg-red-100 text-red-700',      icon: XCircle     },
  CANCELLED:          { label: 'Annulé',                  color: 'bg-gray-100 text-gray-500',    icon: Ban         },
  EXPIRED:            { label: 'Expiré',                  color: 'bg-gray-100 text-gray-500',    icon: Clock       },
  REFUNDED:           { label: 'Remboursé',               color: 'bg-orange-100 text-orange-700', icon: RefreshCw  },
  PARTIALLY_REFUNDED: { label: 'Partiellement remboursé', color: 'bg-orange-100 text-orange-700', icon: RefreshCw  },
  REVERSED:           { label: 'Inversé',                 color: 'bg-red-100 text-red-700',      icon: RotateCcw   },
};

const transactionStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  SUCCEEDED: { label: 'Réussi',     color: 'bg-green-100 text-green-700'  },
  FAILED:    { label: 'Échoué',     color: 'bg-red-100 text-red-700'      },
  REFUNDED:  { label: 'Remboursé',  color: 'bg-orange-100 text-orange-700'},
  REVERSED:  { label: 'Inversé',    color: 'bg-red-100 text-red-700'      },
};

const methodLabels: Record<string, string> = {
  CASH:   'Cash',
  WALLET: 'Wallet',
};

export const PaymentIntentDetailModal: React.FC<PaymentIntentDetailModalProps> = ({
  isOpen, onClose, intent: initialIntent, onRefresh,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);

  const [refundForm, setRefundForm] = useState({ amount: 0, reason: '' });
  const [reverseForm, setReverseForm] = useState({ amount: 0, reason: '' });
  const [refundingTxn, setRefundingTxn] = useState<string | null>(null);
  const [reversingTxn, setReversingTxn] = useState<string | null>(null);

  // Reçu
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const { data: refreshedIntent } = useQuery({
    queryKey: ['payment-intent', initialIntent.intentNumber],
    queryFn: () => paymentService.getPaymentIntent(initialIntent.intentNumber),
    enabled: isOpen,
  });
  const intent = refreshedIntent || initialIntent;

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['payment-transactions', intent.intentNumber],
    queryFn: () => paymentService.getTransactions(intent.intentNumber),
    enabled: isOpen,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-intents'] });
    queryClient.invalidateQueries({ queryKey: ['payment-intent', intent.intentNumber] });
    queryClient.invalidateQueries({ queryKey: ['payment-transactions', intent.intentNumber] });
    onRefresh();
  };

  const refundMutation = useMutation({
    mutationFn: ({ txnNumber, amount, reason }: { txnNumber: string; amount: number; reason: string }) =>
      paymentService.refundTransaction(txnNumber, { amount, reason, processedBy: admin?.email || 'admin' }),
    onSuccess: () => {
      invalidateAll();
      setRefundingTxn(null);
      setRefundForm({ amount: 0, reason: '' });
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors du remboursement.');
    },
  });

  const reverseMutation = useMutation({
    mutationFn: ({ txnNumber, amount, reason }: { txnNumber: string; amount: number; reason: string }) =>
      paymentService.reverseTransaction(txnNumber, { amount, reason, processedBy: admin?.email || 'admin' }),
    onSuccess: () => {
      invalidateAll();
      setReversingTxn(null);
      setReverseForm({ amount: 0, reason: '' });
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors de l\'inversion.');
    },
  });

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
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu_${transactionNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const statusCfg = intentStatusConfig[intent.status];
  const StatusIcon = statusCfg?.icon;

  return (
    <ModalPortal onClose={onClose} size="4xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{intent.intentNumber}</h3>
          <p className="text-sm text-gray-500">{intent.purpose} · {intent.sourceType}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
      </div>

      {/* Statut */}
      <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-3">
        {statusCfg && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
            <StatusIcon size={12} />
            {statusCfg.label}
          </span>
        )}
        <span className="text-xs text-gray-500">
          Créé le {new Date(intent.createdAt).toLocaleString('fr-FR')}
        </span>
        <span className="text-xs text-gray-500">
          Expire : {new Date(intent.expiresAt).toLocaleString('fr-FR')}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
            {actionError}
            <button onClick={() => setActionError(null)} className="underline ml-2 text-xs">Fermer</button>
          </div>
        )}

        {/* Informations intention */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Client</p>
            <p className="font-medium text-sm">{intent.customerCode}</p>
            <p className="text-xs text-gray-400">{intent.customerType}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Montant</p>
            <p className="font-bold text-lg">{intent.amount.toLocaleString('fr-FR')} {intent.currency}</p>
          </div>
          {intent.sourceCode && (
            <div className="p-3 bg-blue-50 rounded-lg col-span-2">
              <p className="text-xs text-blue-500">Source</p>
              <p className="font-mono text-sm text-blue-700">{intent.sourceType} / {intent.sourceCode}</p>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Transactions
            {transactions.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">({transactions.length})</span>
            )}
          </h4>

          {txLoading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Chargement...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <ArrowLeftRight size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(transactions as PaymentTransaction[]).map((txn) => {
                const txStatus = transactionStatusConfig[txn.status];
                const canRefund = txn.status === 'SUCCEEDED';
                const canReverse = txn.status === 'SUCCEEDED';
                const isRefunding = refundingTxn === txn.transactionNumber;
                const isReversing = reversingTxn === txn.transactionNumber;

                return (
                  <div key={txn.transactionNumber} className="border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{txn.transactionNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {txStatus && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${txStatus.color}`}>
                              {txStatus.label}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {methodLabels[txn.method] || txn.method}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(txn.processedAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <p className="font-bold">{txn.amount.toLocaleString('fr-FR')} {intent.currency}</p>
                    </div>

                    {txn.providerReference && (
                      <p className="text-xs text-gray-400 font-mono mb-2">
                        Réf: {txn.providerReference}
                      </p>
                    )}

                    {/* Bouton reçu */}
                    {txn.status === 'SUCCEEDED' && (
                      <div className="flex gap-2 pt-2 border-t mb-2">
                        <button
                          onClick={() => handleOpenReceipt(txn.transactionNumber)}
                          className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs flex items-center gap-1"
                        >
                          <Receipt size={11} /> Voir le reçu
                        </button>
                      </div>
                    )}

                    {/* Actions refund / reverse */}
                    {(canRefund || canReverse) && !isRefunding && !isReversing && (
                      <div className="flex gap-2 pt-2 border-t">
                        {canRefund && (
                          <button
                            onClick={() => {
                              setRefundingTxn(txn.transactionNumber);
                              setRefundForm({ amount: txn.amount, reason: '' });
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
                              setReverseForm({ amount: txn.amount, reason: '' });
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
                        <p className="text-xs font-medium text-orange-700">Remboursement</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Montant (FCFA) *</label>
                           <input
  type="text"
  inputMode="numeric"
  value={refundForm.amount === 0 ? '' : refundForm.amount}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    const num = val === '' ? 0 : parseFloat(val);
    setRefundForm({ ...refundForm, amount: num > txn.amount ? txn.amount : num });
  }}
  placeholder="0"
  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Motif *</label>
                            <input type="text" value={refundForm.reason}
                              onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                              placeholder="Motif du remboursement"
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setRefundingTxn(null)}
                            className="flex-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                            Annuler
                          </button>
                          <button
                            onClick={() => {
                              if (refundForm.amount <= 0 || !refundForm.reason) return;
                              refundMutation.mutate({
                                txnNumber: txn.transactionNumber,
                                amount: refundForm.amount,
                                reason: refundForm.reason,
                              });
                            }}
                            disabled={refundMutation.isPending || refundForm.amount <= 0 || !refundForm.reason}
                            className="flex-1 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {refundMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirmer'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulaire inversion */}
                    {isReversing && (
                      <div className="pt-3 border-t space-y-2">
                        <p className="text-xs font-medium text-red-700">Inversion / Reverse</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Montant (FCFA) *</label>
                            <input
  type="text"
  inputMode="numeric"
  value={reverseForm.amount === 0 ? '' : reverseForm.amount}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    const num = val === '' ? 0 : parseFloat(val);
    setReverseForm({ ...reverseForm, amount: num > txn.amount ? txn.amount : num });
  }}
  placeholder="0"
  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Motif *</label>
                            <input type="text" value={reverseForm.reason}
                              onChange={(e) => setReverseForm({ ...reverseForm, reason: e.target.value })}
                              placeholder="Motif de l'inversion"
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-xs text-red-600">
                          L'inversion annule la transaction et inverse les allocations facture.
                          Si paiement wallet, le wallet sera automatiquement recrédité.
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setReversingTxn(null)}
                            className="flex-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                            Annuler
                          </button>
                          <button
                            onClick={() => {
                              if (reverseForm.amount <= 0 || !reverseForm.reason) return;
                              if (!confirm('Confirmer l\'inversion de cette transaction ?')) return;
                              reverseMutation.mutate({
                                txnNumber: txn.transactionNumber,
                                amount: reverseForm.amount,
                                reason: reverseForm.reason,
                              });
                            }}
                            disabled={reverseMutation.isPending || reverseForm.amount <= 0 || !reverseForm.reason}
                            className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {reverseMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Inverser'}
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

      {/* Modal Reçu */}
      {isReceiptOpen && (
        <ModalPortal onClose={() => setIsReceiptOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Reçu de paiement</h3>
            <button onClick={() => setIsReceiptOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
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
                    <p className="font-mono font-bold">{receiptData.receiptNumber}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Transaction</p>
                    <p className="font-mono font-bold">{receiptData.transactionNumber}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Montant payé</p>
                    <p className="font-bold text-lg">{receiptData.paidAmount?.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Méthode</p>
                    <p className="font-medium">{receiptData.paymentMethod}{receiptData.provider ? ` · ${receiptData.provider}` : ''}</p>
                  </div>
                  {receiptData.allocatedAmount > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Alloué</p>
                      <p className="font-medium">{receiptData.allocatedAmount?.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  )}
                  {receiptData.advanceAmount > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600">Avance créditée</p>
                      <p className="font-medium text-amber-700">{receiptData.advanceAmount?.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm">{new Date(receiptData.paidAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Encaissé par</p>
                    <p className="text-sm">{receiptData.receivedBy}</p>
                  </div>
                </div>
                {receiptData.customerName && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-500">Client</p>
                    <p className="font-medium text-blue-800">{receiptData.customerName}</p>
                  </div>
                )}
                {receiptData.allocations && receiptData.allocations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Allocations</h4>
                    <div className="space-y-1">
                      {(receiptData.allocations as any[]).map((a: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                          <span className="font-mono">{a.documentNumber || a.referenceCode}</span>
                          <span className="font-medium">{a.amount?.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleDownloadReceiptPdf(receiptData.transactionNumber)}
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
              <div className="text-center py-8 text-gray-500">Reçu introuvable</div>
            )}
          </div>
        </ModalPortal>
      )}
    </ModalPortal>
  );
};