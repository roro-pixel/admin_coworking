import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet as WalletIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  walletService,
  formatAmount,
  formatAmountOnly,
  safeNumber,
} from "../../services/wallet.service";
import type { LedgerEntry, WalletHold } from "../../services/wallet.service";
import { useAuth } from "../../contexts/AuthContext";
import { AdminLayout } from "../../components/layout/AdminLayout";

const PAGE_SIZE = 20;

const entryTypeLabels: Record<string, string> = {
  ADMIN_TOPUP: "Top-up admin",
  ADMIN_DEBIT: "Débit admin",
  PAYMENT: "Paiement",
  REFUND: "Remboursement",
  REVERSAL: "Inversion",
  HOLD: "Réservation",
  HOLD_RELEASE: "Libération réservation",
  ADJUSTMENT: "Ajustement",
  CASHBACK: "Cashback",
  PROMOTIONAL_CREDIT: "Crédit promotionnel",
  OVERPAYMENT_CREDIT: "Trop-perçu",
};

const holdStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actif", color: "bg-blue-100 text-blue-700" },
  CAPTURED: { label: "Capturé", color: "bg-green-100 text-green-700" },
  RELEASED: { label: "Libéré", color: "bg-gray-100 text-gray-500" },
  EXPIRED: { label: "Expiré", color: "bg-red-100 text-red-700" },
};

const buildDefaultHoldForm = () => ({
  amount: 0,
  sourceType: "BOOKING",
  sourceCode: "",
  expiresAt: (() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  })(),
});

export const WalletDetailModal: React.FC = () => {
  const { walletNumber } = useParams<{ walletNumber: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  // États
  const [activeTab, setActiveTab] = useState<"ledger" | "holds">("ledger");
  const [ledgerPage, setLedgerPage] = useState(0);
  const [isCreateHoldOpen, setIsCreateHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState(buildDefaultHoldForm);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Chargement du wallet
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ["wallet", walletNumber],
    queryFn: () => walletService.getWallet(walletNumber!),
    enabled: !!walletNumber,
  });

  // Chargement du ledger
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["wallet-ledger", walletNumber, ledgerPage],
    queryFn: () =>
      walletService.getLedgerEntries(walletNumber!, {
        page: ledgerPage,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
    enabled: !!walletNumber && activeTab === "ledger",
  });

  const { data: holdsData, isLoading: holdsLoading } = useQuery({
    queryKey: ["wallet-holds", walletNumber],
    queryFn: () => walletService.getWalletHolds(walletNumber!, { size: 100 }),
    enabled: !!walletNumber && activeTab === "holds",
  });

  const ledgerEntries: LedgerEntry[] = ledgerData?.content || [];
  const totalElements = ledgerData?.totalElements ?? 0;
  const totalPages =
    ledgerData?.totalPages ?? Math.ceil(totalElements / PAGE_SIZE);
  const holds: WalletHold[] = holdsData?.content || [];

  // Réinitialiser la page du ledger quand on change d'onglet
  useEffect(() => {
    setLedgerPage(0);
  }, [activeTab]);

  // Mutations
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet", walletNumber] });
    queryClient.invalidateQueries({
      queryKey: ["wallet-ledger", walletNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["wallet-holds", walletNumber] });
    queryClient.invalidateQueries({ queryKey: ["wallets"] });
  };

  const createHoldMutation = useMutation({
    mutationFn: () =>
      walletService.createHold({
        walletNumber: walletNumber!,
        amount: holdForm.amount,
        sourceType: holdForm.sourceType,
        sourceCode: holdForm.sourceCode,
        expiresAt: new Date(holdForm.expiresAt).toISOString(),
        createdBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      invalidateQueries();
      setIsCreateHoldOpen(false);
      setHoldForm(buildDefaultHoldForm());
      setHoldError(null);
    },
    onError: (error: any) => {
      setHoldError(
        error?.response?.data?.message || "Erreur lors de la création du hold.",
      );
    },
  });

  const captureMutation = useMutation({
    mutationFn: (holdNumber: string) =>
      walletService.captureHold(holdNumber, admin?.email || "admin"),
    onSuccess: () => {
      invalidateQueries();
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message || "Erreur lors de la capture du hold.",
      );
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (holdNumber: string) =>
      walletService.releaseHold(holdNumber, admin?.email || "admin"),
    onSuccess: () => {
      invalidateQueries();
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors de la libération du hold.",
      );
    },
  });

  const anyPending = captureMutation.isPending || releaseMutation.isPending;
  const availableBalance = safeNumber(wallet?.availableBalance);

  if (walletLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (walletError || !wallet) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <WalletIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Portefeuille introuvable</p>
          <button
            onClick={() => navigate("/wallets")}
            className="mt-4 text-primary-600 hover:underline"
          >
            Retour à la liste
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header avec retour */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/wallets")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Retour aux portefeuilles</span>
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {wallet.walletNumber}
            </h1>
            <p className="text-gray-500 mt-1">
              {wallet.ownerType} · {wallet.ownerCode}
            </p>
          </div>
          <button
            onClick={() => refetchWallet()}
            className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">Solde disponible</p>
          <p className="text-2xl font-bold text-green-600">
            {formatAmount(wallet.availableBalance, wallet.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">Solde bloqué</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatAmount(wallet.heldBalance, wallet.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">Solde ledger</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(wallet.ledgerBalance, wallet.currency)}
          </p>
        </div>
      </div>

      {/* Messages d'erreur */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 flex justify-between items-center">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "ledger"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Historique ({totalElements})
          </button>
          <button
            onClick={() => setActiveTab("holds")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "holds"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Holds ({holds.length})
          </button>
        </div>
      </div>

      {/* Contenu onglet Ledger */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {ledgerLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune transaction</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {ledgerEntries.map((entry) => (
                  <div
                    key={entry.entryNumber}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {entry.direction === "CREDIT" ? (
                        <TrendingUp
                          size={18}
                          className="text-green-600 flex-shrink-0"
                        />
                      ) : (
                        <TrendingDown
                          size={18}
                          className="text-red-600 flex-shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {entryTypeLabels[entry.entryType] || entry.entryType}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.sourceCode && (
                            <span className="font-mono">
                              {entry.sourceCode} ·{" "}
                            </span>
                          )}
                          {new Date(entry.createdAt).toLocaleString("fr-FR")}
                        </p>
                        {entry.reference && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Réf: {entry.reference}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-semibold text-sm ${entry.direction === "CREDIT" ? "text-green-600" : "text-red-600"}`}
                      >
                        {entry.direction === "CREDIT" ? "+" : "-"}
                        {formatAmountOnly(entry.amount)} {entry.currency}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatAmountOnly(entry.balanceAfter)} {entry.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Page {ledgerPage + 1} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
                      disabled={ledgerPage === 0}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setLedgerPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={ledgerPage >= totalPages - 1}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Contenu onglet Holds */}
      {activeTab === "holds" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Réservations de fonds sur ce portefeuille
            </p>
            <button
              onClick={() => setIsCreateHoldOpen(true)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700 transition-colors"
            >
              <Plus size={14} /> Nouveau hold
            </button>
          </div>

          {holdsLoading ? (
            <div className="flex justify-center py-12 bg-white rounded-xl border">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : holds.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun hold actif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holds.map((hold) => {
                const hs = holdStatusConfig[hold.status] || {
                  label: hold.status,
                  color: "bg-gray-100 text-gray-500",
                };
                const isActive = hold.status === "ACTIVE";
                const isExpired = new Date(hold.expiresAt) < new Date();
                return (
                  <div
                    key={hold.holdNumber}
                    className={`bg-white rounded-xl border p-4 ${!isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {hold.holdNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hold.sourceType} · {hold.sourceCode}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${isExpired && isActive ? "text-red-500" : "text-gray-400"}`}
                        >
                          Expire le :{" "}
                          {new Date(hold.expiresAt).toLocaleString("fr-FR")}
                          {isExpired && isActive && " (expiré)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatAmountOnly(hold.amount)} {wallet.currency}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${hs.color}`}
                        >
                          {hs.label}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Capturer le hold ${hold.holdNumber} (débit définitif de ${formatAmountOnly(hold.amount)} ${wallet.currency}) ?`,
                              )
                            ) {
                              captureMutation.mutate(hold.holdNumber);
                            }
                          }}
                          disabled={anyPending}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50 hover:bg-green-700 transition-colors"
                        >
                          {captureMutation.isPending &&
                          captureMutation.variables === hold.holdNumber ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          Capturer
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Libérer le hold ${hold.holdNumber} (remettre ${formatAmountOnly(hold.amount)} ${wallet.currency} dans le solde disponible) ?`,
                              )
                            ) {
                              releaseMutation.mutate(hold.holdNumber);
                            }
                          }}
                          disabled={anyPending}
                          className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50 hover:bg-gray-300 transition-colors"
                        >
                          {releaseMutation.isPending &&
                          releaseMutation.variables === hold.holdNumber ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <XCircle size={12} />
                          )}
                          Libérer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulaire créer un hold */}
          {isCreateHoldOpen && (
            <div className="mt-4 border rounded-xl p-4 bg-blue-50 space-y-3">
              <p className="text-sm font-semibold text-blue-800">
                Nouveau hold
              </p>
              {holdError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {holdError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={holdForm.amount === 0 ? "" : holdForm.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, "");
                      setHoldForm({
                        ...holdForm,
                        amount: val === "" ? 0 : parseFloat(val),
                      });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Type de source
                  </label>
                  <select
                    value={holdForm.sourceType}
                    onChange={(e) =>
                      setHoldForm({ ...holdForm, sourceType: e.target.value })
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="BOOKING">Réservation</option>
                    <option value="PAYMENT">Paiement</option>
                    <option value="CAUTION">Caution</option>
                    <option value="SUBSCRIPTION">Abonnement</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Code source *
                  </label>
                  <input
                    type="text"
                    value={holdForm.sourceCode}
                    placeholder="BKG-000001"
                    onChange={(e) =>
                      setHoldForm({ ...holdForm, sourceCode: e.target.value })
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Expiration *
                  </label>
                  <input
                    type="datetime-local"
                    value={holdForm.expiresAt}
                    onChange={(e) =>
                      setHoldForm({ ...holdForm, expiresAt: e.target.value })
                    }
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreateHoldOpen(false)}
                  disabled={createHoldMutation.isPending}
                  className="flex-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (holdForm.amount <= 0 || !holdForm.sourceCode) {
                      setHoldError("Montant et code source obligatoires.");
                      return;
                    }
                    if (holdForm.amount > availableBalance) {
                      setHoldError(
                        `Montant supérieur au solde disponible (${formatAmountOnly(availableBalance)} FCFA).`,
                      );
                      return;
                    }
                    createHoldMutation.mutate();
                  }}
                  disabled={createHoldMutation.isPending}
                  className="flex-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1 hover:bg-primary-700 transition-colors"
                >
                  {createHoldMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Créer le hold"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};
