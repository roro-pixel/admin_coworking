import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Ban,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  Wallet,
  Banknote,
  X,
  AlertCircle,
  Receipt,
  Download,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  PaymentIntent,
  CashSession,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  PROCESSING: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
  },
  AUTHORIZED: {
    label: "Autorisé",
    color: "bg-purple-100 text-purple-700",
    icon: CheckCircle,
  },
  SUCCEEDED: {
    label: "Réussi",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  FAILED: { label: "Échoué", color: "bg-red-100 text-red-700", icon: XCircle },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-500", icon: Ban },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500", icon: Clock },
  REFUNDED: {
    label: "Remboursé",
    color: "bg-orange-100 text-orange-700",
    icon: RefreshCw,
  },
  PARTIALLY_REFUNDED: {
    label: "Partiellement remboursé",
    color: "bg-orange-100 text-orange-700",
    icon: RefreshCw,
  },
  REVERSED: {
    label: "Inversé",
    color: "bg-red-100 text-red-700",
    icon: RefreshCw,
  },
};

const PAGE_SIZE = 20;
const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const PaymentIntentsList: React.FC = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // ========== ÉTATS RECHERCHE ET FILTRES ==========
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [redirectStateHandled, setRedirectStateHandled] = useState(false);

  // ========== ÉTATS MODAL DEPUIS FACTURE ==========
  const [isFromBillingOpen, setIsFromBillingOpen] = useState(false);
  const [billingDocNumber, setBillingDocNumber] = useState("");
  const [fromBillingError, setFromBillingError] = useState<string | null>(null);

  // ========== ÉTATS DETTES CLIENT ==========
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const [debtCustomerType, setDebtCustomerType] = useState<string>("MEMBER");
  const [debtCustomerCode, setDebtCustomerCode] = useState("");
  const [debtSearchText, setDebtSearchText] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [debtPayMethod, setDebtPayMethod] = useState<"CASH" | "WALLET">("CASH");
  const [debtCashSession, setDebtCashSession] = useState("");
  const [debtWalletNumber, setDebtWalletNumber] = useState("");
  const [debtPayAmount, setDebtPayAmount] = useState<number>(0);
  const [debtPayResult, setDebtPayResult] = useState<any>(null);
  const [debtPayError, setDebtPayError] = useState<string | null>(null);

  // ========== ÉTATS REÇU ==========
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ========== REDIRECTION DEPUIS LE RECOUVREMENT ==========
  useEffect(() => {
    if (redirectStateHandled) return;

    const state = location.state as
      | { intentNumber?: string; message?: string }
      | null
      | undefined;

    if (!state?.intentNumber) return;

    setSearch(state.intentNumber);
    setDebouncedSearch(state.intentNumber);
    setStatusFilter("");
    setPage(0);
    setRedirectMessage(
      state.message || "Intention de paiement créée avec succès.",
    );
    setRedirectStateHandled(true);

    window.history.replaceState({}, document.title);
  }, [location.state, redirectStateHandled]);

  // ========== DEBOUNCE RECHERCHE ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ========== HANDLER CHANGEMENT FILTRE ==========
  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  // ========== QUERY INTENTIONS DE PAIEMENT ==========
  const {
    data: intentsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["payment-intents", page, statusFilter, debouncedSearch],
    queryFn: () =>
      paymentService.getPaymentIntents({
        searchText: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  // ========== QUERY DOCUMENTS PAYABLES ==========
  const { data: payableDocuments, isLoading: isLoadingDebts } = useQuery({
    queryKey: [
      "payable-documents",
      debtCustomerType,
      debtCustomerCode,
      debtSearchText,
    ],
    queryFn: () =>
      paymentService.getPayableDocuments({
        customerType: debtCustomerType || undefined,
        customerCode: debtCustomerCode || undefined,
        searchText: debtSearchText || undefined,
      }),
    enabled: isDebtsOpen && (!!debtCustomerCode || !!debtSearchText),
  });

  // ========== QUERY SESSIONS OUVERTES POUR SELECT ==========
  const { data: openSessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const openSessions: CashSession[] = openSessionsData?.content || [];

  // ========== MUTATION CRÉATION DEPUIS FACTURE ==========
  const fromBillingMutation = useMutation({
    mutationFn: () =>
      paymentService.createPaymentIntentFromBilling({
        documentNumber: billingDocNumber,
        idempotencyKey: `billing-${billingDocNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      setIsFromBillingOpen(false);
      setBillingDocNumber("");
      setFromBillingError(null);
    },
    onError: (error: any) => {
      setFromBillingError(
        error?.response?.data?.message ||
          "Erreur lors de la création depuis la facture.",
      );
    },
  });

  // ========== MUTATION CRÉATION DEPUIS PLUSIEURS FACTURES ==========
  const fromBillingsMutation = useMutation({
    mutationFn: (documentNumbers: string[]) =>
      paymentService.createPaymentIntentFromBillings({
        documentNumbers,
        idempotencyKey: `billings-${documentNumbers.join("-")}-${Date.now()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      setIsFromBillingOpen(false);
      setBillingDocNumber("");
      setFromBillingError(null);
    },
    onError: (error: any) => {
      setFromBillingError(
        error?.response?.data?.message ||
          "Erreur lors de la création depuis les factures.",
      );
    },
  });

  // ========== MUTATION PAIEMENT MULTIPLE DETTES CLIENT ==========
  const paySelectedDocumentsMutation = useMutation({
    mutationFn: async () => {
      const intent = await paymentService.createPaymentIntentFromBillings({
        documentNumbers: selectedDocuments,
        idempotencyKey: `multi-pay-${Date.now()}`,
      });
      if (debtPayMethod === "CASH") {
        return paymentService.payCash(intent.intentNumber, {
          receivedBy: admin?.email || "admin",
          cashSessionNumber: debtCashSession || undefined,
        });
      } else {
        return paymentService.payWallet(intent.intentNumber, {
          walletNumber: debtWalletNumber,
          createdBy: admin?.email || "admin",
        });
      }
    },
    onSuccess: (data) => {
      setDebtPayResult(data);
      setDebtPayError(null);
      queryClient.invalidateQueries({ queryKey: ["payable-documents"] });
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      handleOpenReceipt(data.transactionNumber);
    },
    onError: (error: any) => {
      setDebtPayError(
        error?.response?.data?.message || "Erreur lors du paiement multiple.",
      );
    },
  });

  // ========== HELPERS REÇU ==========
  const handleOpenReceipt = async (transactionNumber: string) => {
    setReceiptLoading(true);
    setIsReceiptOpen(true);
    try {
      const data = await paymentService.getReceipt(transactionNumber);
      setReceiptData(data);
    } catch {
      setReceiptData(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleDownloadReceiptPdf = async (transactionNumber: string) => {
    try {
      const blob = await paymentService.getReceiptPdf(transactionNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu_${transactionNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  // ========== HELPERS DETTES CLIENT ==========
  const selectedTotal = (payableDocuments || [])
    .filter((doc: any) => selectedDocuments.includes(doc.documentNumber))
    .reduce(
      (sum: number, doc: any) => sum + (doc.balanceDue || doc.totalAmount || 0),
      0,
    );

  const toggleDocument = (docNumber: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docNumber)
        ? prev.filter((d) => d !== docNumber)
        : [...prev, docNumber],
    );
  };

  const selectAll = () => {
    const allDocs = (payableDocuments || []).map((d: any) => d.documentNumber);
    if (selectedDocuments.length === allDocs.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(allDocs);
    }
  };

  // ========== DONNÉES DU TABLEAU ==========
  const intents: PaymentIntent[] = intentsData?.content || [];
  const totalPages =
    (intentsData as any)?.totalPages ??
    Math.ceil((intentsData?.totalElements || 0) / PAGE_SIZE);
  const totalElements = intentsData?.totalElements ?? 0;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <div>
      {/* ========== EN-TÊTE ========== */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Intentions de paiement
          </h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements} intention{totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {/* Navigation vers la page de création */}
          <button
            onClick={() => navigate("/payments/create")}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            Nouveau paiement
          </button>
          <button
            onClick={() => {
              setIsFromBillingOpen(true);
              setFromBillingError(null);
              setBillingDocNumber("");
            }}
            className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            Depuis facture
          </button>
          <button
            onClick={() => {
              setIsDebtsOpen(true);
              setDebtError(null);
              setSelectedDocuments([]);
              setDebtPayResult(null);
              setDebtPayError(null);
              setDebtPayAmount(0);
            }}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
          >
            <Search size={18} />
            Dettes client
          </button>
        </div>
      </div>

      {redirectMessage && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{redirectMessage}</span>
          <button
            type="button"
            onClick={() => setRedirectMessage(null)}
            className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
            aria-label="Fermer le message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========== FILTRES ========== */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher par client, n° intention..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
          {isFetching && search && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
            />
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>

      {/* ========== TABLEAU ========== */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="min-w-[1120px] w-full border-separate border-spacing-y-2">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                N° Intention
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Client
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Objectif
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Expiration
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {intents.map((intent) => {
              const status = statusConfig[intent.status];
              const StatusIcon = status?.icon;
              return (
                <tr
                  key={intent.intentNumber}
                  onClick={() => navigate(`/payments/${intent.intentNumber}`)}
                  className="cursor-pointer transition hover:bg-gray-50/80"
                >
                  <td className="px-6 py-4 text-sm font-mono">
                    {intent.intentNumber}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">
                      {intent.customerName || intent.customerCode}
                    </p>
                    <p className="text-xs text-gray-500">
                      {intent.customerType}
                    </p>
                    {intent.customerEmail && (
                      <p className="text-xs text-gray-400">
                        {intent.customerEmail}
                      </p>
                    )}
                    {intent.customerPhone && (
                      <p className="text-xs text-gray-400">
                        {intent.customerPhone}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {intent.amount.toLocaleString("fr-FR")} {intent.currency}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {intent.resolvedSourceLabel ? (
                      <>
                        <p className="font-medium">
                          {intent.resolvedSourceLabel}
                        </p>
                        <p className="text-xs text-gray-400">
                          {intent.resolvedSourceType}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>{intent.sourceType}</p>
                        {intent.sourceCode && (
                          <p className="text-xs text-gray-400 font-mono">
                            {intent.sourceCode}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{intent.purpose}</td>
                  <td className="px-6 py-4">
                    {status && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateTime(intent.expiresAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/payments/${intent.intentNumber}`);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-primary-50 hover:text-primary-600"
                      title="Voir détail et transactions"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========== ÉTAT VIDE ========== */}
      {intents.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucune intention de paiement trouvée</p>
        </div>
      )}

      {/* ========== PAGINATION ========== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} intention{totalElements > 1 ? "s" : ""} — Page{" "}
            {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========== MODAL CRÉATION DEPUIS FACTURE(S) ========== */}
      {isFromBillingOpen && (
        <ModalPortal onClose={() => setIsFromBillingOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Paiement depuis une facture</h3>
            <button
              onClick={() => setIsFromBillingOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {fromBillingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {fromBillingError}
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              Le backend déduit automatiquement le client, le montant restant
              dû, la devise et les sources depuis la facture.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Document de facturation *
              </label>
              <input
                type="text"
                value={billingDocNumber}
                onChange={(e) => setBillingDocNumber(e.target.value)}
                placeholder="INV-202604-000001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Une facture unique — ou plusieurs séparées par des virgules
                (même client, même devise)
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsFromBillingOpen(false)}
                disabled={
                  fromBillingMutation.isPending ||
                  fromBillingsMutation.isPending
                }
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const docs = billingDocNumber
                    .split(",")
                    .map((d) => d.trim())
                    .filter(Boolean);
                  if (docs.length === 0) return;
                  if (docs.length === 1) {
                    fromBillingMutation.mutate();
                  } else {
                    fromBillingsMutation.mutate(docs);
                  }
                }}
                disabled={
                  fromBillingMutation.isPending ||
                  fromBillingsMutation.isPending ||
                  !billingDocNumber.trim()
                }
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {fromBillingMutation.isPending ||
                fromBillingsMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} /> Créer l'intention
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL DETTES CLIENT ========== */}
      {isDebtsOpen && (
        <ModalPortal onClose={() => setIsDebtsOpen(false)} size="4xl">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Dettes client</h3>
            <button
              onClick={() => setIsDebtsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de payeur
                </label>
                <select
                  value={debtCustomerType}
                  onChange={(e) => {
                    setDebtCustomerType(e.target.value);
                    setSelectedDocuments([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Client</option>
                  <option value="BUSINESS_ENTITY">Entreprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code payeur
                </label>
                <input
                  type="text"
                  value={debtCustomerCode}
                  onChange={(e) => {
                    setDebtCustomerCode(e.target.value);
                    setSelectedDocuments([]);
                  }}
                  placeholder="MBR-0001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recherche texte
                </label>
                <input
                  type="text"
                  value={debtSearchText}
                  onChange={(e) => setDebtSearchText(e.target.value)}
                  placeholder="Nom, source..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            {debtError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {debtError}
              </div>
            )}
            {debtPayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {debtPayError}
              </div>
            )}
            {debtPayResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>
                    Paiement effectué — Transaction :{" "}
                    <span className="font-mono">
                      {debtPayResult.transactionNumber}
                    </span>
                  </span>
                </div>
                {debtPayResult.advanceAmount > 0 && (
                  <p className="mt-1 text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    Une partie a été créditée comme avance :{" "}
                    {debtPayResult.advanceAmount.toLocaleString("fr-FR")} FCFA
                  </p>
                )}
              </div>
            )}

            {selectedDocuments.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {selectedDocuments.length} document
                    {selectedDocuments.length > 1 ? "s" : ""} sélectionné
                    {selectedDocuments.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-blue-600">
                    Total à payer :{" "}
                    <span className="font-bold">
                      {selectedTotal.toLocaleString("fr-FR")} FCFA
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDebtPayMethod("CASH")}
                      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                        debtPayMethod === "CASH"
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      <Banknote size={12} /> Cash
                    </button>
                    <button
                      onClick={() => setDebtPayMethod("WALLET")}
                      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                        debtPayMethod === "WALLET"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <Wallet size={12} /> Wallet
                    </button>
                  </div>
                  {debtPayMethod === "CASH" && (
                    <select
                      value={debtCashSession}
                      onChange={(e) => setDebtCashSession(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    >
                      <option value="">Sans session caisse</option>
                      {openSessions.map((s) => (
                        <option key={s.sessionNumber} value={s.sessionNumber}>
                          {s.sessionNumber} — {s.registerCode}
                        </option>
                      ))}
                    </select>
                  )}
                  {debtPayMethod === "WALLET" && (
                    <input
                      type="text"
                      value={debtWalletNumber}
                      onChange={(e) => setDebtWalletNumber(e.target.value)}
                      placeholder="N° wallet *"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={debtPayAmount === 0 ? "" : debtPayAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setDebtPayAmount(val === "" ? 0 : parseInt(val));
                    }}
                    placeholder="Montant (vide = total)"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                  />
                  <button
                    onClick={() => paySelectedDocumentsMutation.mutate()}
                    disabled={
                      paySelectedDocumentsMutation.isPending ||
                      selectedDocuments.length === 0 ||
                      (debtPayMethod === "WALLET" && !debtWalletNumber)
                    }
                    className="w-full bg-green-600 text-white py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {paySelectedDocumentsMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Receipt size={12} /> Payer la sélection
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isLoadingDebts ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-500">
                  Chargement des dettes...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {payableDocuments && payableDocuments.length > 0 && (
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 mb-2"
                  >
                    {selectedDocuments.length === payableDocuments.length ? (
                      <CheckSquare size={14} />
                    ) : (
                      <Square size={14} />
                    )}
                    {selectedDocuments.length === payableDocuments.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </button>
                )}
                {(payableDocuments || []).map((doc: any) => {
                  const isSelected = selectedDocuments.includes(
                    doc.documentNumber,
                  );
                  return (
                    <div
                      key={doc.documentNumber}
                      onClick={() => toggleDocument(doc.documentNumber)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-mono font-medium">
                                {doc.documentNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.customerName || doc.customerCode || "—"}
                                {doc.customerEmail && (
                                  <span className="ml-2 text-gray-400">
                                    {doc.customerEmail}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {doc.totalAmount?.toLocaleString("fr-FR")}{" "}
                                {doc.currency}
                              </p>
                              {doc.balanceDue > 0 && (
                                <p className="text-xs text-red-600 font-medium">
                                  Solde :{" "}
                                  {doc.balanceDue.toLocaleString("fr-FR")}{" "}
                                  {doc.currency}
                                </p>
                              )}
                            </div>
                          </div>
                          {doc.resolvedSourceLabel ? (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {doc.resolvedSourceLabel}
                              </span>
                              {doc.resolvedSourceType && (
                                <span className="text-xs text-gray-400 font-mono">
                                  ({doc.resolvedSourceType})
                                </span>
                              )}
                            </div>
                          ) : doc.sourceType || doc.sourceCode ? (
                            <div className="mt-1">
                              <span className="text-xs text-gray-400">
                                {doc.sourceType}
                                {doc.sourceCode ? ` / ${doc.sourceCode}` : ""}
                              </span>
                            </div>
                          ) : null}
                          <div className="flex justify-between mt-1">
                            <p className="text-xs text-gray-400">
                              {doc.documentType}
                            </p>
                            {doc.dueDate && (
                              <p className="text-xs text-gray-500">
                                Échéance :{" "}
                                {new Date(doc.dueDate).toLocaleDateString(
                                  "fr-FR",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {payableDocuments &&
                  payableDocuments.length === 0 &&
                  (debtCustomerCode || debtSearchText) && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Aucune dette trouvée pour ce payeur
                    </div>
                  )}
                {!debtCustomerCode && !debtSearchText && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Entrez un code payeur ou un texte de recherche pour charger
                    les dettes
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL REÇU ========== */}
      {isReceiptOpen && (
        <ModalPortal onClose={() => setIsReceiptOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Reçu de paiement</h3>
            <button
              onClick={() => setIsReceiptOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {receiptLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-500">Chargement du reçu...</p>
              </div>
            ) : receiptData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Reçu</p>
                    <p className="font-mono font-bold">
                      {receiptData.receiptNumber}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Transaction</p>
                    <p className="font-mono font-bold">
                      {receiptData.transactionNumber}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Montant payé</p>
                    <p className="font-bold text-lg">
                      {receiptData.paidAmount?.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Méthode</p>
                    <p className="font-medium">
                      {receiptData.paymentMethod}
                      {receiptData.provider ? ` · ${receiptData.provider}` : ""}
                    </p>
                  </div>
                  {receiptData.allocatedAmount > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Alloué</p>
                      <p className="font-medium">
                        {receiptData.allocatedAmount?.toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </div>
                  )}
                  {receiptData.advanceAmount > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600">Avance créditée</p>
                      <p className="font-medium text-amber-700">
                        {receiptData.advanceAmount?.toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm">
                      {new Date(receiptData.paidAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Encaissé par</p>
                    <p className="text-sm">{receiptData.receivedBy}</p>
                  </div>
                </div>
                {receiptData.customerName && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-500">Client</p>
                    <p className="font-medium text-blue-800">
                      {receiptData.customerName}
                    </p>
                  </div>
                )}
                {receiptData.allocations &&
                  receiptData.allocations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Allocations
                      </h4>
                      <div className="space-y-1">
                        {(receiptData.allocations as any[]).map(
                          (a: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs bg-gray-50 p-2 rounded"
                            >
                              <span className="font-mono">
                                {a.documentNumber || a.referenceCode}
                              </span>
                              <span className="font-medium">
                                {a.amount?.toLocaleString("fr-FR")} FCFA
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() =>
                      handleDownloadReceiptPdf(receiptData.transactionNumber)
                    }
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Télécharger PDF
                  </button>
                  <button
                    onClick={() => setIsReceiptOpen(false)}
                    className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Reçu introuvable
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
