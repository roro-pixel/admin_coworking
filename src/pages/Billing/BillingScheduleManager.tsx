import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CreditCard, Plus, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument, BillingSchedule } from "../../services/billing.service";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBanner, Field, IconButton, ItemRow, ListHeader, Pagination, SearchField, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, FOCUS, ROW_HOVER, apiMessage, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import type { Tone } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { RatioBar } from "../../components/operations/OpsCharts";

const PAGE_SIZE = 20;

const INST_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "À payer", tone: "warn" },
  PAID: { label: "Payée", tone: "success" },
  OVERDUE: { label: "En retard", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const BillingScheduleManager: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingDocument | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Array<{ dueDate: string; amount: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ method: "CASH" as "CASH" | "WALLET", cashSessionNumber: "", walletNumber: "" });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-schedule-invoices", page, search],
    queryFn: () => billingService.getDocuments({ type: "INVOICE", searchText: search || undefined, page, size: PAGE_SIZE, sort: "createdAt,desc" }),
  });
  const invoices = invoicesData?.content ?? [];
  const totalPages = invoicesData?.totalPages ?? 1;

  const { data: schedule, isLoading: scheduleLoading, refetch: refetchSchedule } = useQuery({
    queryKey: ["billing-schedule-manager", selectedInvoice?.documentNumber],
    queryFn: () => billingService.getInvoiceSchedule(selectedInvoice!.documentNumber),
    enabled: !!selectedInvoice,
  });

  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content ?? [];

  const cur = currencyLabel(selectedInvoice?.currency);
  const currentSchedule = schedule as BillingSchedule | null | undefined;
  const scheduledTotal = useMemo(() => currentSchedule?.installments?.reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0, [currentSchedule]);
  const paidTotal = useMemo(() => currentSchedule?.installments?.filter((i) => i.status === "PAID").reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0, [currentSchedule]);
  const remainingToSchedule = Math.max((selectedInvoice?.balanceDue ?? 0) - scheduledTotal, 0);

  const refreshDoc = () => queryClient.invalidateQueries({ queryKey: ["billing-document", selectedInvoice?.documentNumber] });

  const createScheduleMutation = useMutation({
    mutationFn: () => billingService.createInvoiceSchedule(selectedInvoice!.documentNumber, { installments: scheduleForm.filter((i) => i.dueDate && i.amount > 0) }),
    onSuccess: () => {
      setError(null);
      setScheduleForm([]);
      refetchSchedule();
      refreshDoc();
      toast.success("Échéancier créé.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création de l'échéancier.")),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleNumber: string) => billingService.deleteInvoiceSchedule(scheduleNumber),
    onSuccess: () => {
      refetchSchedule();
      refreshDoc();
    },
  });

  const askDeleteSchedule = (scheduleNumber: string) =>
    toast.confirm({
      message: "Supprimer cet échéancier ?",
      detail: `L'échéancier ${scheduleNumber} et ses tranches seront supprimés. La facture n'est pas modifiée.`,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Échéancier supprimé.",
      errorMessage: "Erreur lors de la suppression de l'échéancier.",
      onConfirm: () => deleteScheduleMutation.mutateAsync(scheduleNumber),
    });

  const payInstallmentMutation = useMutation({
    mutationFn: (installmentNumber: string) =>
      billingService.payInstallment(installmentNumber, {
        paymentMethod: payForm.method,
        cashSessionNumber: payForm.method === "CASH" ? payForm.cashSessionNumber || undefined : undefined,
        walletNumber: payForm.method === "WALLET" ? payForm.walletNumber : undefined,
        processedBy: admin?.email || "admin",
        idempotencyKey: `schedule-${installmentNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      setPayingInstallment(null);
      setPayForm({ method: "CASH", cashSessionNumber: "", walletNumber: "" });
      refetchSchedule();
      queryClient.invalidateQueries({ queryKey: ["billing-schedule-invoices"] });
      refreshDoc();
      toast.success("Échéance payée.");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors du paiement de l'échéance.")),
  });

  const addInstallment = () => setScheduleForm((c) => [...c, { dueDate: "", amount: remainingToSchedule > 0 ? remainingToSchedule : 0 }]);
  const updateInstallment = (index: number, field: "dueDate" | "amount", value: string | number) =>
    setScheduleForm((c) => c.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const validateAndCreateSchedule = () => {
    if (!selectedInvoice) return;
    if (scheduleForm.filter((i) => i.dueDate && i.amount > 0).length === 0) {
      setError("Ajoutez au moins une échéance valide.");
      return;
    }
    createScheduleMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <ListHeader title="Échéanciers" subtitle="Choisissez une facture pour consulter ou créer son échéancier." />
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Rechercher une facture"
        />
        {invoicesLoading ? (
          <ListSkeleton rows={6} />
        ) : invoices.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Aucune facture trouvée" />
        ) : (
          <>
            <DataCard>
              {invoices.map((invoice) => {
                const on = selectedInvoice?.documentNumber === invoice.documentNumber;
                return (
                  <button
                    key={invoice.documentNumber}
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setScheduleForm([]);
                      setPayingInstallment(null);
                      setError(null);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition ${FOCUS} ${on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]" : ROW_HOVER}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{invoice.documentNumber}</p>
                      <p className="truncate text-sm text-gray-600">{invoice.customerName || invoice.customerCode || "Client non renseigné"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(invoice.balanceDue, currencyLabel(invoice.currency))}</p>
                      <p className="text-xs text-gray-400">Solde</p>
                    </div>
                  </button>
                );
              })}
            </DataCard>
            <Pagination page={page} totalPages={totalPages} total={invoicesData?.totalElements ?? invoices.length} noun="facture" onChange={setPage} />
          </>
        )}
      </div>

      <div className="min-w-0 space-y-5 xl:pt-1">
        {!selectedInvoice ? (
          <EmptyState icon={CalendarClock} title="Aucune facture sélectionnée" hint="Sélectionnez une facture pour gérer son échéancier." />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400">Facture</p>
                <p className="font-mono text-base font-bold text-gray-950">{selectedInvoice.documentNumber}</p>
                <p className="text-sm text-gray-500">{selectedInvoice.customerName || selectedInvoice.customerCode || "Client non renseigné"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-400">Solde dû</p>
                <p className="text-2xl font-bold tracking-tight text-[color:var(--logo-pink-dark)]">{formatMoney(selectedInvoice.balanceDue, cur)}</p>
              </div>
            </div>

            <ErrorBanner message={error} />

            <Section
              title="Échéancier existant"
              description="Paiement des tranches et suppression de l'échéancier."
              icon={CalendarClock}
              action={
                currentSchedule?.scheduleNumber ? (
                  <ActionButton variant="ghost" icon={Trash2} className="!px-4 !py-2" onClick={() => askDeleteSchedule(currentSchedule.scheduleNumber)}>
                    Supprimer
                  </ActionButton>
                ) : undefined
              }
            >
              {scheduleLoading ? (
                <ListSkeleton rows={3} />
              ) : !currentSchedule ? (
                <p className="py-3 text-center text-sm text-gray-400">Aucun échéancier créé pour cette facture.</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-gray-800">Tranches réglées</span>
                      <span className="tabular-nums text-gray-500">
                        <b className="text-gray-950">{formatMoney(paidTotal, cur)}</b> sur {formatMoney(scheduledTotal, cur)}
                      </span>
                    </div>
                    <RatioBar value={paidTotal} total={scheduledTotal} />
                  </div>
                  {currentSchedule.installments.map((inst) => {
                    const st = INST_STATUS[inst.status] ?? { label: inst.status, tone: "neutral" as Tone };
                    const paying = payingInstallment === inst.installmentNumber;
                    return (
                      <ItemRow key={inst.installmentNumber}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{inst.installmentNumber}</p>
                            <p className="text-sm text-gray-500">{formatDate(inst.dueDate)}</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(inst.amount, cur)}</p>
                          <StatusChip tone={st.tone}>{st.label}</StatusChip>
                          {inst.status !== "PAID" && !paying && (
                            <ActionButton icon={CreditCard} className="!px-4 !py-2" onClick={() => setPayingInstallment(inst.installmentNumber)}>
                              Payer
                            </ActionButton>
                          )}
                        </div>
                        {paying && (
                          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[9rem_1fr_auto]">
                            <Field label="Moyen">
                              <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value as "CASH" | "WALLET" })} className={FIELD}>
                                <option value="CASH">Espèces</option>
                                <option value="WALLET">Portefeuille</option>
                              </select>
                            </Field>
                            {payForm.method === "CASH" ? (
                              <Field label="Session de caisse">
                                <select value={payForm.cashSessionNumber} onChange={(e) => setPayForm({ ...payForm, cashSessionNumber: e.target.value })} className={FIELD}>
                                  <option value="">Choisir</option>
                                  {openSessions.map((s) => (
                                    <option key={s.sessionNumber} value={s.sessionNumber}>
                                      {s.sessionNumber}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            ) : (
                              <Field label="N° de portefeuille">
                                <input value={payForm.walletNumber} onChange={(e) => setPayForm({ ...payForm, walletNumber: e.target.value })} className={FIELD} />
                              </Field>
                            )}
                            <div className="flex items-end gap-2">
                              <ActionButton variant="ghost" onClick={() => setPayingInstallment(null)} disabled={payInstallmentMutation.isPending}>
                                Annuler
                              </ActionButton>
                              <ActionButton pending={payInstallmentMutation.isPending} onClick={() => payInstallmentMutation.mutate(inst.installmentNumber)}>
                                Valider
                              </ActionButton>
                            </div>
                          </div>
                        )}
                      </ItemRow>
                    );
                  })}
                </div>
              )}
            </Section>

            {!scheduleLoading && !currentSchedule && (
              <Section
                title="Créer un échéancier"
                description="Découpez le solde dû en plusieurs échéances."
                icon={Plus}
                action={
                  <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={addInstallment}>
                    Ajouter une tranche
                  </ActionButton>
                }
              >
                {scheduleForm.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-400">Aucune tranche. Utilisez « Ajouter une tranche ».</p>
                ) : (
                  <div className="space-y-3">
                    {scheduleForm.map((item, index) => (
                      <ItemRow key={index}>
                        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                          <Field label="Date d'échéance">
                            <input type="date" value={item.dueDate} onChange={(e) => updateInstallment(index, "dueDate", e.target.value)} className={FIELD_SOFT} />
                          </Field>
                          <Field label="Montant">
                            <input type="number" value={item.amount} onChange={(e) => updateInstallment(index, "amount", Number(e.target.value) || 0)} className={FIELD_SOFT} />
                          </Field>
                          <IconButton icon={Trash2} tone="danger" label="Retirer la tranche" onClick={() => setScheduleForm((c) => c.filter((_, i) => i !== index))} />
                        </div>
                      </ItemRow>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Reste non planifié : <b className="text-gray-900">{formatMoney(remainingToSchedule, cur)}</b>
                  </p>
                  <ActionButton icon={CalendarClock} pending={createScheduleMutation.isPending} disabled={scheduleForm.length === 0} onClick={validateAndCreateSchedule}>
                    Créer l'échéancier
                  </ActionButton>
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
