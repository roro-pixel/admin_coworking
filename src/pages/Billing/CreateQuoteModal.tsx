import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  FileText,
  User,
  Calendar,
  ListChecks,
  CreditCard,
  Tag,
  Banknote,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { billingService } from "../../services/billing.service";
import type {
  BillingLineType,
  BillingDiscount,
  BillingClause,
  BillingLine,
  BillingAdvance,
  BillingEarlyPaymentDiscount,
} from "../../services/billing.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

// ─── Constantes ───────────────────────────────────────────────────────────────

const lineTypeOptions: { value: BillingLineType; label: string }[] = [
  { value: "SERVICE", label: "Service" },
  { value: "PRODUCT", label: "Produit" },
  { value: "BOOKING", label: "Réservation" },
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "PASS", label: "Pass" },
  { value: "ADDON", label: "Option" },
  { value: "FEE", label: "Frais" },
  { value: "DISCOUNT", label: "Remise" },
  { value: "OTHER", label: "Autre" },
];

const buildDefaultLine = (
  order: number,
): Partial<BillingLine> & { lineOrder: number } => ({
  lineOrder: order,
  lineType: "SERVICE",
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
  discountRate: 0,
  taxable: true,
  optional: false,
  externalReference: "",
  notes: "",
});

type Tab = "client" | "lines" | "discounts" | "advance" | "payment";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "client", label: "Client & Général", icon: User },
  { id: "lines", label: "Lignes", icon: ListChecks },
  { id: "discounts", label: "Remises & Taxes", icon: Tag },
  { id: "advance", label: "Acompte", icon: Banknote },
  { id: "payment", label: "Paiement", icon: CreditCard },
];

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white";

// ─── Composant ───────────────────────────────────────────────────────────────

export const CreateQuoteModal: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("client");

  // ── Client ──────────────────────────────────────────────────────────────
  const [customerType, setCustomerType] = useState<
    "CUSTOMER" | "MEMBER" | "EXTERNAL"
  >("CUSTOMER");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [externalInfo, setExternalInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // ── Général ─────────────────────────────────────────────────────────────
  const [generalData, setGeneralData] = useState({
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

  // ── Lignes ───────────────────────────────────────────────────────────────
  const [lines, setLines] = useState([buildDefaultLine(1)]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  // ── Remises globales + clauses ───────────────────────────────────────────
  const [discounts, setDiscounts] = useState<BillingDiscount[]>([]);
  const [clauses, setClauses] = useState<BillingClause[]>([]);

  // ── Escompte (Sprint 2) ──────────────────────────────────────────────────
  const [earlyPaymentEnabled, setEarlyPaymentEnabled] = useState(false);
  const [earlyPayment, setEarlyPayment] = useState<
    Omit<BillingEarlyPaymentDiscount, "computedAmount">
  >({
    discountRate: 2,
    ifPaidBefore: "",
    label: "",
  });

  // ── Acompte (Sprint 1) ───────────────────────────────────────────────────
  const [advanceEnabled, setAdvanceEnabled] = useState(false);
  const [advance, setAdvance] = useState<
    Omit<BillingAdvance, "computedAmount" | "status" | "paidAt">
  >({
    advanceType: "PERCENTAGE",
    advanceValue: 30,
    excludedLineOrders: [],
    paymentReference: "",
    referenceLabel: "",
    dueDate: "",
    notes: "",
  });
  const [excludedLinesInput, setExcludedLinesInput] = useState("");

  // ── Paiement ─────────────────────────────────────────────────────────────
  const [paymentData, setPaymentData] = useState({
    paymentReference: "",
    paymentInstructions: "",
    bankDetailsJson: "",
    deliveryAddressJson: "",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Helpers lignes ────────────────────────────────────────────────────────
  const addLine = () =>
    setLines([...lines, buildDefaultLine(lines.length + 1)]);
  const removeLine = (i: number) =>
    setLines(
      lines
        .filter((_, idx) => idx !== i)
        .map((l, idx) => ({ ...l, lineOrder: idx + 1 })),
    );
  const updateLine = (i: number, field: string, value: any) => {
    const arr = [...lines];
    arr[i] = { ...arr[i], [field]: value };
    setLines(arr);
  };
  const toggleExpand = (i: number) => {
    const s = new Set(expandedLines);
    s.has(i) ? s.delete(i) : s.add(i);
    setExpandedLines(s);
  };

  const addDiscount = () =>
    setDiscounts([
      ...discounts,
      { description: "", discountType: "PERCENTAGE", value: 0 },
    ]);
  const removeDiscount = (i: number) =>
    setDiscounts(discounts.filter((_, idx) => idx !== i));
  const updateDiscount = (i: number, f: string, v: any) => {
    const a = [...discounts];
    a[i] = { ...a[i], [f]: v };
    setDiscounts(a);
  };

  const addClause = () =>
    setClauses([
      ...clauses,
      { title: "", body: "", displayOrder: clauses.length + 1 },
    ]);
  const removeClause = (i: number) =>
    setClauses(clauses.filter((_, idx) => idx !== i));
  const updateClause = (i: number, f: string, v: any) => {
    const a = [...clauses];
    a[i] = { ...a[i], [f]: v };
    setClauses(a);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const isClientValid = () => {
    if (customerType === "CUSTOMER") return !!selectedCustomer;
    if (customerType === "MEMBER") return !!selectedMember;
    return !!(externalInfo.name && externalInfo.email);
  };
  const hasValidLines = lines.some(
    (l) => l.description && l.quantity! > 0 && l.unitPrice! >= 0,
  );
  const isValid = isClientValid() && hasValidLines;

  const totalEstimated = lines
    .filter((l) => !l.optional)
    .reduce((sum, l) => sum + (l.quantity ?? 1) * (l.unitPrice ?? 0), 0);
  const optionsTotal = lines
    .filter((l) => l.optional)
    .reduce((sum, l) => sum + (l.quantity ?? 1) * (l.unitPrice ?? 0), 0);

  // ── Mutation ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => {
      const validLines = lines
        .filter((l) => l.description && l.quantity! > 0 && l.unitPrice! >= 0)
        .map((l) => ({
          lineOrder: l.lineOrder,
          lineType: l.lineType as BillingLineType,
          description: l.description!,
          unit: l.unit || undefined,
          quantity: l.quantity!,
          unitPrice: l.unitPrice!,
          discountRate: l.discountRate ?? 0,
          taxable: l.taxable!,
          optional: l.optional,
          externalReference: l.externalReference || undefined,
          notes: l.notes || undefined,
        }));

      const payload: any = {
        title: generalData.title || "Devis manuel",
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

      if (customerType === "CUSTOMER" && selectedCustomer) {
        payload.customerType = "CUSTOMER";
        payload.customerCode = selectedCustomer.customerId;
      } else if (customerType === "MEMBER" && selectedMember) {
        payload.customerType = "MEMBER";
        payload.customerCode = selectedMember.memberId;
      } else {
        payload.customerName = externalInfo.name;
        payload.customerEmail = externalInfo.email;
        if (externalInfo.phone) payload.customerPhone = externalInfo.phone;
      }

      // Acompte (Sprint 1)
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

      // Escompte (Sprint 2)
      if (
        earlyPaymentEnabled &&
        earlyPayment.discountRate > 0 &&
        earlyPayment.ifPaidBefore
      ) {
        payload.earlyPaymentDiscount = {
          discountRate: earlyPayment.discountRate,
          ifPaidBefore: earlyPayment.ifPaidBefore,
          label: earlyPayment.label || undefined,
        };
      }

      return billingService.createManualQuote(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      navigate("/billing");
    },
    onError: (e: any) => {
      setErrorMessage(
        e?.response?.data?.message ?? "Erreur lors de la création du devis.",
      );
    },
  });

  return (
    <AdminLayout>
      <button
        onClick={() => navigate("/billing")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Devis manuel pour un client enregistré ou externe
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/billing")}
            disabled={createMutation.isPending}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !isValid}
            className="px-5 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {createMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileText size={15} />
            )}
            Créer le devis
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={15} className="flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {/* Badges indicateurs */}
                {tab.id === "advance" && advanceEnabled && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* ── Onglet Client & Général ── */}
        {activeTab === "client" && (
          <>
            <FormSection
              title="Client"
              icon={<User size={16} className="text-blue-600" />}
              iconBg="bg-blue-100"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de client
                </label>
                <div className="flex gap-3">
                  {(["CUSTOMER", "MEMBER", "EXTERNAL"] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        customerType === type
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={customerType === type}
                        onChange={() => {
                          setCustomerType(type);
                          setSelectedCustomer(null);
                          setSelectedMember(null);
                        }}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          customerType === type
                            ? "border-primary-600"
                            : "border-gray-300"
                        }`}
                      >
                        {customerType === type && (
                          <div className="w-2 h-2 rounded-full bg-primary-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {type === "CUSTOMER"
                          ? "Customer"
                          : type === "MEMBER"
                            ? "Membre"
                            : "Client externe"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {customerType === "CUSTOMER" && (
                <Field label="Customer *">
                  <CustomerAutocomplete
                    onSelect={setSelectedCustomer}
                    selectedCustomer={selectedCustomer}
                    placeholder="Rechercher par nom, email..."
                  />
                </Field>
              )}
              {customerType === "MEMBER" && (
                <Field label="Membre *">
                  <MemberAutocomplete
                    onSelect={setSelectedMember}
                    selectedMember={selectedMember}
                    placeholder="Rechercher par nom, email..."
                  />
                </Field>
              )}
              {customerType === "EXTERNAL" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nom / Raison sociale *">
                    <input
                      type="text"
                      value={externalInfo.name}
                      onChange={(e) =>
                        setExternalInfo({
                          ...externalInfo,
                          name: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="Client Externe SARL"
                    />
                  </Field>
                  <Field label="Email *">
                    <input
                      type="email"
                      value={externalInfo.email}
                      onChange={(e) =>
                        setExternalInfo({
                          ...externalInfo,
                          email: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="client@exemple.com"
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      type="tel"
                      value={externalInfo.phone}
                      onChange={(e) =>
                        setExternalInfo({
                          ...externalInfo,
                          phone: e.target.value,
                        })
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            <FormSection
              title="Informations générales"
              icon={<FileText size={16} className="text-purple-600" />}
              iconBg="bg-purple-100"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Titre du devis">
                    <input
                      type="text"
                      value={generalData.title}
                      onChange={(e) =>
                        setGeneralData({
                          ...generalData,
                          title: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="ex: Devis location espaces — Juin 2026"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Description">
                    <textarea
                      value={generalData.description}
                      rows={2}
                      onChange={(e) =>
                        setGeneralData({
                          ...generalData,
                          description: e.target.value,
                        })
                      }
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
                <Field label="Date d'émission *">
                  <input
                    type="date"
                    value={generalData.issueDate}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        issueDate: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Validité jusqu'au">
                  <input
                    type="date"
                    value={generalData.dueDate}
                    min={generalData.issueDate}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        dueDate: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Devise">
                  <select
                    value={generalData.currency}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        currency: e.target.value,
                      })
                    }
                    className={inputCls}
                  >
                    <option value="XAF">XAF (FCFA)</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
                <Field label="Langue PDF">
                  <select
                    value={generalData.language}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        language: e.target.value,
                      })
                    }
                    className={inputCls}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field
                  label="Référence client"
                  hint="N° commande interne du client"
                >
                  <input
                    type="text"
                    value={generalData.customerReference}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        customerReference: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="BC-COMMANDE-2026-88"
                  />
                </Field>
                <Field label="N° bon de commande (PO)">
                  <input
                    type="text"
                    value={generalData.poNumber}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        poNumber: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="PO-2026-0099"
                  />
                </Field>
                <Field label="Code projet">
                  <input
                    type="text"
                    value={generalData.projectCode}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        projectCode: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="PROJ-ALPHA"
                  />
                </Field>
                <Field label="Code commercial">
                  <input
                    type="text"
                    value={generalData.salespersonCode}
                    onChange={(e) =>
                      setGeneralData({
                        ...generalData,
                        salespersonCode: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="USR-RYAN"
                  />
                </Field>
                <div className="col-span-2">
                  <Field
                    label="Conditions générales"
                    hint="Texte libre affiché sur le devis"
                  >
                    <textarea
                      value={generalData.terms}
                      rows={3}
                      onChange={(e) =>
                        setGeneralData({
                          ...generalData,
                          terms: e.target.value,
                        })
                      }
                      className={`${inputCls} resize-none`}
                      placeholder="Paiement à 30 jours net. Devis valable 30 jours..."
                    />
                  </Field>
                </div>
              </div>
            </FormSection>
          </>
        )}

        {/* ── Onglet Lignes ── */}
        {activeTab === "lines" && (
          <FormSection
            title="Lignes du devis"
            icon={<ListChecks size={16} className="text-green-600" />}
            iconBg="bg-green-100"
            action={
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"
              >
                <Plus size={13} /> Ajouter
              </button>
            }
          >
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const expanded = expandedLines.has(idx);
                const subtotal = (line.quantity ?? 1) * (line.unitPrice ?? 0);
                return (
                  <div
                    key={idx}
                    className={`border rounded-xl overflow-hidden ${line.optional ? "border-amber-200" : "border-gray-200"}`}
                  >
                    <div
                      className={`grid grid-cols-12 gap-3 items-start p-3 ${line.optional ? "bg-amber-50" : "bg-gray-50"}`}
                    >
                      <div className="col-span-1 flex items-center justify-center pt-2">
                        <span className="text-xs text-gray-400 font-mono">
                          #{line.lineOrder}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Type
                        </label>
                        <select
                          value={line.lineType}
                          onChange={(e) =>
                            updateLine(idx, "lineType", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                        >
                          {lineTypeOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">
                          Description *
                        </label>
                        <input
                          type="text"
                          value={line.description ?? ""}
                          onChange={(e) =>
                            updateLine(idx, "description", e.target.value)
                          }
                          placeholder="Description"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          Unité
                        </label>
                        <input
                          type="text"
                          value={line.unit ?? ""}
                          onChange={(e) =>
                            updateLine(idx, "unit", e.target.value)
                          }
                          placeholder="jour"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          Qté
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={line.quantity ?? 1}
                          onChange={(e) =>
                            updateLine(
                              idx,
                              "quantity",
                              parseFloat(e.target.value) || 1,
                            )
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Prix unitaire
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={line.unitPrice === 0 ? "" : line.unitPrice}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            updateLine(
                              idx,
                              "unitPrice",
                              v === "" ? 0 : parseInt(v),
                            );
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white"
                        />
                      </div>
                      <div className="col-span-1 flex flex-col items-center gap-1 pt-1">
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={line.taxable ?? true}
                            onChange={(e) =>
                              updateLine(idx, "taxable", e.target.checked)
                            }
                            className="rounded"
                          />
                          TVA
                        </label>
                        <label
                          className={`flex items-center gap-1 cursor-pointer text-xs ${line.optional ? "text-amber-600 font-medium" : "text-gray-400"}`}
                        >
                          <input
                            type="checkbox"
                            checked={line.optional ?? false}
                            onChange={(e) =>
                              updateLine(idx, "optional", e.target.checked)
                            }
                            className="rounded"
                          />
                          Option
                        </label>
                      </div>
                      <div className="col-span-1 flex flex-col items-end gap-1 pt-1">
                        <span
                          className={`text-xs font-medium ${line.optional ? "text-amber-600" : "text-gray-700"}`}
                        >
                          {subtotal.toLocaleString("fr-FR")} F
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {expanded ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length === 1}
                            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="grid grid-cols-3 gap-3 p-3 border-t border-gray-100 bg-white">
                        <Field label="Remise ligne (%)">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={line.discountRate ?? 0}
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "discountRate",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className={inputCls}
                          />
                        </Field>
                        <Field
                          label="Référence externe"
                          hint="Réf. côté client"
                        >
                          <input
                            type="text"
                            value={line.externalReference ?? ""}
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "externalReference",
                                e.target.value,
                              )
                            }
                            placeholder="REF-CLIENT-42"
                            className={inputCls}
                          />
                        </Field>
                        <Field
                          label="Note interne"
                          hint="Non affichée sur le PDF"
                        >
                          <input
                            type="text"
                            value={line.notes ?? ""}
                            onChange={(e) =>
                              updateLine(idx, "notes", e.target.value)
                            }
                            className={inputCls}
                          />
                        </Field>
                        {line.optional && (
                          <div className="col-span-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                            Ligne optionnelle — exclue du total principal,
                            affichée comme option sur le devis
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Récapitulatif */}
            <div className="mt-4 pt-4 border-t space-y-1 text-right">
              {totalEstimated > 0 && (
                <p className="text-sm text-gray-600">
                  Total confirmé HT :{" "}
                  <span className="font-bold text-gray-900">
                    {totalEstimated.toLocaleString("fr-FR")} FCFA
                  </span>
                </p>
              )}
              {optionsTotal > 0 && (
                <p className="text-xs text-amber-600">
                  Options disponibles : +{optionsTotal.toLocaleString("fr-FR")}{" "}
                  FCFA
                </p>
              )}
            </div>
          </FormSection>
        )}

        {/* ── Onglet Remises & Taxes ── */}
        {activeTab === "discounts" && (
          <>
            <FormSection
              title="Remises globales"
              icon={<Tag size={16} className="text-orange-600" />}
              iconBg="bg-orange-100"
              action={
                <button
                  type="button"
                  onClick={addDiscount}
                  className="flex items-center gap-1 text-primary-600 text-sm hover:text-primary-700"
                >
                  <Plus size={13} /> Ajouter
                </button>
              }
            >
              {discounts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Aucune remise globale.
                </p>
              ) : (
                discounts.map((d, i) => (
                  <div
                    key={i}
                    className="flex gap-3 items-end p-3 bg-gray-50 rounded-xl"
                  >
                    <Field label="Description" className="flex-1">
                      <input
                        type="text"
                        value={d.description}
                        onChange={(e) =>
                          updateDiscount(i, "description", e.target.value)
                        }
                        placeholder="Remise commerciale"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={d.discountType}
                        onChange={(e) =>
                          updateDiscount(i, "discountType", e.target.value)
                        }
                        className={inputCls}
                      >
                        <option value="PERCENTAGE">Pourcentage</option>
                        <option value="FIXED_AMOUNT">Montant fixe</option>
                      </select>
                    </Field>
                    <Field label="Valeur">
                      <input
                        type="number"
                        min="0"
                        value={d.value}
                        onChange={(e) =>
                          updateDiscount(
                            i,
                            "value",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={`${inputCls} w-24`}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeDiscount(i)}
                      className="p-2 text-red-500 hover:text-red-700 mb-0.5"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </FormSection>

            {/* Escompte (Sprint 2) */}
            <FormSection
              title="Escompte pour paiement anticipé"
              icon={<Calendar size={16} className="text-teal-600" />}
              iconBg="bg-teal-100"
            >
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={earlyPaymentEnabled}
                  onChange={(e) => setEarlyPaymentEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Activer un escompte pour paiement anticipé
                </span>
              </label>
              {earlyPaymentEnabled && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-teal-50 rounded-xl">
                  <Field label="Taux d'escompte (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={earlyPayment.discountRate}
                      onChange={(e) =>
                        setEarlyPayment({
                          ...earlyPayment,
                          discountRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Si payé avant le *">
                    <input
                      type="date"
                      value={earlyPayment.ifPaidBefore}
                      min={generalData.issueDate}
                      onChange={(e) =>
                        setEarlyPayment({
                          ...earlyPayment,
                          ifPaidBefore: e.target.value,
                        })
                      }
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="Libellé personnalisé"
                    hint="Généré automatiquement si absent"
                  >
                    <input
                      type="text"
                      value={earlyPayment.label ?? ""}
                      onChange={(e) =>
                        setEarlyPayment({
                          ...earlyPayment,
                          label: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="Escompte 2% si règlement avant..."
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {/* Clauses */}
            <FormSection
              title="Clauses"
              icon={<FileText size={16} className="text-gray-500" />}
              iconBg="bg-gray-100"
              action={
                <button
                  type="button"
                  onClick={addClause}
                  className="flex items-center gap-1 text-primary-600 text-sm hover:text-primary-700"
                >
                  <Plus size={13} /> Ajouter
                </button>
              }
            >
              {clauses.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune clause.</p>
              ) : (
                clauses.map((c, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex gap-3 items-center">
                      <Field label="Titre" className="flex-1">
                        <input
                          type="text"
                          value={c.title}
                          onChange={(e) =>
                            updateClause(i, "title", e.target.value)
                          }
                          placeholder="Conditions de paiement"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Ordre">
                        <input
                          type="number"
                          min="1"
                          value={c.displayOrder}
                          onChange={(e) =>
                            updateClause(
                              i,
                              "displayOrder",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className={`${inputCls} w-20`}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeClause(i)}
                        className="p-2 text-red-500 hover:text-red-700 mt-5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <Field label="Corps">
                      <textarea
                        value={c.body}
                        rows={2}
                        onChange={(e) =>
                          updateClause(i, "body", e.target.value)
                        }
                        placeholder="Texte affiché sur le document..."
                        className={`${inputCls} resize-none`}
                      />
                    </Field>
                  </div>
                ))
              )}
            </FormSection>
          </>
        )}

        {/* ── Onglet Acompte (Sprint 1) ── */}
        {activeTab === "advance" && (
          <FormSection
            title="Acompte"
            icon={<Banknote size={16} className="text-green-600" />}
            iconBg="bg-green-100"
          >
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={advanceEnabled}
                onChange={(e) => setAdvanceEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">
                Demander un acompte à la commande
              </span>
            </label>

            {advanceEnabled && (
              <div className="space-y-4 p-4 bg-green-50 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Type d'acompte *">
                    <select
                      value={advance.advanceType}
                      onChange={(e) =>
                        setAdvance({
                          ...advance,
                          advanceType: e.target.value as
                            | "PERCENTAGE"
                            | "FIXED_AMOUNT",
                        })
                      }
                      className={inputCls}
                    >
                      <option value="PERCENTAGE">Pourcentage (%)</option>
                      <option value="FIXED_AMOUNT">Montant fixe (FCFA)</option>
                    </select>
                  </Field>
                  <Field
                    label={
                      advance.advanceType === "PERCENTAGE"
                        ? "Valeur (%) *"
                        : "Montant (FCFA) *"
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      max={
                        advance.advanceType === "PERCENTAGE" ? 100 : undefined
                      }
                      step={advance.advanceType === "PERCENTAGE" ? 1 : 1000}
                      value={advance.advanceValue}
                      onChange={(e) =>
                        setAdvance({
                          ...advance,
                          advanceValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field
                  label="Lignes exclues du calcul"
                  hint="Numéros de lignes séparés par virgule, ex: 3,5"
                >
                  <input
                    type="text"
                    value={excludedLinesInput}
                    onChange={(e) => setExcludedLinesInput(e.target.value)}
                    placeholder="ex: 3,5 — lignes optionnelles recommandées"
                    className={inputCls}
                  />
                  {lines.some((l) => l.optional) && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠ Vous avez des lignes optionnelles (
                      {lines
                        .filter((l) => l.optional)
                        .map((l) => `#${l.lineOrder}`)
                        .join(", ")}
                      ) — pensez à les exclure.
                    </p>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Référence de paiement acompte">
                    <input
                      type="text"
                      value={advance.paymentReference ?? ""}
                      onChange={(e) =>
                        setAdvance({
                          ...advance,
                          paymentReference: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="AV-2026-0042"
                    />
                  </Field>
                  <Field label="Date d'échéance acompte">
                    <input
                      type="date"
                      value={advance.dueDate ?? ""}
                      min={generalData.issueDate}
                      onChange={(e) =>
                        setAdvance({ ...advance, dueDate: e.target.value })
                      }
                      className={inputCls}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Libellé acompte" hint="Affiché sur le PDF">
                      <input
                        type="text"
                        value={advance.referenceLabel ?? ""}
                        onChange={(e) =>
                          setAdvance({
                            ...advance,
                            referenceLabel: e.target.value,
                          })
                        }
                        className={inputCls}
                        placeholder="Acompte 30% — Devis DEV-2026-0042"
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Note interne">
                      <input
                        type="text"
                        value={advance.notes ?? ""}
                        onChange={(e) =>
                          setAdvance({ ...advance, notes: e.target.value })
                        }
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>

                {/* Note d'info */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <strong>Note :</strong> L'acompte est calculé côté backend. La
                  conversion en facture ne reporte pas l'acompte automatiquement
                  — précisez-le dans les instructions de paiement.
                </div>
              </div>
            )}
          </FormSection>
        )}

        {/* ── Onglet Paiement ── */}
        {activeTab === "payment" && (
          <FormSection
            title="Paiement & Coordonnées bancaires"
            icon={<CreditCard size={16} className="text-teal-600" />}
            iconBg="bg-teal-100"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Référence de paiement"
                hint="Générée automatiquement si absente"
              >
                <input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      paymentReference: e.target.value,
                    })
                  }
                  className={inputCls}
                  placeholder="DEV-2026-0042"
                />
              </Field>
              <div className="col-span-2">
                <Field
                  label="Instructions de paiement"
                  hint="Affichées sur le PDF"
                >
                  <textarea
                    value={paymentData.paymentInstructions}
                    rows={2}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        paymentInstructions: e.target.value,
                      })
                    }
                    placeholder="Virement à l'ordre de... Indiquez la référence lors du règlement."
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field
                  label="Coordonnées bancaires (JSON)"
                  hint='{"bank":"Eco Bank","rib":"001 200 ..."}'
                >
                  <textarea
                    value={paymentData.bankDetailsJson}
                    rows={2}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        bankDetailsJson: e.target.value,
                      })
                    }
                    placeholder='{"bank":"Eco Bank","rib":"001 200 123456789 01"}'
                    className={`${inputCls} resize-none font-mono text-xs`}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field
                  label="Adresse de livraison (JSON)"
                  hint='{"street":"...","city":"Brazzaville"}'
                >
                  <textarea
                    value={paymentData.deliveryAddressJson}
                    rows={2}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        deliveryAddressJson: e.target.value,
                      })
                    }
                    placeholder='{"street":"12 Av. des Cocotiers","city":"Brazzaville","country":"CG"}'
                    className={`${inputCls} resize-none font-mono text-xs`}
                  />
                </Field>
              </div>
            </div>
          </FormSection>
        )}

        {/* Bouton sticky */}
        <div className="sticky bottom-0 bg-white border-t py-4 flex justify-end gap-3">
          <button
            onClick={() => navigate("/billing")}
            disabled={createMutation.isPending}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !isValid}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {createMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileText size={15} />
            )}
            Créer le devis
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, className, children }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {hint && (
        <span className="ml-1 text-xs text-gray-400 font-normal">— {hint}</span>
      )}
    </label>
    {children}
  </div>
);

const FormSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, iconBg, action, children }) => (
  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          {icon}
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </section>
);
