import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Calendar,
  CheckCircle,
  CreditCard,
  Pencil,
  DollarSign,
  Download,
  Eye,
  FilePlus2,
  FileText,
  History,
  Mail,
  MessageSquare,
  Package,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Tag,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem, SimulateBillingDocumentResponse } from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  Detail,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  PanelForm,
  Section,
  StatusChip,
  Tag as KitTag,
} from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDate, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob, currencyLabel } from "../../components/payment/paymentUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { RatioBar } from "../../components/operations/OpsCharts";
import { ApplyToPanel, CancelPanel, CreditNotePanel } from "../../components/billing/CreditNotePanel";
import { CatalogPicker } from "../../components/billing/CatalogPicker";
import { NoticeTimeline } from "../../components/billing/dunning/NoticeTimeline";
import { BillingShell } from "../../components/billing/BillingShell";
import { DOC_TYPE_LABEL, STATUS_LABEL, STATUS_TONE } from "../../components/billing/billingLabels";

/* Statuts à partir desquels un document peut encore être annulé (DELETE) : exclut les états terminaux. */
const CANCELLABLE = new Set(["DRAFT", "ISSUED", "SENT", "VIEWED", "ACCEPTED", "NEGOTIATION", "VALIDATED", "PARTIALLY_PAID", "PAID", "OVERDUE"]);

type PanelId = "creditNote" | "applyTo" | "corrective" | "issueOverride" | "versions" | "refundWallet" | "cancel" | "reject" | "pay" | "schedule" | "signature";

type CorrectiveLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  vatRate: string;
  catalogSourceType: string;
  catalogSourceCode: string;
};
const emptyCorrectiveLine = (): CorrectiveLine => ({ description: "", quantity: 1, unitPrice: 0, taxable: true, vatRate: "", catalogSourceType: "", catalogSourceCode: "" });

const SIGNATURE_LABEL: Record<string, string> = { SIGNED: "Signé", EXPIRED: "Expiré", PENDING: "En attente" };
const ADVANCE_LABEL: Record<string, string> = { PAID: "Réglé", PARTIALLY_PAID: "Partiellement réglé", CANCELLED: "Annulé", PENDING: "En attente" };

/** Ligne libellé / valeur des blocs de totaux */
const Row: React.FC<{ label: string; children: React.ReactNode; tone?: "red" | "green" | "amber" }> = ({ label, children, tone }) => (
  <div className={`flex items-baseline justify-between gap-4 text-sm ${tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : ""}`}>
    <span className={tone ? "" : "text-gray-500"}>{label}</span>
    <span className="text-right font-semibold tabular-nums">{children}</span>
  </div>
);

const DetailBody: React.FC = () => {
  const { documentNumber } = useParams<{ documentNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  // Un seul panneau ouvert à la fois : il s'affiche sous la barre d'actions, à la place des anciennes modales.
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const togglePanel = (p: PanelId) => setActivePanel((cur) => (cur === p ? null : p));

  // Émission refusée pour dépassement de remise : le backend renvoie les violations, on ouvre le panneau de dérogation.
  const [issueViolations, setIssueViolations] = useState<SimulateBillingDocumentResponse["violations"]>([]);
  const [discountOverrideReason, setDiscountOverrideReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [correctiveForm, setCorrectiveForm] = useState({ title: "", description: "", lines: [emptyCorrectiveLine()] });
  const [correctivePickerIdx, setCorrectivePickerIdx] = useState<number | null>(null);

  const [selectedOptionLines, setSelectedOptionLines] = useState<Set<number>>(new Set());

  const [payingInstallment, setPayingInstallment] = useState<string | null>(null);
  const [installmentPayForm, setInstallmentPayForm] = useState({ method: "CASH" as "CASH" | "WALLET", cashSessionNumber: "", walletNumber: "" });

  const [payForm, setPayForm] = useState({ method: "CASH" as "CASH" | "WALLET" | "MOBILE_MONEY", cashSessionNumber: "", walletNumber: "", phoneNumber: "", correspondent: "", amount: 0 });
  const [payError, setPayError] = useState<string | null>(null);

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureMessage, setSignatureMessage] = useState("");
  const [signatureResult, setSignatureResult] = useState<{ signerEmail?: string } | null>(null);

  const [scheduleInstallments, setScheduleInstallments] = useState<Array<{ dueDate: string; amount: number }>>([]);

  // ── Requête principale ──
  const { data: document, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber!),
    enabled: !!documentNumber,
  });

  // Lien profond depuis l'onglet Outils ou la liste : /billing/documents/{n}?panel=creditNote|applyTo|corrective
  useEffect(() => {
    const panel = searchParams.get("panel");
    if (panel === "creditNote" || panel === "applyTo" || panel === "corrective") setActivePanel(panel);
  }, [searchParams]);

  // ── Données complémentaires ──
  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions = openSessionsData?.content ?? [];

  const { data: mmProviders = [] } = useQuery({
    queryKey: ["mobile-money-providers"],
    queryFn: () => paymentService.getMobileMoneyProviders(),
  });

  const { data: existingSchedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["invoice-schedule", documentNumber],
    queryFn: () => billingService.getInvoiceSchedule(documentNumber!),
    enabled: activePanel === "schedule" && !!documentNumber && document?.documentType === "INVOICE",
  });

  // Un document scellé n'est plus versionné : inutile d'interroger l'historique.
  const { data: documentVersions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["billing-document-versions", documentNumber],
    queryFn: () => billingService.getDocumentVersions(documentNumber!),
    enabled: activePanel === "versions" && !!documentNumber && !document?.locked,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-document", documentNumber] });
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
    queryClient.invalidateQueries({ queryKey: ["customer-statement"] });
    refetch();
  };

  const fail = (fallback: string) => (e: unknown) => setActionError(apiMessage(e, fallback));

  /** Mutation de workflow sans paramètre : même mécanique pour toutes les transitions de statut. */
  const useWorkflow = (fn: () => Promise<unknown>, okMsg: string, errorMsg = "Erreur lors de l'action.") =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setActionError(null);
        invalidateAll();
        toast.success(okMsg);
      },
      onError: fail(errorMsg),
    });

  /**
   * issue() est le seul point qui REFUSE réellement un dépassement de remise BLOCK (simulate, create et update
   * ne font que signaler). Sur 400 on récupère les violations et on ouvre le panneau de dérogation.
   */
  const issueMutation = useMutation({
    mutationFn: (reason?: string) => billingService.issueDocument(documentNumber!, reason),
    onSuccess: () => {
      invalidateAll();
      setActivePanel(null);
      setIssueViolations([]);
      setDiscountOverrideReason("");
      toast.success("Document émis.");
    },
    onError: (e: unknown) => {
      const violations = (e as { response?: { data?: { violations?: SimulateBillingDocumentResponse["violations"] } } })?.response?.data?.violations;
      if (Array.isArray(violations) && violations.length > 0) {
        setIssueViolations(violations);
        setActivePanel("issueOverride");
        setActionError(null);
      } else {
        setActionError(apiMessage(e, "Erreur lors de l'émission."));
      }
    },
  });
  const sendMutation = useWorkflow(() => billingService.sendDocument(documentNumber!), "Document marqué comme envoyé.");
  const sendEmailMutation = useWorkflow(() => billingService.sendEmail(documentNumber!), "E-mail envoyé.");
  const acceptMutation = useWorkflow(() => billingService.acceptQuote(documentNumber!), "Devis accepté.");
  const convertMutation = useWorkflow(() => billingService.convertToInvoice(documentNumber!), "Devis converti en facture.");
  const markViewedMutation = useWorkflow(() => billingService.markViewed(documentNumber!), "Devis marqué comme consulté.");
  const negotiationMutation = useWorkflow(() => billingService.startNegotiation(documentNumber!), "Négociation ouverte.");
  const requestDepositMutation = useWorkflow(() => billingService.requestDeposit(documentNumber!), "Acompte demandé.");
  const markDepositPaidMutation = useWorkflow(() => billingService.markDepositPaid(documentNumber!), "Acompte marqué comme reçu.");

  // rejectQuote accepte un motif facultatif que l'ancien écran n'envoyait jamais : on le saisit maintenant dans un panneau.
  const rejectMutation = useMutation({
    mutationFn: () => billingService.rejectQuote(documentNumber!, rejectReason.trim() || undefined),
    onSuccess: () => {
      invalidateAll();
      setActivePanel(null);
      setRejectReason("");
      toast.success("Devis rejeté.");
    },
    onError: fail("Erreur lors du rejet du devis."),
  });

  const refundToWalletMutation = useMutation({
    mutationFn: (reason: string) => billingService.refundCreditNoteToWallet(documentNumber!, reason),
    onSuccess: () => {
      invalidateAll();
      setActivePanel(null);
      setRefundReason("");
      toast.success("Avoir reversé au portefeuille.");
    },
    onError: fail("Erreur lors du reversement au portefeuille."),
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
      setCorrectiveForm({ title: "", description: "", lines: [emptyCorrectiveLine()] });
      toast.success(`Rectificative ${corrective.documentNumber} créée.`);
      navigate(`/billing/documents/${corrective.documentNumber}`);
    },
    onError: fail("Erreur lors de la création de la rectificative."),
  });

  const selectOptionsMutation = useMutation({
    mutationFn: () => billingService.selectOptions(documentNumber!, Array.from(selectedOptionLines)),
    onSuccess: () => {
      setSelectedOptionLines(new Set());
      invalidateAll();
      toast.success("Options enregistrées.");
    },
    onError: fail("Erreur lors de la sélection des options."),
  });

  const payInstallmentMutation = useMutation({
    mutationFn: (installmentNumber: string) =>
      billingService.payInstallment(installmentNumber, {
        paymentMethod: installmentPayForm.method,
        cashSessionNumber: installmentPayForm.method === "CASH" ? installmentPayForm.cashSessionNumber || undefined : undefined,
        walletNumber: installmentPayForm.method === "WALLET" ? installmentPayForm.walletNumber : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `inst-${installmentNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      setPayingInstallment(null);
      setInstallmentPayForm({ method: "CASH", cashSessionNumber: "", walletNumber: "" });
      refetchSchedule();
      invalidateAll();
      toast.success("Tranche payée.");
    },
    onError: fail("Erreur lors du paiement de la tranche."),
  });

  const signatureMutation = useMutation({
    mutationFn: () =>
      billingService.requestSignature(documentNumber!, {
        signerName: signerName || undefined,
        signerEmail: signerEmail || undefined,
        customMessage: signatureMessage || undefined,
      }),
    onSuccess: (data) => {
      setSignatureResult(data as { signerEmail?: string });
      invalidateAll();
    },
    onError: fail("Erreur lors de l'envoi de la demande de signature."),
  });

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
        cashSessionNumber: payForm.method === "CASH" ? payForm.cashSessionNumber : undefined,
        walletNumber: payForm.method === "WALLET" ? payForm.walletNumber : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `pay-${documentNumber}-${Date.now()}`,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setPayError(null);
      setActivePanel(null);
      toast.success(payForm.method === "MOBILE_MONEY" ? "Demande de paiement Mobile Money envoyée." : "Paiement enregistré.");
    },
    onError: (e: unknown) => setPayError(apiMessage(e, "Erreur lors du paiement.")),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleNumber: string) => billingService.deleteInvoiceSchedule(scheduleNumber),
    onSuccess: () => {
      refetchSchedule();
    },
    onError: fail("Erreur lors de la suppression de l'échéancier."),
  });

  const createScheduleMutation = useMutation({
    mutationFn: () => billingService.createInvoiceSchedule(documentNumber!, { installments: scheduleInstallments.filter((i) => i.amount > 0 && i.dueDate) }),
    onSuccess: () => {
      refetchSchedule();
      setScheduleInstallments([]);
      toast.success("Échéancier créé.");
    },
    onError: fail("Erreur lors de la création de l'échéancier."),
  });

  const updateInstallment = (i: number, f: "dueDate" | "amount", v: string | number) => {
    const a = [...scheduleInstallments];
    a[i] = { ...a[i], [f]: v };
    setScheduleInstallments(a);
  };

  const updateCorrectiveLine = (idx: number, patch: Partial<CorrectiveLine>) =>
    setCorrectiveForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const applyCorrectiveCatalogItem = (idx: number, item: BillingCatalogLookupItem) => {
    updateCorrectiveLine(idx, { description: item.name, unitPrice: item.unitPrice, catalogSourceType: item.sourceType, catalogSourceCode: item.sourceCode });
    setCorrectivePickerIdx(null);
  };

  /** Impression : on clone la zone marquée data-print-root (l'ancien sélecteur reposait sur des classes de mise en page). */
  const handlePrint = (docType: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres pop-up pour imprimer.");
      return;
    }
    let stylesHTML = "";
    window.document.querySelectorAll('link[rel="stylesheet"], style').forEach((style) => {
      stylesHTML += style.tagName === "LINK" ? `<link rel="stylesheet" href="${(style as HTMLLinkElement).href}">` : style.outerHTML;
    });
    const contentElement = window.document.querySelector("[data-print-root]")?.cloneNode(true) as HTMLElement | null;
    contentElement?.querySelectorAll("button, [data-no-print]").forEach((el) => el.remove());
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${documentNumber} - ${DOC_TYPE_LABEL[docType as keyof typeof DOC_TYPE_LABEL] ?? docType}</title><meta charset="UTF-8">${stylesHTML}<style>body{background:#fff!important;margin:0;padding:20px}[data-print-root]{max-width:100%!important;margin:0!important}.shadow-sm,.shadow{box-shadow:none!important}button{display:none!important}</style></head><body>${contentElement?.outerHTML || "<p>Contenu non trouvé</p>"}</body></html>`);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const blob = await billingService.getPdf(documentNumber!);
      saveBlob(blob, `${document?.documentType}_${documentNumber}.pdf`);
    },
    onError: fail("Erreur lors du téléchargement du PDF."),
  });

  const anyPending =
    issueMutation.isPending || sendMutation.isPending || sendEmailMutation.isPending || acceptMutation.isPending || convertMutation.isPending ||
    markViewedMutation.isPending || negotiationMutation.isPending || requestDepositMutation.isPending || markDepositPaidMutation.isPending ||
    selectOptionsMutation.isPending || payInstallmentMutation.isPending;

  // ── États de chargement ──
  if (isLoading) return <div className="mx-auto w-full max-w-4xl"><DetailsSkeleton /></div>;
  if (isError || !document) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          icon={AlertCircle}
          title="Document introuvable"
          hint="Il a peut-être été supprimé, ou le numéro est incorrect."
          action={<ActionButton onClick={() => navigate("/billing")}>Retour à la liste</ActionButton>}
        />
      </div>
    );
  }

  const s = document.status;
  const t = document.documentType;
  const cur = currencyLabel(document.currency);
  const money = (n?: number | null) => formatMoney(n ?? 0, cur);
  const isQuote = t === "QUOTE";
  const isInvoice = t === "INVOICE";
  const isCreditNote = t === "CREDIT_NOTE";
  const locked = !!document.locked;
  const canValidate = !locked && ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PROFORMA_INVOICE"].includes(t) && ["DRAFT", "ISSUED"].includes(s);
  // Réapplication d'un avoir : il doit être scellé (locked) et pas encore consommé (status !== ISSUED).
  const canApplyToAnother = isCreditNote && locked && s !== "ISSUED";
  const canCancel = CANCELLABLE.has(s);
  const displayNumber = document.fiscalNumber ?? document.documentNumber;
  const optionalLines = document.lines?.filter((l) => l.optional) ?? [];
  const canSelectOptions = isQuote && optionalLines.length > 0 && ["DRAFT", "ISSUED", "SENT", "VIEWED", "NEGOTIATION"].includes(s);
  const lineAmount = (l: { totalAmount?: number; quantity?: number; unitPrice?: number; discountRate?: number }) =>
    l.totalAmount ?? (l.quantity ?? 1) * (l.unitPrice ?? 0) * (1 - (l.discountRate ?? 0) / 100);
  const optionsTotalAll = optionalLines.reduce((sum, l) => sum + lineAmount(l), 0);
  const optionsTotal = document.optionsTotal ?? optionsTotalAll;

  const confirmValidate = () =>
    toast.confirm({
      message: `Valider ${document.documentNumber} (SEFC) ?`,
      detail: "Action définitive : le numéro fiscal est attribué, le document est verrouillé, et toute correction passera par un avoir ou une facture rectificative.",
      confirmLabel: "Valider définitivement",
      pendingLabel: "Validation",
      successMessage: "Document validé et scellé.",
      errorMessage: "Erreur lors de la validation fiscale.",
      onConfirm: async () => {
        await billingService.validateDocument(documentNumber!);
        invalidateAll();
      },
    });

  const confirmApplyCreditNote = () =>
    toast.confirm({
      message: "Appliquer cet avoir ?",
      confirmLabel: "Appliquer",
      pendingLabel: "Application",
      successMessage: "Avoir appliqué.",
      errorMessage: "Erreur lors de l'application de l'avoir.",
      onConfirm: async () => {
        await billingService.applyCreditNote(documentNumber!);
        invalidateAll();
      },
    });

  const submitOptions = () => {
    if (selectedOptionLines.size === 0) {
      toast.confirm({
        message: "Aucune option sélectionnée",
        detail: "Toutes les options seront supprimées définitivement du devis.",
        confirmLabel: "Tout supprimer",
        pendingLabel: "Enregistrement",
        successMessage: "Options supprimées.",
        errorMessage: "Erreur lors de la sélection des options.",
        onConfirm: async () => {
          await billingService.selectOptions(documentNumber!, []);
          setSelectedOptionLines(new Set());
          invalidateAll();
        },
      });
      return;
    }
    selectOptionsMutation.mutate();
  };

  const payTotal = document.totalAmount;
  const paidRatio = payTotal > 0 ? Math.min(100, Math.round((document.paidAmount / payTotal) * 100)) : 0;

  return (
    <div data-print-root className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeader
        title={displayNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {DOC_TYPE_LABEL[t] ?? t}
            {document.projectCode && <KitTag tone="pink">Projet {document.projectCode}</KitTag>}
            {document.fiscalNumber && document.fiscalNumber !== document.documentNumber && <span className="font-mono text-xs text-gray-400">N° système {document.documentNumber}</span>}
          </span>
        }
        onBack={() => navigate("/billing")}
        backLabel="Retour à la liste"
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip tone={STATUS_TONE[s] ?? "neutral"}>{STATUS_LABEL[s] ?? s}</StatusChip>
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={13} /> Scellé SEFC
              </span>
            )}
          </span>
        }
        actions={
          <div data-no-print className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Download} pending={pdfMutation.isPending} onClick={() => pdfMutation.mutate()}>
              PDF + duplicata
            </ActionButton>
            <ActionButton variant="ghost" icon={Printer} onClick={() => handlePrint(t)}>
              Imprimer
            </ActionButton>
            <ActionButton variant="ghost" icon={Mail} pending={sendEmailMutation.isPending} disabled={anyPending} onClick={() => sendEmailMutation.mutate()}>
              E-mail
            </ActionButton>
            {!locked && (s === "DRAFT" || s === "ISSUED" || s === "SENT") && (
              <ActionButton variant="ghost" icon={Pencil} onClick={() => navigate(`/billing/documents/${document.documentNumber}/edit`)} disabled={anyPending}>
                Modifier
              </ActionButton>
            )}
            {!locked && (
              <ActionButton variant="ghost" icon={History} onClick={() => togglePanel("versions")} title="Chaque modification archive l'état précédent">
                Versions
              </ActionButton>
            )}
          </div>
        }
      />

      {document.originalDocumentNumber && (
        <button type="button" onClick={() => navigate(`/billing/documents/${document.originalDocumentNumber}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--logo-pink-dark)] underline-offset-2 hover:underline">
          <FileText size={14} /> Correction de {document.originalDocumentNumber}
        </button>
      )}
      {document.creditNoteReason && <p className="text-sm text-gray-500">Motif : {document.creditNoteReason}</p>}

      <ErrorBanner message={actionError} />

      {/* ── Actions de workflow, selon le type et le statut ── */}
      <div data-no-print className="flex flex-wrap gap-2">
        {s === "DRAFT" && (
          <ActionButton icon={RefreshCw} pending={issueMutation.isPending} disabled={anyPending} onClick={() => issueMutation.mutate(undefined)}>
            Émettre
          </ActionButton>
        )}
        {s === "ISSUED" && (
          <>
            <ActionButton icon={Send} pending={sendMutation.isPending} disabled={anyPending} onClick={() => sendMutation.mutate()}>
              Marquer envoyé
            </ActionButton>
            <ActionButton variant="ghost" icon={Mail} pending={sendEmailMutation.isPending} disabled={anyPending} onClick={() => sendEmailMutation.mutate()}>
              Envoyer par e-mail
            </ActionButton>
          </>
        )}
        {isQuote && s === "SENT" && (
          <ActionButton variant="ghost" icon={Eye} pending={markViewedMutation.isPending} disabled={anyPending} onClick={() => markViewedMutation.mutate()}>
            Marquer consulté
          </ActionButton>
        )}
        {isQuote && ["SENT", "VIEWED", "ACCEPTED"].includes(s) && (
          <ActionButton variant="ghost" icon={MessageSquare} pending={negotiationMutation.isPending} disabled={anyPending} onClick={() => negotiationMutation.mutate()}>
            Négociation
          </ActionButton>
        )}
        {isQuote && ["ISSUED", "SENT", "VIEWED", "NEGOTIATION"].includes(s) && (
          <>
            <ActionButton icon={CheckCircle} pending={acceptMutation.isPending} disabled={anyPending} onClick={() => acceptMutation.mutate()}>
              Accepter
            </ActionButton>
            <ActionButton variant="ghost" icon={XCircle} onClick={() => togglePanel("reject")}>
              Rejeter
            </ActionButton>
          </>
        )}
        {isQuote && ["SENT", "VIEWED", "ACCEPTED", "NEGOTIATION"].includes(s) && (
          <ActionButton
            variant="ghost"
            icon={PenLine}
            onClick={() => {
              setSignerName(document.customerName ?? "");
              setSignerEmail(document.customerEmail ?? "");
              setSignatureMessage("");
              setSignatureResult(null);
              togglePanel("signature");
            }}
          >
            Demander une signature
          </ActionButton>
        )}
        {isQuote && s === "ACCEPTED" && (
          <ActionButton variant="ghost" icon={DollarSign} pending={requestDepositMutation.isPending} disabled={anyPending} onClick={() => requestDepositMutation.mutate()}>
            Demander un acompte
          </ActionButton>
        )}
        {isQuote && s === "DEPOSIT_REQUESTED" && (
          <ActionButton icon={CheckCircle} pending={markDepositPaidMutation.isPending} disabled={anyPending} onClick={() => markDepositPaidMutation.mutate()}>
            Marquer l'acompte reçu
          </ActionButton>
        )}
        {isQuote && ["ACCEPTED", "DEPOSIT_PAID"].includes(s) && (
          <ActionButton icon={ArrowRight} pending={convertMutation.isPending} disabled={anyPending} onClick={() => convertMutation.mutate()}>
            Convertir en facture
          </ActionButton>
        )}
        {isInvoice && ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"].includes(s) && (
          <>
            <ActionButton
              icon={CreditCard}
              onClick={() => {
                setPayError(null);
                setPayForm({ method: "CASH", cashSessionNumber: "", walletNumber: "", phoneNumber: "", correspondent: "", amount: 0 });
                togglePanel("pay");
              }}
            >
              Payer
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={Calendar}
              onClick={() => {
                setScheduleInstallments([{ dueDate: "", amount: 0 }]);
                togglePanel("schedule");
              }}
            >
              Échéancier
            </ActionButton>
          </>
        )}
        {isInvoice && locked && (
          <>
            <ActionButton variant="ghost" icon={FileText} onClick={() => togglePanel("creditNote")}>
              Créer un avoir
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={FilePlus2}
              onClick={() => {
                setCorrectiveForm({ title: "", description: "", lines: [emptyCorrectiveLine()] });
                togglePanel("corrective");
              }}
            >
              Créer une rectificative
            </ActionButton>
          </>
        )}
        {isCreditNote && s === "ISSUED" && (
          <ActionButton icon={CheckCircle} disabled={anyPending} onClick={confirmApplyCreditNote}>
            Appliquer l'avoir
          </ActionButton>
        )}
        {canApplyToAnother && (
          <>
            <ActionButton icon={ArrowRight} onClick={() => togglePanel("applyTo")}>
              Réappliquer à une autre facture
            </ActionButton>
            <ActionButton variant="ghost" icon={Wallet} onClick={() => togglePanel("refundWallet")} title="À utiliser quand il n'y a plus rien à imputer : la créance reste acquise au client">
              Reverser au portefeuille
            </ActionButton>
          </>
        )}
        {canValidate && (
          <ActionButton icon={ShieldCheck} disabled={anyPending} onClick={confirmValidate}>
            Valider (SEFC)
          </ActionButton>
        )}
        {canCancel && (
          <ActionButton variant="danger" icon={Ban} onClick={() => togglePanel("cancel")}>
            Annuler
          </ActionButton>
        )}
      </div>

      {/* ── Panneaux en ligne ── */}
      <div data-no-print>
        {activePanel === "creditNote" && (
          <CreditNotePanel
            invoiceNumber={document.documentNumber}
            balanceDue={document.balanceDue}
            currency={document.currency}
            onCancel={() => setActivePanel(null)}
            onCreated={(cn) => {
              setActivePanel(null);
              navigate(`/billing/documents/${cn.documentNumber}`);
            }}
          />
        )}

        {activePanel === "applyTo" && (
          <ApplyToPanel
            creditNoteNumber={document.documentNumber}
            onCancel={() => setActivePanel(null)}
            onApplied={() => {
              invalidateAll();
              setActivePanel(null);
            }}
          />
        )}

        {activePanel === "cancel" && (
          <CancelPanel
            documentNumber={document.documentNumber}
            locked={locked}
            onCancel={() => setActivePanel(null)}
            onCancelled={() => {
              invalidateAll();
              setActivePanel(null);
            }}
          />
        )}

        {activePanel === "reject" && (
          <PanelForm
            title="Rejeter le devis"
            submitLabel="Rejeter le devis"
            pending={rejectMutation.isPending}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              rejectMutation.mutate();
            }}
          >
            <Field label="Motif du rejet" hint="Facultatif, conservé sur le devis.">
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Budget non validé" className={FIELD_SOFT} />
            </Field>
          </PanelForm>
        )}

        {activePanel === "refundWallet" && (
          <PanelForm
            title="Reverser l'avoir au portefeuille"
            submitLabel="Reverser"
            pending={refundToWalletMutation.isPending}
            submitDisabled={!refundReason.trim()}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              refundToWalletMutation.mutate(refundReason.trim());
            }}
          >
            <p className="text-sm text-gray-500">
              À utiliser quand il n'y a plus rien à imputer : le client n'a pas de facture ouverte, mais la créance existe et lui reste acquise pour ses prochaines commandes. L'opération est idempotente : un second appel retrouve l'écriture d'origine au lieu de recréditer.
            </p>
            <Field label="Motif" required>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} placeholder="Plus de facture ouverte pour ce client" className={`${FIELD_SOFT} resize-none`} />
            </Field>
          </PanelForm>
        )}

        {activePanel === "issueOverride" && (
          <PanelForm
            title="Émission bloquée par un dépassement de remise"
            submitLabel="Émettre malgré tout"
            pending={issueMutation.isPending}
            submitDisabled={!discountOverrideReason.trim()}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              issueMutation.mutate(discountOverrideReason.trim());
            }}
          >
            <div className="space-y-2">
              {issueViolations.map((v, i) => (
                <p key={i} className={`flex items-start gap-2.5 rounded-2xl px-4 py-2.5 text-sm ${v.severity === "BLOCK" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {v.message}
                </p>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Seul un compte disposant de la permission BILLING:DISCOUNT_OVERRIDE peut déroger. Le motif est obligatoire, conservé sur le document (auteur, date) et tracé au journal fiscal.
            </p>
            <Field label="Motif de dérogation" required>
              <textarea value={discountOverrideReason} onChange={(e) => setDiscountOverrideReason(e.target.value)} rows={2} placeholder="Geste commercial validé par la direction" className={`${FIELD_SOFT} resize-none`} />
            </Field>
          </PanelForm>
        )}

        {activePanel === "versions" && (
          <Section title="Historique des versions" icon={History} className="mb-4">
            {versionsLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : documentVersions.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">Aucune version archivée pour ce document.</p>
            ) : (
              <div className="space-y-2">
                {documentVersions
                  .slice()
                  .sort((a, b) => b.versionNumber - a.versionNumber)
                  .map((v) => (
                    <ItemRow key={v.versionNumber}>
                      <p className="flex flex-wrap items-center gap-x-3 text-sm font-bold text-gray-900">
                        Version {v.versionNumber}
                        {/* sentToCustomerAt distingue le travail en cours de ce que le client a réellement vu */}
                        {v.sentToCustomerAt ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Transmise le {formatDate(v.sentToCustomerAt)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            Brouillon, pas encore transmise
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {v.changeSummary || "Aucun résumé"}, par {v.changedBy} le {formatDateTime(v.changedAt)}
                      </p>
                    </ItemRow>
                  ))}
              </div>
            )}
          </Section>
        )}

        {activePanel === "corrective" && (
          <PanelForm
            title="Créer une facture rectificative"
            submitLabel="Créer la rectificative"
            pending={createCorrectiveMutation.isPending}
            submitDisabled={!correctiveForm.lines.some((l) => l.description.trim())}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              createCorrectiveMutation.mutate();
            }}
          >
            <p className="text-sm text-gray-500">
              Corrige une erreur de contenu sans modifier la facture d'origine ({document.documentNumber}, conservée à titre d'historique). Statut initial : brouillon, à valider ensuite.
            </p>
            <Field label="Titre" hint={`Par défaut : Facture rectificative ${documentNumber}`}>
              <input value={correctiveForm.title} onChange={(e) => setCorrectiveForm({ ...correctiveForm, title: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Description ou motif de la correction">
              <textarea value={correctiveForm.description} onChange={(e) => setCorrectiveForm({ ...correctiveForm, description: e.target.value })} rows={2} className={`${FIELD_SOFT} resize-none`} />
            </Field>
            <div className="space-y-3">
              {correctiveForm.lines.map((line, idx) => (
                <div key={idx} className="rounded-2xl bg-gray-50 p-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_auto] md:items-end">
                    <Field label="Description" className="col-span-2 md:col-span-1">
                      <div className="relative">
                        <input value={line.description} onChange={(e) => updateCorrectiveLine(idx, { description: e.target.value })} placeholder="Ligne corrigée" className={`${FIELD_SOFT} pr-11`} />
                        <button
                          type="button"
                          title="Rechercher dans le catalogue"
                          aria-label="Rechercher dans le catalogue"
                          onClick={() => setCorrectivePickerIdx(correctivePickerIdx === idx ? null : idx)}
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[color:var(--logo-pink-dark)]"
                        >
                          <Package size={15} />
                        </button>
                      </div>
                    </Field>
                    <Field label="Qté">
                      <input type="number" min={0} value={line.quantity} onChange={(e) => updateCorrectiveLine(idx, { quantity: Number(e.target.value) || 0 })} className={FIELD_SOFT} />
                    </Field>
                    <Field label="Prix unitaire">
                      <input type="number" min={0} value={line.unitPrice} onChange={(e) => updateCorrectiveLine(idx, { unitPrice: Number(e.target.value) || 0 })} className={FIELD_SOFT} />
                    </Field>
                    <Field label="TVA %" hint="Auto si vide">
                      <input type="number" step="0.01" value={line.vatRate} onChange={(e) => updateCorrectiveLine(idx, { vatRate: e.target.value })} className={FIELD_SOFT} />
                    </Field>
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label="Supprimer la ligne"
                      disabled={correctiveForm.lines.length === 1}
                      onClick={() => setCorrectiveForm({ ...correctiveForm, lines: correctiveForm.lines.filter((_, i) => i !== idx) })}
                    />
                  </div>
                  {correctivePickerIdx === idx && <CatalogPicker onPick={(item) => applyCorrectiveCatalogItem(idx, item)} onClose={() => setCorrectivePickerIdx(null)} />}
                </div>
              ))}
              <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setCorrectiveForm({ ...correctiveForm, lines: [...correctiveForm.lines, emptyCorrectiveLine()] })}>
                Ajouter une ligne
              </ActionButton>
            </div>
          </PanelForm>
        )}

        {activePanel === "signature" && (
          <PanelForm
            title="Demander une signature électronique"
            submitLabel="Envoyer la demande"
            pending={signatureMutation.isPending}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              if (signatureResult) return setActivePanel(null);
              signatureMutation.mutate();
            }}
          >
            {signatureResult ? (
              <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <CheckCircle size={18} /> E-mail de signature envoyé{signatureResult.signerEmail ? ` à ${signatureResult.signerEmail}` : ""}.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nom du signataire">
                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={FIELD_SOFT} />
                </Field>
                <Field label="E-mail du signataire">
                  <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className={FIELD_SOFT} />
                </Field>
                <Field label="Message personnalisé" className="sm:col-span-2">
                  <textarea value={signatureMessage} rows={2} onChange={(e) => setSignatureMessage(e.target.value)} className={`${FIELD_SOFT} resize-none`} />
                </Field>
              </div>
            )}
          </PanelForm>
        )}

        {activePanel === "pay" && (
          <PanelForm
            title="Payer la facture"
            submitLabel="Payer"
            pending={payMutation.isPending}
            submitDisabled={
              (payForm.method === "WALLET" && !payForm.walletNumber.trim()) ||
              (payForm.method === "MOBILE_MONEY" && (!payForm.correspondent || !payForm.phoneNumber))
            }
            error={payError}
            onCancel={() => setActivePanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              setPayError(null);
              payMutation.mutate();
            }}
          >
            <p className="text-sm text-gray-500">
              Solde à payer : <b className="text-red-600">{money(document.balanceDue)}</b>
            </p>
            <PillChoice
              label="Mode de paiement"
              options={[
                { value: "CASH", label: "Espèces" },
                { value: "WALLET", label: "Portefeuille" },
                { value: "MOBILE_MONEY", label: "Mobile Money" },
              ]}
              value={payForm.method}
              onChange={(v) => setPayForm((f) => ({ ...f, method: v as typeof f.method }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {payForm.method === "CASH" && (
                <Field label="Session de caisse">
                  <select value={payForm.cashSessionNumber} onChange={(e) => setPayForm((f) => ({ ...f, cashSessionNumber: e.target.value }))} className={FIELD_SOFT}>
                    <option value="">Aucune</option>
                    {openSessions.map((sess) => (
                      <option key={sess.sessionNumber} value={sess.sessionNumber}>
                        {sess.sessionNumber}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {payForm.method === "WALLET" && (
                <Field label="N° du portefeuille" required>
                  <input value={payForm.walletNumber} onChange={(e) => setPayForm((f) => ({ ...f, walletNumber: e.target.value }))} className={`${FIELD_SOFT} font-mono`} />
                </Field>
              )}
              {payForm.method === "MOBILE_MONEY" && (
                <>
                  <Field label="Opérateur" required>
                    <select value={payForm.correspondent} onChange={(e) => setPayForm((f) => ({ ...f, correspondent: e.target.value }))} className={FIELD_SOFT}>
                      <option value="">Sélectionner</option>
                      {mmProviders.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Téléphone" required>
                    <input inputMode="numeric" value={payForm.phoneNumber} onChange={(e) => setPayForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, "") }))} className={FIELD_SOFT} />
                  </Field>
                </>
              )}
              <Field label="Montant" hint="Vide : le solde est payé en entier">
                <input
                  inputMode="numeric"
                  value={payForm.amount === 0 ? "" : payForm.amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setPayForm((f) => ({ ...f, amount: v === "" ? 0 : parseInt(v) }));
                  }}
                  placeholder={String(document.balanceDue)}
                  className={FIELD_SOFT}
                />
              </Field>
            </div>
            {payForm.method === "MOBILE_MONEY" && (
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <Smartphone size={14} /> Le client reçoit une demande de confirmation sur son téléphone.
              </p>
            )}
          </PanelForm>
        )}

        {activePanel === "schedule" && (
          <Section title="Échéancier de paiement" icon={Calendar} className="mb-4">
            {existingSchedule && existingSchedule.installments?.length > 0 ? (
              <div className="space-y-2">
                {existingSchedule.scheduleNumber && <p className="px-1 font-mono text-xs text-gray-400">{existingSchedule.scheduleNumber}</p>}
                {existingSchedule.installments.map((inst) => (
                  <ItemRow key={inst.installmentNumber}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-gray-500">{inst.installmentNumber}</p>
                        <p className="text-sm font-semibold text-gray-900">Échéance {formatDate(inst.dueDate)}</p>
                        <p className="text-xs text-gray-400">{inst.status}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold tabular-nums text-gray-950">{money(inst.amount)}</span>
                        {inst.status === "PENDING" && (
                          <ActionButton
                            variant="ghost"
                            className="!px-4 !py-2"
                            onClick={() => {
                              setPayingInstallment(payingInstallment === inst.installmentNumber ? null : inst.installmentNumber);
                              setInstallmentPayForm({ method: "CASH", cashSessionNumber: "", walletNumber: "" });
                            }}
                          >
                            Payer
                          </ActionButton>
                        )}
                      </div>
                    </div>
                    {payingInstallment === inst.installmentNumber && (
                      <div className="mt-4 space-y-3 rounded-2xl bg-gray-50 p-3">
                        <PillChoice
                          label="Mode de paiement"
                          options={[
                            { value: "CASH", label: "Espèces" },
                            { value: "WALLET", label: "Portefeuille" },
                          ]}
                          value={installmentPayForm.method}
                          onChange={(v) => setInstallmentPayForm((f) => ({ ...f, method: v as "CASH" | "WALLET" }))}
                        />
                        {installmentPayForm.method === "CASH" ? (
                          <select value={installmentPayForm.cashSessionNumber} onChange={(e) => setInstallmentPayForm((f) => ({ ...f, cashSessionNumber: e.target.value }))} className={FIELD_SOFT}>
                            <option value="">Session de caisse (facultatif)</option>
                            {openSessions.map((sess) => (
                              <option key={sess.sessionNumber} value={sess.sessionNumber}>
                                {sess.sessionNumber}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input value={installmentPayForm.walletNumber} onChange={(e) => setInstallmentPayForm((f) => ({ ...f, walletNumber: e.target.value }))} placeholder="N° du portefeuille" className={`${FIELD_SOFT} font-mono`} />
                        )}
                        <div className="flex justify-end gap-2">
                          <ActionButton variant="ghost" onClick={() => setPayingInstallment(null)} disabled={payInstallmentMutation.isPending}>
                            Annuler
                          </ActionButton>
                          <ActionButton
                            pending={payInstallmentMutation.isPending}
                            disabled={installmentPayForm.method === "WALLET" && !installmentPayForm.walletNumber.trim()}
                            onClick={() => payInstallmentMutation.mutate(inst.installmentNumber)}
                          >
                            Confirmer
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </ItemRow>
                ))}
                <div className="pt-1">
                  <ActionButton
                    variant="danger"
                    icon={Trash2}
                    pending={deleteScheduleMutation.isPending}
                    onClick={() =>
                      toast.confirm({
                        message: "Supprimer l'échéancier ?",
                        detail: "Les tranches non payées seront supprimées.",
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Échéancier supprimé.",
                        errorMessage: "Erreur lors de la suppression de l'échéancier.",
                        onConfirm: async () => {
                          await billingService.deleteInvoiceSchedule(existingSchedule.scheduleNumber);
                          refetchSchedule();
                        },
                      })
                    }
                  >
                    Supprimer l'échéancier
                  </ActionButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="px-1 text-sm text-gray-500">Aucun échéancier existant. Découpez le solde en tranches :</p>
                {scheduleInstallments.map((inst, idx) => (
                  <ItemRow key={idx}>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
                      <Field label="Échéance">
                        <input type="date" value={inst.dueDate} onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)} className={FIELD_SOFT} />
                      </Field>
                      <Field label="Montant">
                        <input
                          inputMode="numeric"
                          value={inst.amount === 0 ? "" : inst.amount}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            updateInstallment(idx, "amount", v === "" ? 0 : parseInt(v));
                          }}
                          className={`${FIELD_SOFT} text-right`}
                        />
                      </Field>
                      <IconButton icon={Trash2} tone="danger" label="Retirer la tranche" disabled={scheduleInstallments.length === 1} onClick={() => setScheduleInstallments(scheduleInstallments.filter((_, i) => i !== idx))} />
                    </div>
                  </ItemRow>
                ))}
                <div className="flex flex-wrap justify-between gap-2">
                  <ActionButton variant="ghost" icon={Plus} onClick={() => setScheduleInstallments([...scheduleInstallments, { dueDate: "", amount: 0 }])}>
                    Ajouter une tranche
                  </ActionButton>
                  <ActionButton pending={createScheduleMutation.isPending} disabled={scheduleInstallments.filter((i) => i.amount > 0 && i.dueDate).length === 0} onClick={() => createScheduleMutation.mutate()}>
                    Créer l'échéancier
                  </ActionButton>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* ── Récapitulatif : le total d'abord, puis le détail ── */}
      <section className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400">Total TTC</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-[color:var(--logo-pink-dark)]">{money(document.totalAmount)}</p>
          </div>
          {document.balanceDue > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400">Reste à payer</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-red-600">{money(document.balanceDue)}</p>
            </div>
          )}
        </div>
        {document.paidAmount > 0 && (
          <div className="mt-4">
            <RatioBar value={document.paidAmount} total={payTotal} />
            <p className="mt-1.5 text-xs text-gray-500">
              {money(document.paidAmount)} payés, soit {paidRatio} %
            </p>
          </div>
        )}
        <div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4">
          <Row label="Sous-total HT">{money(document.subtotalAmount)}</Row>
          {document.discountAmount > 0 && <Row label="Remise" tone="red">-{money(document.discountAmount)}</Row>}
          {document.vatAmount > 0 && <Row label="TVA">{money(document.vatAmount)}</Row>}
          {document.additionalCentAmount > 0 && <Row label="Centimes additionnels">{money(document.additionalCentAmount)}</Row>}
          {document.paidAmount > 0 && <Row label="Payé" tone="green">-{money(document.paidAmount)}</Row>}
          {optionsTotal > 0 && isQuote && (
            <>
              <Row label="Options disponibles, non incluses" tone="amber">+{money(optionsTotal)}</Row>
              <Row label="Total si toutes les options" tone="amber">{money(document.totalAmount + optionsTotal)}</Row>
            </>
          )}
        </div>
      </section>

      {/* ── Options du devis ── */}
      {canSelectOptions && (
        <Section title="Options du devis" description="Cochez les options retenues. Les options non sélectionnées seront supprimées définitivement." icon={CheckCircle}>
          <div className="space-y-2">
            {optionalLines.map((line) => {
              const order = line.lineOrder ?? 0;
              return (
                <label key={order} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOptionLines.has(order)}
                      onChange={() => {
                        const next = new Set(selectedOptionLines);
                        if (next.has(order)) next.delete(order);
                        else next.add(order);
                        setSelectedOptionLines(next);
                      }}
                      className="h-4 w-4 shrink-0 rounded accent-[color:var(--logo-pink-dark)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{line.description}</span>
                      <span className="block text-xs text-gray-400">Ligne n°{order}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{money(lineAmount(line))}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <ActionButton icon={CheckCircle} pending={selectOptionsMutation.isPending} onClick={submitOptions}>
              Valider la sélection
            </ActionButton>
          </div>
        </Section>
      )}

      {/* ── Lignes ── */}
      {document.lines && document.lines.length > 0 && (
        <Section title="Lignes du document" icon={FileText}>
          <div className="space-y-2">
            {document.lines.map((line, idx) => (
              <ItemRow key={idx} className={line.optional ? "ring-2 ring-amber-200" : ""}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                      {line.description}
                      {line.sourceCode && (
                        <span title={`Depuis le catalogue (${line.sourceCode})`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          <Package size={11} /> Catalogue
                        </span>
                      )}
                      {line.optional && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Option</span>}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {line.quantity}
                      {line.unit ? ` ${line.unit}` : ""} × {money(line.unitPrice)}
                      {!!line.discountRate && line.discountRate > 0 && <span className="ml-2 text-red-600">-{line.discountRate} %</span>}
                    </p>
                    {line.externalReference && <p className="mt-0.5 text-xs text-gray-400">Réf. {line.externalReference}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{money(lineAmount(line))}</span>
                </div>
              </ItemRow>
            ))}
          </div>
        </Section>
      )}

      {/* ── Client, dates et références ── */}
      <Section title="Client et dates" icon={User}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <Detail label="Client" wide>
            {document.customerName ?? document.customerCode ?? "Client externe"}
          </Detail>
          <Detail label="E-mail">{document.customerEmail}</Detail>
          <Detail label="Téléphone">{document.customerPhone}</Detail>
          <Detail label="Type et code" mono>
            {document.customerType ? `${document.customerType} ${document.customerCode ?? ""}` : undefined}
          </Detail>
          <Detail label="Date d'émission">{formatDate(document.issueDate)}</Detail>
          <Detail label="Échéance">
            <span className={s === "OVERDUE" ? "text-red-600" : ""}>{formatDate(document.dueDate)}</span>
          </Detail>
          <Detail label="Émis le">{document.issuedAt ? formatDateTime(document.issuedAt) : undefined}</Detail>
          <Detail label="Envoyé le">{document.sentAt ? formatDateTime(document.sentAt) : undefined}</Detail>
          <Detail label="Payé le">{document.paidAt ? <span className="text-emerald-700">{formatDateTime(document.paidAt)}</span> : undefined}</Detail>
          <Detail label="Source métier" wide>
            {document.resolvedSourceLabel ?? document.sourceCode}
          </Detail>
          <Detail label="Référence de la source" mono>
            {document.resolvedSourceType ? `${document.resolvedSourceType} ${document.resolvedSourceCode ?? ""}` : undefined}
          </Detail>
          <Detail label="Réf. client">{document.customerReference}</Detail>
          <Detail label="N° bon de commande">{document.poNumber}</Detail>
          <Detail label="Projet">{document.projectCode}</Detail>
          <Detail label="Commercial">{document.salespersonCode}</Detail>
        </div>
      </Section>

      {/* ── Remises et clauses ── */}
      {document.discounts && document.discounts.length > 0 && (
        <Section title="Remises" icon={Tag}>
          <div className="space-y-2">
            {document.discounts.map((d, idx) => (
              <ItemRow key={idx}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-800">{d.description}</span>
                  <span className="font-bold tabular-nums">{d.discountType === "PERCENTAGE" ? `${d.value} %` : money(d.value)}</span>
                </div>
              </ItemRow>
            ))}
          </div>
        </Section>
      )}

      {document.clauses && document.clauses.length > 0 && (
        <Section title="Clauses" icon={FileText}>
          <div className="space-y-2">
            {document.clauses.map((c, idx) => (
              <ItemRow key={idx}>
                <p className="text-sm font-bold text-gray-900">{c.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{c.body}</p>
              </ItemRow>
            ))}
          </div>
        </Section>
      )}

      {/* ── Paiement, acompte, escompte ── */}
      {(document.paymentReference || document.paymentInstructions || document.advance || document.earlyPaymentDiscount) && (
        <Section title="Paiement" icon={CreditCard}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
            <Detail label="Référence de paiement" mono>
              {document.paymentReference}
            </Detail>
            <Detail label="Instructions" wide>
              {document.paymentInstructions}
            </Detail>
            {document.advance && (
              <>
                <Detail label="Acompte">
                  {document.advance.advanceType === "PERCENTAGE" ? `${document.advance.advanceValue} %` : money(document.advance.advanceValue)}
                </Detail>
                <Detail label="Montant de l'acompte">{document.advance.computedAmount ? money(document.advance.computedAmount) : undefined}</Detail>
                <Detail label="Statut de l'acompte">
                  <StatusChip tone={document.advance.status === "PAID" ? "success" : document.advance.status === "CANCELLED" ? "neutral" : "warn"}>
                    {ADVANCE_LABEL[document.advance.status ?? "PENDING"] ?? document.advance.status}
                  </StatusChip>
                </Detail>
              </>
            )}
            {document.earlyPaymentDiscount && (
              <Detail label="Escompte pour paiement anticipé" wide>
                {document.earlyPaymentDiscount.label ?? `Escompte ${document.earlyPaymentDiscount.discountRate} % si règlement avant le ${formatDate(document.earlyPaymentDiscount.ifPaidBefore)}`}
                {document.earlyPaymentDiscount.computedAmount ? <span className="ml-2 text-emerald-700">Économie {money(document.earlyPaymentDiscount.computedAmount)}</span> : null}
              </Detail>
            )}
          </div>
        </Section>
      )}

      {/* ── Relances d'impayés ── */}
      {isInvoice && s !== "DRAFT" && <NoticeTimeline documentNumber={document.documentNumber} />}

      {/* ── Signature électronique ── */}
      {document.signature && (
        <Section title="Signature électronique" icon={PenLine}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
            <Detail label="Statut">
              <StatusChip tone={document.signature.status === "SIGNED" ? "success" : document.signature.status === "EXPIRED" ? "neutral" : "info"}>
                {SIGNATURE_LABEL[document.signature.status] ?? document.signature.status}
              </StatusChip>
            </Detail>
            <Detail label="Signataire">{document.signature.signerName}</Detail>
            <Detail label="E-mail">{document.signature.signerEmail}</Detail>
            <Detail label="Signé le">{document.signature.signedAt ? formatDateTime(document.signature.signedAt) : undefined}</Detail>
          </div>
        </Section>
      )}

      {/* ── Informations fiscales SEFC ── */}
      {locked && (
        <Section title="Informations fiscales" icon={ShieldCheck}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
            <Detail label="Numéro fiscal" mono>
              {document.fiscalNumber}
            </Detail>
            <Detail label="Date fiscale">{document.fiscalDate ? formatDate(document.fiscalDate) : undefined}</Detail>
            <Detail label="Validé le">{document.validatedAt ? formatDateTime(document.validatedAt) : undefined}</Detail>
            <Detail label="Émetteur">{document.sellerName}</Detail>
            <Detail label="NIU émetteur" mono>
              {document.sellerNiu}
            </Detail>
            <Detail label="Catégorie client">{document.customerCategory}</Detail>
            <Detail label="NIU client" mono>
              {document.customerNiu}
            </Detail>
          </div>
        </Section>
      )}
    </div>
  );
};

export const BillingDocumentDetailPage: React.FC = () => (
  <BillingShell>
    <DetailBody />
  </BillingShell>
);
