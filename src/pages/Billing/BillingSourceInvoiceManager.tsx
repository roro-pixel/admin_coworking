import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2, Plus, Search, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem, BillingLineType } from "../../services/billing.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, ErrorBanner, Field, IconButton, ItemRow, ListHeader, Section, Tabs } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, FOCUS, ROW_HOVER, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";

type SourceTab = "billables" | "reservation";
type BookingUnit = "HOUR" | "HALF_DAY" | "DAY" | "WEEK" | "MONTH";

interface ExtraLineForm {
  lineType: BillingLineType;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
}

const defaultExtraLine = (): ExtraLineForm => ({
  lineType: "SERVICE",
  description: "",
  quantity: 1,
  unit: "",
  unitPrice: 0,
  taxable: true,
});

const SOURCE_TABS = [
  { id: "billables" as const, label: "Éléments facturables" },
  { id: "reservation" as const, label: "Réservation" },
];

const BOOKING_UNITS = new Set(["HOUR", "HALF_DAY", "DAY", "WEEK", "MONTH"]);

export const BillingSourceInvoiceManager: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SourceTab>("billables");
  const [error, setError] = useState<string | null>(null);
  const [createdDocumentNumber, setCreatedDocumentNumber] = useState<string | null>(null);

  const [billableForm, setBillableForm] = useState({
    title: "",
    description: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    billableNumbersText: "",
  });

  const [reservationForm, setReservationForm] = useState({
    mode: "BOOKING" as "BOOKING" | "EXTERNAL",
    bookingNumber: "",
    documentType: "INVOICE" as "INVOICE" | "PROFORMA_INVOICE",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    terms: "",
    paymentInstructions: "",
    internalNotes: "",
    customerType: "MEMBER",
    customerCode: "",
    resourceName: "",
    resourceDescription: "",
    checkInAt: "",
    checkOutAt: "",
    bookingUnit: "HOUR" as BookingUnit,
    quantity: 1,
    unitPrice: 0,
    externalReference: "",
    notes: "",
  });

  const [extraLines, setExtraLines] = useState<ExtraLineForm[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);

  // Recherche de ressource (mode externe) : recherche unifiée du catalogue filtrée sur la source RESOURCE
  const [resourceQuery, setResourceQuery] = useState("");
  const [showResourceResults, setShowResourceResults] = useState(false);
  const { data: resourceResults } = useQuery({
    queryKey: ["billing-resource-lookup", resourceQuery],
    queryFn: () => billingService.catalogLookup({ q: resourceQuery, source: "RESOURCE", size: 10 }),
    enabled: resourceQuery.trim().length > 1,
  });
  const resources: BillingCatalogLookupItem[] = resourceResults?.content ?? [];

  const selectResource = (item: BillingCatalogLookupItem) => {
    setReservationForm((f) => ({
      ...f,
      resourceName: item.name,
      resourceDescription: item.description || "",
      unitPrice: item.unitPrice,
      bookingUnit: BOOKING_UNITS.has(item.unit || "") ? (item.unit as BookingUnit) : f.bookingUnit,
    }));
    setResourceQuery(item.name);
    setShowResourceResults(false);
  };

  const handleCustomerTypeChange = (type: string) => {
    setReservationForm({ ...reservationForm, customerType: type, customerCode: "" });
    setSelectedCustomer(null);
    setSelectedMember(null);
  };

  const handleCustomerSelect = (customer: CustomerSummaryResponse | null) => {
    setSelectedCustomer(customer);
    setSelectedMember(null);
    setReservationForm((f) => ({ ...f, customerType: "CUSTOMER", customerCode: customer?.customerId || "" }));
  };

  const handleMemberSelect = (member: MemberSummaryResponse | null) => {
    setSelectedMember(member);
    setSelectedCustomer(null);
    setReservationForm((f) => ({ ...f, customerType: "MEMBER", customerCode: member?.memberId || "" }));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["billing-documents"] });

  const fromBillablesMutation = useMutation({
    mutationFn: () => {
      const billableNumbers = billableForm.billableNumbersText
        .split(/[\n,;]+/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (billableNumbers.length === 0) throw new Error("Ajoutez au moins un numéro d'élément facturable.");
      return billingService.createInvoiceFromBillableItems({
        title: billableForm.title || undefined,
        description: billableForm.description || undefined,
        issueDate: billableForm.issueDate,
        dueDate: billableForm.dueDate || undefined,
        billableNumbers,
      });
    },
    onSuccess: (doc) => {
      invalidate();
      setError(null);
      setCreatedDocumentNumber(doc.documentNumber);
      toast.success(`Facture ${doc.documentNumber} créée.`);
    },
    onError: (e: unknown) => setError(apiMessage(e, (e as Error)?.message || "Erreur lors de la création depuis éléments facturables.")),
  });

  const fromReservationMutation = useMutation({
    mutationFn: () => {
      if (reservationForm.mode === "BOOKING" && !reservationForm.bookingNumber.trim()) {
        throw new Error("Le numéro de réservation est obligatoire en mode réservation existante.");
      }
      if (reservationForm.mode === "EXTERNAL") {
        if (!reservationForm.customerCode.trim()) throw new Error("Le code client est obligatoire pour une réservation externe.");
        if (!reservationForm.resourceName.trim()) throw new Error("Le nom de la ressource est obligatoire.");
        if (!reservationForm.checkInAt || !reservationForm.checkOutAt) throw new Error("Les dates d'entrée et de sortie sont obligatoires.");
      }
      return billingService.createInvoiceFromReservation({
        mode: reservationForm.mode,
        bookingNumber: reservationForm.mode === "BOOKING" ? reservationForm.bookingNumber.trim() : undefined,
        documentType: reservationForm.documentType,
        issueDate: reservationForm.issueDate || undefined,
        dueDate: reservationForm.dueDate || undefined,
        terms: reservationForm.terms || undefined,
        paymentInstructions: reservationForm.paymentInstructions || undefined,
        internalNotes: reservationForm.internalNotes || undefined,
        customerType: reservationForm.mode === "EXTERNAL" ? reservationForm.customerType : undefined,
        customerCode: reservationForm.mode === "EXTERNAL" ? reservationForm.customerCode : undefined,
        externalBooking:
          reservationForm.mode === "EXTERNAL"
            ? {
                resourceName: reservationForm.resourceName,
                resourceDescription: reservationForm.resourceDescription || undefined,
                checkInAt: new Date(reservationForm.checkInAt).toISOString(),
                checkOutAt: new Date(reservationForm.checkOutAt).toISOString(),
                bookingUnit: reservationForm.bookingUnit,
                quantity: reservationForm.quantity,
                unitPrice: reservationForm.unitPrice,
                externalReference: reservationForm.externalReference || undefined,
                notes: reservationForm.notes || undefined,
              }
            : undefined,
        extraLines: extraLines
          .filter((line) => line.description.trim())
          .map((line, index) => ({
            lineOrder: index + 1,
            lineType: line.lineType,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit || undefined,
            unitPrice: line.unitPrice,
            taxable: line.taxable,
          })),
      });
    },
    onSuccess: (doc) => {
      invalidate();
      setError(null);
      setCreatedDocumentNumber(doc.documentNumber);
      toast.success(`Document ${doc.documentNumber} créé.`);
    },
    onError: (e: unknown) => setError(apiMessage(e, (e as Error)?.message || "Erreur lors de la création depuis réservation.")),
  });

  const updateExtraLine = <K extends keyof ExtraLineForm>(index: number, field: K, value: ExtraLineForm[K]) =>
    setExtraLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));

  const rf = reservationForm;
  const setRf = (patch: Partial<typeof reservationForm>) => setReservationForm({ ...reservationForm, ...patch });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader title="Création depuis sources métier" subtitle="Créez des factures depuis les éléments facturables ou depuis les réservations." />

      <Tabs variant="soft" items={SOURCE_TABS} active={activeTab} onChange={setActiveTab} />

      <ErrorBanner message={error} />
      {createdDocumentNumber && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>
            Document créé : <b className="font-mono">{createdDocumentNumber}</b>
          </span>
          <button type="button" onClick={() => navigate(`/billing/documents/${createdDocumentNumber}`)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold hover:bg-emerald-100 ${FOCUS}`}>
            Ouvrir <ArrowRight size={14} />
          </button>
        </div>
      )}

      {activeTab === "billables" && (
        <Section title="Éléments facturables" description="Regroupe des éléments en attente dans une seule facture." icon={FilePlus2}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Titre">
                <input className={FIELD} value={billableForm.title} onChange={(e) => setBillableForm({ ...billableForm, title: e.target.value })} />
              </Field>
              <Field label="Date d'émission" required>
                <input type="date" className={FIELD} value={billableForm.issueDate} onChange={(e) => setBillableForm({ ...billableForm, issueDate: e.target.value })} />
              </Field>
              <Field label="Date d'échéance">
                <input type="date" className={FIELD} value={billableForm.dueDate} onChange={(e) => setBillableForm({ ...billableForm, dueDate: e.target.value })} />
              </Field>
              <Field label="Description">
                <input className={FIELD} value={billableForm.description} onChange={(e) => setBillableForm({ ...billableForm, description: e.target.value })} />
              </Field>
            </div>
            <Field label="Numéros d'éléments facturables" required hint="Séparés par une virgule, un point-virgule ou un retour à la ligne.">
              <textarea
                className={FIELD}
                rows={5}
                placeholder="BILL-001, BILL-002"
                value={billableForm.billableNumbersText}
                onChange={(e) => setBillableForm({ ...billableForm, billableNumbersText: e.target.value })}
              />
            </Field>
            <div className="flex justify-end">
              <ActionButton icon={FilePlus2} pending={fromBillablesMutation.isPending} onClick={() => fromBillablesMutation.mutate()}>
                Créer la facture
              </ActionButton>
            </div>
          </div>
        </Section>
      )}

      {activeTab === "reservation" && (
        <>
          <Section title="Réservation" description="Facturez une réservation existante ou saisissez une réservation externe." icon={FilePlus2}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Mode">
                  <select className={FIELD} value={rf.mode} onChange={(e) => setRf({ mode: e.target.value as "BOOKING" | "EXTERNAL" })}>
                    <option value="BOOKING">Réservation existante</option>
                    <option value="EXTERNAL">Réservation externe</option>
                  </select>
                </Field>
                <Field label="Type de document">
                  <select className={FIELD} value={rf.documentType} onChange={(e) => setRf({ documentType: e.target.value as "INVOICE" | "PROFORMA_INVOICE" })}>
                    <option value="INVOICE">Facture</option>
                    <option value="PROFORMA_INVOICE">Proforma</option>
                  </select>
                </Field>
                <Field label="Date d'émission">
                  <input type="date" className={FIELD} value={rf.issueDate} onChange={(e) => setRf({ issueDate: e.target.value })} />
                </Field>
              </div>

              {rf.mode === "BOOKING" ? (
                <Field label="Numéro de réservation" required>
                  <input className={FIELD} value={rf.bookingNumber} onChange={(e) => setRf({ bookingNumber: e.target.value })} />
                </Field>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Type de client">
                    <select className={FIELD} value={rf.customerType} onChange={(e) => handleCustomerTypeChange(e.target.value)}>
                      <option value="MEMBER">Membre</option>
                      <option value="CUSTOMER">Client</option>
                      <option value="BUSINESS_ENTITY">Entreprise</option>
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Client<span className="text-[color:var(--logo-pink-dark)]"> *</span>
                    </span>
                    {rf.customerType === "MEMBER" ? (
                      <MemberAutocomplete selectedMember={selectedMember} onSelect={handleMemberSelect} placeholder="Rechercher un membre" />
                    ) : (
                      <CustomerAutocomplete
                        selectedCustomer={selectedCustomer}
                        typeFilter={rf.customerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
                        onSelect={handleCustomerSelect}
                        placeholder={rf.customerType === "BUSINESS_ENTITY" ? "Rechercher une entreprise" : "Rechercher un client"}
                      />
                    )}
                  </div>

                  <div className="relative md:col-span-3">
                    <Field label="Ressource" required hint="Choisir une ressource préremplit le prix et l'unité ci-dessous, modifiables ensuite.">
                      <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className={`${FIELD} pl-10`}
                          placeholder="Salle, bureau"
                          value={resourceQuery || rf.resourceName}
                          onChange={(e) => {
                            setResourceQuery(e.target.value);
                            setRf({ resourceName: e.target.value });
                            setShowResourceResults(true);
                          }}
                          onFocus={() => setShowResourceResults(true)}
                        />
                      </div>
                    </Field>
                    {showResourceResults && resources.length > 0 && (
                      <div className="absolute left-0 right-0 z-10 -mt-6 max-h-60 overflow-y-auto rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
                        {resources.map((item) => (
                          <button key={item.sourceCode} type="button" onClick={() => selectResource(item)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${ROW_HOVER} ${FOCUS}`}>
                            <span className="truncate text-sm font-semibold text-gray-900">{item.name}</span>
                            <span className="shrink-0 text-sm tabular-nums text-gray-600">
                              {formatMoney(item.unitPrice, currencyLabel(item.currency))}
                              {item.unit ? ` / ${item.unit}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Field label="Début" required>
                    <input type="datetime-local" className={FIELD} value={rf.checkInAt} onChange={(e) => setRf({ checkInAt: e.target.value })} />
                  </Field>
                  <Field label="Fin" required>
                    <input type="datetime-local" className={FIELD} value={rf.checkOutAt} onChange={(e) => setRf({ checkOutAt: e.target.value })} />
                  </Field>
                  <Field label="Unité">
                    <select className={FIELD} value={rf.bookingUnit} onChange={(e) => setRf({ bookingUnit: e.target.value as BookingUnit })}>
                      <option value="HOUR">Heure</option>
                      <option value="HALF_DAY">Demi-journée</option>
                      <option value="DAY">Jour</option>
                      <option value="WEEK">Semaine</option>
                      <option value="MONTH">Mois</option>
                    </select>
                  </Field>
                  <Field label="Quantité">
                    <input type="number" min={1} className={FIELD} value={rf.quantity} onChange={(e) => setRf({ quantity: Number(e.target.value) || 1 })} />
                  </Field>
                  <Field label="Prix unitaire">
                    <input type="number" min={0} className={FIELD} value={rf.unitPrice} onChange={(e) => setRf({ unitPrice: Number(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Référence externe">
                    <input className={FIELD} value={rf.externalReference} onChange={(e) => setRf({ externalReference: e.target.value })} />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <Section
            title="Lignes complémentaires"
            icon={Plus}
            action={
              <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setExtraLines((prev) => [...prev, defaultExtraLine()])}>
                Ajouter
              </ActionButton>
            }
          >
            {extraLines.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">Aucune ligne complémentaire.</p>
            ) : (
              <div className="space-y-3">
                {extraLines.map((line, index) => (
                  <ItemRow key={index}>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                      <Field label="Type" className="md:col-span-2">
                        <select className={FIELD_SOFT} value={line.lineType} onChange={(e) => updateExtraLine(index, "lineType", e.target.value as BillingLineType)}>
                          <option value="SERVICE">Service</option>
                          <option value="PRODUCT">Produit</option>
                          <option value="FEE">Frais</option>
                          <option value="OTHER">Autre</option>
                        </select>
                      </Field>
                      <Field label="Description" className="col-span-2 md:col-span-5">
                        <input className={FIELD_SOFT} value={line.description} onChange={(e) => updateExtraLine(index, "description", e.target.value)} />
                      </Field>
                      <Field label="Quantité" className="md:col-span-2">
                        <input type="number" min={1} className={FIELD_SOFT} value={line.quantity} onChange={(e) => updateExtraLine(index, "quantity", Number(e.target.value) || 1)} />
                      </Field>
                      <Field label="Prix unitaire" className="md:col-span-2">
                        <input type="number" min={0} className={FIELD_SOFT} value={line.unitPrice} onChange={(e) => updateExtraLine(index, "unitPrice", Number(e.target.value) || 0)} />
                      </Field>
                      <div className="flex items-end justify-end md:col-span-1">
                        <IconButton icon={Trash2} tone="danger" label="Retirer la ligne" onClick={() => setExtraLines((prev) => prev.filter((_, i) => i !== index))} />
                      </div>
                    </div>
                  </ItemRow>
                ))}
              </div>
            )}
          </Section>

          <div className="flex justify-end">
            <ActionButton icon={FilePlus2} pending={fromReservationMutation.isPending} onClick={() => fromReservationMutation.mutate()}>
              Créer depuis la réservation
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
};
