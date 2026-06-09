import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Download,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Wallet,
  Receipt,
  AlertCircle,
  Calendar,
  Plus,
  Trash2,
  Banknote,
  Smartphone,
  Eye,
  MessageSquare,
  DollarSign,
  PenLine,
  Tag,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { CreateCreditNoteModal } from "./CreateCreditNoteModal";

interface BillingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: BillingDocument;
  onRefresh: () => void;
  onCreateCreditNote: (invoiceNumber: string) => void;
}

// ─── Labels & config ──────────────────────────────────────────────────────────

const documentTypeLabels: Record<string, string> = {
  QUOTE: "Devis",
  PROFORMA_INVOICE: "Proforma",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  DEBIT_NOTE: "Note de débit",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  ISSUED: { label: "Émis(e)", color: "bg-blue-100 text-blue-700" },
  SENT: { label: "Envoyé(e)", color: "bg-purple-100 text-purple-700" },
  ACCEPTED: { label: "Accepté(e)", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté(e)", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré(e)", color: "bg-gray-100 text-gray-500" },
  CONVERTED: { label: "Converti(e)", color: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: {
    label: "Partiellement payé(e)",
    color: "bg-yellow-100 text-yellow-700",
  },
  PAID: { label: "Payé(e)", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "En retard", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulé(e)", color: "bg-gray-100 text-gray-500" },
  VOIDED: { label: "Annulé(e)", color: "bg-gray-100 text-gray-500" },
  REFUNDED: { label: "Remboursé(e)", color: "bg-orange-100 text-orange-700" },
  WRITTEN_OFF: {
    label: "Passé(e) en perte",
    color: "bg-gray-100 text-gray-500",
  },
  // Sprint 3 — nouveaux statuts devis
  VIEWED: { label: "Vu par le client", color: "bg-teal-100 text-teal-700" },
  NEGOTIATION: {
    label: "En négociation",
    color: "bg-amber-100 text-amber-700",
  },
  DEPOSIT_REQUESTED: {
    label: "Acompte demandé",
    color: "bg-violet-100 text-violet-700",
  },
  DEPOSIT_PAID: { label: "Acompte reçu", color: "bg-green-100 text-green-600" },
};

// ─── Composant ───────────────────────────────────────────────────────────────

export const BillingDetailModal: React.FC<BillingDetailModalProps> = ({
  isOpen,
  onClose,
  document: initialDoc,
  onRefresh,
}) => {
  const queryClient = useQueryClient();
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [payForm, setPayForm] = useState({
    method: "CASH" as "CASH" | "WALLET" | "MOBILE_MONEY",
    cashSessionNumber: "",
    walletNumber: "",
    phoneNumber: "",
    correspondent: "",
    amount: 0,
  });
  const [payError, setPayError] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [scheduleInstallments, setScheduleInstallments] = useState<
    Array<{ dueDate: string; amount: number }>
  >([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureMessage, setSignatureMessage] = useState("");
  const [signatureResult, setSignatureResult] = useState<any>(null);

  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ── Refresh document ──────────────────────────────────────────────────────
  const { data: refreshedDocument } = useQuery({
    queryKey: ["billing-document", initialDoc.documentNumber],
    queryFn: () => billingService.getDocument(initialDoc.documentNumber),
    enabled: isOpen,
  });
  const currentDoc = refreshedDocument ?? initialDoc;

  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content ?? [];

  const { data: mmProviders = [] } = useQuery({
    queryKey: ["mobile-money-providers"],
    queryFn: () => paymentService.getMobileMoneyProviders(),
  });

  const { data: existingSchedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["invoice-schedule", currentDoc.documentNumber],
    queryFn: () => billingService.getInvoiceSchedule(currentDoc.documentNumber),
    enabled: isScheduleOpen && currentDoc.documentType === "INVOICE",
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
    queryClient.invalidateQueries({
      queryKey: ["billing-document", currentDoc.documentNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["customer-statement"] });
    onRefresh();
  };

  const makeM = (
    fn: () => Promise<any>,
    errorMsg = "Erreur lors de l'action.",
  ) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidateAll,
      onError: (e: any) =>
        setActionError(e?.response?.data?.message ?? errorMsg),
    });

  // Mutations workflow général
  const issueMutation = makeM(() =>
    billingService.issueDocument(currentDoc.documentNumber),
  );
  const sendMutation = makeM(() =>
    billingService.sendDocument(currentDoc.documentNumber),
  );
  const sendEmailMutation = makeM(() =>
    billingService.sendEmail(currentDoc.documentNumber),
  );

  // Mutations workflow devis
  const acceptMutation = makeM(() =>
    billingService.acceptQuote(currentDoc.documentNumber),
  );
  const rejectMutation = makeM(() =>
    billingService.rejectQuote(currentDoc.documentNumber),
  );
  const convertMutation = makeM(() =>
    billingService.convertToInvoice(currentDoc.documentNumber),
  );
  // Sprint 3
  const markViewedMutation = makeM(() =>
    billingService.markViewed(currentDoc.documentNumber),
  );
  const negotiationMutation = makeM(() =>
    billingService.startNegotiation(currentDoc.documentNumber),
  );
  const requestDepositMutation = makeM(() =>
    billingService.requestDeposit(currentDoc.documentNumber),
  );
  const markDepositPaidMutation = makeM(() =>
    billingService.markDepositPaid(currentDoc.documentNumber),
  );

  // Avoir
  const applyMutation = makeM(() =>
    billingService.applyCreditNote(currentDoc.documentNumber),
  );

  // Signature (Sprint 3)
  const signatureMutation = useMutation({
    mutationFn: () =>
      billingService.requestSignature(currentDoc.documentNumber, {
        signerName: signerName || undefined,
        signerEmail: signerEmail || undefined,
        customMessage: signatureMessage || undefined,
      }),
    onSuccess: (data) => {
      setSignatureResult(data);
      invalidateAll();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ??
          "Erreur lors de l'envoi de la demande de signature.",
      ),
  });

  // Paiement direct
  const payMutation = useMutation({
    mutationFn: async () => {
      if (payForm.method === "MOBILE_MONEY") {
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
          createdBy: (window as any).__admin_email__ || "admin",
        });
      }
      return billingService.payInvoiceDirect(currentDoc.documentNumber, {
        paymentMethod: payForm.method as "CASH" | "WALLET",
        amount: payForm.amount > 0 ? payForm.amount : undefined,
        cashSessionNumber:
          payForm.method === "CASH" ? payForm.cashSessionNumber : undefined,
        walletNumber:
          payForm.method === "WALLET" ? payForm.walletNumber : undefined,
        processedBy: (window as any).__admin_email__ || "admin",
        idempotencyKey: `pay-${currentDoc.documentNumber}-${Date.now()}`,
      });
    },
    onSuccess: (data) => {
      setPayResult(data);
      invalidateAll();
      setPayError(null);
      const txn =
        "transactionNumber" in data
          ? data.transactionNumber
          : data?.transaction?.transactionNumber;
      if (txn) handleOpenReceipt(txn);
    },
    onError: (e: any) =>
      setPayError(e?.response?.data?.message ?? "Erreur lors du paiement."),
  });

  // Échéancier
  const createScheduleMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceSchedule(currentDoc.documentNumber, {
        installments: scheduleInstallments.filter(
          (i) => i.amount > 0 && i.dueDate,
        ),
      }),
    onSuccess: () => {
      refetchSchedule();
      setScheduleError(null);
    },
    onError: (e: any) =>
      setScheduleError(e?.response?.data?.message ?? "Erreur échéancier."),
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: (n: string) => billingService.deleteInvoiceSchedule(n),
    onSuccess: () => {
      refetchSchedule();
      setScheduleError(null);
    },
    onError: (e: any) =>
      setScheduleError(e?.response?.data?.message ?? "Erreur suppression."),
  });
  const payInstallmentMutation = useMutation({
    mutationFn: ({
      installmentNumber,
      method,
      cashSessionNumber,
      walletNumber,
    }: {
      installmentNumber: string;
      method: "CASH" | "WALLET";
      cashSessionNumber?: string;
      walletNumber?: string;
    }) =>
      billingService.payInstallment(installmentNumber, {
        paymentMethod: method,
        cashSessionNumber,
        walletNumber,
        processedBy: (window as any).__admin_email__ || "admin",
        idempotencyKey: `inst-${installmentNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      refetchSchedule();
      invalidateAll();
    },
    onError: (e: any) =>
      setScheduleError(
        e?.response?.data?.message ?? "Erreur paiement tranche.",
      ),
  });

  const handleDownloadPdf = async () => {
    try {
      const blob = await billingService.getPdf(currentDoc.documentNumber);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${currentDoc.documentType}_${currentDoc.documentNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionError("Erreur lors du téléchargement du PDF.");
    }
  };

  const handleOpenReceipt = async (transactionNumber: string) => {
    if (!transactionNumber) return;
    setReceiptLoading(true);
    setIsReceiptOpen(true);
    try {
      setReceiptData(await paymentService.getReceipt(transactionNumber));
    } catch {
      setReceiptData(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  const addInstallment = () =>
    setScheduleInstallments([
      ...scheduleInstallments,
      { dueDate: "", amount: 0 },
    ]);
  const updateInstallment = (
    i: number,
    f: "dueDate" | "amount",
    v: string | number,
  ) => {
    const a = [...scheduleInstallments];
    a[i] = { ...a[i], [f]: v };
    setScheduleInstallments(a);
  };
  const removeInstallment = (i: number) =>
    setScheduleInstallments(scheduleInstallments.filter((_, idx) => idx !== i));

  const anyPending =
    issueMutation.isPending ||
    sendMutation.isPending ||
    sendEmailMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    convertMutation.isPending ||
    applyMutation.isPending ||
    markViewedMutation.isPending ||
    negotiationMutation.isPending ||
    requestDepositMutation.isPending ||
    markDepositPaidMutation.isPending;

  if (!isOpen) return null;

  const s = currentDoc.status;
  const t = currentDoc.documentType;
  const cfg = statusConfig[s] ?? {
    label: s,
    color: "bg-gray-100 text-gray-600",
  };

  const isQuote = t === "QUOTE";
  const isInvoice = t === "INVOICE";
  const isCreditNote = t === "CREDIT_NOTE";

  return (
    <ModalPortal onClose={onClose} size="5xl">
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{currentDoc.documentNumber}</h3>
          <p className="text-sm text-gray-500">{documentTypeLabels[t] ?? t}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Statut + dates */}
      <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-3 flex-wrap">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
        >
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">
          Créé le{" "}
          {currentDoc.createdAt
            ? new Date(currentDoc.createdAt).toLocaleDateString("fr-FR")
            : "—"}
        </span>
        {currentDoc.projectCode && (
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
            Projet : {currentDoc.projectCode}
          </span>
        )}
        {/* Sprint 3 — badge signature */}
        {currentDoc.signature && (
          <span
            className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
              currentDoc.signature.status === "SIGNED"
                ? "bg-green-50 text-green-600"
                : currentDoc.signature.status === "EXPIRED"
                  ? "bg-gray-100 text-gray-500"
                  : "bg-amber-50 text-amber-600"
            }`}
          >
            <PenLine size={11} />
            {currentDoc.signature.status === "SIGNED"
              ? "Signé"
              : currentDoc.signature.status === "EXPIRED"
                ? "Signature expirée"
                : "Signature en attente"}
          </span>
        )}
      </div>

      {/* Barre d'actions */}
      <div className="px-6 py-3 border-b bg-white flex flex-wrap gap-2">
        {actionError && (
          <div className="w-full text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 flex justify-between">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="underline ml-2"
            >
              Fermer
            </button>
          </div>
        )}

        {/* PDF toujours disponible */}
        <button
          onClick={handleDownloadPdf}
          className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs flex items-center gap-1"
        >
          <Download size={12} /> PDF
        </button>

        {/* Émettre */}
        {s === "DRAFT" && (
          <button
            onClick={() => issueMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {issueMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Émettre
          </button>
        )}

        {/* Envoyer */}
        {s === "ISSUED" && (
          <>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Marquer envoyé
            </button>
            <button
              onClick={() => sendEmailMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {sendEmailMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileText size={12} />
              )}
              Envoyer email
            </button>
          </>
        )}

        {/* Workflow devis */}
        {isQuote && ["SENT"].includes(s) && (
          <button
            onClick={() => markViewedMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            <Eye size={12} /> Marquer vu
          </button>
        )}

        {isQuote && ["SENT", "VIEWED", "ACCEPTED"].includes(s) && (
          <button
            onClick={() => negotiationMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            <MessageSquare size={12} /> Négociation
          </button>
        )}

        {isQuote && ["ISSUED", "SENT", "VIEWED", "NEGOTIATION"].includes(s) && (
          <>
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {acceptMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Accepter
            </button>
            <button
              onClick={() => {
                if (confirm("Rejeter ce devis ?")) rejectMutation.mutate();
              }}
              disabled={anyPending}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {rejectMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XCircle size={12} />
              )}
              Rejeter
            </button>
          </>
        )}

        {isQuote &&
          ["SENT", "VIEWED", "ACCEPTED", "NEGOTIATION"].includes(s) && (
            <button
              onClick={() => {
                setIsSignatureOpen(true);
                setSignerName(currentDoc.customerName ?? "");
                setSignerEmail(currentDoc.customerEmail ?? "");
                setSignatureMessage("");
                setSignatureResult(null);
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs flex items-center gap-1"
            >
              <PenLine size={12} /> Demander signature
            </button>
          )}

        {isQuote && s === "ACCEPTED" && (
          <>
            <button
              onClick={() => requestDepositMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {requestDepositMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <DollarSign size={12} />
              )}
              Demander acompte
            </button>
            <button
              onClick={() => convertMutation.mutate()}
              disabled={anyPending}
              className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {convertMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ArrowRight size={12} />
              )}
              Convertir en facture
            </button>
          </>
        )}

        {isQuote && s === "DEPOSIT_REQUESTED" && (
          <button
            onClick={() => markDepositPaidMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {markDepositPaidMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle size={12} />
            )}
            Marquer acompte reçu
          </button>
        )}

        {isQuote && s === "DEPOSIT_PAID" && (
          <button
            onClick={() => convertMutation.mutate()}
            disabled={anyPending}
            className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {convertMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ArrowRight size={12} />
            )}
            Convertir en facture
          </button>
        )}

        {/* Paiement facture */}
        {isInvoice &&
          ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"].includes(s) && (
            <>
              <button
                onClick={() => {
                  setIsPayModalOpen(true);
                  setPayError(null);
                  setPayResult(null);
                  setPayForm({
                    method: "CASH",
                    cashSessionNumber: "",
                    walletNumber: "",
                    phoneNumber: "",
                    correspondent: "",
                    amount: 0,
                  });
                }}
                className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1"
              >
                <CreditCard size={12} /> Payer
              </button>
              <button
                onClick={() => {
                  setIsScheduleOpen(true);
                  setScheduleError(null);
                  setScheduleInstallments([{ dueDate: "", amount: 0 }]);
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1"
              >
                <Calendar size={12} /> Échéancier
              </button>
            </>
          )}

        {isInvoice && ["PAID", "PARTIALLY_PAID"].includes(s) && (
          <button
            onClick={() => setIsCreditNoteOpen(true)}
            className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1"
          >
            <FileText size={12} /> Créer un avoir
          </button>
        )}

        {isCreditNote && s === "ISSUED" && (
          <button
            onClick={() => {
              if (confirm("Appliquer cet avoir ?")) applyMutation.mutate();
            }}
            disabled={anyPending}
            className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {applyMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle size={12} />
            )}
            Appliquer l&apos;avoir
          </button>
        )}
      </div>

      {/* Corps */}
      <div className="p-6 space-y-4 overflow-y-auto">
        {/* Client */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Client
          </h4>
          <p className="font-medium">
            {currentDoc.customerName ??
              currentDoc.customerCode ??
              "Client externe"}
          </p>
          {currentDoc.customerEmail && (
            <p className="text-sm text-gray-500">{currentDoc.customerEmail}</p>
          )}
          {currentDoc.customerPhone && (
            <p className="text-sm text-gray-500">{currentDoc.customerPhone}</p>
          )}
          {currentDoc.customerType && (
            <p className="text-xs text-gray-400 mt-1">
              {currentDoc.customerType} · {currentDoc.customerCode}
            </p>
          )}
        </div>

        {/* Champs enrichis sprint 2 */}
        {(currentDoc.customerReference ||
          currentDoc.poNumber ||
          currentDoc.projectCode ||
          currentDoc.salespersonCode) && (
          <div className="grid grid-cols-2 gap-3">
            {currentDoc.customerReference && (
              <InfoCard
                label="Référence client"
                value={currentDoc.customerReference}
              />
            )}
            {currentDoc.poNumber && (
              <InfoCard
                label="N° bon de commande"
                value={currentDoc.poNumber}
              />
            )}
            {currentDoc.projectCode && (
              <InfoCard label="Projet" value={currentDoc.projectCode} />
            )}
            {currentDoc.salespersonCode && (
              <InfoCard label="Commercial" value={currentDoc.salespersonCode} />
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label="Date d'émission"
            value={
              currentDoc.issueDate
                ? new Date(currentDoc.issueDate).toLocaleDateString("fr-FR")
                : "—"
            }
          />
          <InfoCard
            label="Échéance"
            value={
              currentDoc.dueDate
                ? new Date(currentDoc.dueDate).toLocaleDateString("fr-FR")
                : "—"
            }
            valueClass={s === "OVERDUE" ? "text-red-600 font-medium" : ""}
          />
        </div>

        {/* Source */}
        {(currentDoc.resolvedSourceLabel || currentDoc.sourceCode) && (
          <div className="p-3 bg-blue-50 rounded-lg text-xs">
            <span className="text-blue-400">Source : </span>
            <span className="font-semibold text-blue-800">
              {currentDoc.resolvedSourceLabel ??
                `${currentDoc.sourceType} / ${currentDoc.sourceCode}`}
            </span>
          </div>
        )}

        {/* Lignes */}
        {currentDoc.lines?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Lignes</h4>
            <div className="space-y-2">
              {currentDoc.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between p-3 rounded-lg text-sm ${line.optional ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}
                >
                  <div>
                    <p className="font-medium">
                      {line.description}
                      {line.optional && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Option
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {line.quantity}
                      {line.unit ? ` ${line.unit}` : ""} ×{" "}
                      {line.unitPrice.toLocaleString("fr-FR")} FCFA
                      {(line.discountRate ?? 0) > 0 &&
                        ` − ${line.discountRate}%`}
                      {line.taxable ? " · TVA 18%" : " · Exonéré"}
                    </p>
                    {line.externalReference && (
                      <p className="text-xs text-gray-400">
                        Réf. : {line.externalReference}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold">
                    {(line.quantity * line.unitPrice).toLocaleString("fr-FR")}{" "}
                    FCFA
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totaux */}
        <div className="border-t pt-4 space-y-1.5">
          <TotalRow
            label="Sous-total HT"
            value={currentDoc.subtotalAmount}
            currency={currentDoc.currency}
          />
          {currentDoc.discountAmount > 0 && (
            <TotalRow
              label="Remise"
              value={-currentDoc.discountAmount}
              currency={currentDoc.currency}
              valueClass="text-red-600"
            />
          )}
          {currentDoc.vatAmount > 0 && (
            <TotalRow
              label="TVA 18%"
              value={currentDoc.vatAmount}
              currency={currentDoc.currency}
            />
          )}
          {currentDoc.additionalCentAmount > 0 && (
            <TotalRow
              label="Centimes additionnels 5%"
              value={currentDoc.additionalCentAmount}
              currency={currentDoc.currency}
            />
          )}
          <TotalRow
            label="Total TTC"
            value={currentDoc.totalAmount}
            currency={currentDoc.currency}
            className="font-bold text-base pt-2 border-t"
          />
          {currentDoc.paidAmount > 0 && (
            <TotalRow
              label="Payé"
              value={-currentDoc.paidAmount}
              currency={currentDoc.currency}
              valueClass="text-green-600"
            />
          )}
          {currentDoc.balanceDue > 0 && (
            <TotalRow
              label="Reste à payer"
              value={currentDoc.balanceDue}
              currency={currentDoc.currency}
              valueClass="text-red-600 font-semibold"
            />
          )}
          {/* Sprint 2 — options */}
          {(currentDoc.optionsTotal ?? 0) > 0 && (
            <div className="pt-2 border-t border-dashed border-amber-200">
              <div className="flex justify-between text-xs text-amber-600">
                <span>Options disponibles (non incluses)</span>
                <span>
                  +{currentDoc.optionsTotal!.toLocaleString("fr-FR")}{" "}
                  {currentDoc.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sprint 1 — Acompte */}
        {currentDoc.advance && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <h4 className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
              <Banknote size={12} /> Acompte
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p>
                  {currentDoc.advance.advanceType === "PERCENTAGE"
                    ? `${currentDoc.advance.advanceValue}%`
                    : `${currentDoc.advance.advanceValue?.toLocaleString("fr-FR")} ${currentDoc.currency}`}
                </p>
              </div>
              {currentDoc.advance.computedAmount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Montant calculé</p>
                  <p className="font-semibold">
                    {currentDoc.advance.computedAmount.toLocaleString("fr-FR")}{" "}
                    {currentDoc.currency}
                  </p>
                </div>
              )}
              {currentDoc.advance.dueDate && (
                <div>
                  <p className="text-xs text-gray-500">Échéance</p>
                  <p>
                    {new Date(currentDoc.advance.dueDate).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Statut</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    currentDoc.advance.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : currentDoc.advance.status === "CANCELLED"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {currentDoc.advance.status === "PAID"
                    ? "Reçu"
                    : currentDoc.advance.status === "CANCELLED"
                      ? "Annulé"
                      : "En attente"}
                </span>
              </div>
              {currentDoc.advance.paymentReference && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Référence</p>
                  <p className="font-mono text-xs">
                    {currentDoc.advance.paymentReference}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sprint 2 — Escompte */}
        {currentDoc.earlyPaymentDiscount && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <h4 className="text-xs font-semibold text-teal-600 uppercase mb-2 flex items-center gap-1">
              <Tag size={12} /> Escompte pour paiement anticipé
            </h4>
            <p className="text-sm">
              {currentDoc.earlyPaymentDiscount.label ??
                `Escompte ${currentDoc.earlyPaymentDiscount.discountRate}% si règlement avant le ${new Date(currentDoc.earlyPaymentDiscount.ifPaidBefore).toLocaleDateString("fr-FR")}`}
            </p>
            {currentDoc.earlyPaymentDiscount.computedAmount !== undefined && (
              <p className="text-xs text-teal-700 mt-1">
                Économie :{" "}
                {currentDoc.earlyPaymentDiscount.computedAmount.toLocaleString(
                  "fr-FR",
                )}{" "}
                {currentDoc.currency}
              </p>
            )}
          </div>
        )}

        {/* Sprint 1 — Référence de paiement */}
        {(currentDoc.paymentReference ||
          currentDoc.paymentInstructions ||
          currentDoc.bankDetailsJson) && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <CreditCard size={12} /> Informations de paiement
            </h4>
            {currentDoc.paymentReference && (
              <p className="text-sm">
                <span className="text-gray-500">Référence : </span>
                <span className="font-mono">{currentDoc.paymentReference}</span>
              </p>
            )}
            {currentDoc.paymentInstructions && (
              <p className="text-sm text-gray-600 mt-1">
                {currentDoc.paymentInstructions}
              </p>
            )}
            {currentDoc.bankDetailsJson &&
              (() => {
                try {
                  const b = JSON.parse(currentDoc.bankDetailsJson);
                  return (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(b).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                        >
                          {k} : {String(v)}
                        </span>
                      ))}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
          </div>
        )}

        {/* Sprint 3 — Signature */}
        {currentDoc.signature && (
          <div
            className={`p-4 rounded-xl border ${
              currentDoc.signature.status === "SIGNED"
                ? "bg-green-50 border-green-200"
                : currentDoc.signature.status === "EXPIRED"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-indigo-50 border-indigo-200"
            }`}
          >
            <h4
              className="text-xs font-semibold uppercase mb-2 flex items-center gap-1"
              style={{
                color:
                  currentDoc.signature.status === "SIGNED"
                    ? "#166534"
                    : currentDoc.signature.status === "EXPIRED"
                      ? "#6b7280"
                      : "#3730a3",
              }}
            >
              <PenLine size={12} /> Signature électronique
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Statut</p>
                <p>
                  {currentDoc.signature.status === "SIGNED"
                    ? "Signé"
                    : currentDoc.signature.status === "EXPIRED"
                      ? "Expiré"
                      : "En attente de signature"}
                </p>
              </div>
              {currentDoc.signature.signerName && (
                <div>
                  <p className="text-xs text-gray-500">Signataire</p>
                  <p>{currentDoc.signature.signerName}</p>
                </div>
              )}
              {currentDoc.signature.signerEmail && (
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p>{currentDoc.signature.signerEmail}</p>
                </div>
              )}
              {currentDoc.signature.signedAt && (
                <div>
                  <p className="text-xs text-gray-500">Signé le</p>
                  <p>
                    {new Date(currentDoc.signature.signedAt).toLocaleString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              )}
              {currentDoc.signature.expiresAt &&
                currentDoc.signature.status === "PENDING" && (
                  <div>
                    <p className="text-xs text-gray-500">Expire le</p>
                    <p>
                      {new Date(currentDoc.signature.expiresAt).toLocaleString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Modal paiement */}
      {isPayModalOpen && (
        <ModalPortal onClose={() => setIsPayModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Payer la facture</h3>
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                {payError}
              </div>
            )}
            {payResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle size={14} />
                Paiement effectué — Transaction :{" "}
                <span className="font-mono">
                  {payResult.transaction?.transactionNumber}
                </span>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-500">Solde : </span>
              <span className="font-bold text-red-600">
                {currentDoc.balanceDue.toLocaleString("fr-FR")}{" "}
                {currentDoc.currency}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <div className="flex gap-3">
                {(
                  [
                    {
                      value: "CASH",
                      label: "Cash",
                      icon: Banknote,
                      border: "border-green-500 bg-green-50",
                    },
                    {
                      value: "WALLET",
                      label: "Wallet",
                      icon: Wallet,
                      border: "border-blue-500 bg-blue-50",
                    },
                    {
                      value: "MOBILE_MONEY",
                      label: "Mobile Money",
                      icon: Smartphone,
                      border: "border-yellow-500 bg-yellow-50",
                    },
                  ] as const
                ).map(({ value, label, icon: Icon, border }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${payForm.method === value ? border : "border-gray-200"}`}
                  >
                    <input
                      type="radio"
                      checked={payForm.method === value}
                      onChange={() =>
                        setPayForm((f) => ({ ...f, method: value }))
                      }
                      className="sr-only"
                    />
                    <Icon
                      size={15}
                      className={
                        payForm.method === value
                          ? "text-current"
                          : "text-gray-400"
                      }
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {payForm.method === "CASH" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session de caisse
                </label>
                <select
                  value={payForm.cashSessionNumber}
                  onChange={(e) =>
                    setPayForm((f) => ({
                      ...f,
                      cashSessionNumber: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Aucune (paiement hors session)</option>
                  {openSessions.map((sess) => (
                    <option key={sess.sessionNumber} value={sess.sessionNumber}>
                      {sess.sessionNumber} — {sess.registerCode}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {payForm.method === "WALLET" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° Wallet *
                </label>
                <input
                  type="text"
                  value={payForm.walletNumber}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, walletNumber: e.target.value }))
                  }
                  placeholder="WAL-000001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            )}
            {payForm.method === "MOBILE_MONEY" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider *
                  </label>
                  <select
                    value={payForm.correspondent}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        correspondent: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner un provider</option>
                    {(mmProviders || []).map((p: any) => (
                      <option key={p.code} value={p.code}>
                        {p.displayName} ({p.countryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payForm.phoneNumber}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        phoneNumber: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="242061135836"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Format international sans «+»
                  </p>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant{" "}
                <span className="text-gray-400 font-normal">
                  (vide = solde total)
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={payForm.amount === 0 ? "" : payForm.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setPayForm((f) => ({
                    ...f,
                    amount: v === "" ? 0 : parseInt(v),
                  }));
                }}
                placeholder={`${currentDoc.balanceDue.toLocaleString("fr-FR")} ${currentDoc.currency}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsPayModalOpen(false)}
                disabled={payMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => payMutation.mutate()}
                disabled={
                  payMutation.isPending ||
                  (payForm.method === "WALLET" && !payForm.walletNumber) ||
                  (payForm.method === "MOBILE_MONEY" &&
                    (!payForm.phoneNumber || !payForm.correspondent))
                }
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <Receipt size={15} /> Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal signature (Sprint 3) */}
      {isSignatureOpen && (
        <ModalPortal onClose={() => setIsSignatureOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              Demander une signature électronique
            </h3>
            <button
              onClick={() => setIsSignatureOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {signatureResult ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle
                  size={32}
                  className="mx-auto text-green-500 mb-2"
                />
                <p className="font-medium text-green-800">
                  Email de signature envoyé
                </p>
                <p className="text-sm text-green-600 mt-1">
                  À : {signatureResult.signerEmail}
                </p>
                {signatureResult.expiresAt && (
                  <p className="text-xs text-green-400 mt-1">
                    Expire le{" "}
                    {new Date(signatureResult.expiresAt).toLocaleString(
                      "fr-FR",
                    )}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Un email sera envoyé au signataire avec un lien vers la page
                  de signature. Le devis passera en <strong>Accepté</strong>{" "}
                  après signature.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du signataire
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder={currentDoc.customerName ?? "Jean Moukala"}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email du signataire
                  </label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder={
                      currentDoc.customerEmail ?? "signataire@client.com"
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message personnalisé
                  </label>
                  <textarea
                    value={signatureMessage}
                    rows={2}
                    onChange={(e) => setSignatureMessage(e.target.value)}
                    placeholder="Merci de signer ce devis pour valider votre réservation..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSignatureOpen(false)}
                    disabled={signatureMutation.isPending}
                    className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => signatureMutation.mutate()}
                    disabled={signatureMutation.isPending}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signatureMutation.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <PenLine size={15} /> Envoyer la demande
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Modal échéancier */}
      {isScheduleOpen && (
        <ModalPortal onClose={() => setIsScheduleOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Échéancier de paiement</h3>
            <button
              onClick={() => setIsScheduleOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {scheduleError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                {scheduleError}
              </div>
            )}
            {existingSchedule?.installments ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold">
                    Échéancier{" "}
                    {existingSchedule.scheduleNumber && (
                      <span className="font-mono text-xs text-gray-400">
                        ({existingSchedule.scheduleNumber})
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => {
                      if (confirm("Supprimer cet échéancier ?"))
                        deleteScheduleMutation.mutate(
                          existingSchedule.scheduleNumber,
                        );
                    }}
                    disabled={deleteScheduleMutation.isPending}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
                <div className="space-y-2">
                  {existingSchedule.installments.map(
                    (inst: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-mono">
                            {inst.installmentNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Échéance :{" "}
                            {inst.dueDate
                              ? new Date(inst.dueDate).toLocaleDateString(
                                  "fr-FR",
                                )
                              : "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            Statut : {inst.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">
                            {inst.amount?.toLocaleString("fr-FR")} FCFA
                          </p>
                          {inst.status === "PENDING" && (
                            <button
                              onClick={() => {
                                const method = confirm(
                                  "Payer en Cash ? (OK=Cash / Annuler=Wallet)",
                                )
                                  ? "CASH"
                                  : "WALLET";
                                if (method === "WALLET") {
                                  const wn = prompt("N° Wallet :");
                                  if (!wn) return;
                                  payInstallmentMutation.mutate({
                                    installmentNumber: inst.installmentNumber,
                                    method: "WALLET",
                                    walletNumber: wn,
                                  });
                                } else {
                                  const cs =
                                    openSessions.length > 0
                                      ? prompt(
                                          "N° Session (optionnel) : " +
                                            openSessions
                                              .map((s) => s.sessionNumber)
                                              .join(", "),
                                        )
                                      : undefined;
                                  payInstallmentMutation.mutate({
                                    installmentNumber: inst.installmentNumber,
                                    method: "CASH",
                                    cashSessionNumber: cs ?? undefined,
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
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold">Nouvel échéancier</h4>
                  <button
                    onClick={addInstallment}
                    className="text-xs text-primary-600 flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter une tranche
                  </button>
                </div>
                <div className="space-y-2">
                  {scheduleInstallments.map((inst, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) =>
                          updateInstallment(idx, "dueDate", e.target.value)
                        }
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inst.amount === 0 ? "" : inst.amount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          updateInstallment(
                            idx,
                            "amount",
                            v === "" ? 0 : parseFloat(v),
                          );
                        }}
                        placeholder="Montant"
                        className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeInstallment(idx)}
                        disabled={scheduleInstallments.length === 1}
                        className="p-1.5 text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => createScheduleMutation.mutate()}
                  disabled={
                    createScheduleMutation.isPending ||
                    scheduleInstallments.filter(
                      (i) => i.amount > 0 && i.dueDate,
                    ).length === 0
                  }
                  className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {createScheduleMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Créer l'échéancier"
                  )}
                </button>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Modal reçu */}
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
              </div>
            ) : receiptData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    label="N° Reçu"
                    value={receiptData.receiptNumber}
                    mono
                  />
                  <InfoCard
                    label="N° Transaction"
                    value={receiptData.transactionNumber}
                    mono
                  />
                  <InfoCard
                    label="Montant payé"
                    value={`${receiptData.paidAmount?.toLocaleString("fr-FR")} FCFA`}
                    className="font-bold text-lg"
                  />
                  <InfoCard
                    label="Méthode"
                    value={`${receiptData.paymentMethod}${receiptData.provider ? ` · ${receiptData.provider}` : ""}`}
                  />
                  {receiptData.advanceAmount > 0 && (
                    <InfoCard
                      label="Avance créditée"
                      value={`${receiptData.advanceAmount?.toLocaleString("fr-FR")} FCFA`}
                      className="text-amber-700"
                    />
                  )}
                  <InfoCard
                    label="Encaissé par"
                    value={receiptData.receivedBy}
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      const blob = await paymentService.getReceiptPdf(
                        receiptData.transactionNumber,
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `recu_${receiptData.transactionNumber}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Download size={15} /> Télécharger PDF
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Reçu introuvable
              </div>
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

// ─── Sous-composants ──────────────────────────────────────────────────────────

const InfoCard: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
  valueClass?: string;
}> = ({ label, value, mono, className, valueClass }) => (
  <div className={`p-3 bg-gray-50 rounded-lg ${className ?? ""}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p
      className={`font-medium text-sm mt-0.5 ${mono ? "font-mono" : ""} ${valueClass ?? ""}`}
    >
      {value}
    </p>
  </div>
);

const TotalRow: React.FC<{
  label: string;
  value: number;
  currency: string;
  className?: string;
  valueClass?: string;
}> = ({ label, value, currency, className, valueClass }) => (
  <div className={`flex justify-between text-sm ${className ?? ""}`}>
    <span className="text-gray-600">{label}</span>
    <span className={valueClass}>
      {value >= 0 ? "" : "−"}
      {Math.abs(value).toLocaleString("fr-FR")} {currency}
    </span>
  </div>
);
