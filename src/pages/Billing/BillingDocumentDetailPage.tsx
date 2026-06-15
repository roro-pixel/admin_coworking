import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  ArrowLeft,
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
  AlertCircle,
  Calendar,
  Banknote,
  Smartphone,
  Eye,
  MessageSquare,
  DollarSign,
  PenLine,
  Tag,
  Printer,
  Mail,
  User,
  Trash2,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { CreateCreditNoteModal } from "./CreateCreditNoteModal";
import { useAuth } from "../../contexts/AuthContext";

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

// ─── Composant principal ───────────────────────────────────────────────────────

export const BillingDocumentDetailPage: React.FC = () => {
  const { documentNumber } = useParams<{ documentNumber: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  // États des modals
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedOptionLines, setSelectedOptionLines] = useState<Set<number>>(
    new Set(),
  );
  const [payingInstallment, setPayingInstallment] = useState<string | null>(
    null,
  );
  const [installmentPayForm, setInstallmentPayForm] = useState({
    method: "CASH" as "CASH" | "WALLET",
    cashSessionNumber: "",
    walletNumber: "",
  });

  // États paiement
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

  // États signature
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureMessage, setSignatureMessage] = useState("");
  const [signatureResult, setSignatureResult] = useState<any>(null);

  // États échéancier
  const [scheduleInstallments, setScheduleInstallments] = useState<
    Array<{ dueDate: string; amount: number }>
  >([]);

  // ── Requête principale ──────────────────────────────────────────────────────
  const {
    data: document,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["billing-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber!),
    enabled: !!documentNumber,
  });

  // ── Données complémentaires ────────────────────────────────────────────────
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
    queryKey: ["invoice-schedule", documentNumber],
    queryFn: () => billingService.getInvoiceSchedule(documentNumber!),
    enabled:
      isScheduleOpen &&
      !!documentNumber &&
      document?.documentType === "INVOICE",
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["billing-document", documentNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
    queryClient.invalidateQueries({ queryKey: ["customer-statement"] });
    refetch();
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

  // Mutations workflow
  const issueMutation = makeM(() =>
    billingService.issueDocument(documentNumber!),
  );
  const sendMutation = makeM(() =>
    billingService.sendDocument(documentNumber!),
  );
  const sendEmailMutation = makeM(() =>
    billingService.sendEmail(documentNumber!),
  );
  const acceptMutation = makeM(() =>
    billingService.acceptQuote(documentNumber!),
  );
  const rejectMutation = makeM(() =>
    billingService.rejectQuote(documentNumber!),
  );
  const convertMutation = makeM(() =>
    billingService.convertToInvoice(documentNumber!),
  );
  const applyMutation = makeM(() =>
    billingService.applyCreditNote(documentNumber!),
  );
  const markViewedMutation = makeM(() =>
    billingService.markViewed(documentNumber!),
  );
  const negotiationMutation = makeM(() =>
    billingService.startNegotiation(documentNumber!),
  );
  const requestDepositMutation = makeM(() =>
    billingService.requestDeposit(documentNumber!),
  );
  const markDepositPaidMutation = makeM(() =>
    billingService.markDepositPaid(documentNumber!),
  );

  const selectOptionsMutation = useMutation({
    mutationFn: () =>
      billingService.selectOptions(
        documentNumber!,
        Array.from(selectedOptionLines),
      ),
    onSuccess: () => {
      setSelectedOptionLines(new Set());
      invalidateAll();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ??
          "Erreur lors de la sélection des options.",
      ),
  });

  const payInstallmentMutation = useMutation({
    mutationFn: (installmentNumber: string) =>
      billingService.payInstallment(installmentNumber, {
        paymentMethod: installmentPayForm.method,
        cashSessionNumber:
          installmentPayForm.method === "CASH"
            ? installmentPayForm.cashSessionNumber || undefined
            : undefined,
        walletNumber:
          installmentPayForm.method === "WALLET"
            ? installmentPayForm.walletNumber
            : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `inst-${installmentNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      setPayingInstallment(null);
      setInstallmentPayForm({
        method: "CASH",
        cashSessionNumber: "",
        walletNumber: "",
      });
      refetchSchedule();
      invalidateAll();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ?? "Erreur lors du paiement de la tranche.",
      ),
  });

  // Signature
  const signatureMutation = useMutation({
    mutationFn: () =>
      billingService.requestSignature(documentNumber!, {
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

  // Paiement
  const payMutation = useMutation({
    mutationFn: async () => {
      if (payForm.method === "MOBILE_MONEY") {
        const intent = await paymentService.createPaymentIntentFromBilling({
          documentNumber: documentNumber!,
          amount: payForm.amount > 0 ? payForm.amount : undefined,
          idempotencyKey: `pay-mm-${documentNumber}-${Date.now()}`,
        });
        return paymentService.initiateMobileMoneyDeposit({
          intentNumber: intent.intentNumber,
          phoneNumber: payForm.phoneNumber,
          correspondent: payForm.correspondent,
          amount: payForm.amount > 0 ? payForm.amount : undefined,
          createdBy: admin?.email || "admin",
        });
      }
      return billingService.payInvoiceDirect(documentNumber!, {
        paymentMethod: payForm.method as "CASH" | "WALLET",
        amount: payForm.amount > 0 ? payForm.amount : undefined,
        cashSessionNumber:
          payForm.method === "CASH" ? payForm.cashSessionNumber : undefined,
        walletNumber:
          payForm.method === "WALLET" ? payForm.walletNumber : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `pay-${documentNumber}-${Date.now()}`,
      });
    },
    onSuccess: (data) => {
      setPayResult(data);
      invalidateAll();
      setPayError(null);
    },
    onError: (e: any) =>
      setPayError(e?.response?.data?.message ?? "Erreur lors du paiement."),
  });

  // Suppression échéancier
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleNumber: string) =>
      billingService.deleteInvoiceSchedule(scheduleNumber),
    onSuccess: () => {
      refetchSchedule();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message ?? "Erreur suppression."),
  });

  // Helpers échéancier
  const addInstallment = () =>
    setScheduleInstallments([
      ...scheduleInstallments,
      { dueDate: "", amount: 0 },
    ]);
  const removeInstallment = (i: number) =>
    setScheduleInstallments(scheduleInstallments.filter((_, idx) => idx !== i));
  const updateInstallment = (
    i: number,
    f: "dueDate" | "amount",
    v: string | number,
  ) => {
    const a = [...scheduleInstallments];
    a[i] = { ...a[i], [f]: v };
    setScheduleInstallments(a);
  };

  // Création échéancier
  const createScheduleMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceSchedule(documentNumber!, {
        installments: scheduleInstallments.filter(
          (i) => i.amount > 0 && i.dueDate,
        ),
      }),
    onSuccess: () => {
      refetchSchedule();
      setScheduleInstallments([]);
      setIsScheduleOpen(false);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message ?? "Erreur échéancier."),
  });

  const handlePrint = (docType: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Veuillez autoriser les popups pour imprimer");
      return;
    }
    const styles = window.document.querySelectorAll(
      'link[rel="stylesheet"], style',
    );
    let stylesHTML = "";
    styles.forEach((style) => {
      if (style.tagName === "LINK") {
        stylesHTML += `<link rel="stylesheet" href="${(style as HTMLLinkElement).href}">`;
      } else {
        stylesHTML += style.outerHTML;
      }
    });
    const contentElement = window.document
      .querySelector(".max-w-6xl.mx-auto.py-8")
      ?.cloneNode(true) as HTMLElement;
    if (contentElement) {
      contentElement.querySelectorAll("button").forEach((btn) => btn.remove());
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentNumber} - ${documentTypeLabels[docType] ?? docType}</title>
          <meta charset="UTF-8">
          ${stylesHTML}
          <style>
            body { background: white !important; margin: 0; padding: 20px; }
            .max-w-6xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .shadow-sm, .shadow { box-shadow: none !important; }
            button { display: none !important; }
          </style>
        </head>
        <body>${contentElement?.outerHTML || "<p>Contenu non trouvé</p>"}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  // Téléchargement PDF
  const handleDownloadPdf = async () => {
    try {
      const blob = await billingService.getPdf(documentNumber!);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document?.documentType}_${documentNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionError("Erreur lors du téléchargement du PDF.");
    }
  };

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
    markDepositPaidMutation.isPending ||
    selectOptionsMutation.isPending ||
    payInstallmentMutation.isPending;

  // Formatage des dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "—";
    const parts = dateString.split("T");
    if (parts.length === 2) {
      const date = parts[0].split("-").reverse().join("/");
      const time = parts[1].substring(0, 8);
      return `${date} ${time}`;
    }
    return dateString;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-12 w-12 text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!document) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Document non trouvé</p>
          <button
            onClick={() => navigate("/billing")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Retour à la liste
          </button>
        </div>
      </AdminLayout>
    );
  }

  const s = document.status;
  const t = document.documentType;
  const cfg = statusConfig[s] ?? {
    label: s,
    color: "bg-gray-100 text-gray-600",
  };
  const isQuote = t === "QUOTE";
  const isInvoice = t === "INVOICE";
  const isCreditNote = t === "CREDIT_NOTE";
  const optionalLines = document.lines?.filter((l) => l.optional) ?? [];
  const hasOptionalLines = optionalLines.length > 0;
  const canSelectOptions =
    isQuote &&
    hasOptionalLines &&
    ["DRAFT", "ISSUED", "SENT", "VIEWED", "NEGOTIATION"].includes(s);
  const optionsTotalAll = optionalLines.reduce(
    (sum, l) => sum + (l.totalAmount ?? (l.quantity ?? 1) * (l.unitPrice ?? 0)),
    0,
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8">
        {/* Header avec retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/billing")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={18} />
            Retour à la liste des documents
          </button>
        </div>

        {/* Erreur */}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between items-center">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="underline">
              Fermer
            </button>
          </div>
        )}

        {/* En-tête du document */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b bg-gray-50">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {document.documentNumber}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-gray-500">
                  {documentTypeLabels[t] ?? t}
                  {document.projectCode && (
                    <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                      Projet: {document.projectCode}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={() => handlePrint(t)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <Printer size={16} /> Imprimer
                </button>
                <button
                  onClick={() => sendEmailMutation.mutate()}
                  disabled={anyPending}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <Mail size={16} /> Envoyer par email
                </button>
              </div>
            </div>
          </div>

          {/* Barre d'actions workflow */}
          <div className="px-6 py-4 border-b bg-white flex flex-wrap gap-2">
            {s === "DRAFT" && (
              <button
                onClick={() => issueMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                {issueMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Émettre
              </button>
            )}

            {s === "ISSUED" && (
              <>
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={anyPending}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Marquer envoyé
                </button>
                <button
                  onClick={() => sendEmailMutation.mutate()}
                  disabled={anyPending}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Mail size={14} />
                  )}
                  Envoyer email
                </button>
              </>
            )}

            {isQuote && ["SENT"].includes(s) && (
              <button
                onClick={() => markViewedMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <Eye size={14} /> Marquer vu
              </button>
            )}

            {isQuote && ["SENT", "VIEWED", "ACCEPTED"].includes(s) && (
              <button
                onClick={() => negotiationMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <MessageSquare size={14} /> Négociation
              </button>
            )}

            {isQuote &&
              ["ISSUED", "SENT", "VIEWED", "NEGOTIATION"].includes(s) && (
                <>
                  <button
                    onClick={() => acceptMutation.mutate()}
                    disabled={anyPending}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    Accepter
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Rejeter ce devis ?"))
                        rejectMutation.mutate();
                    }}
                    disabled={anyPending}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    <XCircle size={14} /> Rejeter
                  </button>
                </>
              )}

            {isQuote &&
              ["SENT", "VIEWED", "ACCEPTED", "NEGOTIATION"].includes(s) && (
                <button
                  onClick={() => {
                    setIsSignatureOpen(true);
                    setSignerName(document.customerName ?? "");
                    setSignerEmail(document.customerEmail ?? "");
                    setSignatureMessage("");
                    setSignatureResult(null);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"
                >
                  <PenLine size={14} /> Demander signature
                </button>
              )}

            {isQuote && s === "ACCEPTED" && (
              <>
                <button
                  onClick={() => requestDepositMutation.mutate()}
                  disabled={anyPending}
                  className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm flex items-center gap-1"
                >
                  <DollarSign size={14} /> Demander acompte
                </button>
                <button
                  onClick={() => convertMutation.mutate()}
                  disabled={anyPending}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"
                >
                  <ArrowRight size={14} /> Convertir en facture
                </button>
              </>
            )}

            {isQuote && s === "DEPOSIT_REQUESTED" && (
              <button
                onClick={() => markDepositPaidMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <CheckCircle size={14} /> Marquer acompte reçu
              </button>
            )}

            {isQuote && s === "DEPOSIT_PAID" && (
              <button
                onClick={() => convertMutation.mutate()}
                disabled={anyPending}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <ArrowRight size={14} /> Convertir en facture
              </button>
            )}

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
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    <CreditCard size={14} /> Payer
                  </button>
                  <button
                    onClick={() => {
                      setIsScheduleOpen(true);
                      setScheduleInstallments([{ dueDate: "", amount: 0 }]);
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    <Calendar size={14} /> Échéancier
                  </button>
                </>
              )}

            {isInvoice && ["PAID", "PARTIALLY_PAID"].includes(s) && (
              <button
                onClick={() => setIsCreditNoteOpen(true)}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <FileText size={14} /> Créer un avoir
              </button>
            )}

            {isCreditNote && s === "ISSUED" && (
              <button
                onClick={() => {
                  if (confirm("Appliquer cet avoir ?")) applyMutation.mutate();
                }}
                disabled={anyPending}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <CheckCircle size={14} /> Appliquer l'avoir
              </button>
            )}
          </div>
        </div>

        {/* Grille d'informations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Client et dates */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User size={18} className="text-primary-600" />
                Client
              </h2>
              <p className="font-medium text-gray-900">
                {document.customerName ??
                  document.customerCode ??
                  "Client externe"}
              </p>
              {document.customerEmail && (
                <p className="text-sm text-gray-500 mt-1">
                  {document.customerEmail}
                </p>
              )}
              {document.customerPhone && (
                <p className="text-sm text-gray-500">
                  {document.customerPhone}
                </p>
              )}
              {document.customerType && (
                <p className="text-xs text-gray-400 mt-2">
                  {document.customerType} · {document.customerCode}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary-600" />
                Dates
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date d'émission</p>
                  <p className="font-medium">
                    {formatDate(document.issueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Échéance</p>
                  <p
                    className={`font-medium ${s === "OVERDUE" ? "text-red-600" : ""}`}
                  >
                    {formatDate(document.dueDate)}
                  </p>
                </div>
                {document.issuedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Émis le</p>
                    <p className="font-medium">
                      {formatDateTime(document.issuedAt)}
                    </p>
                  </div>
                )}
                {document.sentAt && (
                  <div>
                    <p className="text-sm text-gray-500">Envoyé le</p>
                    <p className="font-medium">
                      {formatDateTime(document.sentAt)}
                    </p>
                  </div>
                )}
                {document.paidAt && (
                  <div>
                    <p className="text-sm text-gray-500">Payé le</p>
                    <p className="font-medium text-green-600">
                      {formatDateTime(document.paidAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(document.resolvedSourceLabel || document.sourceCode) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Source métier
                </h2>
                <p className="font-medium">
                  {document.resolvedSourceLabel ?? document.sourceCode}
                </p>
                {document.resolvedSourceType && (
                  <p className="text-xs text-gray-400 mt-1">
                    {document.resolvedSourceType} ·{" "}
                    {document.resolvedSourceCode}
                  </p>
                )}
              </div>
            )}

            {/* Sélection des options (devis) */}
            {canSelectOptions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-amber-900 mb-2">
                  Options du devis
                </h2>
                <p className="text-sm text-amber-700 mb-4">
                  Cochez les options retenues par le client. Les options non
                  sélectionnées seront supprimées définitivement.
                </p>
                <div className="space-y-2 mb-4">
                  {optionalLines.map((line) => {
                    const order = line.lineOrder ?? 0;
                    const amount =
                      line.totalAmount ??
                      (line.quantity ?? 1) * (line.unitPrice ?? 0);
                    return (
                      <label
                        key={order}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOptionLines.has(order)}
                            onChange={() => {
                              const next = new Set(selectedOptionLines);
                              if (next.has(order)) next.delete(order);
                              else next.add(order);
                              setSelectedOptionLines(next);
                            }}
                            className="rounded"
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {line.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              Ligne #{order}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {amount.toLocaleString("fr-FR")} {document.currency}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-amber-800 mb-4">
                  <span>
                    Total confirmé :{" "}
                    <strong>
                      {document.totalAmount.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </strong>
                  </span>
                  <span>
                    Options :{" "}
                    <strong>
                      +
                      {(
                        document.optionsTotal ?? optionsTotalAll
                      ).toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </strong>
                  </span>
                  <span>
                    Total si toutes options :{" "}
                    <strong>
                      {(
                        document.totalAmount +
                        (document.optionsTotal ?? optionsTotalAll)
                      ).toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (selectedOptionLines.size === 0) {
                      if (
                        !confirm(
                          "Aucune option sélectionnée — toutes les options seront supprimées. Continuer ?",
                        )
                      )
                        return;
                    }
                    selectOptionsMutation.mutate();
                  }}
                  disabled={selectOptionsMutation.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {selectOptionsMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Valider la sélection des options
                </button>
              </div>
            )}

            {/* Champs enrichis */}
            {(document.customerReference ||
              document.poNumber ||
              document.projectCode ||
              document.salespersonCode) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations complémentaires
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {document.customerReference && (
                    <div>
                      <p className="text-sm text-gray-500">Réf. client</p>
                      <p className="font-medium">
                        {document.customerReference}
                      </p>
                    </div>
                  )}
                  {document.poNumber && (
                    <div>
                      <p className="text-sm text-gray-500">
                        N° bon de commande
                      </p>
                      <p className="font-medium">{document.poNumber}</p>
                    </div>
                  )}
                  {document.projectCode && (
                    <div>
                      <p className="text-sm text-gray-500">Projet</p>
                      <p className="font-medium">{document.projectCode}</p>
                    </div>
                  )}
                  {document.salespersonCode && (
                    <div>
                      <p className="text-sm text-gray-500">Commercial</p>
                      <p className="font-medium">{document.salespersonCode}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lignes */}
            {document.lines && document.lines.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Lignes du document
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          Qté
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          Prix unit.
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {document.lines.map((line, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50 ${line.optional ? "bg-amber-50/30" : ""}`}
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-sm">
                              {line.description}
                            </p>
                            {line.optional && (
                              <span className="text-xs text-amber-600">
                                Option
                              </span>
                            )}
                            {line.externalReference && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Réf: {line.externalReference}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {line.quantity}
                            {line.unit ? ` ${line.unit}` : ""}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {(line.unitPrice ?? 0).toLocaleString("fr-FR")} FCFA
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-sm">
                            {(
                              (line.quantity ?? 1) * (line.unitPrice ?? 0)
                            ).toLocaleString("fr-FR")}{" "}
                            FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Remises et clauses */}
            {document.discounts && document.discounts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Remises
                </h2>
                {document.discounts.map((discount, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span>{discount.description}</span>
                    <span className="font-medium">
                      {discount.discountType === "PERCENTAGE"
                        ? `${discount.value}%`
                        : `${discount.value.toLocaleString("fr-FR")} ${document.currency}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {document.clauses && document.clauses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Clauses
                </h2>
                <div className="space-y-3">
                  {document.clauses.map((clause, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-sm">{clause.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {clause.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite - Totaux et paiement */}
          <div className="space-y-6">
            {/* Totaux */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Récapitulatif
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total HT</span>
                  <span>
                    {document.subtotalAmount.toLocaleString("fr-FR")}{" "}
                    {document.currency}
                  </span>
                </div>
                {document.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Remise</span>
                    <span>
                      -{document.discountAmount.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                {document.vatAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>TVA 18%</span>
                    <span>
                      {document.vatAmount.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                {document.additionalCentAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Centimes additionnels</span>
                    <span>
                      {document.additionalCentAmount.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total TTC</span>
                  <span className="text-primary-600">
                    {document.totalAmount.toLocaleString("fr-FR")}{" "}
                    {document.currency}
                  </span>
                </div>
                {document.paidAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Payé</span>
                    <span>
                      -{document.paidAmount.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                {document.balanceDue > 0 && (
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span className="text-red-600">Reste à payer</span>
                    <span className="text-red-600">
                      {document.balanceDue.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                {(document.optionsTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-dashed border-amber-200 text-amber-600">
                    <span>Options disponibles (non incluses)</span>
                    <span>
                      +{document.optionsTotal!.toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
                {(document.optionsTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>Total si toutes options</span>
                    <span>
                      {(
                        document.totalAmount + document.optionsTotal!
                      ).toLocaleString("fr-FR")}{" "}
                      {document.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Informations de paiement */}
            {(document.paymentReference || document.paymentInstructions) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary-600" />
                  Informations de paiement
                </h2>
                {document.paymentReference && (
                  <p className="text-sm">
                    <span className="text-gray-500">Référence:</span>{" "}
                    <span className="font-mono">
                      {document.paymentReference}
                    </span>
                  </p>
                )}
                {document.paymentInstructions && (
                  <p className="text-sm text-gray-600 mt-2">
                    {document.paymentInstructions}
                  </p>
                )}
              </div>
            )}

            {/* Acompte */}
            {document.advance && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Banknote size={18} className="text-green-600" />
                  Acompte
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span>
                      {document.advance.advanceType === "PERCENTAGE"
                        ? `${document.advance.advanceValue}%`
                        : `${document.advance.advanceValue?.toLocaleString("fr-FR")} FCFA`}
                    </span>
                  </div>
                  {document.advance.computedAmount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant</span>
                      <span className="font-medium">
                        {document.advance.computedAmount.toLocaleString(
                          "fr-FR",
                        )}{" "}
                        FCFA
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Statut</span>
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full ${
                        document.advance.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : document.advance.status === "CANCELLED"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {document.advance.status === "PAID"
                        ? "Reçu"
                        : document.advance.status === "CANCELLED"
                          ? "Annulé"
                          : "En attente"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Escompte */}
            {document.earlyPaymentDiscount && (
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag size={18} className="text-teal-600" />
                  Escompte pour paiement anticipé
                </h2>
                <p className="text-sm">
                  {document.earlyPaymentDiscount.label ??
                    `Escompte ${document.earlyPaymentDiscount.discountRate}% si règlement avant le ${formatDate(document.earlyPaymentDiscount.ifPaidBefore)}`}
                </p>
                {document.earlyPaymentDiscount.computedAmount && (
                  <p className="text-sm text-teal-600 mt-2">
                    Économie:{" "}
                    {document.earlyPaymentDiscount.computedAmount.toLocaleString(
                      "fr-FR",
                    )}{" "}
                    FCFA
                  </p>
                )}
              </div>
            )}

            {/* Signature */}
            {document.signature && (
              <div
                className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
                  document.signature.status === "SIGNED"
                    ? "border-green-500"
                    : document.signature.status === "EXPIRED"
                      ? "border-gray-400"
                      : "border-indigo-500"
                }`}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <PenLine size={18} className="text-indigo-600" />
                  Signature électronique
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Statut</span>
                    <span>
                      {document.signature.status === "SIGNED"
                        ? "Signé"
                        : document.signature.status === "EXPIRED"
                          ? "Expiré"
                          : "En attente"}
                    </span>
                  </div>
                  {document.signature.signerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Signataire</span>
                      <span>{document.signature.signerName}</span>
                    </div>
                  )}
                  {document.signature.signerEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span>{document.signature.signerEmail}</span>
                    </div>
                  )}
                  {document.signature.signedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Signé le</span>
                      <span>{formatDateTime(document.signature.signedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Modal signature */}
      {isSignatureOpen && (
        <ModalPortal onClose={() => setIsSignatureOpen(false)}>
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              Demander une signature électronique
            </h3>
            <button
              onClick={() => setIsSignatureOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={20} />
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
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du signataire
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
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
                    className="w-full px-3 py-2 border rounded-lg"
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
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSignatureOpen(false)}
                    className="flex-1 px-4 py-2 border rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => signatureMutation.mutate()}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg"
                  >
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Modal paiement */}
      {isPayModalOpen && (
        <ModalPortal onClose={() => setIsPayModalOpen(false)}>
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Payer la facture</h3>
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {payError}
              </div>
            )}
            {payResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
                Paiement effectué
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-500">Solde : </span>
              <span className="font-bold text-red-600">
                {document.balanceDue.toLocaleString("fr-FR")}{" "}
                {document.currency}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <div className="flex gap-3">
                {[
                  { value: "CASH", label: "Cash", icon: Banknote },
                  { value: "WALLET", label: "Wallet", icon: Wallet },
                  {
                    value: "MOBILE_MONEY",
                    label: "Mobile Money",
                    icon: Smartphone,
                  },
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${payForm.method === value ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
                  >
                    <input
                      type="radio"
                      checked={payForm.method === value}
                      onChange={() =>
                        setPayForm((f) => ({ ...f, method: value as any }))
                      }
                      className="sr-only"
                    />
                    <Icon size={15} /> <span className="text-sm">{label}</span>
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
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Aucune</option>
                  {openSessions.map((sess) => (
                    <option key={sess.sessionNumber} value={sess.sessionNumber}>
                      {sess.sessionNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {payForm.method === "WALLET" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° Wallet
                </label>
                <input
                  type="text"
                  value={payForm.walletNumber}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, walletNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}
            {payForm.method === "MOBILE_MONEY" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={payForm.correspondent}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        correspondent: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Sélectionner</option>
                    {mmProviders.map((p: any) => (
                      <option key={p.code} value={p.code}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
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
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant
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
                placeholder={`${document.balanceDue.toLocaleString("fr-FR")}`}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => payMutation.mutate()}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
              >
                Payer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal échéancier */}
      {isScheduleOpen && (
        <ModalPortal onClose={() => setIsScheduleOpen(false)} size="lg">
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Échéancier de paiement</h3>
            <button
              onClick={() => setIsScheduleOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {existingSchedule && existingSchedule.installments?.length > 0 ? (
              <div>
                {existingSchedule.scheduleNumber && (
                  <p className="text-xs text-gray-400 mb-3 font-mono">
                    Échéancier {existingSchedule.scheduleNumber}
                  </p>
                )}
                <div className="space-y-2">
                  {existingSchedule.installments.map((inst, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-mono">
                            {inst.installmentNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Échéance: {formatDate(inst.dueDate)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Statut: {inst.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {inst.amount?.toLocaleString("fr-FR")} FCFA
                          </p>
                          {inst.status === "PENDING" && (
                            <button
                              onClick={() => {
                                setPayingInstallment(inst.installmentNumber);
                                setInstallmentPayForm({
                                  method: "CASH",
                                  cashSessionNumber: "",
                                  walletNumber: "",
                                });
                              }}
                              className="mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200"
                            >
                              Payer cette tranche
                            </button>
                          )}
                        </div>
                      </div>
                      {payingInstallment === inst.installmentNumber && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                          <div className="flex gap-3">
                            {(["CASH", "WALLET"] as const).map((method) => (
                              <label
                                key={method}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${installmentPayForm.method === method ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
                              >
                                <input
                                  type="radio"
                                  checked={installmentPayForm.method === method}
                                  onChange={() =>
                                    setInstallmentPayForm((f) => ({
                                      ...f,
                                      method,
                                    }))
                                  }
                                  className="sr-only"
                                />
                                {method === "CASH" ? (
                                  <Banknote size={14} />
                                ) : (
                                  <Wallet size={14} />
                                )}
                                {method === "CASH" ? "Cash" : "Wallet"}
                              </label>
                            ))}
                          </div>
                          {installmentPayForm.method === "CASH" && (
                            <select
                              value={installmentPayForm.cashSessionNumber}
                              onChange={(e) =>
                                setInstallmentPayForm((f) => ({
                                  ...f,
                                  cashSessionNumber: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="">
                                Session de caisse (optionnel)
                              </option>
                              {openSessions.map((sess) => (
                                <option
                                  key={sess.sessionNumber}
                                  value={sess.sessionNumber}
                                >
                                  {sess.sessionNumber}
                                </option>
                              ))}
                            </select>
                          )}
                          {installmentPayForm.method === "WALLET" && (
                            <input
                              type="text"
                              value={installmentPayForm.walletNumber}
                              onChange={(e) =>
                                setInstallmentPayForm((f) => ({
                                  ...f,
                                  walletNumber: e.target.value,
                                }))
                              }
                              placeholder="N° Wallet"
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPayingInstallment(null)}
                              className="flex-1 py-2 border rounded-lg text-sm"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() =>
                                payInstallmentMutation.mutate(
                                  inst.installmentNumber,
                                )
                              }
                              disabled={
                                payInstallmentMutation.isPending ||
                                (installmentPayForm.method === "WALLET" &&
                                  !installmentPayForm.walletNumber)
                              }
                              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                              {payInstallmentMutation.isPending ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin mx-auto"
                                />
                              ) : (
                                "Confirmer"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    deleteScheduleMutation.mutate(
                      existingSchedule.scheduleNumber,
                    )
                  }
                  className="mt-4 w-full py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Supprimer l'échéancier
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Aucun échéancier existant. Créez-en un :
                </p>
                <div className="space-y-3">
                  {scheduleInstallments.map((inst, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) =>
                          updateInstallment(idx, "dueDate", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
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
                            v === "" ? 0 : parseInt(v),
                          );
                        }}
                        placeholder="Montant"
                        className="w-32 px-3 py-2 border rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeInstallment(idx)}
                        disabled={scheduleInstallments.length === 1}
                        className="p-2 text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addInstallment}
                    className="text-sm text-primary-600 flex items-center gap-1"
                  >
                    + Ajouter une tranche
                  </button>
                  <button
                    onClick={() => createScheduleMutation.mutate()}
                    disabled={
                      scheduleInstallments.filter(
                        (i) => i.amount > 0 && i.dueDate,
                      ).length === 0 || createScheduleMutation.isPending
                    }
                    className="w-full mt-4 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createScheduleMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Créer l'échéancier"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Modal création avoir */}
      <CreateCreditNoteModal
        isOpen={isCreditNoteOpen}
        onClose={() => setIsCreditNoteOpen(false)}
        invoiceNumber={documentNumber!}
        onSuccess={() => {
          invalidateAll();
          setIsCreditNoteOpen(false);
        }}
      />
    </AdminLayout>
  );
};
