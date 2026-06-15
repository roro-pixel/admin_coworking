import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type {
  BillingDocument,
  BillingSchedule,
} from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_SIZE = 20;

const statusLabels: Record<string, string> = {
  PENDING: "À payer",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const formatAmount = (amount: number, currency = "XAF") =>
  `${(amount ?? 0).toLocaleString("fr-FR")} ${currency}`;

export const BillingScheduleManager: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedInvoice, setSelectedInvoice] =
    useState<BillingDocument | null>(null);
  const [scheduleForm, setScheduleForm] = useState<
    Array<{ dueDate: string; amount: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<string | null>(
    null,
  );
  const [payForm, setPayForm] = useState({
    method: "CASH" as "CASH" | "WALLET",
    cashSessionNumber: "",
    walletNumber: "",
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-schedule-invoices", page, search],
    queryFn: () =>
      billingService.getDocuments({
        type: "INVOICE",
        searchText: search || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const invoices = invoicesData?.content ?? [];
  const totalPages = invoicesData?.totalPages ?? 1;

  const {
    data: schedule,
    isLoading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ["billing-schedule-manager", selectedInvoice?.documentNumber],
    queryFn: () =>
      billingService.getInvoiceSchedule(selectedInvoice!.documentNumber),
    enabled: !!selectedInvoice,
  });

  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content ?? [];

  const selectedCurrency = selectedInvoice?.currency ?? "XAF";
  const currentSchedule = schedule as BillingSchedule | null | undefined;
  const paidOrScheduled = useMemo(() => {
    const scheduled =
      currentSchedule?.installments?.reduce((s, i) => s + (i.amount ?? 0), 0) ??
      0;
    return scheduled;
  }, [currentSchedule]);

  const remainingToSchedule = Math.max(
    (selectedInvoice?.balanceDue ?? 0) - paidOrScheduled,
    0,
  );

  const createScheduleMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceSchedule(selectedInvoice!.documentNumber, {
        installments: scheduleForm.filter((i) => i.dueDate && i.amount > 0),
      }),
    onSuccess: () => {
      setError(null);
      setScheduleForm([]);
      refetchSchedule();
      queryClient.invalidateQueries({
        queryKey: ["billing-document", selectedInvoice?.documentNumber],
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ??
          "Erreur lors de la création de l’échéancier.",
      ),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleNumber: string) =>
      billingService.deleteInvoiceSchedule(scheduleNumber),
    onSuccess: () => {
      refetchSchedule();
      queryClient.invalidateQueries({
        queryKey: ["billing-document", selectedInvoice?.documentNumber],
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ??
          "Erreur lors de la suppression de l’échéancier.",
      ),
  });

  const payInstallmentMutation = useMutation({
    mutationFn: (installmentNumber: string) =>
      billingService.payInstallment(installmentNumber, {
        paymentMethod: payForm.method,
        cashSessionNumber:
          payForm.method === "CASH"
            ? payForm.cashSessionNumber || undefined
            : undefined,
        walletNumber:
          payForm.method === "WALLET" ? payForm.walletNumber : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `schedule-${installmentNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      setPayingInstallment(null);
      setPayForm({ method: "CASH", cashSessionNumber: "", walletNumber: "" });
      refetchSchedule();
      queryClient.invalidateQueries({
        queryKey: ["billing-schedule-invoices"],
      });
      queryClient.invalidateQueries({
        queryKey: ["billing-document", selectedInvoice?.documentNumber],
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ?? "Erreur lors du paiement de l’échéance.",
      ),
  });

  const addInstallment = () => {
    setScheduleForm((current) => [
      ...current,
      {
        dueDate: "",
        amount: remainingToSchedule > 0 ? remainingToSchedule : 0,
      },
    ]);
  };

  const updateInstallment = (
    index: number,
    field: "dueDate" | "amount",
    value: string | number,
  ) => {
    setScheduleForm((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeInstallment = (index: number) =>
    setScheduleForm((current) => current.filter((_, i) => i !== index));

  const validateAndCreateSchedule = () => {
    const valid = scheduleForm.filter((i) => i.dueDate && i.amount > 0);
    if (!selectedInvoice) return;
    if (valid.length === 0) {
      setError("Ajoutez au moins une échéance valide.");
      return;
    }
    createScheduleMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-1 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Échéanciers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez une facture pour consulter ou créer son échéancier.
          </p>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            placeholder="Rechercher une facture..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden border border-gray-100">
          {invoicesLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-primary-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Aucune facture trouvée.
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <button
                  key={invoice.documentNumber}
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setScheduleForm([]);
                    setError(null);
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${selectedInvoice?.documentNumber === invoice.documentNumber ? "bg-primary-50" : ""}`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {invoice.documentNumber}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {invoice.customerName ||
                          invoice.customerCode ||
                          "Client non renseigné"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatAmount(invoice.balanceDue, invoice.currency)}
                      </p>
                      <p className="text-xs text-gray-400">Solde</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Préc.
          </button>
          <span className="text-gray-500">
            Page {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
          >
            Suiv. <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="xl:col-span-2">
        {!selectedInvoice ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <CalendarClock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Sélectionnez une facture pour gérer son échéancier.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500">Facture</p>
                  <p className="font-mono font-semibold">
                    {selectedInvoice.documentNumber}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedInvoice.customerName ||
                      selectedInvoice.customerCode ||
                      "Client non renseigné"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Solde dû</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatAmount(
                      selectedInvoice.balanceDue,
                      selectedInvoice.currency,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Échéancier existant
                  </h3>
                  <p className="text-sm text-gray-500">
                    Paiement des tranches et suppression de l’échéancier.
                  </p>
                </div>
                {currentSchedule?.scheduleNumber && (
                  <button
                    onClick={() => {
                      if (confirm("Supprimer cet échéancier ?"))
                        deleteScheduleMutation.mutate(
                          currentSchedule.scheduleNumber,
                        );
                    }}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={15} /> Supprimer
                  </button>
                )}
              </div>

              {scheduleLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-primary-600" />
                </div>
              ) : !currentSchedule ? (
                <p className="text-sm text-gray-500">
                  Aucun échéancier créé pour cette facture.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-2 text-left">Échéance</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-right">Montant</th>
                        <th className="px-4 py-2 text-center">Statut</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentSchedule.installments.map((inst) => (
                        <tr key={inst.installmentNumber}>
                          <td className="px-4 py-3 font-mono">
                            {inst.installmentNumber}
                          </td>
                          <td className="px-4 py-3">
                            {new Date(inst.dueDate).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatAmount(inst.amount, selectedCurrency)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${statusColors[inst.status] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {statusLabels[inst.status] ?? inst.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inst.status !== "PAID" &&
                              (payingInstallment === inst.installmentNumber ? (
                                <div className="inline-flex items-center gap-2">
                                  <select
                                    value={payForm.method}
                                    onChange={(e) =>
                                      setPayForm({
                                        ...payForm,
                                        method: e.target.value as
                                          | "CASH"
                                          | "WALLET",
                                      })
                                    }
                                    className="px-2 py-1 border rounded text-xs"
                                  >
                                    <option value="CASH">Cash</option>
                                    <option value="WALLET">Wallet</option>
                                  </select>
                                  {payForm.method === "CASH" ? (
                                    <select
                                      value={payForm.cashSessionNumber}
                                      onChange={(e) =>
                                        setPayForm({
                                          ...payForm,
                                          cashSessionNumber: e.target.value,
                                        })
                                      }
                                      className="px-2 py-1 border rounded text-xs"
                                    >
                                      <option value="">Session</option>
                                      {openSessions.map((s) => (
                                        <option
                                          key={s.sessionNumber}
                                          value={s.sessionNumber}
                                        >
                                          {s.sessionNumber}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={payForm.walletNumber}
                                      onChange={(e) =>
                                        setPayForm({
                                          ...payForm,
                                          walletNumber: e.target.value,
                                        })
                                      }
                                      placeholder="Wallet"
                                      className="px-2 py-1 border rounded text-xs w-28"
                                    />
                                  )}
                                  <button
                                    onClick={() =>
                                      payInstallmentMutation.mutate(
                                        inst.installmentNumber,
                                      )
                                    }
                                    className="px-2 py-1 bg-primary-600 text-white rounded text-xs"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setPayingInstallment(inst.installmentNumber)
                                  }
                                  className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 inline-flex items-center gap-1"
                                >
                                  <CreditCard size={13} /> Payer
                                </button>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!currentSchedule && (
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Créer un échéancier
                    </h3>
                    <p className="text-sm text-gray-500">
                      Découpez le solde dû en plusieurs échéances.
                    </p>
                  </div>
                  <button
                    onClick={addInstallment}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Ajouter une tranche
                  </button>
                </div>

                <div className="space-y-3">
                  {scheduleForm.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-center"
                    >
                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) =>
                          updateInstallment(index, "dueDate", e.target.value)
                        }
                        className="col-span-5 px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          updateInstallment(
                            index,
                            "amount",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="col-span-5 px-3 py-2 border rounded-lg text-sm"
                        placeholder="Montant"
                      />
                      <button
                        onClick={() => removeInstallment(index)}
                        className="col-span-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-5 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Reste non planifié :{" "}
                    {formatAmount(remainingToSchedule, selectedCurrency)}
                  </p>
                  <button
                    onClick={validateAndCreateSchedule}
                    disabled={
                      createScheduleMutation.isPending ||
                      scheduleForm.length === 0
                    }
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {createScheduleMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CalendarClock size={16} />
                    )}
                    Créer l’échéancier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
