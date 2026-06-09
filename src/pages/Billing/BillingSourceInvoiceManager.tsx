import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingLineType } from "../../services/billing.service";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

type SourceTab = "billables" | "reservation";

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

export const BillingSourceInvoiceManager: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SourceTab>("billables");
  const [error, setError] = useState<string | null>(null);
  const [createdDocumentNumber, setCreatedDocumentNumber] = useState<
    string | null
  >(null);

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
    bookingUnit: "HOUR" as "HOUR" | "HALF_DAY" | "DAY" | "WEEK" | "MONTH",
    quantity: 1,
    unitPrice: 0,
    externalReference: "",
    notes: "",
  });

  const [extraLines, setExtraLines] = useState<ExtraLineForm[]>([]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });

  const fromBillablesMutation = useMutation({
    mutationFn: () => {
      const billableNumbers = billableForm.billableNumbersText
        .split(/[\n,;]+/)
        .map((v) => v.trim())
        .filter(Boolean);

      if (billableNumbers.length === 0) {
        throw new Error("Ajoute au moins un numéro d’élément facturable.");
      }

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
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la création depuis éléments facturables.",
      ),
  });

  const fromReservationMutation = useMutation({
    mutationFn: () => {
      if (
        reservationForm.mode === "BOOKING" &&
        !reservationForm.bookingNumber.trim()
      ) {
        throw new Error(
          "Le numéro de réservation est obligatoire en mode réservation existante.",
        );
      }

      if (reservationForm.mode === "EXTERNAL") {
        if (!reservationForm.customerCode.trim())
          throw new Error(
            "Le code client est obligatoire pour une réservation externe.",
          );
        if (!reservationForm.resourceName.trim())
          throw new Error("Le nom de la ressource est obligatoire.");
        if (!reservationForm.checkInAt || !reservationForm.checkOutAt)
          throw new Error("Les dates d’entrée et de sortie sont obligatoires.");
      }

      return billingService.createInvoiceFromReservation({
        mode: reservationForm.mode,
        bookingNumber:
          reservationForm.mode === "BOOKING"
            ? reservationForm.bookingNumber.trim()
            : undefined,
        documentType: reservationForm.documentType,
        issueDate: reservationForm.issueDate || undefined,
        dueDate: reservationForm.dueDate || undefined,
        terms: reservationForm.terms || undefined,
        paymentInstructions: reservationForm.paymentInstructions || undefined,
        internalNotes: reservationForm.internalNotes || undefined,
        customerType:
          reservationForm.mode === "EXTERNAL"
            ? reservationForm.customerType
            : undefined,
        customerCode:
          reservationForm.mode === "EXTERNAL"
            ? reservationForm.customerCode
            : undefined,
        externalBooking:
          reservationForm.mode === "EXTERNAL"
            ? {
                resourceName: reservationForm.resourceName,
                resourceDescription:
                  reservationForm.resourceDescription || undefined,
                checkInAt: new Date(reservationForm.checkInAt).toISOString(),
                checkOutAt: new Date(reservationForm.checkOutAt).toISOString(),
                bookingUnit: reservationForm.bookingUnit,
                quantity: reservationForm.quantity,
                unitPrice: reservationForm.unitPrice,
                externalReference:
                  reservationForm.externalReference || undefined,
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
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la création depuis réservation.",
      ),
  });

  const addExtraLine = () =>
    setExtraLines((prev) => [...prev, defaultExtraLine()]);
  const updateExtraLine = (
    index: number,
    field: keyof ExtraLineForm,
    value: any,
  ) => {
    setExtraLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Création depuis sources métier
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Crée des factures depuis les éléments facturables ou depuis les
          réservations.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("billables")}
          className={`px-4 py-2 text-sm rounded-t-lg ${activeTab === "billables" ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}
        >
          Éléments facturables
        </button>
        <button
          onClick={() => setActiveTab("reservation")}
          className={`px-4 py-2 text-sm rounded-t-lg ${activeTab === "reservation" ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}
        >
          Réservation
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {createdDocumentNumber && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center gap-3">
          <span>
            Document créé : <strong>{createdDocumentNumber}</strong>
          </span>
          <button
            onClick={() =>
              navigate(`/billing/documents/${createdDocumentNumber}`)
            }
            className="inline-flex items-center gap-1 text-green-800 font-medium hover:underline"
          >
            Ouvrir <ArrowRight size={14} />
          </button>
        </div>
      )}

      {activeTab === "billables" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre</label>
              <input
                className={inputCls}
                value={billableForm.title}
                onChange={(e) =>
                  setBillableForm({ ...billableForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Date d’émission *
              </label>
              <input
                type="date"
                className={inputCls}
                value={billableForm.issueDate}
                onChange={(e) =>
                  setBillableForm({
                    ...billableForm,
                    issueDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Date d’échéance
              </label>
              <input
                type="date"
                className={inputCls}
                value={billableForm.dueDate}
                onChange={(e) =>
                  setBillableForm({ ...billableForm, dueDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <input
                className={inputCls}
                value={billableForm.description}
                onChange={(e) =>
                  setBillableForm({
                    ...billableForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Numéros d’éléments facturables *
            </label>
            <textarea
              className={inputCls}
              rows={5}
              placeholder="BILL-001, BILL-002 ou un numéro par ligne"
              value={billableForm.billableNumbersText}
              onChange={(e) =>
                setBillableForm({
                  ...billableForm,
                  billableNumbersText: e.target.value,
                })
              }
            />
          </div>
          <button
            onClick={() => fromBillablesMutation.mutate()}
            disabled={fromBillablesMutation.isPending}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {fromBillablesMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FilePlus2 size={16} />
            )}
            Créer la facture
          </button>
        </div>
      )}

      {activeTab === "reservation" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mode</label>
              <select
                className={inputCls}
                value={reservationForm.mode}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    mode: e.target.value as "BOOKING" | "EXTERNAL",
                  })
                }
              >
                <option value="BOOKING">Réservation existante</option>
                <option value="EXTERNAL">Réservation externe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Type document
              </label>
              <select
                className={inputCls}
                value={reservationForm.documentType}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    documentType: e.target.value as
                      | "INVOICE"
                      | "PROFORMA_INVOICE",
                  })
                }
              >
                <option value="INVOICE">Facture</option>
                <option value="PROFORMA_INVOICE">Proforma</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Date d’émission
              </label>
              <input
                type="date"
                className={inputCls}
                value={reservationForm.issueDate}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    issueDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {reservationForm.mode === "BOOKING" ? (
            <div>
              <label className="block text-sm font-medium mb-1">
                Numéro de réservation *
              </label>
              <input
                className={inputCls}
                value={reservationForm.bookingNumber}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    bookingNumber: e.target.value,
                  })
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Type client
                </label>
                <select
                  className={inputCls}
                  value={reservationForm.customerType}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      customerType: e.target.value,
                    })
                  }
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Client</option>
                  <option value="BUSINESS_ENTITY">Entité</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Code client *
                </label>
                <input
                  className={inputCls}
                  value={reservationForm.customerCode}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      customerCode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ressource *
                </label>
                <input
                  className={inputCls}
                  value={reservationForm.resourceName}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      resourceName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Début *
                </label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={reservationForm.checkInAt}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      checkInAt: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fin *</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={reservationForm.checkOutAt}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      checkOutAt: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unité</label>
                <select
                  className={inputCls}
                  value={reservationForm.bookingUnit}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      bookingUnit: e.target.value as any,
                    })
                  }
                >
                  <option value="HOUR">Heure</option>
                  <option value="HALF_DAY">Demi-journée</option>
                  <option value="DAY">Jour</option>
                  <option value="WEEK">Semaine</option>
                  <option value="MONTH">Mois</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantité
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={reservationForm.quantity}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Prix unitaire
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={reservationForm.unitPrice}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      unitPrice: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Référence externe
                </label>
                <input
                  className={inputCls}
                  value={reservationForm.externalReference}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      externalReference: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="border-t pt-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                Lignes complémentaires
              </h3>
              <button
                onClick={addExtraLine}
                className="px-3 py-2 border rounded-lg text-sm inline-flex items-center gap-1 hover:bg-gray-50"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
            {extraLines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded-lg"
              >
                <select
                  className={inputCls}
                  value={line.lineType}
                  onChange={(e) =>
                    updateExtraLine(index, "lineType", e.target.value)
                  }
                >
                  <option value="SERVICE">Service</option>
                  <option value="PRODUCT">Produit</option>
                  <option value="FEE">Frais</option>
                  <option value="OTHER">Autre</option>
                </select>
                <input
                  className={`${inputCls} md:col-span-2`}
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    updateExtraLine(index, "description", e.target.value)
                  }
                />
                <input
                  type="number"
                  className={inputCls}
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateExtraLine(
                      index,
                      "quantity",
                      Number(e.target.value) || 1,
                    )
                  }
                />
                <input
                  type="number"
                  className={inputCls}
                  min={0}
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateExtraLine(
                      index,
                      "unitPrice",
                      Number(e.target.value) || 0,
                    )
                  }
                />
                <button
                  onClick={() =>
                    setExtraLines((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => fromReservationMutation.mutate()}
            disabled={fromReservationMutation.isPending}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {fromReservationMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FilePlus2 size={16} />
            )}
            Créer depuis réservation
          </button>
        </div>
      )}
    </div>
  );
};
