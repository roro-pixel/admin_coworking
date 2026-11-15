import React, { useEffect, useRef, useState } from "react";
import { readDraft, useFormDraft } from "./useFormDraft";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Banknote, ChevronDown, ChevronUp, CreditCard, FileText, ListChecks, Package, Plus, Tag, Trash2, User } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { companyService } from "../../services/company.service";
import type {
  BillingAdvance,
  BillingCatalogLookupItem,
  BillingClause,
  BillingDiscount,
  BillingDocument,
  BillingEarlyPaymentDiscount,
  UpdateBillingLinePayload,
  BillingLine,
  BillingLineType,
  CreateBillingDocumentPayload,
} from "../../services/billing.service";
import { CustomerAutocomplete } from "../customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, ErrorBanner, Field, IconButton, ItemRow, PageHeader, Section, Switch, Tabs } from "../subscription/kit";
import type { TabItem } from "../subscription/kit";
import { FIELD, FIELD_SOFT, FOCUS, apiMessage, formatMoney } from "../subscription/kitUtils";
import { PillChoice } from "../operations/opsKit";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { DOC_TYPE_LABEL, LINE_TYPE_OPTIONS } from "./billingLabels";
import { CatalogPicker } from "./CatalogPicker";

/*
 * Formulaire de création partagé par « Nouvelle facture » et « Nouveau devis ».
 */

type Kind = "invoice" | "quote";
type Tab = "client" | "lines" | "discounts" | "advance" | "payment";
type CustomerKind = "CUSTOMER" | "MEMBER" | "EXTERNAL";
type FormLine = Partial<BillingLine> & { lineOrder: number };

const CONFIG = {
  invoice: {
    title: "Nouvelle facture",
    subtitle: "Facture manuelle pour un client enregistré ou externe",
    create: "Créer la facture",
    docTitle: "Titre de la facture",
    docTitlePh: "Facture prestation coworking",
    defaultTitle: "Facture manuelle",
    dueLabel: "Date d'échéance",
    termsHint: "Texte libre affiché sur la facture",
    termsPh: "Paiement à 30 jours net",
    refPh: "FAC-2026-0042",
    advanceLabelPh: "Acompte 30 % sur la facture FAC-2026-0042",
    advanceNote: "L'acompte est calculé côté backend et n'est pas modifiable après création (document en brouillon uniquement).",
    optionNote: "Ligne optionnelle : exclue du total, affichée séparément sur le document.",
    simKey: "billing-simulate-invoice",
    errorMsg: "Erreur lors de la création de la facture.",
    okMsg: "Facture créée.",
    bankPh: '{"bank":"Eco Bank","rib":"001 200 123456789 01","iban":"CG29..."}',
  },
  quote: {
    title: "Nouveau devis",
    subtitle: "Devis manuel pour un client enregistré ou externe",
    create: "Créer le devis",
    docTitle: "Titre du devis",
    docTitlePh: "Location d'espaces, juin 2026",
    defaultTitle: "Devis manuel",
    dueLabel: "Validité jusqu'au",
    termsHint: "Texte libre affiché sur le devis",
    termsPh: "Paiement à 30 jours net. Devis valable 30 jours.",
    refPh: "DEV-2026-0042",
    advanceLabelPh: "Acompte 30 % sur le devis DEV-2026-0042",
    advanceNote: "L'acompte est calculé côté backend. La conversion en facture ne reporte pas l'acompte automatiquement : précisez-le dans les instructions de paiement.",
    optionNote: "Ligne optionnelle : exclue du total principal, affichée comme option sur le devis.",
    simKey: "billing-simulate-quote",
    errorMsg: "Erreur lors de la création du devis.",
    okMsg: "Devis créé.",
    bankPh: '{"bank":"Eco Bank","rib":"001 200 123456789 01"}',
  },
} as const;

const LINE_TYPES = LINE_TYPE_OPTIONS.filter((o) => o.value !== "OVERAGE");

const buildDefaultLine = (order: number): FormLine => ({
  lineOrder: order,
  lineType: "SERVICE",
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
  discountRate: 0,
  taxable: true,
  taxIncluded: false,
  optional: false,
  externalReference: "",
  notes: "",
});

const TABS: TabItem<Tab>[] = [
  { id: "client", label: "Client et général", icon: User },
  { id: "lines", label: "Lignes", icon: ListChecks },
  { id: "discounts", label: "Remises et taxes", icon: Tag },
  { id: "advance", label: "Acompte", icon: Banknote },
  { id: "payment", label: "Paiement", icon: CreditCard },
];

const CUSTOMER_KIND_OPTIONS: { value: CustomerKind; label: string }[] = [
  { value: "CUSTOMER", label: "Client" },
  { value: "MEMBER", label: "Membre" },
  { value: "EXTERNAL", label: "Client externe" },
];

/** Libellé d'un champ qui contient un autocomplete (un <label> capterait les clics de la liste) */
const PlainLabel: React.FC<{ text: string; required?: boolean; children: React.ReactNode }> = ({ text, required, children }) => (
  <div>
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {text}
      {required && <span className="text-[color:var(--logo-pink-dark)]"> *</span>}
    </span>
    {children}
  </div>
);

/** Reconstitue l'état du formulaire à partir d'un document existant (mode modification) */
const docToState = (d: BillingDocument) => ({
  activeTab: "client" as Tab,
  customerType: "CUSTOMER" as CustomerKind,
  selectedCustomer: null,
  selectedMember: null,
  externalInfo: { name: "", email: "", phone: "" },
  generalData: {
    title: d.title || "",
    description: d.description || "",
    issueDate: d.issueDate || "",
    dueDate: d.dueDate || "",
    currency: d.currency || "XAF",
    customerReference: d.customerReference || "",
    poNumber: d.poNumber || "",
    projectCode: d.projectCode || "",
    salespersonCode: d.salespersonCode || "",
    language: d.language || "fr",
    terms: d.terms || "",
  },
  internalNotes: d.internalNotes || "",
  lines: (d.lines || []).map((l, i): FormLine => ({
    lineOrder: l.lineOrder ?? i + 1,
    lineType: l.lineType,
    description: l.description,
    unit: l.unit || "",
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountRate: l.discountRate ?? 0,
    taxable: l.taxable,
    taxIncluded: l.taxIncluded,
    optional: !!l.optional,
    externalReference: l.externalReference || "",
    notes: l.notes || "",
    catalogSourceType: l.catalogSourceType,
    catalogSourceCode: l.catalogSourceCode,
  })),
  discounts: d.discounts || [],
  clauses: d.clauses || [],
  earlyPaymentEnabled: !!d.earlyPaymentDiscount,
  earlyPayment: d.earlyPaymentDiscount ? { discountRate: d.earlyPaymentDiscount.discountRate, ifPaidBefore: d.earlyPaymentDiscount.ifPaidBefore, label: d.earlyPaymentDiscount.label ?? "" } : { discountRate: 2, ifPaidBefore: "", label: "" },
  advanceEnabled: !!d.advance,
  advance: d.advance
    ? { advanceType: d.advance.advanceType, advanceValue: d.advance.advanceValue, excludedLineOrders: d.advance.excludedLineOrders ?? [], paymentReference: d.advance.paymentReference ?? "", referenceLabel: d.advance.referenceLabel ?? "", dueDate: d.advance.dueDate ?? "", notes: d.advance.notes ?? "" }
    : { advanceType: "PERCENTAGE", advanceValue: 30, excludedLineOrders: [], paymentReference: "", referenceLabel: "", dueDate: "", notes: "" },
  excludedLinesInput: (d.advance?.excludedLineOrders ?? []).join(","),
  paymentData: { paymentReference: d.paymentReference || "", paymentInstructions: d.paymentInstructions || "", bankDetailsJson: d.bankDetailsJson || "", deliveryAddressJson: d.deliveryAddressJson || "" },
});

const DocumentFormInner: React.FC<{ kind: Kind; doc?: BillingDocument }> = ({ kind, doc }) => {
  const cfg = CONFIG[kind];
  const edit = !!doc;
  const ro = edit && doc!.status !== "DRAFT";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const draftKey = edit ? `billing-draft-edit-${doc!.documentNumber}` : `billing-draft-${kind}`;
  const saved = useRef<any>(readDraft(draftKey) ?? (doc ? docToState(doc) : null));
  const [restored, setRestored] = useState(!!readDraft(draftKey));
  const [internalNotes, setInternalNotes] = useState<string>(saved.current?.internalNotes ?? "");
  const [activeTab, setActiveTab] = useState<Tab>(saved.current?.activeTab ?? "client");

  // Client
  const [customerType, setCustomerType] = useState<CustomerKind>(saved.current?.customerType ?? "CUSTOMER");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(saved.current?.selectedCustomer ?? null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(saved.current?.selectedMember ?? null);
  const [externalInfo, setExternalInfo] = useState(saved.current?.externalInfo ?? { name: "", email: "", phone: "" });
  // Organisation qui paie
  const [billingCompany, setBillingCompany] = useState<string>(saved.current?.billingCompany ?? "");
  const memberLinks = useQuery({
    queryKey: ["member-companies", selectedMember?.memberId],
    queryFn: () => companyService.getMemberCompanies(selectedMember!.memberId),
    enabled: !edit && customerType === "MEMBER" && !!selectedMember,
  });
  const activeLinks = (memberLinks.data ?? []).filter((l) => l.customerId && (!l.status || l.status === "ACTIVE"));

  // Général
  const [generalData, setGeneralData] = useState(saved.current?.generalData ?? {
    title: "",
    description: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "XAF",
    customerReference: "",
    poNumber: "",
    projectCode: "",
    salespersonCode: "",
    language: "fr",
    terms: "",
  });

  // Lignes
  const [lines, setLines] = useState<FormLine[]>(saved.current?.lines ?? [buildDefaultLine(1)]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [catalogPickerIndex, setCatalogPickerIndex] = useState<number | null>(null);

  const applyCatalogItem = (idx: number, item: BillingCatalogLookupItem) => {
    setLines((current) =>
      current.map((l, i) =>
        i === idx
          ? { ...l, description: item.name, unitPrice: item.unitPrice, unit: item.unit || l.unit, catalogSourceType: item.sourceType, catalogSourceCode: item.sourceCode }
          : l,
      ),
    );
    setCatalogPickerIndex(null);
  };

  //  Remises et clauses 
  const [discounts, setDiscounts] = useState<BillingDiscount[]>(saved.current?.discounts ?? []);
  const [clauses, setClauses] = useState<BillingClause[]>(saved.current?.clauses ?? []);

  //  Escompte 
  const [earlyPaymentEnabled, setEarlyPaymentEnabled] = useState<boolean>(saved.current?.earlyPaymentEnabled ?? false);
  const [earlyPayment, setEarlyPayment] = useState<Omit<BillingEarlyPaymentDiscount, "computedAmount">>(saved.current?.earlyPayment ?? { discountRate: 2, ifPaidBefore: "", label: "" });

  // Acompte 
  const [advanceEnabled, setAdvanceEnabled] = useState<boolean>(saved.current?.advanceEnabled ?? false);
  const [advance, setAdvance] = useState<Omit<BillingAdvance, "computedAmount" | "status" | "paidAt">>(saved.current?.advance ?? {
    advanceType: "PERCENTAGE",
    advanceValue: 30,
    excludedLineOrders: [],
    paymentReference: "",
    referenceLabel: "",
    dueDate: "",
    notes: "",
  });
  const [excludedLinesInput, setExcludedLinesInput] = useState<string>(saved.current?.excludedLinesInput ?? "");

  //  Paiement 
  const [paymentData, setPaymentData] = useState(saved.current?.paymentData ?? { paymentReference: "", paymentInstructions: "", bankDetailsJson: "", deliveryAddressJson: "" });

  //  Brouillon automatique 
  const hasContent =
    edit || !!selectedCustomer || !!selectedMember || !!externalInfo.name || !!generalData.title || !!generalData.description || !!generalData.terms ||
    lines.some((l) => !!l.description || Number(l.unitPrice) > 0) || discounts.length > 0 || clauses.length > 0 || !!paymentData.paymentReference || !!paymentData.paymentInstructions;
  const { clearDraft } = useFormDraft(
    draftKey,
    { activeTab, customerType, selectedCustomer, selectedMember, billingCompany, externalInfo, generalData, internalNotes, lines, discounts, clauses, earlyPaymentEnabled, earlyPayment, advanceEnabled, advance, excludedLinesInput, paymentData },
    hasContent,
  );
  const discardDraft = () => {
    clearDraft();
    window.location.reload();
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  //  Aides lignes / remises / clauses 
  const addLine = () => setLines([...lines, buildDefaultLine(edit ? Math.max(0, ...lines.map((l) => l.lineOrder)) + 1 : lines.length + 1)]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i).map((l, idx) => (edit ? l : { ...l, lineOrder: idx + 1 })));
  const updateLine = <K extends keyof FormLine>(i: number, field: K, value: FormLine[K]) => {
    const arr = [...lines];
    arr[i] = { ...arr[i], [field]: value };
    setLines(arr);
  };
  const toggleExpand = (i: number) => {
    const s = new Set(expandedLines);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setExpandedLines(s);
  };

  const updateDiscount = <K extends keyof BillingDiscount>(i: number, field: K, value: BillingDiscount[K]) => {
    const arr = [...discounts];
    arr[i] = { ...arr[i], [field]: value };
    setDiscounts(arr);
  };
  const updateClause = <K extends keyof BillingClause>(i: number, field: K, value: BillingClause[K]) => {
    const arr = [...clauses];
    arr[i] = { ...arr[i], [field]: value };
    setClauses(arr);
  };

  //  Validation 
  const isClientValid = () => {
    if (edit) return true;
    if (customerType === "CUSTOMER") return !!selectedCustomer;
    if (customerType === "MEMBER") return !!selectedMember;
    return !!(externalInfo.name && externalInfo.email);
  };
  const isLineValid = (l: FormLine) => !!l.description && l.quantity! > 0 && l.unitPrice! >= 0;
  const hasValidLines = lines.some(isLineValid);
  const isValid = isClientValid() && hasValidLines;

  const totalEstimated = lines.filter((l) => !l.optional).reduce((sum, l) => sum + (l.quantity ?? 1) * (l.unitPrice ?? 0), 0);
  const optionsTotal = lines.filter((l) => l.optional).reduce((sum, l) => sum + (l.quantity ?? 1) * (l.unitPrice ?? 0), 0);
  const cur = currencyLabel(generalData.currency);

  const buildPayload = (): CreateBillingDocumentPayload => {
    const validLines = lines.filter(isLineValid).map((l) => ({
      lineOrder: l.lineOrder,
      lineType: l.lineType as BillingLineType,
      description: l.description!,
      unit: l.unit || undefined,
      quantity: l.quantity!,
      unitPrice: l.unitPrice!,
      discountRate: l.discountRate ?? 0,
      taxable: l.taxable!,
      taxIncluded: l.taxIncluded,
      optional: l.optional,
      externalReference: l.externalReference || undefined,
      notes: l.notes || undefined,
      catalogSourceType: l.catalogSourceType || undefined,
      catalogSourceCode: l.catalogSourceCode || undefined,
    }));

    const payload: CreateBillingDocumentPayload = {
      title: generalData.title || cfg.defaultTitle,
      description: generalData.description || undefined,
      terms: generalData.terms || undefined,
      currency: generalData.currency,
      issueDate: generalData.issueDate,
      dueDate: generalData.dueDate || undefined,
      language: generalData.language,
      customerReference: generalData.customerReference || undefined,
      poNumber: generalData.poNumber || undefined,
      projectCode: generalData.projectCode || undefined,
      salespersonCode: generalData.salespersonCode || undefined,
      paymentReference: paymentData.paymentReference || undefined,
      paymentInstructions: paymentData.paymentInstructions || undefined,
      bankDetailsJson: paymentData.bankDetailsJson || undefined,
      deliveryAddressJson: paymentData.deliveryAddressJson || undefined,
      lines: validLines,
      discounts: discounts.filter((d) => d.description && d.value > 0),
      clauses: clauses.filter((c) => c.title && c.body),
    };

    if (edit) {
      // Le client n'est pas modifiable
      if (doc!.customerType && doc!.customerCode) {
        payload.customerType = doc!.customerType;
        payload.customerCode = doc!.customerCode;
      } else {
        payload.customerName = doc!.customerName;
        payload.customerEmail = doc!.customerEmail;
        if (doc!.customerPhone) payload.customerPhone = doc!.customerPhone;
      }
    } else if (customerType === "CUSTOMER" && selectedCustomer) {
      payload.customerType = "CUSTOMER";
      payload.customerCode = selectedCustomer.customerId;
    } else if (customerType === "MEMBER" && selectedMember) {
      payload.customerType = "MEMBER";
      payload.customerCode = selectedMember.memberId;
      if (billingCompany) payload.companyCustomerCode = billingCompany;
    } else {
      payload.customerName = externalInfo.name;
      payload.customerEmail = externalInfo.email;
      if (externalInfo.phone) payload.customerPhone = externalInfo.phone;
    }

    if (advanceEnabled && advance.advanceValue > 0) {
      const excl = excludedLinesInput
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));
      payload.advance = {
        advanceType: advance.advanceType,
        advanceValue: advance.advanceValue,
        excludedLineOrders: excl.length > 0 ? excl : undefined,
        paymentReference: advance.paymentReference || undefined,
        referenceLabel: advance.referenceLabel || undefined,
        dueDate: advance.dueDate || undefined,
        notes: advance.notes || undefined,
      };
    }

    if (earlyPaymentEnabled && earlyPayment.discountRate > 0 && earlyPayment.ifPaidBefore) {
      payload.earlyPaymentDiscount = {
        discountRate: earlyPayment.discountRate,
        ifPaidBefore: earlyPayment.ifPaidBefore,
        label: earlyPayment.label || undefined,
      };
    }

    return payload;
  };

  //  Simulation en direct
  const [debouncedTrigger, setDebouncedTrigger] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTrigger((n) => n + 1), 500);
    return () => clearTimeout(t);
  }, [lines, discounts, advanceEnabled, advance, earlyPaymentEnabled, earlyPayment]);

  const { data: simulation, isFetching: isSimulating } = useQuery({
    queryKey: [cfg.simKey, debouncedTrigger],
    queryFn: () => billingService.simulateDocument(buildPayload()),
    enabled: hasValidLines,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!edit) return kind === "invoice" ? billingService.createManualInvoice(buildPayload()) : billingService.createManualQuote(buildPayload());
      const base = {
        dueDate: generalData.dueDate || undefined,
        terms: generalData.terms,
        paymentInstructions: paymentData.paymentInstructions,
        bankDetailsJson: paymentData.bankDetailsJson || undefined,
        internalNotes,
      };
      if (ro) return billingService.updateDocument(doc!.documentNumber, base);
      const kept = lines.filter(isLineValid);
      const keptOrders = new Set(kept.map((l) => l.lineOrder));
      const upserts: UpdateBillingLinePayload[] = kept.map((l) => ({
        action: "UPSERT",
        lineOrder: l.lineOrder,
        lineType: l.lineType as BillingLineType,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit || undefined,
        unitPrice: l.unitPrice,
        discountRate: l.discountRate ?? 0,
        taxable: l.taxable,
        optional: l.optional,
        externalReference: l.externalReference || undefined,
        notes: l.notes || undefined,
        catalogSourceType: l.catalogSourceType || undefined,
        catalogSourceCode: l.catalogSourceCode || undefined,
      }));
      const removals: UpdateBillingLinePayload[] = (doc!.lines || []).map((l, i) => l.lineOrder ?? i + 1).filter((o) => !keptOrders.has(o)).map((lineOrder) => ({ action: "REMOVE", lineOrder }));
      return billingService.updateDocument(doc!.documentNumber, {
        ...base,
        title: generalData.title,
        description: generalData.description,
        issueDate: generalData.issueDate || undefined,
        customerReference: generalData.customerReference,
        poNumber: generalData.poNumber,
        projectCode: generalData.projectCode,
        salespersonCode: generalData.salespersonCode,
        language: generalData.language,
        lines: [...upserts, ...removals],
        discounts: discounts.filter((d) => d.description && d.value > 0),
        clauses: clauses.filter((c) => c.title && c.body),
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      if (edit) queryClient.invalidateQueries({ queryKey: ["billing-document", doc!.documentNumber] });
      clearDraft();
      toast.success(edit ? "Document mis à jour." : cfg.okMsg);
      navigate(edit ? `/billing/documents/${(saved as BillingDocument)?.documentNumber ?? doc!.documentNumber}` : "/billing");
    },
    onError: (e: unknown) => setErrorMessage(apiMessage(e, edit ? "Erreur lors de la mise à jour." : cfg.errorMsg)),
  });

  const validLinesForSim = lines.filter(isLineValid);
  const money = (v: string | number) => formatMoney(Number(v), cur);

  const gd = generalData;
  const setGd = (patch: Partial<typeof generalData>) => setGeneralData({ ...generalData, ...patch });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeader
        title={edit ? `Modifier ${DOC_TYPE_LABEL[doc!.documentType] ?? "le document"} ${doc!.documentNumber}` : cfg.title}
        subtitle={edit ? (ro ? "Document déjà émis : seuls l'échéance, les conditions, le paiement et les notes internes sont modifiables." : "Brouillon : tous les champs de la création sont modifiables.") : cfg.subtitle}
        onBack={() => navigate(edit ? `/billing/documents/${doc!.documentNumber}` : "/billing")}
        backLabel={edit ? "Retour au document" : "Retour à la liste"}
      />

      {restored && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">Votre brouillon a été restauré : vous retrouvez ce que vous aviez commencé à saisir.</p>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={() => setRestored(false)}>Continuer</ActionButton>
            <ActionButton variant="ghost" onClick={discardDraft}>Repartir de zéro</ActionButton>
          </div>
        </div>
      )}

      <ErrorBanner message={errorMessage} />

      {/* Total en direct : la simulation ne bloque jamais la création, elle signale les dépassements.
          La dérogation (discountOverrideReason) ne s'applique qu'à l'émission, sur la fiche du document. */}
      {hasValidLines && (
        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-950">Total estimé</h3>
          {simulation ? (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
                {[
                  ["Sous-total", simulation.subtotalAmount],
                  ["Remise lignes", simulation.lineDiscountAmount],
                  ["Remise document", simulation.documentDiscountAmount],
                  ["Taxes", simulation.taxAmount],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-gray-400">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{money(value)}</dd>
                  </div>
                ))}
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-xs font-semibold text-gray-400">Total</dt>
                  <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-[color:var(--logo-pink-dark)]">{money(simulation.totalAmount)}</dd>
                </div>
              </dl>
              {kind === "quote" && optionsTotal > 0 && (
                <p className="mt-3 text-xs text-amber-700">
                  + {formatMoney(optionsTotal, cur)} de lignes optionnelles, exclues du total tant qu'elles ne sont pas sélectionnées par le client.
                </p>
              )}
              {simulation.violations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {simulation.violations.map((v, i) => (
                    <p key={i} className={`rounded-2xl px-4 py-2.5 text-sm ${v.severity === "BLOCK" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {v.message}
                    </p>
                  ))}
                  {kind === "invoice" && simulation.blocked && (
                    <p className="text-xs text-gray-500">Ce dépassement empêchera l'émission tant qu'un motif de dérogation n'est pas fourni. Vous pouvez tout de même créer le document en brouillon.</p>
                  )}
                </div>
              )}
              {isSimulating && <p className="mt-3 text-xs text-gray-400">Mise à jour du calcul</p>}
            </>
          ) : isSimulating ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : (
            <p className="text-sm text-gray-400">Renseignez au moins une ligne pour voir le total estimé.</p>
          )}
        </section>
      )}

      <Tabs variant="soft" items={TABS.map((t) => (t.id === "advance" && advanceEnabled ? { ...t, count: 1 } : t))} active={activeTab} onChange={setActiveTab} />

      <div className="space-y-5">
        {/* Client et général  */}
        {activeTab === "client" && (
          <>
            {edit ? (
              <Section title="Client" icon={User}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><p className="text-xs font-semibold text-gray-500">Nom</p><p className="text-sm font-semibold text-gray-900">{doc!.customerName || "Non renseigné"}</p></div>
                  <div><p className="text-xs font-semibold text-gray-500">{doc!.customerType ? `Code ${doc!.customerType}` : "Client externe"}</p><p className="font-mono text-sm text-gray-900">{doc!.customerCode || "Non enregistré"}</p></div>
                  <div><p className="text-xs font-semibold text-gray-500">E-mail</p><p className="text-sm text-gray-900">{doc!.customerEmail || "Non renseigné"}</p></div>
                  <div><p className="text-xs font-semibold text-gray-500">Téléphone</p><p className="text-sm text-gray-900">{doc!.customerPhone || "Non renseigné"}</p></div>
                </div>
                {doc!.companyName && <div className="mt-3"><p className="text-xs font-semibold text-gray-500">Émise pour le compte de</p><p className="text-sm font-semibold text-gray-900">{doc!.companyName}</p></div>}
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500"><Lock size={13} className="shrink-0" />Le client ne peut pas être changé après création. Pour un autre client, dupliquez le document.</p>
              </Section>
            ) : (
            <Section title="Client" icon={User}>
              <div className="space-y-4">
                <PillChoice label="Type de client" options={CUSTOMER_KIND_OPTIONS} value={customerType} onChange={(v) => { setCustomerType(v); setSelectedCustomer(null); setSelectedMember(null); setBillingCompany(""); }} />
                {customerType === "CUSTOMER" && (
                  <PlainLabel text="Client" required>
                    <CustomerAutocomplete onSelect={setSelectedCustomer} selectedCustomer={selectedCustomer} placeholder="Rechercher par nom ou e-mail" />
                  </PlainLabel>
                )}
                {customerType === "MEMBER" && (
                  <PlainLabel text="Membre" required>
                    <MemberAutocomplete onSelect={(m) => { setSelectedMember(m); setBillingCompany(""); }} selectedMember={selectedMember} placeholder="Rechercher par nom ou e-mail" />
                  </PlainLabel>
                )}
                {customerType === "MEMBER" && selectedMember && activeLinks.length > 0 && (
                  <Field label="Facturé à" hint="La facture reste au nom du membre ; elle compte dans l'encours de l'organisation choisie.">
                    <select value={billingCompany} onChange={(e) => setBillingCompany(e.target.value)} className={FIELD}>
                      <option value="">Selon le rattachement du membre (par défaut)</option>
                      <option value="NONE">Le membre seul</option>
                      {activeLinks.map((l) => (
                        <option key={l.id} value={l.customerId}>
                          {l.companyName ?? l.customerId}
                          {l.effectiveInvoiceLinkMode === "AUTOMATIC" ? " (automatique)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {customerType === "EXTERNAL" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nom / raison sociale" required>
                      <input type="text" value={externalInfo.name} onChange={(e) => setExternalInfo({ ...externalInfo, name: e.target.value })} className={FIELD} placeholder="Client Externe SARL" />
                    </Field>
                    <Field label="E-mail" required>
                      <input type="email" value={externalInfo.email} onChange={(e) => setExternalInfo({ ...externalInfo, email: e.target.value })} className={FIELD} placeholder="client@exemple.com" />
                    </Field>
                    <Field label="Téléphone">
                      <input type="tel" value={externalInfo.phone} onChange={(e) => setExternalInfo({ ...externalInfo, phone: e.target.value })} className={FIELD} placeholder="+242 06 000 00 00" />
                    </Field>
                  </div>
                )}
              </div>
            </Section>
            )}

            <Section title="Informations générales" icon={FileText}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={cfg.docTitle} className="sm:col-span-2">
                  <input type="text" value={gd.title} disabled={ro} onChange={(e) => setGd({ title: e.target.value })} className={FIELD} placeholder={cfg.docTitlePh} />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <textarea value={gd.description} disabled={ro} rows={2} onChange={(e) => setGd({ description: e.target.value })} className={`${FIELD} resize-none`} />
                </Field>
                <Field label="Date d'émission" required>
                  <input type="date" value={gd.issueDate} disabled={ro} onChange={(e) => setGd({ issueDate: e.target.value })} className={FIELD} />
                </Field>
                <Field label={cfg.dueLabel}>
                  <input type="date" value={gd.dueDate} min={gd.issueDate} onChange={(e) => setGd({ dueDate: e.target.value })} className={FIELD} />
                </Field>
                <Field label="Devise">
                  <select disabled={edit} value={gd.currency} onChange={(e) => setGd({ currency: e.target.value })} className={FIELD}>
                    <option value="XAF">XAF (FCFA)</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
                <Field label="Langue du PDF">
                  <select value={gd.language} disabled={ro} onChange={(e) => setGd({ language: e.target.value })} className={FIELD}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field label="Référence client" hint="N° de commande interne du client">
                  <input type="text" value={gd.customerReference} disabled={ro} onChange={(e) => setGd({ customerReference: e.target.value })} className={FIELD} placeholder="BC-2026-88" />
                </Field>
                <Field label="N° de bon de commande (PO)">
                  <input type="text" value={gd.poNumber} disabled={ro} onChange={(e) => setGd({ poNumber: e.target.value })} className={FIELD} placeholder="PO-2026-0099" />
                </Field>
                <Field label="Code projet">
                  <input type="text" value={gd.projectCode} disabled={ro} onChange={(e) => setGd({ projectCode: e.target.value })} className={FIELD} placeholder="PROJ-ALPHA" />
                </Field>
                <Field label="Code commercial">
                  <input type="text" value={gd.salespersonCode} disabled={ro} onChange={(e) => setGd({ salespersonCode: e.target.value })} className={FIELD} placeholder="USR-RYAN" />
                </Field>
                <Field label="Conditions générales" hint={cfg.termsHint} className="sm:col-span-2">
                  <textarea value={gd.terms} rows={3} onChange={(e) => setGd({ terms: e.target.value })} className={`${FIELD} resize-none`} placeholder={cfg.termsPh} />
                </Field>
                {edit && (
                  <Field label="Notes internes" hint="Jamais visibles du client, ni sur le PDF ni dans les e-mails" className="sm:col-span-2">
                    <textarea value={internalNotes} rows={2} onChange={(e) => setInternalNotes(e.target.value)} className={`${FIELD} resize-none`} />
                  </Field>
                )}
              </div>
            </Section>
          </>
        )}

        {/*  Lignes */}
        {activeTab === "lines" && (
          <fieldset disabled={ro} className="min-w-0">
          <Section
            title={kind === "invoice" ? "Lignes de facturation" : "Lignes du devis"}
            icon={ListChecks}
            action={
              <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={addLine}>
                Ajouter
              </ActionButton>
            }
          >
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const expanded = expandedLines.has(idx);
                const subtotal = (line.quantity ?? 1) * (line.unitPrice ?? 0);
                // Même filtre que buildPayload() 
                const validIdx = validLinesForSim.indexOf(line);
                const simulatedLine = validIdx >= 0 ? simulation?.lines?.[validIdx] : undefined;
                return (
                  <ItemRow key={idx} className={line.optional ? "ring-2 ring-amber-200" : ""}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <span className="font-mono">#{line.lineOrder}</span>
                        {line.catalogSourceCode && (
                          <span title={`Depuis le catalogue (${line.catalogSourceCode})`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                            <Package size={11} /> Catalogue
                          </span>
                        )}
                        {line.optional && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Option</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="mr-2 text-sm font-bold tabular-nums text-gray-900">{formatMoney(subtotal, cur)}</span>
                        <IconButton icon={expanded ? ChevronUp : ChevronDown} label={expanded ? "Masquer les détails" : "Afficher les détails"} onClick={() => toggleExpand(idx)} />
                        <IconButton icon={Trash2} tone="danger" label="Supprimer la ligne" disabled={lines.length === 1} onClick={() => removeLine(idx)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                      <Field label="Description" required className="col-span-2 md:col-span-6">
                        <div className="relative">
                          <input type="text" value={line.description ?? ""} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Description" className={`${FIELD_SOFT} pr-11`} />
                          <button
                            type="button"
                            title="Rechercher dans le catalogue"
                            aria-label="Rechercher dans le catalogue"
                            onClick={() => setCatalogPickerIndex(catalogPickerIndex === idx ? null : idx)}
                            className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[color:var(--logo-pink-dark)] ${FOCUS}`}
                          >
                            <Package size={15} />
                          </button>
                        </div>
                      </Field>
                      <Field label="Type" className="col-span-2 md:col-span-3">
                        <select value={line.lineType} onChange={(e) => updateLine(idx, "lineType", e.target.value as BillingLineType)} className={FIELD_SOFT}>
                          {LINE_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Unité" className="md:col-span-3">
                        <input type="text" value={line.unit ?? ""} onChange={(e) => updateLine(idx, "unit", e.target.value)} placeholder="jour" className={FIELD_SOFT} />
                      </Field>
                      <Field label="Quantité" className="md:col-span-3">
                        <input type="number" min="0" step="0.5" value={line.quantity ?? 1} onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 1)} className={FIELD_SOFT} />
                      </Field>
                      <Field label="Prix unitaire" className="md:col-span-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={line.unitPrice === 0 ? "" : line.unitPrice}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            updateLine(idx, "unitPrice", v === "" ? 0 : parseInt(v));
                          }}
                          placeholder="0"
                          className={`${FIELD_SOFT} text-right`}
                        />
                      </Field>
                      <div className="col-span-2 flex flex-wrap items-end gap-x-5 gap-y-2 pb-2.5 md:col-span-6">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                          <input type="checkbox" checked={line.taxable ?? true} onChange={(e) => updateLine(idx, "taxable", e.target.checked)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                          TVA
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                          <input type="checkbox" checked={line.optional ?? false} onChange={(e) => updateLine(idx, "optional", e.target.checked)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                          Option
                        </label>
                      </div>
                    </div>

                    {catalogPickerIndex === idx && <CatalogPicker onPick={(item) => applyCatalogItem(idx, item)} onClose={() => setCatalogPickerIndex(null)} />}

                    {expanded && (
                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2">
                        <Field label="Remise de ligne (%)" hint={simulatedLine ? `Taux réel : ${Number(simulatedLine.effectiveRate).toFixed(2)} %` : undefined}>
                          <input type="number" min="0" max="100" step="0.5" value={line.discountRate ?? 0} onChange={(e) => updateLine(idx, "discountRate", parseFloat(e.target.value) || 0)} className={FIELD} />
                        </Field>
                        <div>
                          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Prix saisi TTC</span>
                          <Switch checked={line.taxIncluded ?? false} onChange={(v) => updateLine(idx, "taxIncluded", v)} label={line.taxIncluded ? "TTC" : "HT"} hint="Si activé, le prix unitaire est taxe incluse" />
                        </div>
                        <Field label="Référence externe" hint="Référence de l'article côté client">
                          <input type="text" value={line.externalReference ?? ""} onChange={(e) => updateLine(idx, "externalReference", e.target.value)} placeholder="REF-CLIENT-42" className={FIELD} />
                        </Field>
                        <Field label="Note interne" hint="Non affichée sur le PDF">
                          <input type="text" value={line.notes ?? ""} onChange={(e) => updateLine(idx, "notes", e.target.value)} className={FIELD} />
                        </Field>
                        {line.optional && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 sm:col-span-2">{cfg.optionNote}</p>}
                      </div>
                    )}
                  </ItemRow>
                );
              })}
            </div>

            {(totalEstimated > 0 || (kind === "quote" && optionsTotal > 0)) && (
              <div className="mt-4 text-right">
                {totalEstimated > 0 && (
                  <p className="text-sm text-gray-600">
                    Estimation brute hors remises et options : <b className="text-gray-950">{formatMoney(totalEstimated, cur)}</b>
                  </p>
                )}
                {kind === "quote" && optionsTotal > 0 && <p className="text-xs text-amber-700">Options disponibles : +{formatMoney(optionsTotal, cur)}</p>}
              </div>
            )}
          </Section>
          </fieldset>
        )}

        {/*  Remises et taxes */}
        {activeTab === "discounts" && (
          <>
            <fieldset disabled={ro} className="min-w-0">
            <Section
              title="Remises globales"
              icon={Tag}
              action={
                <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setDiscounts([...discounts, { description: "", discountType: "PERCENTAGE", value: 0 }])}>
                  Ajouter
                </ActionButton>
              }
            >
              {discounts.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">Aucune remise globale.</p>
              ) : (
                <div className="space-y-3">
                  {discounts.map((d, i) => (
                    <ItemRow key={i}>
                      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[minmax(0,1fr)_10rem_7rem_auto]">
                        <Field label="Description" className="col-span-2 md:col-span-1">
                          <input type="text" value={d.description} onChange={(e) => updateDiscount(i, "description", e.target.value)} placeholder="Remise commerciale" className={FIELD_SOFT} />
                        </Field>
                        <Field label="Type">
                          <select value={d.discountType} onChange={(e) => updateDiscount(i, "discountType", e.target.value as BillingDiscount["discountType"])} className={FIELD_SOFT}>
                            <option value="PERCENTAGE">Pourcentage</option>
                            <option value="FIXED_AMOUNT">Montant fixe</option>
                          </select>
                        </Field>
                        <Field label="Valeur">
                          <input type="number" min="0" value={d.value} onChange={(e) => updateDiscount(i, "value", parseFloat(e.target.value) || 0)} className={FIELD_SOFT} />
                        </Field>
                        <IconButton icon={Trash2} tone="danger" label="Supprimer la remise" onClick={() => setDiscounts(discounts.filter((_, idx) => idx !== i))} />
                      </div>
                    </ItemRow>
                  ))}
                </div>
              )}
            </Section>

            </fieldset>

            <fieldset disabled={edit} className="min-w-0">
            <Section title="Escompte pour paiement anticipé" icon={CreditCard}>
              {edit && <p className="mb-4 flex items-center gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500"><Lock size={13} className="shrink-0" />L'escompte est fixé à la création : il n'est pas modifiable ensuite.</p>}
              <div className="space-y-4">
                <Switch checked={earlyPaymentEnabled} onChange={setEarlyPaymentEnabled} label="Activer un escompte pour paiement anticipé" />
                {earlyPaymentEnabled && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Taux d'escompte (%)">
                      <input type="number" min="0" max="100" step="0.5" value={earlyPayment.discountRate} onChange={(e) => setEarlyPayment({ ...earlyPayment, discountRate: parseFloat(e.target.value) || 0 })} className={FIELD} />
                    </Field>
                    <Field label="Si payé avant le" required>
                      <input type="date" value={earlyPayment.ifPaidBefore} min={gd.issueDate} onChange={(e) => setEarlyPayment({ ...earlyPayment, ifPaidBefore: e.target.value })} className={FIELD} />
                    </Field>
                    <Field label="Libellé personnalisé" hint="Généré automatiquement si absent">
                      <input type="text" value={earlyPayment.label ?? ""} onChange={(e) => setEarlyPayment({ ...earlyPayment, label: e.target.value })} className={FIELD} placeholder="Escompte 2 % si règlement avant..." />
                    </Field>
                  </div>
                )}
              </div>
            </Section>
            </fieldset>

            <fieldset disabled={ro} className="min-w-0">
            <Section
              title="Clauses"
              icon={FileText}
              action={
                <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setClauses([...clauses, { title: "", body: "", displayOrder: clauses.length + 1 }])}>
                  Ajouter
                </ActionButton>
              }
            >
              {clauses.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">Aucune clause.</p>
              ) : (
                <div className="space-y-3">
                  {clauses.map((c, i) => (
                    <ItemRow key={i}>
                      <div className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-end gap-3">
                        <Field label="Titre">
                          <input type="text" value={c.title} onChange={(e) => updateClause(i, "title", e.target.value)} placeholder="Conditions de paiement" className={FIELD_SOFT} />
                        </Field>
                        <Field label="Ordre">
                          <input type="number" min="1" value={c.displayOrder} onChange={(e) => updateClause(i, "displayOrder", parseInt(e.target.value) || 1)} className={FIELD_SOFT} />
                        </Field>
                        <IconButton icon={Trash2} tone="danger" label="Supprimer la clause" onClick={() => setClauses(clauses.filter((_, idx) => idx !== i))} />
                      </div>
                      <Field label="Corps" className="mt-3">
                        <textarea value={c.body} rows={2} onChange={(e) => updateClause(i, "body", e.target.value)} placeholder="Texte affiché sur le document" className={`${FIELD_SOFT} resize-none`} />
                      </Field>
                    </ItemRow>
                  ))}
                </div>
              )}
            </Section>
            </fieldset>
          </>
        )}

        {/* Acompte */}
        {activeTab === "advance" && (
          <fieldset disabled={edit} className="min-w-0">
          <Section title="Acompte" icon={Banknote}>
            {edit && <p className="mb-4 flex items-center gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500"><Lock size={13} className="shrink-0" />L'acompte est fixé à la création : il n'est pas modifiable ensuite.</p>}
            <div className="space-y-4">
              <Switch checked={advanceEnabled} onChange={setAdvanceEnabled} label="Demander un acompte à la commande" />
              {advanceEnabled && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Type d'acompte" required>
                      <select value={advance.advanceType} onChange={(e) => setAdvance({ ...advance, advanceType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" })} className={FIELD}>
                        <option value="PERCENTAGE">Pourcentage (%)</option>
                        <option value="FIXED_AMOUNT">Montant fixe (FCFA)</option>
                      </select>
                    </Field>
                    <Field label={advance.advanceType === "PERCENTAGE" ? "Valeur (%)" : "Montant (FCFA)"} required>
                      <input
                        type="number"
                        min="0"
                        max={advance.advanceType === "PERCENTAGE" ? 100 : undefined}
                        step={advance.advanceType === "PERCENTAGE" ? 1 : 1000}
                        value={advance.advanceValue}
                        onChange={(e) => setAdvance({ ...advance, advanceValue: parseFloat(e.target.value) || 0 })}
                        className={FIELD}
                      />
                    </Field>
                  </div>

                  <Field label="Lignes exclues du calcul" hint="Numéros de lignes séparés par une virgule, par exemple 3,5">
                    <input type="text" value={excludedLinesInput} onChange={(e) => setExcludedLinesInput(e.target.value)} placeholder="3,5" className={FIELD} />
                  </Field>
                  {lines.some((l) => l.optional) && (
                    <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                      Vous avez des lignes optionnelles ({lines.filter((l) => l.optional).map((l) => `#${l.lineOrder}`).join(", ")}). Pensez à les exclure.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Référence de paiement de l'acompte">
                      <input type="text" value={advance.paymentReference ?? ""} onChange={(e) => setAdvance({ ...advance, paymentReference: e.target.value })} className={FIELD} placeholder="AV-2026-0042" />
                    </Field>
                    <Field label="Échéance de l'acompte">
                      <input type="date" value={advance.dueDate ?? ""} min={gd.issueDate} onChange={(e) => setAdvance({ ...advance, dueDate: e.target.value })} className={FIELD} />
                    </Field>
                    <Field label="Libellé de l'acompte" hint="Affiché sur le PDF" className="sm:col-span-2">
                      <input type="text" value={advance.referenceLabel ?? ""} onChange={(e) => setAdvance({ ...advance, referenceLabel: e.target.value })} className={FIELD} placeholder={cfg.advanceLabelPh} />
                    </Field>
                    <Field label="Note interne" className="sm:col-span-2">
                      <input type="text" value={advance.notes ?? ""} onChange={(e) => setAdvance({ ...advance, notes: e.target.value })} className={FIELD} />
                    </Field>
                  </div>

                  <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                    <b>Note :</b> {cfg.advanceNote}
                  </p>
                </>
              )}
            </div>
          </Section>
          </fieldset>
        )}

        {/* Paiement */}
        {activeTab === "payment" && (
          <Section title="Paiement et coordonnées bancaires" icon={CreditCard}>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Référence de paiement" hint={edit ? "Fixée à la création" : "Générée automatiquement si absente"}>
                <input type="text" disabled={edit} value={paymentData.paymentReference} onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })} className={FIELD} placeholder={cfg.refPh} />
              </Field>
              <Field label="Instructions de paiement" hint="Affichées sur le PDF">
                <textarea value={paymentData.paymentInstructions} rows={2} onChange={(e) => setPaymentData({ ...paymentData, paymentInstructions: e.target.value })} placeholder="Virement à l'ordre de... Indiquez la référence lors du règlement." className={`${FIELD} resize-none`} />
              </Field>
              <Field label="Coordonnées bancaires (JSON)" hint='{"bank":"Eco Bank","rib":"001 200 ..."}'>
                <textarea value={paymentData.bankDetailsJson} rows={2} onChange={(e) => setPaymentData({ ...paymentData, bankDetailsJson: e.target.value })} placeholder={cfg.bankPh} className={`${FIELD} resize-none font-mono text-xs`} />
              </Field>
              <Field label="Adresse de livraison (JSON)" hint={edit ? "Fixée à la création" : '{"street":"...","city":"Brazzaville"}'}>
                <textarea disabled={edit} value={paymentData.deliveryAddressJson} rows={2} onChange={(e) => setPaymentData({ ...paymentData, deliveryAddressJson: e.target.value })} placeholder='{"street":"12 Av. des Cocotiers","city":"Brazzaville","country":"CG"}' className={`${FIELD} resize-none font-mono text-xs`} />
              </Field>
            </div>
          </Section>
        )}

        <div className="sticky bottom-4 z-10 flex justify-end gap-3 rounded-full bg-white p-2 shadow-lg ring-1 ring-black/5">
          <ActionButton variant="ghost" onClick={() => { clearDraft(); navigate(edit ? `/billing/documents/${doc!.documentNumber}` : "/billing"); }} disabled={createMutation.isPending}>
            Annuler
          </ActionButton>
          <ActionButton icon={FileText} pending={createMutation.isPending} disabled={!isValid} onClick={() => createMutation.mutate()}>
            {edit ? "Enregistrer les modifications" : cfg.create}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

/** Création  ou modification : même formulaire, mêmes onglets. */
export const DocumentForm: React.FC<{ kind?: Kind; documentNumber?: string }> = ({ kind = "invoice", documentNumber }) => {
  const navigate = useNavigate();
  const { data: doc, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber!),
    enabled: !!documentNumber,
  });

  if (!documentNumber) return <DocumentFormInner kind={kind} />;
  if (isLoading)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <Skeleton className="h-14 w-2/3 rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  if (isError || !doc)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">Impossible de charger ce document.</p>
        <div className="flex justify-center gap-2">
          <ActionButton variant="ghost" onClick={() => navigate("/billing")}>Retour à la liste</ActionButton>
          <ActionButton onClick={() => refetch()}>Réessayer</ActionButton>
        </div>
      </div>
    );
  const editable = !doc.locked && (doc.status === "DRAFT" || doc.status === "ISSUED" || doc.status === "SENT");
  if (!editable)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">Ce document n'est plus modifiable{doc.locked ? " : il est validé fiscalement. Corrigez-le par un avoir ou une facture rectificative." : " dans son statut actuel."}</p>
        <ActionButton onClick={() => navigate(`/billing/documents/${doc.documentNumber}`)}>Retour au document</ActionButton>
      </div>
    );
  return <DocumentFormInner kind={doc.documentType === "QUOTE" ? "quote" : "invoice"} doc={doc} />;
};
