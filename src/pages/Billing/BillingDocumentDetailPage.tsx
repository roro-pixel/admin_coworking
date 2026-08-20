import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  ShieldCheck,
  FilePlus2,
  Ban,
  Package,
  Search,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem } from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { useAuth } from "../../contexts/AuthContext";

// ─── Labels & config ──────────────────────────────────────────────────────────

const documentTypeLabels: Record<string, string> = {
  QUOTE: "Devis",
  PROFORMA_INVOICE: "Proforma",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  DEBIT_NOTE: "Note de débit",
  CORRECTIVE_INVOICE: "Rectificative",
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
  VALIDATED: { label: "Validé SEFC", color: "bg-emerald-100 text-emerald-700" },
};

// Statuts a partir desquels un document peut encore etre annule (DELETE) -
// exclut les etats deja terminaux.
const cancellableStatuses = new Set([
  "DRAFT",
  "ISSUED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "NEGOTIATION",
  "VALIDATED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
]);

// ─── Composant principal ───────────────────────────────────────────────────────

export const BillingDocumentDetailPage: React.FC = () => {
  const { documentNumber } = useParams<{ documentNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  // États des modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Panneaux inline (avoir / réapplication / rectificative) - voir barre
  // d'actions. Un seul panneau ouvert a la fois.
  const [activePanel, setActivePanel] = useState<
    "creditNote" | "applyTo" | "corrective" | null
  >(null);
  const [creditNoteForm, setCreditNoteForm] = useState({
    amount: "",
    reason: "",
    validateImmediately: false,
    applyImmediately: false,
  });
  const [applyToTarget, setApplyToTarget] = useState("");
  const [correctiveForm, setCorrectiveForm] = useState({
    title: "",
    description: "",
    lines: [
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxable: true,
        vatRate: "",
        catalogSourceType: "",
        catalogSourceCode: "",
      },
    ],
  });

  // Recherche catalogue pour préremplir une ligne de rectificative - même
  // mécanisme qu'en création/édition (billing-enhancements.md §3.2)
  const [correctiveCatalogPickerIdx, setCorrectiveCatalogPickerIdx] = useState<
    number | null
  >(null);
  const [correctiveCatalogQuery, setCorrectiveCatalogQuery] = useState("");
  const { data: correctiveCatalogResults } = useQuery({
    queryKey: ["billing-catalog-lookup-corrective", correctiveCatalogQuery],
    queryFn: () =>
      billingService.catalogLookup({ q: correctiveCatalogQuery, size: 8 }),
    enabled:
      correctiveCatalogPickerIdx !== null &&
      correctiveCatalogQuery.trim().length > 1,
  });
  const correctiveCatalogItems: BillingCatalogLookupItem[] =
    correctiveCatalogResults?.content ?? [];

  const applyCorrectiveCatalogItem = (
    idx: number,
    item: BillingCatalogLookupItem,
  ) => {
    setCorrectiveForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) =>
        i === idx
          ? {
              ...l,
              description: item.name,
              unitPrice: item.unitPrice,
              catalogSourceType: item.sourceType,
              catalogSourceCode: item.sourceCode,
            }
          : l,
      ),
    }));
    setCorrectiveCatalogPickerIdx(null);
    setCorrectiveCatalogQuery("");
  };
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

  // Lien profond depuis l'onglet Outils : /billing/documents/{n}?panel=corrective
  React.useEffect(() => {
    const panel = searchParams.get("panel");
    if (
      panel === "creditNote" ||
      panel === "applyTo" ||
      panel === "corrective"
    ) {
      setActivePanel(panel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // ── SEFC / immutabilité ─────────────────────────────────────────────────────

  /** Validation fiscale - irréversible, cf. modale de confirmation dédiée. */
  const validateMutation = makeM(
    () => billingService.validateDocument(documentNumber!),
    "Erreur lors de la validation fiscale.",
  );

  /**
   * Annulation - le backend gère seul la logique selon `locked` (annulation
   * directe ou avoir automatique). Le frontend n'a plus besoin de vérifier
   * `locked` avant d'appeler.
   */
  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      billingService.cancelDocument(documentNumber!, reason),
    onSuccess: (updated) => {
      invalidateAll();
      if (updated.status === "PAID" && updated.locked) {
        setActionError(null);
        alert(
          "La facture a été annulée via avoir. Elle reste validée (SEFC) et passe au statut Payé.",
        );
      }
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ?? "Erreur lors de l’annulation.",
      ),
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: () =>
      billingService.createCreditNote(documentNumber!, {
        amount: creditNoteForm.amount
          ? parseFloat(creditNoteForm.amount)
          : null,
        reason: creditNoteForm.reason,
        createdBy: admin?.email || String(admin?.id) || "admin",
        validateImmediately: creditNoteForm.validateImmediately,
        applyImmediately: creditNoteForm.applyImmediately,
      }),
    onSuccess: (creditNote) => {
      invalidateAll();
      setActivePanel(null);
      setCreditNoteForm({
        amount: "",
        reason: "",
        validateImmediately: false,
        applyImmediately: false,
      });
      navigate(`/billing/documents/${creditNote.documentNumber}`);
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ?? "Erreur lors de la création de l’avoir.",
      ),
  });

  const applyCreditNoteToMutation = useMutation({
    mutationFn: () =>
      billingService.applyCreditNoteTo(documentNumber!, applyToTarget.trim()),
    onSuccess: () => {
      invalidateAll();
      setActivePanel(null);
      setApplyToTarget("");
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ??
          "Erreur lors de la ré-application de l’avoir.",
      ),
  });

  const createCorrectiveMutation = useMutation({
    mutationFn: () =>
      billingService.createCorrectiveInvoice(documentNumber!, {
        currency: document!.currency,
        title: correctiveForm.title || `Facture rectificative ${documentNumber}`,
        description: correctiveForm.description || undefined,
        issueDate: new Date().toISOString().split("T")[0],
        lines: correctiveForm.lines
          .filter((l) => l.description.trim() && l.unitPrice >= 0)
          .map((l) => ({
            lineType: "SERVICE" as const,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxable: l.taxable,
            vatRate: l.vatRate ? parseFloat(l.vatRate) : undefined,
            catalogSourceType: l.catalogSourceType || undefined,
            catalogSourceCode: l.catalogSourceCode || undefined,
          })),
      }),
    onSuccess: (corrective) => {
      invalidateAll();
      setActivePanel(null);
      setCorrectiveForm({
        title: "",
        description: "",
        lines: [
          {
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxable: true,
            vatRate: "",
            catalogSourceType: "",
            catalogSourceCode: "",
          },
        ],
      });
      navigate(`/billing/documents/${corrective.documentNumber}`);
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message ??
          "Erreur lors de la création de la rectificative.",
      ),
  });

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
      .querySelector(".w-full.mx-auto.py-8")
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
            .w-full { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
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
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "-";
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
  const locked = !!document.locked;
  const canValidate =
    !locked &&
    ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PROFORMA_INVOICE"].includes(t) &&
    ["DRAFT", "ISSUED"].includes(s);
  // Prérequis backend pour la ré-application d'un avoir sur une autre
  // facture : avoir VALIDATED (locked=true) et pas encore ISSUED (deja appliqué)
  const canApplyToAnother = isCreditNote && locked && s !== "ISSUED";
  const canCancel = cancellableStatuses.has(s);
  const displayNumber = document.fiscalNumber ?? document.documentNumber;
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
      <div className="w-full mx-auto py-8">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b bg-gray-50 rounded-t-xl">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 font-mono">
                    {displayNumber}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  {locked && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck size={14} /> Verrouillé (SEFC)
                    </span>
                  )}
                </div>
                <p className="text-gray-500">
                  {documentTypeLabels[t] ?? t}
                  {document.projectCode && (
                    <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                      Projet: {document.projectCode}
                    </span>
                  )}
                </p>
                {document.fiscalNumber &&
                  document.fiscalNumber !== document.documentNumber && (
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      N° système : {document.documentNumber}
                    </p>
                  )}
                {document.originalDocumentNumber && (
                  <button
                    onClick={() =>
                      navigate(
                        `/billing/documents/${document.originalDocumentNumber}`,
                      )
                    }
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    <FileText size={13} />
                    Correction de {document.originalDocumentNumber}
                  </button>
                )}
                {document.creditNoteReason && (
                  <p className="text-sm text-gray-500 mt-1">
                    Motif : {document.creditNoteReason}
                  </p>
                )}
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

            {isInvoice && locked && (
              <button
                onClick={() => {
                  setActivePanel(activePanel === "creditNote" ? null : "creditNote");
                  setCreditNoteForm({
                    amount: "",
                    reason: "",
                    validateImmediately: false,
                    applyImmediately: false,
                  });
                }}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <FileText size={14} /> Créer un avoir
              </button>
            )}

            {isInvoice && locked && (
              <button
                onClick={() => {
                  setActivePanel(
                    activePanel === "corrective" ? null : "corrective",
                  );
                  setCorrectiveForm({
                    title: "",
                    description: "",
                    lines: [
                      {
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        taxable: true,
                        vatRate: "",
                        catalogSourceType: "",
                        catalogSourceCode: "",
                      },
                    ],
                  });
                }}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <FilePlus2 size={14} /> Créer une rectificative
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

            {canApplyToAnother && (
              <button
                onClick={() => {
                  setActivePanel(activePanel === "applyTo" ? null : "applyTo");
                  setApplyToTarget("");
                }}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <ArrowRight size={14} /> Réappliquer à une autre facture
              </button>
            )}

            {canValidate && (
              <button
                onClick={() => {
                  const confirmed = confirm(
                    `⚠️ Valider ce document SEFC ?\n\nCette action est définitive. Une fois validé :\n• Le numéro fiscal sera assigné et ne pourra plus changer\n• Le document sera verrouillé et ne pourra plus être modifié\n• Un avoir (avoir annulateur) devra être créé pour toute correction\n\nNuméro actuel : ${document.documentNumber}\nType : ${documentTypeLabels[t] ?? t}`,
                  );
                  if (confirmed) validateMutation.mutate();
                }}
                disabled={anyPending}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                {validateMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Valider (SEFC)
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => {
                  const reason = window.prompt(
                    "Motif de l’annulation (obligatoire) :",
                  );
                  if (reason && reason.trim())
                    cancelMutation.mutate(reason.trim());
                }}
                disabled={cancelMutation.isPending}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-1 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Ban size={14} />
                )}
                Annuler
              </button>
            )}
          </div>

          {/* ── Panneaux inline (avoir / réapplication / rectificative) ── */}
          {activePanel === "creditNote" && (
            <div className="px-6 py-5 border-b bg-orange-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Créer un avoir</h3>
                <button
                  onClick={() => setActivePanel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant{" "}
                    <span className="text-gray-400 font-normal">
                      (vide = solde dû, {document.balanceDue.toLocaleString("fr-FR")}{" "}
                      {document.currency})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={creditNoteForm.amount}
                    onChange={(e) =>
                      setCreditNoteForm({
                        ...creditNoteForm,
                        amount: e.target.value,
                      })
                    }
                    placeholder={String(document.balanceDue)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motif *
                  </label>
                  <input
                    value={creditNoteForm.reason}
                    onChange={(e) =>
                      setCreditNoteForm({
                        ...creditNoteForm,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Ex: Erreur sur la ligne TVA"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={creditNoteForm.validateImmediately}
                    onChange={(e) =>
                      setCreditNoteForm({
                        ...creditNoteForm,
                        validateImmediately: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Sceller l'avoir immédiatement (SEFC)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={creditNoteForm.applyImmediately}
                    onChange={(e) =>
                      setCreditNoteForm({
                        ...creditNoteForm,
                        applyImmediately: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Appliquer sur cette facture immédiatement
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActivePanel(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white"
                >
                  Annuler
                </button>
                <button
                  onClick={() => createCreditNoteMutation.mutate()}
                  disabled={
                    !creditNoteForm.reason.trim() ||
                    createCreditNoteMutation.isPending
                  }
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {createCreditNoteMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Créer l'avoir"
                  )}
                </button>
              </div>
            </div>
          )}

          {activePanel === "applyTo" && (
            <div className="px-6 py-5 border-b bg-teal-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Réappliquer l'avoir à une autre facture
                </h3>
                <button
                  onClick={() => setActivePanel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                La facture cible doit appartenir au même client. L'avoir passera
                au statut Émis une fois appliqué.
              </p>
              <div className="flex gap-3">
                <input
                  value={applyToTarget}
                  onChange={(e) => setApplyToTarget(e.target.value)}
                  placeholder="N° de la facture cible (INV-... ou PRF-...)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={() => applyCreditNoteToMutation.mutate()}
                  disabled={
                    !applyToTarget.trim() || applyCreditNoteToMutation.isPending
                  }
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {applyCreditNoteToMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Appliquer"
                  )}
                </button>
              </div>
            </div>
          )}

          {activePanel === "corrective" && (
            <div className="px-6 py-5 border-b bg-violet-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Créer une facture rectificative
                </h3>
                <button
                  onClick={() => setActivePanel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Corrige une erreur de contenu sans modifier la facture
                d'origine ({document.documentNumber}, conservée à titre
                d'historique). Statut initial : Brouillon - à valider ensuite.
              </p>
              <input
                value={correctiveForm.title}
                onChange={(e) =>
                  setCorrectiveForm({ ...correctiveForm, title: e.target.value })
                }
                placeholder={`Titre (défaut : Facture rectificative ${documentNumber})`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={correctiveForm.description}
                onChange={(e) =>
                  setCorrectiveForm({
                    ...correctiveForm,
                    description: e.target.value,
                  })
                }
                rows={2}
                placeholder="Description / motif de la correction"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />

              <div className="space-y-2">
                {correctiveForm.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white rounded-lg p-3 border border-gray-100"
                  >
                    <div className="md:col-span-5 relative">
                      <div className="relative">
                        <input
                          value={line.description}
                          onChange={(e) => {
                            const lines = [...correctiveForm.lines];
                            lines[idx] = {
                              ...lines[idx],
                              description: e.target.value,
                            };
                            setCorrectiveForm({ ...correctiveForm, lines });
                          }}
                          placeholder="Description de la ligne corrigée"
                          className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          title="Rechercher dans le catalogue"
                          onClick={() => {
                            setCorrectiveCatalogPickerIdx(
                              correctiveCatalogPickerIdx === idx ? null : idx,
                            );
                            setCorrectiveCatalogQuery("");
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 rounded"
                        >
                          <Package size={14} />
                        </button>
                      </div>
                      {correctiveCatalogPickerIdx === idx && (
                        <div className="absolute z-20 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
                          <div className="p-2 border-b border-gray-100 relative">
                            <Search
                              size={13}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              autoFocus
                              type="text"
                              value={correctiveCatalogQuery}
                              onChange={(e) =>
                                setCorrectiveCatalogQuery(e.target.value)
                              }
                              placeholder="Rechercher un article, un service..."
                              className="w-full pl-7 pr-2 py-1.5 text-sm border-0 focus:outline-none"
                            />
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            {correctiveCatalogQuery.trim().length <= 1 ? (
                              <p className="p-3 text-xs text-gray-400">
                                Tapez au moins 2 caractères pour rechercher.
                              </p>
                            ) : correctiveCatalogItems.length === 0 ? (
                              <p className="p-3 text-xs text-gray-400">
                                Aucun résultat.
                              </p>
                            ) : (
                              correctiveCatalogItems.map((item) => (
                                <button
                                  key={`${item.sourceType}-${item.sourceCode}`}
                                  type="button"
                                  onClick={() =>
                                    applyCorrectiveCatalogItem(idx, item)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                >
                                  <p className="text-sm font-medium text-gray-900">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.unitPrice.toLocaleString("fr-FR")}{" "}
                                    {item.currency}
                                    {item.unit ? ` / ${item.unit}` : ""} ·{" "}
                                    {item.sourceType}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setCorrectiveCatalogPickerIdx(null)}
                            className="w-full text-center py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100"
                          >
                            Fermer
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) => {
                        const lines = [...correctiveForm.lines];
                        lines[idx] = {
                          ...lines[idx],
                          quantity: Number(e.target.value) || 0,
                        };
                        setCorrectiveForm({ ...correctiveForm, lines });
                      }}
                      placeholder="Qté"
                      className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => {
                        const lines = [...correctiveForm.lines];
                        lines[idx] = {
                          ...lines[idx],
                          unitPrice: Number(e.target.value) || 0,
                        };
                        setCorrectiveForm({ ...correctiveForm, lines });
                      }}
                      placeholder="Prix unitaire"
                      className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.vatRate}
                      onChange={(e) => {
                        const lines = [...correctiveForm.lines];
                        lines[idx] = { ...lines[idx], vatRate: e.target.value };
                        setCorrectiveForm({ ...correctiveForm, lines });
                      }}
                      placeholder="TVA % (auto si vide)"
                      className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() =>
                        setCorrectiveForm({
                          ...correctiveForm,
                          lines: correctiveForm.lines.filter((_, i) => i !== idx),
                        })
                      }
                      disabled={correctiveForm.lines.length === 1}
                      className="md:col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 flex justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setCorrectiveForm({
                      ...correctiveForm,
                      lines: [
                        ...correctiveForm.lines,
                        {
                          description: "",
                          quantity: 1,
                          unitPrice: 0,
                          taxable: true,
                          vatRate: "",
                          catalogSourceType: "",
                          catalogSourceCode: "",
                        },
                      ],
                    })
                  }
                  className="text-sm text-violet-600 hover:text-violet-700"
                >
                  + Ajouter une ligne
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setActivePanel(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white"
                >
                  Annuler
                </button>
                <button
                  onClick={() => createCorrectiveMutation.mutate()}
                  disabled={
                    !correctiveForm.lines.some((l) => l.description.trim()) ||
                    createCorrectiveMutation.isPending
                  }
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {createCorrectiveMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Créer la rectificative"
                  )}
                </button>
              </div>
            </div>
          )}
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
                          "Aucune option sélectionnée - toutes les options seront supprimées. Continuer ?",
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
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {line.description}
                              {line.sourceCode && (
                                <span
                                  title={`Depuis le catalogue (${line.sourceCode})`}
                                  className="inline-flex items-center justify-center w-4 h-4 bg-primary-50 text-primary-600 rounded-full"
                                >
                                  <Package size={10} />
                                </span>
                              )}
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
            {/* Informations fiscales SEFC */}
            {locked && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  Informations fiscales
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Numéro fiscal</span>
                    <span className="font-mono">{document.fiscalNumber ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date fiscale</span>
                    <span>{formatDate(document.fiscalDate ?? undefined)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Validé le</span>
                    <span>{formatDateTime(document.validatedAt ?? undefined)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="text-gray-500">Émetteur</span>
                    <span>{document.sellerName ?? "-"}</span>
                  </div>
                  {document.sellerNiu && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">NIU émetteur</span>
                      <span className="font-mono">{document.sellerNiu}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="text-gray-500">Catégorie client</span>
                    <span>{document.customerCategory ?? "-"}</span>
                  </div>
                  {document.customerNiu && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">NIU client</span>
                      <span className="font-mono">{document.customerNiu}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

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

    </AdminLayout>
  );
};