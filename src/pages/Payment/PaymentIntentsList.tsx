import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Banknote, CreditCard, FileText, Plus, Receipt, Search, Wallet, X } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentIntent, PayableDocument } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import {
  FIELD_SOFT,
  FOCUS,
  ROW_HOVER,
  apiMessage,
  formatDateTime,
  formatMoney,
} from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ReceiptModal } from "../../components/payment/ReceiptModal";
import { CashSessionSelect } from "../../components/payment/CashSessionSelect";
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABEL,
  INTENT_STATUS,
  PURPOSE_LABEL,
} from "../../components/payment/paymentLabels";
import { computeChange, currencyLabel, parseDigits, saveBlob } from "../../components/payment/paymentUtils";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_8rem_minmax(0,1fr)_9rem_11rem]";

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "SUCCEEDED", label: "Payées" },
  { value: "PROCESSING", label: "En cours" },
  { value: "PARTIALLY_REFUNDED", label: "Remb. en partie" },
  { value: "REFUNDED", label: "Remboursées" },
  { value: "EXPIRED", label: "Expirées" },
  { value: "CANCELLED", label: "Annulées" },
];

export const PaymentIntentsList: React.FC = () => {
  const { hasPermission } = useAuth();
  const canProcess = hasPermission("PAYMENT:PROCESS");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [redirectStateHandled, setRedirectStateHandled] = useState(false);

  // Panneau « depuis facture »
  const [isFromBillingOpen, setIsFromBillingOpen] = useState(false);
  const [billingDocNumber, setBillingDocNumber] = useState("");
  const [fromBillingError, setFromBillingError] = useState<string | null>(null);

  // Panneau « dettes client »
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const [debtCustomerType, setDebtCustomerType] = useState("MEMBER");
  const [debtCustomerCode, setDebtCustomerCode] = useState("");
  const [debtSearchText, setDebtSearchText] = useState("");
  const [debtPage, setDebtPage] = useState(0);
  // Sélection conservée d'une page à l'autre : on garde le document entier (devise, solde).
  const [selected, setSelected] = useState<Record<string, PayableDocument>>({});
  const [debtError, setDebtError] = useState<string | null>(null);
  const [debtPayMethod, setDebtPayMethod] = useState<"CASH" | "WALLET">("CASH");
  const [debtCashSession, setDebtCashSession] = useState("");
  const [debtTendered, setDebtTendered] = useState(0);
  const [debtWalletNumber, setDebtWalletNumber] = useState("");

  // Reçu
  const [receiptTxn, setReceiptTxn] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Arrivée depuis le recouvrement
  useEffect(() => {
    if (redirectStateHandled) return;
    const state = location.state as { intentNumber?: string; message?: string } | null | undefined;
    if (!state?.intentNumber) return;
    setSearch(state.intentNumber);
    setDebouncedSearch(state.intentNumber);
    setStatusFilter("");
    setPage(0);
    setRedirectMessage(state.message || "Intention de paiement créée avec succès.");
    setRedirectStateHandled(true);
    window.history.replaceState({}, document.title);
  }, [location.state, redirectStateHandled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: intentsData, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["payment-intents", page, statusFilter, debouncedSearch],
    queryFn: () =>
      paymentService.getPaymentIntents({
        searchText: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const { data: payableDocuments, isLoading: isLoadingDebts } = useQuery({
    queryKey: ["payable-documents", debtCustomerType, debtCustomerCode, debtSearchText, debtPage],
    queryFn: () =>
      paymentService.getPayableDocuments({
        customerType: debtCustomerType || undefined,
        customerCode: debtCustomerCode || undefined,
        searchText: debtSearchText || undefined,
        page: debtPage,
        size: PAGE_SIZE,
      }),
    enabled: isDebtsOpen && (!!debtCustomerCode || !!debtSearchText),
  });

  const closeFromBilling = () => {
    setIsFromBillingOpen(false);
    setBillingDocNumber("");
    setFromBillingError(null);
  };

  const fromBillingMutation = useMutation({
    mutationFn: () =>
      paymentService.createPaymentIntentFromBilling({
        documentNumber: billingDocNumber,
        idempotencyKey: `billing-${billingDocNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      closeFromBilling();
      toast.success("Intention créée depuis la facture");
    },
    onError: (e: unknown) => setFromBillingError(apiMessage(e, "Erreur lors de la création depuis la facture.")),
  });

  const fromBillingsMutation = useMutation({
    mutationFn: (documentNumbers: string[]) =>
      paymentService.createPaymentIntentFromBillings({
        documentNumbers,
        idempotencyKey: `billings-${documentNumbers.join("-")}-${Date.now()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      closeFromBilling();
      toast.success("Intention créée depuis les factures");
    },
    onError: (e: unknown) => setFromBillingError(apiMessage(e, "Erreur lors de la création depuis les factures.")),
  });

  const submitFromBilling = (e: React.FormEvent) => {
    e.preventDefault();
    const docs = billingDocNumber
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (docs.length === 0) return;
    if (docs.length === 1) fromBillingMutation.mutate();
    else fromBillingsMutation.mutate(docs);
  };

  const selectedList = Object.values(selected);
  const selectedNumbers = selectedList.map((d) => d.documentNumber);
  const selectedCurrency = selectedList[0]?.currency || "XAF";
  const selectedTotal = selectedList.reduce((sum, d) => sum + (d.balanceDue || d.totalAmount || 0), 0);

  const createDebtIntent = () =>
    paymentService.createPaymentIntentFromBillings({
      documentNumbers: selectedNumbers,
      idempotencyKey: `multi-pay-${selectedNumbers.join("-")}-${Date.now()}`,
    });

  const paySelectedDocumentsMutation = useMutation({
    mutationFn: async () => {
      const intent = await createDebtIntent();
      if (debtPayMethod === "CASH") {
        return paymentService.payCash(intent.intentNumber, {
          cashSessionNumber: debtCashSession,
          tenderedAmount: debtTendered > 0 ? debtTendered : undefined,
        });
      }
      return paymentService.payWallet(intent.intentNumber, { walletNumber: debtWalletNumber.trim() });
    },
    onSuccess: (data) => {
      setDebtError(null);
      setSelected({});
      setDebtTendered(0);
      queryClient.invalidateQueries({ queryKey: ["payable-documents"] });
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      queryClient.invalidateQueries({ queryKey: ["cash-sessions-open-select"] });
      toast.success(
        data.changeAmount && data.changeAmount > 0
          ? `Paiement enregistré. Monnaie à rendre : ${formatMoney(data.changeAmount, currencyLabel(selectedCurrency))}`
          : "Paiement enregistré",
      );
      setReceiptTxn(data.transactionNumber);
    },
    onError: (e: unknown) => setDebtError(apiMessage(e, "Erreur lors du paiement multiple.")),
  });

  // Choisir un autre moyen (chèque, virement, mobile money…) : on crée l'intention puis on ouvre sa fiche.
  const openIntentMutation = useMutation({
    mutationFn: createDebtIntent,
    onSuccess: (intent) => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      navigate(`/payments/${intent.intentNumber}`);
    },
    onError: (e: unknown) => setDebtError(apiMessage(e, "Impossible de créer l'intention.")),
  });

  const downloadReceipt = async (transactionNumber: string) => {
    setDownloading(true);
    try {
      saveBlob(await paymentService.getReceiptPdf(transactionNumber), `recu_${transactionNumber}.pdf`);
    } catch {
      toast.error("Téléchargement impossible");
    } finally {
      setDownloading(false);
    }
  };

  // Un paiement multi-documents ne porte que sur une devise : celle du premier document coché.
  const docs: PayableDocument[] = payableDocuments?.content || [];

  const toggleDocument = (doc: PayableDocument) => {
    setSelected((prev) => {
      if (prev[doc.documentNumber]) {
        const { [doc.documentNumber]: _removed, ...rest } = prev;
        return rest;
      }
      const first = Object.values(prev)[0];
      if (first && doc.currency && first.currency && doc.currency !== first.currency) {
        setDebtError(
          `Une seule devise à la fois (${currencyLabel(first.currency)}). Décochez d'abord ces documents pour choisir des documents en ${currencyLabel(doc.currency)}.`,
        );
        return prev;
      }
      setDebtError(null);
      return { ...prev, [doc.documentNumber]: doc };
    });
  };

  const pageAllSelected = docs.length > 0 && docs.every((d) => selected[d.documentNumber]);
  const selectAll = () => {
    setSelected((prev) => {
      if (pageAllSelected) {
        const next = { ...prev };
        docs.forEach((d) => delete next[d.documentNumber]);
        return next;
      }
      const currency = Object.values(prev)[0]?.currency ?? docs[0]?.currency;
      const next = { ...prev };
      docs.filter((d) => !currency || d.currency === currency).forEach((d) => {
        next[d.documentNumber] = d;
      });
      return next;
    });
  };

  const intents: PaymentIntent[] = intentsData?.content || [];
  const totalPages = intentsData?.totalPages ?? Math.ceil((intentsData?.totalElements || 0) / PAGE_SIZE);
  const cashCalc = debtTendered > 0 ? computeChange(selectedTotal, debtTendered) : null;
  const canPay =
    selectedNumbers.length > 0 &&
    (debtPayMethod === "CASH" ? !!debtCashSession : debtWalletNumber.trim().length > 0);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Intentions de paiement"
        subtitle="Toutes les demandes d'encaissement, leur statut et leur règlement."
        action={
          canProcess ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <ActionButton icon={Plus} onClick={() => navigate("/payments/create")}>
              Nouveau paiement
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={FileText}
              onClick={() => {
                setIsDebtsOpen(false);
                setIsFromBillingOpen(true);
                setFromBillingError(null);
                setBillingDocNumber("");
              }}
            >
              Depuis facture
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={Search}
              onClick={() => {
                setIsFromBillingOpen(false);
                setIsDebtsOpen(true);
                setDebtError(null);
                setSelected({});
                setDebtPage(0);
              }}
            >
              Dettes client
            </ActionButton>
          </div>
          ) : undefined
        }
      />

      {redirectMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <span>{redirectMessage}</span>
          <IconButton icon={X} label="Fermer le message" tone="success" onClick={() => setRedirectMessage(null)} />
        </div>
      )}

      {isFromBillingOpen && (
        <PanelForm
          title="Créer une intention depuis une facture"
          onSubmit={submitFromBilling}
          onCancel={closeFromBilling}
          pending={fromBillingMutation.isPending || fromBillingsMutation.isPending}
          submitLabel="Créer l'intention"
          submitDisabled={!billingDocNumber.trim()}
          error={fromBillingError}
        >
          <Field label="Numéro de facture" required hint="Plusieurs factures : séparez-les par une virgule (une seule devise).">
            <input
              value={billingDocNumber}
              onChange={(e) => setBillingDocNumber(e.target.value)}
              placeholder="INV-2026-0042, INV-2026-0043"
              className={`${FIELD_SOFT} font-mono`}
              autoFocus
            />
          </Field>
        </PanelForm>
      )}

      {isDebtsOpen && (
        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-gray-950">Dettes d'un client</h4>
              <p className="text-sm text-gray-500">Cherchez les documents à payer, cochez-les, puis réglez en une fois.</p>
            </div>
            <IconButton icon={X} label="Fermer" tone="neutral" onClick={() => setIsDebtsOpen(false)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Type de client">
              <select
                value={debtCustomerType}
                onChange={(e) => {
                  setDebtCustomerType(e.target.value);
                  setSelected({});
                  setDebtPage(0);
                }}
                className={FIELD_SOFT}
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Code client">
              <input
                value={debtCustomerCode}
                onChange={(e) => {
                  setDebtCustomerCode(e.target.value);
                  setSelected({});
                  setDebtPage(0);
                }}
                placeholder="MBR-0001"
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
            <Field label="Recherche">
              <input
                value={debtSearchText}
                onChange={(e) => {
                  setDebtSearchText(e.target.value);
                  setDebtPage(0);
                }}
                placeholder="Nom, source…"
                className={FIELD_SOFT}
              />
            </Field>
          </div>

          {debtError && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{debtError}</p>}

          <div className="mt-4">
            {!debtCustomerCode && !debtSearchText ? (
              <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Saisissez un code client ou une recherche pour afficher les documents.
              </p>
            ) : isLoadingDebts ? (
              <ListSkeleton rows={3} />
            ) : docs.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Aucun document à payer.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  className={`mb-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--logo-pink-dark)] hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_12%,white)] ${FOCUS}`}
                >
                  {pageAllSelected ? "Tout décocher sur cette page" : "Tout cocher sur cette page"}
                </button>
                <ul className="space-y-2">
                  {docs.map((d) => {
                    const on = !!selected[d.documentNumber];
                    return (
                      <li key={d.documentNumber}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition ${
                            on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_12%,white)]" : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleDocument(d)}
                            className="h-4 w-4 shrink-0 rounded accent-[color:var(--logo-pink-dark)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">
                              {d.documentNumber}
                            </span>
                            <span className="block truncate text-sm text-gray-600">
                              {d.documentType}
                              {d.dueDate ? ` · échéance ${formatDateTime(d.dueDate).split(" ")[0]}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-bold tabular-nums text-gray-950">
                              {formatMoney(d.balanceDue, currencyLabel(d.currency))}
                            </span>
                            <span className="block text-xs text-gray-400">{d.status}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3">
                  <Pagination
                    page={debtPage}
                    totalPages={payableDocuments?.totalPages || 1}
                    total={payableDocuments?.totalElements ?? docs.length}
                    noun="document"
                    onChange={setDebtPage}
                  />
                </div>
              </>
            )}
          </div>

          {selectedNumbers.length > 0 && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {selectedNumbers.length} document{selectedNumbers.length > 1 ? "s" : ""} à régler
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-gray-950">
                    {formatMoney(selectedTotal, currencyLabel(selectedCurrency))}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Le règlement couvre la totalité de la sélection (pas de paiement partiel).</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex gap-2">
                    {([
                      { v: "CASH", label: "Espèces", icon: Banknote },
                      { v: "WALLET", label: "Portefeuille", icon: Wallet },
                    ] as const).map(({ v, label, icon: Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDebtPayMethod(v)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${FOCUS} ${
                          debtPayMethod === v
                            ? "bg-[color:var(--logo-pink-dark)] text-white"
                            : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
                        }`}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                  </div>
                  {debtPayMethod === "CASH" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <CashSessionSelect value={debtCashSession} onChange={setDebtCashSession} required label="Session de caisse" />
                      <Field label="Montant remis" hint={cashCalc ? (cashCalc.invalid || cashCalc.remainingAfter > 0 ? "Inférieur au total : le paiement sera refusé ou partiel" : `À rendre : ${formatMoney(cashCalc.change, currencyLabel(selectedCurrency))}`) : "Facultatif"}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={debtTendered === 0 ? "" : debtTendered}
                          onChange={(e) => setDebtTendered(parseDigits(e.target.value))}
                          placeholder={String(selectedTotal)}
                          className={`${FIELD_SOFT} bg-white tabular-nums shadow-sm`}
                        />
                      </Field>
                    </div>
                  ) : (
                    <input
                      value={debtWalletNumber}
                      onChange={(e) => setDebtWalletNumber(e.target.value)}
                      placeholder="N° de portefeuille"
                      aria-label="Numéro de portefeuille"
                      className={`${FIELD_SOFT} bg-white font-mono shadow-sm sm:w-56`}
                    />
                  )}
                  <ActionButton
                    icon={Receipt}
                    pending={paySelectedDocumentsMutation.isPending}
                    disabled={!canPay}
                    onClick={() => paySelectedDocumentsMutation.mutate()}
                  >
                    Payer la sélection
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    pending={openIntentMutation.isPending}
                    onClick={() => openIntentMutation.mutate()}
                  >
                    Autre moyen…
                  </ActionButton>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="space-y-3">
        <SearchField value={search} onChange={setSearch} placeholder="Client, n° d'intention, e-mail" />
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => {
            const on = statusFilter === f.value;
            return (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(0);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                  on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {isFetching && !isLoading && <Dots />}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les intentions." onRetry={() => refetch()} />
      ) : intents.length === 0 ? (
        <EmptyState icon={CreditCard} title="Aucune intention" hint="Ajustez la recherche ou créez un nouveau paiement." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Intention</span>
            <span>Client</span>
            <span>Montant</span>
            <span>Source</span>
            <span>Expire</span>
            <span className="text-right">Statut</span>
          </HeadRow>
          <DataCard>
            {intents.map((intent) => {
              const st = statusOf(INTENT_STATUS, intent.status);
              return (
                <button
                  key={intent.intentNumber}
                  type="button"
                  onClick={() => navigate(`/payments/${intent.intentNumber}`)}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 text-left transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER} ${FOCUS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{intent.intentNumber}</p>
                    <p className="mt-0.5 truncate text-sm text-gray-500">{PURPOSE_LABEL[intent.purpose] ?? intent.purpose}</p>
                  </div>
                  <div className="lg:order-last lg:text-right">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="truncate font-semibold text-gray-950">{intent.customerName || intent.customerCode}</p>
                    <p className="truncate text-xs text-gray-400">
                      {CUSTOMER_TYPE_LABEL[intent.customerType] ?? intent.customerType}
                      {intent.customerEmail ? ` · ${intent.customerEmail}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(intent.amount, currencyLabel(intent.currency))}</p>
                    {(intent.paidAmount ?? 0) > 0 && intent.status !== "SUCCEEDED" && (
                      <p className="text-xs text-emerald-700">dont {formatMoney(intent.paidAmount, currencyLabel(intent.currency))} payé</p>
                    )}
                  </div>
                  <p className="min-w-0 truncate text-sm text-gray-600 max-lg:hidden">
                    {intent.resolvedSourceLabel || intent.sourceCode || intent.sourceType}
                  </p>
                  <p className="text-sm text-gray-500 max-lg:text-right">{formatDateTime(intent.expiresAt)}</p>
                </button>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={totalPages || 1} total={intentsData?.totalElements ?? intents.length} noun="intention" onChange={setPage} />
        </>
      )}

      <ReceiptModal
        transactionNumber={receiptTxn}
        onClose={() => setReceiptTxn(null)}
        onDownload={downloadReceipt}
        downloading={downloading}
      />
    </div>
  );
};
