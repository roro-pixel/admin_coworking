import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Download, FileText, Loader2, CheckCircle, XCircle, Send, RefreshCw, ArrowRight, CreditCard, Wallet, Receipt, AlertCircle, Calendar, Plus, Trash2, Banknote, Smartphone } from 'lucide-react';
import { billingService } from '../../services/billing.service';
import type { BillingDocument } from '../../services/billing.service';
import { paymentService } from '../../services/payment.service';
import type { CashSession } from '../../services/payment.service';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { CreateCreditNoteModal } from './CreateCreditNoteModal';

interface BillingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: BillingDocument;
  onRefresh: () => void;
  onCreateCreditNote: (invoiceNumber: string) => void;
}

const documentTypeLabels: Record<string, string> = {
  QUOTE:            'Devis',
  PROFORMA_INVOICE: 'Proforma',
  INVOICE:          'Facture',
  CREDIT_NOTE:      'Avoir',
  DEBIT_NOTE:       'Note de débit',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: 'Brouillon',           color: 'bg-gray-100 text-gray-700'     },
  ISSUED:         { label: 'Émise',               color: 'bg-blue-100 text-blue-700'     },
  SENT:           { label: 'Envoyée',             color: 'bg-purple-100 text-purple-700' },
  ACCEPTED:       { label: 'Acceptée',            color: 'bg-green-100 text-green-700'   },
  REJECTED:       { label: 'Rejetée',             color: 'bg-red-100 text-red-700'       },
  EXPIRED:        { label: 'Expirée',             color: 'bg-gray-100 text-gray-500'     },
  CONVERTED:      { label: 'Convertie',           color: 'bg-blue-100 text-blue-700'     },
  PARTIALLY_PAID: { label: 'Partiellement payée', color: 'bg-yellow-100 text-yellow-700' },
  PAID:           { label: 'Payée',               color: 'bg-green-100 text-green-700'   },
  OVERDUE:        { label: 'En retard',           color: 'bg-red-100 text-red-700'       },
  CANCELLED:      { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'     },
  VOIDED:         { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'     },
  REFUNDED:       { label: 'Remboursée',          color: 'bg-orange-100 text-orange-700' },
  WRITTEN_OFF:    { label: 'Passée en perte',     color: 'bg-gray-100 text-gray-500'     },
};

export const BillingDetailModal: React.FC<BillingDetailModalProps> = ({
  isOpen, onClose, document: initialDoc, onRefresh,
}) => {
  const queryClient = useQueryClient();
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ 
    method: 'CASH' as 'CASH' | 'WALLET' | 'MOBILE_MONEY', 
    cashSessionNumber: '', 
    walletNumber: '', 
    phoneNumber: '',
    correspondent: '',
    amount: 0 
  });
  const [payError, setPayError] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleInstallments, setScheduleInstallments] = useState<Array<{ dueDate: string; amount: number }>>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const { data: refreshedDocument } = useQuery({
    queryKey: ['billing-document', initialDoc.documentNumber],
    queryFn: () => billingService.getDocument(initialDoc.documentNumber),
    enabled: isOpen,
  });

  const currentDoc = refreshedDocument || initialDoc;

  const { data: openSessionsData } = useQuery({
    queryKey: ['cash-sessions-open-select'],
    queryFn: () => paymentService.getCashSessions({ status: 'OPEN', size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content || [];

  const { data: mmProviders = [] } = useQuery({
    queryKey: ['mobile-money-providers'],
    queryFn: () => paymentService.getMobileMoneyProviders(),
  });

  const { data: existingSchedule, refetch: refetchSchedule } = useQuery({
    queryKey: ['invoice-schedule', currentDoc.documentNumber],
    queryFn: () => billingService.getInvoiceSchedule(currentDoc.documentNumber),
    enabled: isScheduleOpen && currentDoc.documentType === 'INVOICE',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['billing-documents'] });
    queryClient.invalidateQueries({ queryKey: ['billing-document', currentDoc.documentNumber] });
    queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
    onRefresh();
  };

  const makeM = (fn: () => Promise<any>) => useMutation({
    mutationFn: fn,
    onSuccess: invalidateAll,
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors de l\'action.');
    },
  });

  const issueMutation       = makeM(() => billingService.issueDocument(currentDoc.documentNumber));
  const sendMutation        = makeM(() => billingService.sendDocument(currentDoc.documentNumber));
  const sendEmailMutation   = makeM(() => billingService.sendEmail(currentDoc.documentNumber));
  const acceptQuoteMutation = makeM(() => billingService.acceptQuote(currentDoc.documentNumber));
  const rejectQuoteMutation = makeM(() => billingService.rejectQuote(currentDoc.documentNumber));
  const convertMutation     = makeM(() => billingService.convertToInvoice(currentDoc.documentNumber));
  const applyMutation       = makeM(() => billingService.applyCreditNote(currentDoc.documentNumber));

  const payMutation = useMutation({
    mutationFn: async () => {
      if (payForm.method === 'MOBILE_MONEY') {
        const intent = await paymentService.createPaymentIntentFromBilling({
          documentNumber: currentDoc.documentNumber,
          amount: payForm.amount > 0 ? payForm.amount : undefined,
          idempotencyKey: `pay-mm-${currentDoc.documentNumber}-${Date.now()}`,
        });
        return paymentService.initiateMobileMoneyDeposit({
          intentNumber: intent.intentNumber,
          phoneNumber: payForm.phoneNumber,
          correspondent: payForm.correspondent,
          amount: payForm.amount > 0 ? payForm.amount : undefined,
          createdBy: (window as any).__admin_email__ || 'admin',
        });
      }
      return billingService.payInvoiceDirect(currentDoc.documentNumber, {
        paymentMethod: payForm.method,
        amount: payForm.amount > 0 ? payForm.amount : undefined,
        cashSessionNumber: payForm.method === 'CASH' ? payForm.cashSessionNumber : undefined,
        walletNumber: payForm.method === 'WALLET' ? payForm.walletNumber : undefined,
        processedBy: (window as any).__admin_email__ || 'admin',
        idempotencyKey: `pay-${currentDoc.documentNumber}-${Date.now()}`,
      });
    },
    onSuccess: (data) => {
      if (payForm.method === 'MOBILE_MONEY') {
        setPayResult({ transaction: data });
      } else {
        setPayResult(data);
      }
      invalidateAll();
      setPayError(null);
      if (data.transactionNumber || data.transaction?.transactionNumber) {
        handleOpenReceipt(data.transactionNumber || data.transaction?.transactionNumber);
      }
    },
    onError: (e: any) => setPayError(e?.response?.data?.message || 'Erreur lors du paiement.'),
  });

  const anyPending = issueMutation.isPending || sendMutation.isPending || sendEmailMutation.isPending
    || acceptQuoteMutation.isPending || rejectQuoteMutation.isPending || convertMutation.isPending
    || applyMutation.isPending;

  const handleDownloadPdf = async () => {
    try {
      const blob = await billingService.getPdf(currentDoc.documentNumber);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${currentDoc.documentType}_${currentDoc.documentNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionError('Erreur lors du téléchargement du PDF.');
    }
  };

  const handleOpenReceipt = async (transactionNumber: string) => {
    if (!transactionNumber) return;
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

  const addInstallment = () => {
    setScheduleInstallments([...scheduleInstallments, { dueDate: '', amount: 0 }]);
  };

  const updateInstallment = (index: number, field: 'dueDate' | 'amount', value: string | number) => {
    const updated = [...scheduleInstallments];
    updated[index] = { ...updated[index], [field]: value };
    setScheduleInstallments(updated);
  };

  const removeInstallment = (index: number) => {
    setScheduleInstallments(scheduleInstallments.filter((_, i) => i !== index));
  };

  const createScheduleMutation = useMutation({
    mutationFn: () => billingService.createInvoiceSchedule(currentDoc.documentNumber, {
      installments: scheduleInstallments.filter(i => i.amount > 0 && i.dueDate),
    }),
    onSuccess: () => {
      refetchSchedule();
      setScheduleError(null);
    },
    onError: (error: any) => {
      setScheduleError(error?.response?.data?.message || 'Erreur lors de la création de l\'échéancier.');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleNumber: string) => billingService.deleteInvoiceSchedule(scheduleNumber),
    onSuccess: () => {
      refetchSchedule();
      setScheduleError(null);
    },
    onError: (error: any) => {
      setScheduleError(error?.response?.data?.message || 'Erreur lors de la suppression.');
    },
  });

  const payInstallmentMutation = useMutation({
    mutationFn: ({ installmentNumber, method, cashSessionNumber, walletNumber }: {
      installmentNumber: string;
      method: 'CASH' | 'WALLET';
      cashSessionNumber?: string;
      walletNumber?: string;
    }) => billingService.payInstallment(installmentNumber, {
      paymentMethod: method,
      cashSessionNumber,
      walletNumber,
      processedBy: (window as any).__admin_email__ || 'admin',
      idempotencyKey: `inst-${installmentNumber}-${Date.now()}`,
    }),
    onSuccess: () => {
      refetchSchedule();
      invalidateAll();
    },
    onError: (error: any) => {
      setScheduleError(error?.response?.data?.message || 'Erreur lors du paiement de la tranche.');
    },
  });

  if (!isOpen) return null;

  const s = currentDoc.status;
  const t = currentDoc.documentType;
  const status = statusConfig[s];

  return (
    <ModalPortal onClose={onClose} size="4xl">
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{currentDoc.documentNumber}</h3>
          <p className="text-sm text-gray-500">{documentTypeLabels[t] || t}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
      </div>

      {/* Statut */}
      <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>
          {status?.label || s}
        </span>
        <span className="text-xs text-gray-500">Créé le {new Date(currentDoc.createdAt).toLocaleDateString('fr-FR')}</span>
      </div>

      {/* Barre d'actions */}
      <div className="px-6 py-3 border-b bg-white flex flex-wrap gap-2">
        {actionError && (
          <div className="w-full text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mb-1 flex justify-between">
            {actionError}
            <button onClick={() => setActionError(null)} className="underline ml-2">Fermer</button>
          </div>
        )}

        <button onClick={handleDownloadPdf}
          className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs flex items-center gap-1">
          <Download size={13} /> PDF
        </button>

        {s === 'DRAFT' && (
          <button onClick={() => issueMutation.mutate()} disabled={anyPending}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
            {issueMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Émettre
          </button>
        )}

        {s === 'ISSUED' && (
          <>
            <button onClick={() => sendMutation.mutate()} disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
              {sendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Marquer envoyé
            </button>
            <button onClick={() => sendEmailMutation.mutate()} disabled={anyPending}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
              {sendEmailMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              Envoyer email
            </button>
          </>
        )}

        {t === 'QUOTE' && ['ISSUED', 'SENT'].includes(s) && (
          <>
            <button onClick={() => acceptQuoteMutation.mutate()} disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
              {acceptQuoteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Accepter
            </button>
            <button onClick={() => { if (confirm('Rejeter ce devis ?')) rejectQuoteMutation.mutate(); }}
              disabled={anyPending}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
              {rejectQuoteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Rejeter
            </button>
          </>
        )}

        {t === 'QUOTE' && s === 'ACCEPTED' && (
          <button onClick={() => convertMutation.mutate()} disabled={anyPending}
            className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
            {convertMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            Convertir en facture
          </button>
        )}

        {t === 'INVOICE' && ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(s) && (
          <>
            <button onClick={() => { 
              setIsPayModalOpen(true); 
              setPayError(null); 
              setPayResult(null); 
              setPayForm({ method: 'CASH', cashSessionNumber: '', walletNumber: '', phoneNumber: '', correspondent: '', amount: 0 }); 
            }}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1">
              <CreditCard size={12} /> Payer
            </button>
            <button onClick={() => { setIsScheduleOpen(true); setScheduleError(null); setScheduleInstallments([{ dueDate: '', amount: 0 }]); }}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1">
              <Calendar size={12} /> Échéancier
            </button>
          </>
        )}

        {t === 'INVOICE' && ['PAID', 'PARTIALLY_PAID'].includes(s) && (
          <button onClick={() => setIsCreditNoteOpen(true)}
            className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1">
            <FileText size={12} /> Créer un avoir
          </button>
        )}

        {t === 'CREDIT_NOTE' && s === 'ISSUED' && (
          <button onClick={() => { if (confirm('Appliquer cet avoir sur la facture liée ?')) applyMutation.mutate(); }}
            disabled={anyPending}
            className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
            {applyMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Appliquer l&apos;avoir
          </button>
        )}
      </div>

      {/* Contenu */}
      <div className="p-6 space-y-4 overflow-y-auto">
        {/* Client */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-500 mb-2">Client</h4>
          <p className="font-medium">{currentDoc.customerName || currentDoc.customerCode || 'Client externe'}</p>
          {currentDoc.customerEmail && <p className="text-sm text-gray-500">{currentDoc.customerEmail}</p>}
          {currentDoc.customerPhone && <p className="text-sm text-gray-500">{currentDoc.customerPhone}</p>}
          {currentDoc.customerType && (
            <p className="text-xs text-gray-400 mt-1">{currentDoc.customerType} · {currentDoc.customerCode}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Date d&apos;émission</p>
            <p className="font-medium text-sm">{currentDoc.issueDate ? new Date(currentDoc.issueDate).toLocaleDateString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Échéance</p>
            <p className={`font-medium text-sm ${s === 'OVERDUE' ? 'text-red-600' : ''}`}>
              {currentDoc.dueDate ? new Date(currentDoc.dueDate).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
        </div>

        {/* Source résolue */}
        {(currentDoc.resolvedSourceLabel || currentDoc.sourceCode) && (
          <div className="p-3 bg-blue-50 rounded-lg text-xs">
            <span className="text-blue-500">Source : </span>
            <span className="font-semibold text-blue-800">
              {currentDoc.resolvedSourceLabel || `${currentDoc.sourceType} / ${currentDoc.sourceCode}`}
            </span>
            {currentDoc.resolvedSourceType && (
              <span className="text-blue-400 ml-2 font-mono">({currentDoc.resolvedSourceType})</span>
            )}
          </div>
        )}

        {/* Lignes */}
        {currentDoc.lines && currentDoc.lines.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Lignes</h4>
            <div className="space-y-2">
              {currentDoc.lines.map((line, idx) => (
                <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-gray-500">
                      {line.quantity} × {line.unitPrice.toLocaleString('fr-FR')} FCFA
                      {line.taxable ? ' · TVA 18%' : ' · Exonéré'}
                    </p>
                  </div>
                  <p className="font-semibold">{(line.quantity * line.unitPrice).toLocaleString('fr-FR')} FCFA</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totaux */}
        <div className="border-t pt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sous-total HT</span>
            <span>{currentDoc.subtotalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          {currentDoc.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Remise</span>
              <span>-{currentDoc.discountAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          {currentDoc.vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TVA 18%</span>
              <span>{currentDoc.vatAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          {currentDoc.additionalCentAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Centimes additionnels 5%</span>
              <span>{currentDoc.additionalCentAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total TTC</span>
            <span>{currentDoc.totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          {currentDoc.paidAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Payé</span>
              <span>-{currentDoc.paidAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          {currentDoc.balanceDue > 0 && (
            <div className="flex justify-between text-sm font-semibold text-red-600">
              <span>Reste à payer</span>
              <span>{currentDoc.balanceDue.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal paiement direct */}
      {isPayModalOpen && (
        <ModalPortal onClose={() => setIsPayModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Payer la facture</h3>
            <button onClick={() => setIsPayModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {payError}
              </div>
            )}
            {payResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Paiement effectué — Transaction : <span className="font-mono">{payResult.transaction?.transactionNumber}</span></span>
                </div>
                {payResult.transaction?.advanceAmount > 0 && (
                  <p className="mt-1 text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    Une partie a été créditée comme avance : {payResult.transaction.advanceAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                )}
                {payResult.status === 'PROCESSING' && (
                  <p className="mt-1 text-xs flex items-center gap-1 text-yellow-700">
                    <Loader2 size={12} className="animate-spin" />
                    Paiement Mobile Money en cours de traitement...
                  </p>
                )}
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-500">Solde à payer : </span>
              <span className="font-bold text-red-600">{currentDoc.balanceDue.toLocaleString('fr-FR')} {currentDoc.currency}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${payForm.method === 'CASH' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <input type="radio" checked={payForm.method === 'CASH'} onChange={() => setPayForm(f => ({ ...f, method: 'CASH' }))} className="sr-only" />
                  <Banknote size={16} className={payForm.method === 'CASH' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm">Cash</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${payForm.method === 'WALLET' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <input type="radio" checked={payForm.method === 'WALLET'} onChange={() => setPayForm(f => ({ ...f, method: 'WALLET' }))} className="sr-only" />
                  <Wallet size={16} className={payForm.method === 'WALLET' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm">Wallet</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${payForm.method === 'MOBILE_MONEY' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}>
                  <input type="radio" checked={payForm.method === 'MOBILE_MONEY'} onChange={() => setPayForm(f => ({ ...f, method: 'MOBILE_MONEY' }))} className="sr-only" />
                  <Smartphone size={16} className={payForm.method === 'MOBILE_MONEY' ? 'text-yellow-600' : 'text-gray-400'} />
                  <span className="text-sm">Mobile Money</span>
                </label>
              </div>
            </div>
            {payForm.method === 'CASH' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session de caisse</label>
                <select
                  value={payForm.cashSessionNumber}
                  onChange={(e) => setPayForm(f => ({ ...f, cashSessionNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Aucune (paiement hors session)</option>
                  {openSessions.map(s => (
                    <option key={s.sessionNumber} value={s.sessionNumber}>
                      {s.sessionNumber} — {s.registerCode}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Sélectionnez une session de caisse ouverte</p>
              </div>
            )}
            {payForm.method === 'WALLET' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Wallet *</label>
                <input type="text" value={payForm.walletNumber}
                  onChange={(e) => setPayForm(f => ({ ...f, walletNumber: e.target.value }))}
                  placeholder="WAL-000001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            )}
            {payForm.method === 'MOBILE_MONEY' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                  <select
                    value={payForm.correspondent}
                    onChange={(e) => setPayForm(f => ({ ...f, correspondent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner un provider</option>
                    {(mmProviders || []).map((p: any) => (
                      <option key={p.code} value={p.code}>{p.displayName} ({p.countryCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payForm.phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPayForm(f => ({ ...f, phoneNumber: val }));
                    }}
                    placeholder="242061135836"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Format international sans "+"</p>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (laisser vide = payer le solde total)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={payForm.amount === 0 ? '' : payForm.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPayForm(f => ({ ...f, amount: val === '' ? 0 : parseInt(val) }));
                }}
                placeholder={`Solde : ${currentDoc.balanceDue.toLocaleString('fr-FR')} ${currentDoc.currency}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsPayModalOpen(false)} disabled={payMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50">Annuler</button>
              <button onClick={() => payMutation.mutate()}
                disabled={
                  payMutation.isPending || 
                  (payForm.method === 'WALLET' && !payForm.walletNumber) ||
                  (payForm.method === 'MOBILE_MONEY' && (!payForm.phoneNumber || !payForm.correspondent))
                }
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {payMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    <Receipt size={16} /> Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal échéancier */}
      {isScheduleOpen && (
        <ModalPortal onClose={() => setIsScheduleOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Échéancier de paiement</h3>
            <button onClick={() => setIsScheduleOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {scheduleError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {scheduleError}
              </div>
            )}

            {existingSchedule && existingSchedule.installments ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Échéancier {existingSchedule.scheduleNumber && <span className="font-mono text-xs text-gray-400">({existingSchedule.scheduleNumber})</span>}
                  </h4>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cet échéancier ?')) {
                        deleteScheduleMutation.mutate(existingSchedule.scheduleNumber);
                      }
                    }}
                    disabled={deleteScheduleMutation.isPending}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
                <div className="space-y-2">
                  {existingSchedule.installments.map((inst: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{inst.installmentNumber}</p>
                        <p className="text-xs text-gray-500">
                          Échéance : {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('fr-FR') : '—'}
                        </p>
                        <p className="text-xs text-gray-400">Statut : {inst.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{inst.amount?.toLocaleString('fr-FR')} FCFA</p>
                        {inst.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              const method = confirm('Payer en Cash ? (OK = Cash, Annuler = Wallet)') ? 'CASH' : 'WALLET';
                              if (method === 'WALLET') {
                                const wn = prompt('N° Wallet :');
                                if (!wn) return;
                                payInstallmentMutation.mutate({
                                  installmentNumber: inst.installmentNumber,
                                  method: 'WALLET',
                                  walletNumber: wn,
                                });
                              } else {
                                const cs = openSessions.length > 0
                                  ? prompt('N° Session caisse (optionnel) : ' + openSessions.map(s => s.sessionNumber).join(', '))
                                  : undefined;
                                payInstallmentMutation.mutate({
                                  installmentNumber: inst.installmentNumber,
                                  method: 'CASH',
                                  cashSessionNumber: cs || undefined,
                                });
                              }
                            }}
                            disabled={payInstallmentMutation.isPending}
                            className="mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200"
                          >
                            Payer cette tranche
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Nouvel échéancier</h4>
                  <button onClick={addInstallment} className="text-xs text-primary-600 flex items-center gap-1">
                    <Plus size={12} /> Ajouter une tranche
                  </button>
                </div>
                <div className="space-y-2">
                  {scheduleInstallments.map((inst, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inst.amount === 0 ? '' : inst.amount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          updateInstallment(idx, 'amount', val === '' ? 0 : parseFloat(val));
                        }}
                        placeholder="Montant"
                        className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeInstallment(idx)}
                        disabled={scheduleInstallments.length === 1}
                        className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => createScheduleMutation.mutate()}
                  disabled={createScheduleMutation.isPending || scheduleInstallments.filter(i => i.amount > 0 && i.dueDate).length === 0}
                  className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {createScheduleMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Créer l\'échéancier'}
                </button>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

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

      <CreateCreditNoteModal
        isOpen={isCreditNoteOpen}
        onClose={() => setIsCreditNoteOpen(false)}
        invoiceNumber={currentDoc.documentNumber}
        onSuccess={() => {
          invalidateAll();
          setIsCreditNoteOpen(false);
        }}
      />
    </ModalPortal>
  );
};