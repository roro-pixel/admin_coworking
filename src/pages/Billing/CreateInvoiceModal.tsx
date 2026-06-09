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
  ListChecks,
  CreditCard,
  Tag,
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
} from "../../services/billing.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "client" | "lines" | "discounts" | "payment";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "client", label: "Client & Général", icon: User },
  { id: "lines", label: "Lignes", icon: ListChecks },
  { id: "discounts", label: "Remises & Taxes", icon: Tag },
  { id: "payment", label: "Paiement", icon: CreditCard },
];

// ─── Composant ───────────────────────────────────────────────────────────────

export const CreateInvoiceModal: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Navigation onglets
  const [activeTab, setActiveTab] = useState<Tab>("client");

  // ── Client ────────────────────────────────────────────────────────────────
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

  // ── Informations générales ────────────────────────────────────────────────
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
  });

  // ── Lignes ────────────────────────────────────────────────────────────────
  const [lines, setLines] = useState([buildDefaultLine(1)]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  // ── Remises & Clauses ─────────────────────────────────────────────────────
  const [discounts, setDiscounts] = useState<BillingDiscount[]>([]);
  const [clauses, setClauses] = useState<BillingClause[]>([]);

  // ── Paiement ──────────────────────────────────────────────────────────────
  const [paymentData, setPaymentData] = useState({
    paymentReference: "",
    paymentInstructions: "",
    bankDetailsJson: "",
    deliveryAddressJson: "",
  });

  // ── Divers ────────────────────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Helpers lignes ────────────────────────────────────────────────────────
  const addLine = () => {
    const order = lines.length + 1;
    setLines([...lines, buildDefaultLine(order)]);
  };
  const removeLine = (i: number) => {
    const updated = lines
      .filter((_, idx) => idx !== i)
      .map((l, idx) => ({ ...l, lineOrder: idx + 1 }));
    setLines(updated);
  };
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

  // ── Helpers remises ───────────────────────────────────────────────────────
  const addDiscount = () =>
    setDiscounts([
      ...discounts,
      { description: "", discountType: "PERCENTAGE", value: 0 },
    ]);
  const removeDiscount = (i: number) =>
    setDiscounts(discounts.filter((_, idx) => idx !== i));
  const updateDiscount = (i: number, field: string, value: any) => {
    const arr = [...discounts];
    arr[i] = { ...arr[i], [field]: value };
    setDiscounts(arr);
  };

  // ── Helpers clauses ───────────────────────────────────────────────────────
  const addClause = () =>
    setClauses([
      ...clauses,
      { title: "", body: "", displayOrder: clauses.length + 1 },
    ]);
  const removeClause = (i: number) =>
    setClauses(clauses.filter((_, idx) => idx !== i));
  const updateClause = (i: number, field: string, value: any) => {
    const arr = [...clauses];
    arr[i] = { ...arr[i], [field]: value };
    setClauses(arr);
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

  const totalEstimated = lines.reduce(
    (sum, l) => sum + (l.quantity ?? 1) * (l.unitPrice ?? 0),
    0,
  );

  // ── Mutation ──────────────────────────────────────────────────────────────
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
        title: generalData.title || "Facture manuelle",
        description: generalData.description || undefined,
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

      return billingService.createManualInvoice(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      navigate("/billing");
    },
    onError: (e: any) => {
      setErrorMessage(
        e?.response?.data?.message ??
          "Erreur lors de la création de la facture.",
      );
    },
  });

  return (
    <AdminLayout>
      {/* Retour */}
      <button
        onClick={() => navigate("/billing")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle facture</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Facture manuelle pour un client enregistré ou externe
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
            Créer la facture
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
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* ── Onglet Client & Général ── */}
        {activeTab === "client" && (
          <>
            {/* Client */}
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
                      placeholder="+242 00 000 0000"
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {/* Informations générales */}
            <FormSection
              title="Informations générales"
              icon={<FileText size={16} className="text-purple-600" />}
              iconBg="bg-purple-100"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Titre de la facture">
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
                      placeholder="ex: Facture prestation coworking"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Description">
                    <textarea
                      value={generalData.description}
                      rows={2}
                      resize-none
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
                <Field label="Date d'échéance">
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
                  hint="N° de commande interne du client"
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
              </div>
            </FormSection>
          </>
        )}

        {/* ── Onglet Lignes ── */}
        {activeTab === "lines" && (
          <FormSection
            title="Lignes de facturation"
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
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Ligne principale */}
                    <div className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50">
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
                        <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400">
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
                        <span className="text-xs font-medium text-gray-700">
                          {subtotal.toLocaleString("fr-FR")} F
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Détails"
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

                    {/* Champs secondaires (accordéon) */}
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
                          hint="Réf. article côté client"
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
                            placeholder="Commentaire admin..."
                            className={inputCls}
                          />
                        </Field>
                        {line.optional && (
                          <div className="col-span-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg">
                              <Tag size={11} /> Ligne optionnelle — exclue du
                              total, affichée séparément sur le devis
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalEstimated > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="bg-gray-50 rounded-xl px-5 py-3 text-right">
                  <p className="text-xs text-gray-500">
                    Total estimé HT (hors options)
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {totalEstimated.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              </div>
            )}
          </FormSection>
        )}

        {/* ── Onglet Remises & Taxes ── */}
        {activeTab === "discounts" && (
          <>
            {/* Remises globales */}
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
                        placeholder="Texte affiché sur le document PDF..."
                        className={`${inputCls} resize-none`}
                      />
                    </Field>
                  </div>
                ))
              )}
            </FormSection>
          </>
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
                  placeholder="FAC-2026-0042"
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
                    placeholder='{"bank":"Eco Bank","rib":"001 200 123456789 01","iban":"CG29..."}'
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

        {/* Bouton bas de page */}
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
            Créer la facture
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── Sous-composants locaux ───────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white";

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
